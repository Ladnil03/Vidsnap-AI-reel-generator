"""
Authentication routes — signup, login, forgot password, reset password.
All routes are public (no auth required).
"""

import logging
import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status

from backend.config import settings
from backend.database import get_db
from backend.models import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
)
from backend.services.email_service import send_otp_email
from backend.utils.auth_utils import (
    create_access_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def _generate_otp() -> str:
    """
    Generate a random 6-digit OTP string.

    Returns:
        6-digit OTP as string.
    """
    return "".join(random.choices(string.digits, k=6))


def _build_user_document(name: str, email: str, hashed_password: str) -> dict:
    """
    Build a new user MongoDB document.
    All user fields defined here in one place.

    Args:
        name: User's full name.
        email: User's email address.
        hashed_password: Bcrypt hashed password.

    Returns:
        Complete user document dict ready to insert into MongoDB.
    """
    return {
        "user_id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "password_hash": hashed_password,
        "tokens_remaining": settings.free_tokens_on_signup,
        "is_admin": False,
        "otp": None,
        "otp_created_at": None,
        "created_at": datetime.now(timezone.utc),
    }


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup(request: SignupRequest) -> AuthResponse:
    """
    Register a new user account.

    Checks email is not already registered. Hashes password, saves user to
    MongoDB with free token balance. Returns JWT access token immediately so
    user is logged in on signup.

    Args:
        request: Signup request containing name, email, password.

    Returns:
        AuthResponse with access token and user data.

    Raises:
        HTTPException 409 if email already registered.
    """
    db = get_db()

    # Check if email already exists
    existing_user = await db.users.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Hash password and create user document
    hashed = hash_password(request.password)
    user_doc = _build_user_document(request.name, request.email, hashed)

    # Insert into database
    await db.users.insert_one(user_doc)

    # Create JWT token
    token = create_access_token(user_doc["user_id"], user_doc["email"])

    logger.info("[Auth] New user registered: %s", request.email)

    return AuthResponse(
        access_token=token,
        name=user_doc["name"],
        email=user_doc["email"],
        tokens_remaining=user_doc["tokens_remaining"],
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest) -> AuthResponse:
    """
    Authenticate an existing user.

    Verifies email exists and password matches the stored hash.
    Returns a fresh JWT access token.

    Args:
        request: Login request containing email and password.

    Returns:
        AuthResponse with access token and user data.

    Raises:
        HTTPException 401 for invalid credentials (email or password mismatch).
    """
    db = get_db()

    # Find user by email
    user = await db.users.find_one({"email": request.email})

    # Generic error message — never reveal if email exists or not
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Create JWT token
    token = create_access_token(user["user_id"], user["email"])

    logger.info("[Auth] User logged in: %s", request.email)

    return AuthResponse(
        access_token=token,
        name=user["name"],
        email=user["email"],
        tokens_remaining=user["tokens_remaining"],
    )


@router.post("/forgot-password", response_model=dict)
async def forgot_password(request: ForgotPasswordRequest) -> dict:
    """
    Initiate password reset — generate OTP and send to user email.

    Always returns success message even if email not found (security:
    do not reveal if email is registered).

    Args:
        request: Forgot password request containing email.

    Returns:
        Generic success message dict.
    """
    db = get_db()

    # Find user by email
    user = await db.users.find_one({"email": request.email})

    if user:
        # Generate OTP and save to database
        otp = _generate_otp()
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {
                "$set": {
                    "otp": otp,
                    "otp_created_at": datetime.now(timezone.utc),
                }
            },
        )

        # Send OTP email
        try:
            await send_otp_email(request.email, otp, user["name"])
        except RuntimeError as error:
            logger.error("[Auth] Failed to send OTP email: %s", error)
            # Still return success to user for security

    # Always return same message — never reveal if email exists
    return {
        "message": "If this email is registered, an OTP has been sent. Check your inbox."
    }


@router.post("/reset-password", response_model=dict)
async def reset_password(request: ResetPasswordRequest) -> dict:
    """
    Complete password reset using OTP.

    Verifies OTP is correct and not expired (10 minute window).
    Updates password hash, clears OTP from database.

    Args:
        request: Reset password request containing email, OTP, and new password.

    Returns:
        Success message dict.

    Raises:
        HTTPException 400 if email not found or OTP invalid/expired.
    """
    db = get_db()

    # Find user by email
    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request.",
        )

    # Verify OTP matches
    if user["otp"] != request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    # Check OTP expiry (10 minute window)
    otp_created = user["otp_created_at"]
    if datetime.now(timezone.utc) - otp_created > timedelta(minutes=10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one.",
        )

    # Hash new password and update user document
    new_hash = hash_password(request.new_password)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "password_hash": new_hash,
                "otp": None,
                "otp_created_at": None,
            }
        },
    )

    logger.info("[Auth] Password reset for: %s", request.email)

    return {"message": "Password reset successful. You can now log in."}
