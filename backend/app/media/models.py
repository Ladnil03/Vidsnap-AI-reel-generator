"""
Media Domain Models.
Defines schemas for presigned uploads and asset metadata.
"""

from typing import Literal

from pydantic import BaseModel, Field


class PresignedUploadRequest(BaseModel):
    """Request for a direct storage upload URL."""
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: Literal[
        "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"
    ]
    size_bytes: int = Field(..., gt=0, le=50 * 1024 * 1024, description="Max 50 MB")


class PresignedUploadResponse(BaseModel):
    """Response containing presigned URL and target key."""
    upload_url: str
    key: str
    method: str = "PUT"
    public_url: str


class PresignedVideoUploadRequest(BaseModel):
    """Request for a direct video upload URL (MP4, WebM, MOV up to 50MB)."""
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: Literal["video/mp4", "video/webm", "video/quicktime"]
    size_bytes: int = Field(..., gt=0, le=50 * 1024 * 1024, description="Max 50 MB")


class PresignedVideoUploadResponse(BaseModel):
    """Response containing presigned URL, key, and caching headers."""
    upload_url: str
    key: str
    method: str = "PUT"
    public_url: str
    content_type: str
    max_size_bytes: int = 50 * 1024 * 1024
