"""
Reel Studio Domain Models & Enums.
Defines schemas for reel creation, progress tracking, and gallery displays.
"""

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class JobStage(str, Enum):
    """Granular stages of a reel generation pipeline."""
    QUEUED = "queued"
    TTS_GENERATING = "tts_generating"
    RENDERING_VIDEO = "rendering_video"
    UPLOADING_MEDIA = "uploading_media"
    DONE = "done"
    FAILED = "failed"


class VoiceChoice(str, Enum):
    """Supported neural voices."""
    NATURAL_US = "en-US-AriaNeural"
    MALE_US = "en-US-GuyNeural"
    FEMALE_UK = "en-GB-SoniaNeural"
    INDIAN_ENGLISH = "en-IN-NeerjaNeural"
    HINDI_FEMALE = "hi-IN-SwaraNeural"
    HINDI_MALE = "hi-IN-MadhurNeural"


class CreateJobRequest(BaseModel):
    """Payload for initiating a reel generation job with storage keys."""
    voiceover_text: str = Field(..., min_length=5, max_length=900, description="Narration script")
    image_keys: list[str] = Field(..., min_length=1, max_length=10, description="1 to 10 storage keys")
    voice: str = Field(default=VoiceChoice.NATURAL_US.value)
    duration: int = Field(default=3, ge=1, le=10, description="Display duration per image in seconds")


class JobCreatedResponse(BaseModel):
    """Returned immediately after job enqueueing."""
    job_id: str
    status: Literal["queued"] = "queued"
    stage: JobStage = JobStage.QUEUED
    message: str


class JobStatusResponse(BaseModel):
    """Returned when polling job status."""
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    stage: JobStage
    reel_url: str | None = None
    thumbnail_url: str | None = None
    error_msg: str | None = None
    created_at: datetime
    updated_at: datetime


class ReelItem(BaseModel):
    """Reel gallery item."""
    job_id: str
    reel_url: str
    thumbnail_url: str | None = None
    created_at: datetime


class DeleteReelResponse(BaseModel):
    """Confirmation of reel soft-deletion."""
    deleted: bool
    job_id: str
