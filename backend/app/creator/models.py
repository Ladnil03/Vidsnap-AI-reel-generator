"""
Creator Domain Models & Schemas.
Defines schemas for Creator Profiles, Verification Applications,
Audience Analytics, Creator Copilot AI, and Community Live Events.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class VerificationStatus(str, Enum):
    """Creator verification approval lifecycle states."""

    NONE = "none"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class CreatorProfile(BaseModel):
    """Creator profile metadata, badge status, and public stats."""

    user_id: str
    handle: str
    display_name: str
    bio: str = ""
    niche: str = "general"
    social_links: dict[str, str] = Field(default_factory=dict)
    verification_status: VerificationStatus = VerificationStatus.NONE
    verified_at: datetime | None = None
    total_reels: int = 0
    total_views: int = 0
    followers_count: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UpdateCreatorProfileRequest(BaseModel):
    """Payload to update creator bio, niche, or external social handles."""

    bio: str | None = Field(None, max_length=500)
    niche: str | None = Field(None, max_length=50)
    social_links: dict[str, str] | None = None


class VerificationApplyRequest(BaseModel):
    """Payload for a creator applying for official verification badge."""

    niche: str = Field(..., min_length=2, max_length=50)
    portfolio_links: list[str] = Field(default_factory=list)
    statement: str = Field(..., min_length=10, max_length=500)


class VerificationApplication(BaseModel):
    """Stored verification submission record."""

    application_id: str
    user_id: str
    niche: str
    portfolio_links: list[str] = Field(default_factory=list)
    statement: str
    status: VerificationStatus = VerificationStatus.PENDING
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: datetime | None = None


class CreatorAnalytics(BaseModel):
    """Aggregated viewer metrics, watch time, and audience affinity."""

    user_id: str
    period_days: int = 30
    total_impressions: int = 0
    total_views: int = 0
    total_watch_seconds: int = 0
    avg_completion_rate_pct: float = 0.0
    engagement_rate_pct: float = 0.0
    top_tags: list[dict[str, Any]] = Field(default_factory=list)
    audience_mood_affinity: list[dict[str, Any]] = Field(default_factory=list)
    daily_views_trend: list[dict[str, Any]] = Field(default_factory=list)


class CreatorCopilotRequest(BaseModel):
    """Input parameters for Creator Copilot AI content recommendations."""

    topic: str = Field(..., min_length=2, max_length=120)
    target_audience: str | None = Field(None, max_length=100)
    mood_vibe: str | None = Field(None, max_length=50)


class CreatorCopilotHook(BaseModel):
    """Individual high-retention video hook proposal."""

    hook_text: str
    hook_style: str


class CreatorCopilotResponse(BaseModel):
    """AI-powered content hooks, viral potential score, and posting window."""

    topic: str
    hooks: list[CreatorCopilotHook]
    viral_potential_score: int = Field(..., ge=0, le=100)
    viral_score_breakdown: str
    optimal_posting_window: str
    recommended_hashtags: list[str]
    suggested_call_to_action: str


class CreatorEventStatus(str, Enum):
    """Status of scheduled community event or watch party."""

    SCHEDULED = "scheduled"
    LIVE = "live"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CreatorEvent(BaseModel):
    """Community watch party or live stream event scheduled by a creator."""

    event_id: str
    creator_id: str
    creator_name: str
    title: str
    description: str = ""
    room_id: str | None = None
    scheduled_at: datetime
    status: CreatorEventStatus = CreatorEventStatus.SCHEDULED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CreateEventRequest(BaseModel):
    """Payload to schedule a creator watch party or event."""

    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field("", max_length=500)
    scheduled_at: datetime
    room_id: str | None = None
