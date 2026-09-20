"""
Discovery Domain Models and Schemas.
Defines third-party content representation, source connectors, and search schemas.
Enforces legal-by-design compliance (zero re-hosting, mandatory attribution).
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class DiscoverySource(str, Enum):
    """Supported content origin platforms."""
    YOUTUBE_SHORTS = "youtube_shorts"
    PEXELS = "pexels"
    PIXABAY = "pixabay"
    COVERR = "coverr"
    COMMUNITY = "community"


class PlayerType(str, Enum):
    """Playback mechanism required for the item."""
    IFRAME = "iframe"          # Official iframe embed player (e.g., YouTube)
    DIRECT_VIDEO = "direct_video"  # Direct official CDN streaming URL (e.g., Pexels, Pixabay)


class DiscoveryItem(BaseModel):
    """Public representation of a discovered or indexed video asset."""
    item_id: str
    source: DiscoverySource
    external_id: str
    title: str
    description: str = ""
    author_name: str
    author_url: str | None = None
    source_url: str = Field(description="Canonical URL to view on source platform")
    embed_url: str = Field(description="Official iframe player URL or direct CDN video URL")
    player_type: PlayerType = PlayerType.DIRECT_VIDEO
    thumbnail_url: str | None = None
    duration: float = 0.0
    tags: list[str] = Field(default_factory=list)
    embedding: list[float] = Field(default_factory=list, description="384-dimensional semantic projection vector")
    license: str = "Standard"
    attribution_text: str = Field(description="Visible attribution badge text for UI")
    is_external: bool = True
    can_rehost: bool = False  # Hard invariant: third-party video files are NEVER re-hosted
    views_count: int = 0
    likes_count: int = 0
    created_at: datetime
    last_viewed_at: datetime | None = None


class DiscoverySearchRequest(BaseModel):
    """Parameters for cross-source discovery search."""
    q: str | None = Field(default=None, max_length=150)
    source: DiscoverySource | None = None
    tag: str | None = Field(default=None, max_length=50)
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=50)


class DiscoverySearchResponse(BaseModel):
    """Response payload for discovery catalog search."""
    items: list[DiscoveryItem]
    total: int
    page: int
    limit: int
    has_more: bool


class BatchIngestRequest(BaseModel):
    """Trigger on-demand ingestion from external source connector."""
    source: DiscoverySource
    query: str = Field(min_length=2, max_length=100)
    limit: int = Field(default=10, ge=1, le=50)


class BatchIngestResponse(BaseModel):
    """Ingestion execution summary."""
    source: DiscoverySource
    query: str
    ingested_count: int
    skipped_existing_count: int
    total_catalog_size: int


class SourceStatusResponse(BaseModel):
    """Status and configuration state of a content source connector."""
    name: str
    source: DiscoverySource
    configured: bool
    mode: str
    description: str
