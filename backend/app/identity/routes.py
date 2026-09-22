"""
Identity & Authentication API Routes (/api/v1/auth & /api/v1/users).
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from backend.app.core.config import settings
from backend.app.core.rate_limiter import rate_limit, rate_limit_per_email
from backend.app.identity.dependencies import get_current_user
from backend.app.identity.models import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenRefreshRequest,
    UpdateProfileRequest,
    UserResponse,
    VerifyEmailRequest,
)
from backend.app.identity.service import IdentityService

router = APIRouter(tags=["Authentication & Identity"])


@router.post(
    "/api/v1/auth/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(rate_limit_per_email(max_requests=10, window_seconds=3600)),
        Depends(rate_limit(max_requests=settings.signup_rate_limit_per_hour, window_seconds=3600)),
    ],
)
async def signup(request: SignupRequest, response: Response) -> AuthResponse:
    """Register a new user account and issue session tokens."""
    auth_resp = await IdentityService.register_user(request)

    # Set secure httpOnly cookie for refresh token
    if auth_resp.refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=auth_resp.refresh_token,
            httponly=True,
            secure=settings.environment == "production",
            samesite="lax",
            max_age=settings.refresh_token_expire_days * 86400,
            path="/api/v1/auth",
        )
    return auth_resp


@router.post(
    "/api/v1/auth/verify-email",
    status_code=status.HTTP_200_OK,
    dependencies=[
        Depends(rate_limit_per_email(max_requests=10, window_seconds=3600)),
        Depends(rate_limit(max_requests=30, window_seconds=60)),
    ],
)
async def verify_email(request: VerifyEmailRequest) -> dict[str, Any]:
    """Confirm email verification OTP code and grant free tier signup tokens."""
    return await IdentityService.verify_email(request)


@router.post(
    "/api/v1/auth/resend-verification",
    status_code=status.HTTP_200_OK,
    dependencies=[
        Depends(rate_limit_per_email(max_requests=5, window_seconds=3600)),
        Depends(rate_limit(max_requests=10, window_seconds=60)),
    ],
)
async def resend_verification(request: ResendVerificationRequest) -> dict[str, str]:
    """Request a fresh email verification OTP code."""
    await IdentityService.request_email_verification(request.email)
    return {"message": "Verification code sent if email exists."}


@router.post(
    "/api/v1/auth/login",
    response_model=AuthResponse,
    dependencies=[
        Depends(rate_limit_per_email(max_requests=20, window_seconds=3600)),
        Depends(rate_limit(max_requests=15, window_seconds=60)),
    ],
)
async def login(request: LoginRequest, response: Response) -> AuthResponse:
    """Authenticate with email and password and issue session tokens."""
    user = await IdentityService.authenticate_user(request)
    auth_resp = await IdentityService.create_session(user)

    if auth_resp.refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=auth_resp.refresh_token,
            httponly=True,
            secure=settings.environment == "production",
            samesite="lax",
            max_age=settings.refresh_token_expire_days * 86400,
            path="/api/v1/auth",
        )
    return auth_resp


@router.post(
    "/api/v1/auth/refresh",
    response_model=AuthResponse,
    dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))],
)
async def refresh_token(
    request: Request,
    response: Response,
    body: TokenRefreshRequest | None = None,
) -> AuthResponse:
    """Rotate refresh token and issue fresh access and refresh tokens."""
    raw_token = request.cookies.get("refresh_token") or (body.refresh_token if body else None)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing.",
        )

    auth_resp = await IdentityService.rotate_refresh_token(raw_token)

    if auth_resp.refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=auth_resp.refresh_token,
            httponly=True,
            secure=settings.environment == "production",
            samesite="lax",
            max_age=settings.refresh_token_expire_days * 86400,
            path="/api/v1/auth",
        )
    return auth_resp


@router.post("/api/v1/auth/logout", response_model=dict[str, str])
async def logout(
    request: Request,
    response: Response,
    body: TokenRefreshRequest | None = None,
) -> dict[str, str]:
    """Revoke session and clear refresh token cookie."""
    raw_token = request.cookies.get("refresh_token") or (body.refresh_token if body else None)
    if raw_token:
        await IdentityService.revoke_session(raw_token)

    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully."}


@router.post(
    "/api/v1/auth/forgot-password",
    response_model=dict[str, str],
    dependencies=[
        Depends(rate_limit_per_email(max_requests=5, window_seconds=300)),
        Depends(rate_limit(max_requests=5, window_seconds=300)),
    ],
)
async def forgot_password(request: ForgotPasswordRequest) -> dict[str, str]:
    """Request a 6-digit password reset verification code."""
    await IdentityService.request_password_reset(request.email)
    # Always return identical message for security
    return {
        "message": "If an account exists for this email, a 6-digit verification code has been sent."
    }


@router.post(
    "/api/v1/auth/reset-password",
    response_model=dict[str, str],
    dependencies=[
        Depends(rate_limit_per_email(max_requests=5, window_seconds=300)),
        Depends(rate_limit(max_requests=5, window_seconds=300)),
    ],
)
async def reset_password(request: ResetPasswordRequest) -> dict[str, str]:
    """Verify OTP code and set new password."""
    await IdentityService.verify_and_reset_password(request)
    return {"message": "Password reset successful. You can now log in."}


@router.get("/api/v1/users/me", response_model=UserResponse)
async def get_me(current_user: dict[str, Any] = Depends(get_current_user)) -> UserResponse:
    """Retrieve the currently authenticated user's profile."""
    from datetime import datetime, timezone
    return UserResponse(
        user_id=current_user["user_id"],
        name=current_user.get("name", ""),
        email=current_user["email"],
        roles=current_user.get("roles", ["user"]),
        tokens_remaining=current_user.get("tokens_remaining", 0),
        timezone=current_user.get("timezone", "UTC"),
        created_at=current_user.get("created_at", datetime.now(timezone.utc)),
    )


@router.patch("/api/v1/users/me", response_model=UserResponse)
async def update_me(
    request: UpdateProfileRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    """Update profile attributes such as display name and timezone."""
    from datetime import datetime, timezone
    updated_user = await IdentityService.update_profile(current_user["user_id"], request)
    return UserResponse(
        user_id=updated_user["user_id"],
        name=updated_user.get("name", ""),
        email=updated_user["email"],
        roles=updated_user.get("roles", ["user"]),
        tokens_remaining=updated_user.get("tokens_remaining", 0),
        timezone=updated_user.get("timezone", "UTC"),
        created_at=updated_user.get("created_at", datetime.now(timezone.utc)),
    )

