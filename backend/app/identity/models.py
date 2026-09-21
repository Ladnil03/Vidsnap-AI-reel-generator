"""
Identity Domain Pydantic Models & Schemas.
Enforces strict field boundaries, EmailStr normalization, and role definitions.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRole(str, Enum):
    """User access control roles."""
    USER = "user"
    CREATOR = "creator"
    BUSINESS = "business"
    MODERATOR = "moderator"
    ADMIN = "admin"


class SignupRequest(BaseModel):
    """Payload for user registration."""
    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password (min 8 chars)")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class LoginRequest(BaseModel):
    """Payload for user login."""
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ForgotPasswordRequest(BaseModel):
    """Payload for requesting a password reset OTP."""
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    """Payload for verifying OTP and setting a new password."""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class TokenRefreshRequest(BaseModel):
    """Optional payload for clients that cannot use httpOnly cookies."""
    refresh_token: str | None = Field(None, description="Rotating refresh token string")


class UserResponse(BaseModel):
    """Public user profile response."""
    user_id: str
    name: str
    email: EmailStr
    roles: list[str]
    tokens_remaining: int
    timezone: str = "UTC"
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    """Payload for updating user profile."""
    name: str | None = Field(None, min_length=2, max_length=100)
    timezone: str | None = Field(None, description="IANA timezone identifier e.g. America/New_York")

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is not None:
            import zoneinfo
            try:
                zoneinfo.ZoneInfo(v)
            except Exception:
                raise ValueError(f"Invalid IANA timezone '{v}'") from None
        return v


class AuthResponse(BaseModel):
    """Authentication response returning access token and profile info."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    refresh_token: str | None = None  # Populated if not using cookies
