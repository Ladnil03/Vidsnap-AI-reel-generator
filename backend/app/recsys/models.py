"""
Recommendation System Models and Schemas.
Defines user preference representations, online interaction events,
explainability metadata, and anti-doomscroll digital wellbeing cards.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from backend.app.discovery.models import DiscoverySource, PlayerType


class InteractionType(str, Enum):
    """User engagement action on a recommended reel."""
    VIEW = "view"
    COMPLETE = "complete"
    LIKE = "like"
    SAVE = "save"
    SHARE = "share"
    SKIP = "skip"


class InteractionEventRequest(BaseModel):
    """Event log sent from client video player on engagement."""
    item_id: str
    source: DiscoverySource = DiscoverySource.COMMUNITY
    interaction_type: InteractionType
    watched_seconds: float = Field(default=0.0, ge=0.0)
    total_seconds: float = Field(default=0.0, ge=0.0)


class UserPreferencesRequest(BaseModel):
    """Explicit interest categories selected by the user."""
    preferred_categories: list[str] = Field(min_length=1, max_length=10)


class UserVectorResponse(BaseModel):
    """Summary of active user taste profile."""
    user_id: str
    top_categories: list[str]
    interaction_count: int
    updated_at: datetime


class WellbeingCard(BaseModel):
    """Anti-doomscroll mindful break prompt injected into continuous sessions."""
    card_type: str = "wellbeing_break"
    title: str = "Time for a Mindful Breath 🌿"
    message: str = "You've enjoyed 15 reels in this session. Take a stretch, grab water, or pause mindfully."
    reel_count: int = 15
    suggested_action: str = "Take a Break"


class RecommendationItem(BaseModel):
    """A personalized feed entry with explainability tag and player embed info."""
    id: str
    video_id: str
    source: DiscoverySource
    title: str
    description: str = ""
    author_name: str
    author_url: str | None = None
    source_url: str
    embed_url: str
    player_type: PlayerType = PlayerType.DIRECT_VIDEO
    thumbnail_url: str | None = None
    duration: float = 0.0
    tags: list[str] = Field(default_factory=list)
    attribution_text: str
    likes_count: int = 0
    views_count: int = 0
    has_liked: bool = False
    has_saved: bool = False
    explainability_tag: str = Field(description="Transparent reason why this item was recommended")
    recommendation_score: float = 0.0
    is_wellbeing_card: bool = False
    wellbeing_card: WellbeingCard | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecommendationFeedResponse(BaseModel):
    """Personalized recommendation stream response."""
    items: list[RecommendationItem]
    total: int
    session_reel_count: int
    has_more: bool
