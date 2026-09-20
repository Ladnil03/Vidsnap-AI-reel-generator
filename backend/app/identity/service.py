"""
Identity Domain Service.
Handles user registration, authentication, session tokens (access + rotating refresh),
and secure password resets via OTP.
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status

from backend.app.billing_quota.models import TransactionType
from backend.app.core.adapters.factory import get_email_adapter
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import (
    create_access_token,
    generate_refresh_token,
    generate_secure_otp,
    hash_otp,
    hash_password,
    hash_token,
    verify_otp_hash,
    verify_password,
)
from backend.app.identity.models import (
    AuthResponse,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
    UserResponse,
    UserRole,
)

logger = logging.getLogger(__name__)


class IdentityService:
    """Service orchestrating authentication, sessions, and credentials."""

    @staticmethod
    async def register_user(request: SignupRequest) -> AuthResponse:
        """Register a new user account."""
        db = get_db()
        email = request.email.lower()

        # Check existing user
        existing = await db.users.find_one({"email": email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        user_id = str(uuid.uuid4())
        hashed_password = hash_password(request.password)
        now = datetime.now(timezone.utc)

        user_doc = {
            "user_id": user_id,
            "name": request.name.strip(),
            "email": email,
            "password_hash": hashed_password,
            "roles": [UserRole.USER.value],
            "tokens_remaining": settings.free_tokens_on_signup,
            "created_at": now,
            "updated_at": now,
        }
        await db.users.insert_one(user_doc)

        # Record signup token bonus in credit ledger
        if settings.free_tokens_on_signup > 0:
            ledger_doc = {
                "ledger_id": str(uuid.uuid4()),
                "user_id": user_id,
                "amount": settings.free_tokens_on_signup,
                "balance_after": settings.free_tokens_on_signup,
                "transaction_type": TransactionType.SIGNUP_BONUS.value,
                "reference_id": None,
                "memo": "Welcome signup bonus",
                "created_at": now,
            }
            await db.credit_ledger.insert_one(ledger_doc)

        logger.info("User registered successfully: %s (%s)", email, user_id)
        return await IdentityService.create_session(user_doc)

    @staticmethod
    async def authenticate_user(request: LoginRequest) -> dict[str, Any]:
        """Authenticate email and password."""
        db = get_db()
        email = request.email.lower()
        user = await db.users.find_one({"email": email})

        if not user or not verify_password(request.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    @staticmethod
    async def create_session(user: dict[str, Any]) -> AuthResponse:
        """Create access token and rotating refresh token for user."""
        db = get_db()
        user_id = user["user_id"]
        roles = user.get("roles", [UserRole.USER.value])

        # Generate tokens
        access_token = create_access_token(
            user_id=user_id,
            email=user["email"],
            roles=roles,
        )
        raw_refresh_token = generate_refresh_token()
        hashed_refresh = hash_token(raw_refresh_token)

        now = datetime.now(timezone.utc)
        refresh_expires = now + timedelta(days=settings.refresh_token_expire_days)

        # Store hashed refresh token
        await db.refresh_tokens.insert_one({
            "token_hash": hashed_refresh,
            "user_id": user_id,
            "created_at": now,
            "expires_at": refresh_expires,
        })

        user_resp = UserResponse(
            user_id=user_id,
            name=user["name"],
            email=user["email"],
            roles=roles,
            tokens_remaining=user.get("tokens_remaining", 0),
            created_at=user["created_at"],
        )

        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_resp,
            refresh_token=raw_refresh_token,
        )

    @staticmethod
    async def rotate_refresh_token(raw_refresh_token: str) -> AuthResponse:
        """Verify and rotate refresh token, issuing new access and refresh tokens."""
        db = get_db()
        hashed_input = hash_token(raw_refresh_token)
        now = datetime.now(timezone.utc)

        # Find and immediately delete old refresh token (single use)
        stored_token = await db.refresh_tokens.find_one_and_delete({"token_hash": hashed_input})
        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or already used refresh token. Please log in again.",
            )

        if stored_token["expires_at"] < now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please log in again.",
            )

        user = await db.users.find_one({"user_id": stored_token["user_id"]})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer exists.",
            )

        return await IdentityService.create_session(user)

    @staticmethod
    async def revoke_session(raw_refresh_token: str | None) -> None:
        """Revoke a refresh token on logout."""
        if not raw_refresh_token:
            return
        db = get_db()
        hashed_input = hash_token(raw_refresh_token)
        await db.refresh_tokens.delete_one({"token_hash": hashed_input})

    @staticmethod
    async def request_password_reset(email: str) -> None:
        """
        Generate and send a 6-digit OTP for password reset.
        Hashed with salt at rest, expires in 10 minutes.
        Enforces a 60-second resend cooldown and never resets the attempt
        counter of an in-flight OTP, so a resend cannot bypass lockout.
        """
        db = get_db()
        email = email.strip().lower()
        now = datetime.now(timezone.utc)

        existing = await db.otps.find_one({"email": email})
        if existing:
            created_at = existing["created_at"]
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if now - created_at < timedelta(seconds=60):
                return
            if existing.get("attempts", 0) >= 5:
                return

        user = await db.users.find_one({"email": email})
        if not user:
            return

        otp_code = generate_secure_otp()
        salt = secrets.token_hex(16)
        hashed_otp = hash_otp(otp_code, salt)

        # Preserve attempt counter on re-request inside the lock window
        await db.otps.update_one(
            {"email": email},
            {
                "$set": {
                    "user_id": user["user_id"],
                    "hashed_otp": hashed_otp,
                    "salt": salt,
                    "created_at": now,
                },
                "$setOnInsert": {"attempts": 0},
            },
            upsert=True,
        )

        # Deliver OTP email via configured EmailPort
        email_adapter = get_email_adapter()
        await email_adapter.send_otp_email(
            recipient_email=email,
            recipient_name=user["name"],
            otp_code=otp_code,
        )
        logger.info("Password reset OTP requested for: %s", email)

    @staticmethod
    async def verify_and_reset_password(request: ResetPasswordRequest) -> None:
        """
        Verify OTP and update user password.
        Guarantees constant-time verification and lockout after 5 attempts.
        """
        db = get_db()
        email = request.email.lower()
        now = datetime.now(timezone.utc)

        otp_record = await db.otps.find_one({"email": email})
        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code.",
            )

        # Check attempt limits (keep record so a resend cannot reset the counter)
        if otp_record.get("attempts", 0) >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed verification attempts. Please request a new code.",
            )

        # Check expiry (10 minutes) BEFORE checking OTP value
        otp_created = otp_record["created_at"]
        if otp_created.tzinfo is None:
            otp_created = otp_created.replace(tzinfo=timezone.utc)
        if now - otp_created > timedelta(minutes=10):
            await db.otps.delete_one({"email": email})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new one.",
            )

        # Verify OTP value using constant-time comparison
        is_valid = verify_otp_hash(
            plain_otp=request.otp,
            stored_hash=otp_record["hashed_otp"],
            salt=otp_record["salt"],
        )

        if not is_valid:
            await db.otps.update_one({"email": email}, {"$inc": {"attempts": 1}})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code.",
            )

        # Successful verification: update password, invalidate OTP, revoke active sessions
        new_hash = hash_password(request.new_password)
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": new_hash, "updated_at": now}},
        )
        # Invalidate OTP immediately
        await db.otps.delete_one({"email": email})
        # Revoke all active refresh tokens for this user
        await db.refresh_tokens.delete_many({"user_id": otp_record["user_id"]})
        logger.info("Password successfully reset for user: %s", email)
