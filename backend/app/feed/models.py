"""
Universal Feed Domain Models and Schemas.
Defines feed tabs, pagination responses, and cross-device watch progress models.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from backend.app.content.models import VideoResponse


class FeedTab(str, Enum):
    """Supported tabs in the universal feed."""
    TRENDING = "trending"
    FOLLOWING = "following"
    FRIENDS = "friends"
    COMMUNITIES = "communities"
    CONTINUE_WATCHING = "continue_watching"
    SAVED = "saved"


class WatchProgressRequest(BaseModel):
    """Client beacon reporting playback position for cross-device sync."""
    video_id: str
    watched_seconds: float = Field(ge=0.0, description="Current playback timestamp in seconds")
    total_seconds: float = Field(gt=0.0, description="Total video duration in seconds")
    completed: bool = Field(default=False, description="Whether the user finished watching the reel")


class WatchProgressResponse(BaseModel):
    """Stored watch progress for resuming playback on any device."""
    video_id: str
    watched_seconds: float
    total_seconds: float
    percentage: float
    completed: bool
    updated_at: datetime


class FeedResponse(BaseModel):
    """Paginated universal feed response."""
    tab: FeedTab
    items: list[VideoResponse]
    total: int
    has_more: bool = False
    next_cursor: str | None = None
