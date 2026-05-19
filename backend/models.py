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
