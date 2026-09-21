"""
Content Domain Models and Schemas.
Defines video publishing, visibility, scheduling, engagement, and commenting types.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ContentVisibility(str, Enum):
    """Visibility permissions for published video content."""
    PUBLIC = "public"
    UNLISTED = "unlisted"
    PRIVATE = "private"
    FOLLOWERS_ONLY = "followers_only"


class ContentStatus(str, Enum):
    """Lifecycle status for video content."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PROCESSING = "processing"
    IN_REVIEW = "in_review"
    REJECTED = "rejected"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DELETED = "deleted"


class CreateVideoRequest(BaseModel):
    """Schema for creating a video post or saving a draft."""
    title: str = Field(min_length=1, max_length=150, description="Headline title for the video")
    description: str = Field(default="", max_length=2000, description="Detailed video description")
    hashtags: list[str] = Field(default_factory=list, description="Associated discovery tags")
    visibility: ContentVisibility = Field(default=ContentVisibility.PUBLIC)
    scheduled_at: datetime | None = Field(default=None, description="Future release timestamp if scheduled")
    video_key: str | None = Field(default=None, description="Pre-uploaded storage key for the video")
    thumbnail_key: str | None = Field(default=None, description="Pre-uploaded storage key for the thumbnail")
    duration: float = Field(default=0.0, ge=0, le=300)
    is_draft: bool = Field(default=False, description="Whether to save as draft instead of publishing")


class CreateVideoFromKeyRequest(BaseModel):
    """Schema for registering a video post directly from a presigned uploaded key."""
    key: str = Field(..., min_length=5, description="Storage key of the uploaded video")
    title: str = Field(..., min_length=1, max_length=150, description="Headline title for the video")
    description: str = Field(default="", max_length=2000, description="Detailed video description")
    hashtags: list[str] = Field(default_factory=list, description="Associated discovery tags")
    visibility: ContentVisibility = Field(default=ContentVisibility.PUBLIC)
    scheduled_at: datetime | None = Field(default=None, description="Future release timestamp if scheduled")
    is_draft: bool = Field(default=False, description="Whether to save as draft instead of publishing")


class UpdateVideoRequest(BaseModel):
    """Schema for updating an existing video post or draft."""
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    hashtags: list[str] | None = None
    visibility: ContentVisibility | None = None
    scheduled_at: datetime | None = None
    status: ContentStatus | None = None


class VideoResponse(BaseModel):
    """Full public representation of a video entity."""
    video_id: str
    user_id: str
    author_name: str
    title: str
    description: str
    hashtags: list[str]
    video_url: str
    thumbnail_url: str | None = None
    duration: float
    visibility: ContentVisibility
    status: ContentStatus
    moderation_status: str = "approved"
    scheduled_at: datetime | None = None
    likes_count: int = 0
    saves_count: int = 0
    comments_count: int = 0
    views_count: int = 0
    has_liked: bool = False
    has_saved: bool = False
    captions: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class CommentCreateRequest(BaseModel):
    """Schema for posting a user comment."""
    text: str = Field(min_length=1, max_length=500, description="Comment text content")


class CommentResponse(BaseModel):
    """Schema for a video comment."""
    comment_id: str
    video_id: str
    user_id: str
    user_name: str
    text: str
    is_hidden: bool = False
    created_at: datetime


class LikeResponse(BaseModel):
    """Feedback on a like or unlike action."""
    video_id: str
    liked: bool
    likes_count: int


class SaveResponse(BaseModel):
    """Feedback on a bookmark or unsave action."""
    video_id: str
    saved: bool
    saves_count: int


class HashtagSuggestionRequest(BaseModel):
    """Request schema for AI hashtag generation."""
    title: str = Field(min_length=2, max_length=200)
    transcript: str | None = Field(default=None, max_length=2000)


class HashtagSuggestionResponse(BaseModel):
    """Generated hashtags and viral hook recommendations."""
    hashtags: list[str]
    suggested_hook: str
