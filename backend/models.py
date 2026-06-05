"""
Pydantic models for API request validation and response serialisation.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# The four possible states of a reel generation job
JobStatus = Literal["queued", "processing", "done", "failed"]


class JobCreatedResponse(BaseModel):
    """
    Returned immediately after POST /api/jobs.

    Contains the job_id the frontend uses to poll for status.
    """

    job_id: str = Field(..., description="Unique job identifier (UUID4)")
    status: JobStatus = Field(..., description="Job status, always 'queued' on creation")
    message: str = Field(..., description="Human-readable confirmation message")


class JobStatusResponse(BaseModel):
    """
    Returned by GET /api/jobs/{job_id}.

    Frontend polls this every 3 seconds after job creation to monitor progress.
    """

    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current job status")
    reel_url: str | None = Field(
        None, description="Cloudinary URL to the generated reel, populated when status=done"
    )
    error_msg: str | None = Field(
        None, description="Error message, populated when status=failed"
    )
    created_at: datetime = Field(..., description="Job creation timestamp")
    updated_at: datetime = Field(..., description="Job last updated timestamp")


class ReelItem(BaseModel):
    """
    One item in the gallery list returned by GET /api/reels.

    Represents a previously generated reel in the user's history.
    """

    job_id: str = Field(..., description="Unique job identifier")
    reel_url: str = Field(..., description="Direct Cloudinary video URL")
    created_at: datetime = Field(..., description="Reel creation timestamp")


class DeleteResponse(BaseModel):
    """
    Returned by DELETE /api/reels/{job_id}.

    Confirms successful deletion of a reel and its associated job record.
    """

    deleted: bool = Field(..., description="Whether the reel was successfully deleted")
    job_id: str = Field(..., description="Identifier of the deleted reel's job")


# Authentication Models
class SignupRequest(BaseModel):
    """Request body for POST /api/auth/signup."""

    name: str = Field(..., description="User's full name")
    email: str = Field(..., description="User's email address")
    password: str = Field(..., description="User's password (will be hashed with bcrypt)")


class LoginRequest(BaseModel):
    """Request body for POST /api/auth/login."""

    email: str = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")


class AuthResponse(BaseModel):
    """Returned by signup and login endpoints."""

    access_token: str = Field(..., description="JWT access token")
    name: str = Field(..., description="User's name")
    email: str = Field(..., description="User's email")
    tokens_remaining: int = Field(..., description="Remaining tokens for reel generation")
    is_admin: bool = Field(False, description="Whether the user is an admin")


class ForgotPasswordRequest(BaseModel):
    """Request body for POST /api/auth/forgot-password."""

    email: str = Field(..., description="Registered email address")


class ResetPasswordRequest(BaseModel):
    """Request body for POST /api/auth/reset-password."""

    email: str = Field(..., description="Registered email address")
    otp: str = Field(..., description="6-digit OTP sent to email")
    new_password: str = Field(..., description="New password")


class UserProfile(BaseModel):
    """
    Returned by GET /api/users/me.

    Contains the currently logged-in user's profile information.
    """

    name: str = Field(..., description="User's name")
    email: str = Field(..., description="User's email")
    tokens_remaining: int = Field(..., description="Remaining tokens for reel generation")
    created_at: datetime = Field(..., description="Account creation timestamp")


# Feedback Models
class FeedbackRequest(BaseModel):
    """Request body for POST /api/feedback."""

    message: str = Field(..., description="User feedback message")


class FeedbackResponse(BaseModel):
    """Returned by POST /api/feedback."""

    submitted: bool = Field(..., description="Whether feedback was successfully submitted")
    message: str = Field(..., description="Confirmation message")


# Admin Models
class AdminUserItem(BaseModel):
    """Item in admin users list."""

    user_id: str = Field(..., description="Unique user identifier")
    name: str = Field(..., description="User's name")
    email: str = Field(..., description="User's email address")
    tokens_remaining: int = Field(..., description="Current token balance")
    total_reels: int = Field(..., description="Number of completed reels by this user")
    created_at: datetime = Field(..., description="Account creation timestamp")


class AdminFeedbackItem(BaseModel):
    """Item in admin feedback list."""

    feedback_id: str = Field(..., description="Unique feedback identifier")
    user_id: str = Field(..., description="ID of user who submitted feedback")
    user_name: str = Field(..., description="Name of user who submitted feedback")
    user_email: str = Field(..., description="Email of user who submitted feedback")
    message: str = Field(..., description="Feedback message text")
    created_at: datetime = Field(..., description="Feedback submission timestamp")


class AdminTokenUpdate(BaseModel):
    """Request body for PATCH /api/admin/users/{user_id}/tokens."""

    tokens: int = Field(..., description="New token balance to set")
