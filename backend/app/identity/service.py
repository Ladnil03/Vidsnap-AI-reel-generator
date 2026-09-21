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
    UpdateProfileRequest,
    UserResponse,
    UserRole,
    VerifyEmailRequest,
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

        # Check CAPTCHA if enabled
        if settings.captcha_enabled:
            from backend.app.identity.captcha import verify_captcha
            valid_captcha = await verify_captcha(request.captcha_token)
            if not valid_captcha:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CAPTCHA verification failed. Please try again.",
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
            "tokens_remaining": 0,
            "email_verified": False,
            "timezone": "UTC",
            "created_at": now,
            "updated_at": now,
        }
        await db.users.insert_one(user_doc)

        # Dispatch email verification OTP
        await IdentityService.request_email_verification(
            email, user_id=user_id, user_name=request.name.strip()
        )

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

        # Grandfathering existing users without email_verified
        if "email_verified" not in user:
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"email_verified": True}},
            )
            user["email_verified"] = True

        return user

    @staticmethod
    async def create_session(user: dict[str, Any], family_id: str | None = None) -> AuthResponse:
        """Create access token and rotating refresh token for user within a session family."""
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

        if not family_id:
            family_id = str(uuid.uuid4())

        # Store hashed refresh token with family tracking
        await db.refresh_tokens.insert_one({
            "token_hash": hashed_refresh,
            "user_id": user_id,
            "family_id": family_id,
            "status": "active",
            "created_at": now,
            "expires_at": refresh_expires,
        })

        user_resp = UserResponse(
            user_id=user_id,
            name=user["name"],
            email=user["email"],
            roles=roles,
            tokens_remaining=user.get("tokens_remaining", 0),
            email_verified=user.get("email_verified", False),
            timezone=user.get("timezone", "UTC"),
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
        """
        Verify and rotate refresh token, issuing new access and refresh tokens.
        Enforces refresh token reuse detection via token families:
        - Presenting an already-rotated or revoked token terminates the entire family
          and records an entry in the security audit logs.
        """
        db = get_db()
        hashed_input = hash_token(raw_refresh_token)
        now = datetime.now(timezone.utc)

        stored_token = await db.refresh_tokens.find_one({"token_hash": hashed_input})
        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or already used refresh token. Please log in again.",
            )

        family_id = stored_token.get("family_id")
        user_id = stored_token.get("user_id")

        # REUSE DETECTION: If token was already rotated or revoked, trigger security defense
        if stored_token.get("status") in ("rotated", "revoked"):
            logger.warning(
                "SECURITY: Refresh token reuse detected! user_id=%s, family_id=%s, token_status=%s",
                user_id,
                family_id,
                stored_token.get("status"),
            )
            # Revoke entire token family
            if family_id:
                await db.refresh_tokens.update_many(
                    {"family_id": family_id},
                    {"$set": {"status": "revoked", "revoked_at": now}},
                )

            # Record security audit log
            await db.security_audit_logs.insert_one({
                "audit_id": str(uuid.uuid4()),
                "event": "refresh_token_reuse_detected",
                "user_id": user_id,
                "family_id": family_id,
                "timestamp": now,
                "detail": (
                    "Attempted reuse of an already-rotated or revoked refresh token. "
                    "Entire session family revoked."
                ),
            })

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=(
                    "Refresh token reuse detected. All sessions in this family have been "
                    "terminated. Please log in again."
                ),
            )

        # Normalize expires_at for timezone-safe comparison
        expires_at = stored_token["expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please log in again.",
            )

        # Mark token as rotated
        await db.refresh_tokens.update_one(
            {"_id": stored_token["_id"]},
            {"$set": {"status": "rotated", "rotated_at": now}},
        )

        user = await db.users.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer exists.",
            )

        # Issue new token in the same token family
        return await IdentityService.create_session(user, family_id=family_id)

    @staticmethod
    async def revoke_session(raw_refresh_token: str | None) -> None:
        """Revoke a refresh token and its session family on logout."""
        if not raw_refresh_token:
            return
        db = get_db()
        hashed_input = hash_token(raw_refresh_token)
        stored_token = await db.refresh_tokens.find_one({"token_hash": hashed_input})
        if stored_token:
            family_id = stored_token.get("family_id")
            now = datetime.now(timezone.utc)
            if family_id:
                await db.refresh_tokens.update_many(
                    {"family_id": family_id},
                    {"$set": {"status": "revoked", "revoked_at": now}},
                )
            else:
                await db.refresh_tokens.delete_one({"_id": stored_token["_id"]})

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

    @staticmethod
    async def update_profile(user_id: str, request: UpdateProfileRequest) -> dict[str, Any]:
        """Update user profile fields such as name and timezone."""
        db = get_db()
        updates: dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
        if request.name is not None:
            updates["name"] = request.name.strip()
        if request.timezone is not None:
            updates["timezone"] = request.timezone

        updated_user = await db.users.find_one_and_update(
            {"user_id": user_id},
            {"$set": updates},
            return_document=True,
        )
        if not updated_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return updated_user

    @classmethod
    async def request_email_verification(
        cls, email: str, user_id: str | None = None, user_name: str | None = None
    ) -> None:
        """Generate and send email verification OTP code."""
        db = get_db()
        email = email.strip().lower()
        now = datetime.now(timezone.utc)

        user = await db.users.find_one({"email": email})
        if not user:
            return

        if user.get("email_verified") is True:
            return

        existing = await db.otps.find_one({"email": email, "type": "email_verification"})
        if existing:
            created_at = existing["created_at"]
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if now - created_at < timedelta(seconds=60):
                return
            if existing.get("attempts", 0) >= 5:
                return

        otp_code = generate_secure_otp()
        salt = secrets.token_hex(16)
        hashed_otp = hash_otp(otp_code, salt)

        await db.otps.update_one(
            {"email": email, "type": "email_verification"},
            {
                "$set": {
                    "user_id": user["user_id"],
                    "email": email,
                    "hashed_otp": hashed_otp,
                    "salt": salt,
                    "type": "email_verification",
                    "created_at": now,
                },
                "$setOnInsert": {"attempts": 0},
            },
            upsert=True,
        )

        email_adapter = get_email_adapter()
        await email_adapter.send_otp_email(
            recipient_email=email,
            recipient_name=user_name or user.get("name", "User"),
            otp_code=otp_code,
        )
        logger.info("Email verification OTP dispatched for: %s", email)

    @classmethod
    async def verify_email(cls, request: VerifyEmailRequest) -> dict[str, Any]:
        """Verify OTP for email verification and grant free tokens."""
        db = get_db()
        email = request.email.lower()
        now = datetime.now(timezone.utc)

        otp_record = await db.otps.find_one({"email": email, "type": "email_verification"})
        if not otp_record:
            otp_record = await db.otps.find_one({"email": email})
        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code.",
            )

        if otp_record.get("attempts", 0) >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed verification attempts. Please request a new code.",
            )

        otp_created = otp_record["created_at"]
        if otp_created.tzinfo is None:
            otp_created = otp_created.replace(tzinfo=timezone.utc)
        if now - otp_created > timedelta(minutes=10):
            await db.otps.delete_one({"_id": otp_record["_id"]})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new one.",
            )

        is_valid = verify_otp_hash(
            plain_otp=request.otp,
            stored_hash=otp_record["hashed_otp"],
            salt=otp_record["salt"],
        )
        if not is_valid:
            await db.otps.update_one({"_id": otp_record["_id"]}, {"$inc": {"attempts": 1}})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code.",
            )

        # Delete verified OTP
        await db.otps.delete_one({"_id": otp_record["_id"]})

        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        if user.get("email_verified") is True:
            return {"email_verified": True, "tokens_granted": 0, "message": "Email already verified."}

        bonus = settings.free_tokens_on_signup
        await db.users.update_one(
            {"email": email},
            {
                "$set": {"email_verified": True, "updated_at": now},
                "$inc": {"tokens_remaining": bonus},
            },
        )

        if bonus > 0:
            ledger_doc = {
                "ledger_id": str(uuid.uuid4()),
                "user_id": user["user_id"],
                "amount": bonus,
                "balance_after": user.get("tokens_remaining", 0) + bonus,
                "transaction_type": TransactionType.SIGNUP_BONUS.value,
                "reference_id": None,
                "memo": "Welcome signup bonus (email verified)",
                "created_at": now,
            }
            await db.credit_ledger.insert_one(ledger_doc)

        logger.info("Email verified successfully for user: %s (bonus: %d)", email, bonus)
        return {"email_verified": True, "tokens_granted": bonus, "message": "Email verified successfully."}

