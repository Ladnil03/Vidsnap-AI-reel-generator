"""
Admin Domain Models & Schemas.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class AdminUserItem(BaseModel):
    """Admin user table row item."""
    user_id: str
    name: str
    email: EmailStr
    tokens_remaining: int
    roles: list[str]
    total_reels: int
    created_at: datetime


class AdminReelItem(BaseModel):
    """Admin reel list item with author email."""
    job_id: str
    reel_url: str
    thumbnail_url: str | None = None
    user_email: str
    created_at: datetime


class AdminTokenUpdate(BaseModel):
    """Admin token balance adjustment."""
    tokens: int = Field(..., ge=0, le=100000, description="New token balance")


class AdminSystemStats(BaseModel):
    """Aggregated platform health and activity overview."""
    total_users: int
    total_creators: int
    total_businesses: int
    total_reels: int
    total_views: int
    active_rooms: int
    pending_reports: int
    tokens_circulating: int


class AdminRoleUpdate(BaseModel):
    """User role promotion or demotion request."""
    role: str = Field(..., description="Role name e.g. creator, business, moderator, admin")
    action: str = Field("add", description="'add' or 'remove'")
