"""
Social Graph Domain Models and Schemas.
Defines follow relations, mutual friends, community groupings, and public user profiles.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class CommunityCategory(str, Enum):
    """Categories for grouping communities and discovery."""
    GENERAL = "general"
    TECH = "tech"
    COMEDY = "comedy"
    FITNESS = "fitness"
    ART = "art"
    GAMING = "gaming"
    MUSIC = "music"
    LIFESTYLE = "lifestyle"


class FollowStatusResponse(BaseModel):
    """Response returned when querying or toggling a user follow relation."""
    target_user_id: str
    is_following: bool
    is_friend: bool = Field(description="True if both users follow each other (mutual friends)")
    followers_count: int
    following_count: int


class SocialUserSummary(BaseModel):
    """Compact summary of a user for followers/following/friends lists."""
    user_id: str
    name: str
    email: str
    avatar_url: str | None = None
    followers_count: int = 0
    following_count: int = 0
    is_following: bool = False
    is_friend: bool = False


class FollowersListResponse(BaseModel):
    """Paginated or listed followers response."""
    items: list[SocialUserSummary]
    total: int


class FollowingListResponse(BaseModel):
    """Paginated or listed following response."""
    items: list[SocialUserSummary]
    total: int


class FriendsListResponse(BaseModel):
    """Mutual friends response."""
    items: list[SocialUserSummary]
    total: int


class CommunityCreateRequest(BaseModel):
    """Schema for creating a new interest community."""
    name: str = Field(min_length=2, max_length=50, description="Community display name")
    description: str = Field(default="", max_length=500, description="Brief community summary or manifesto")
    category: CommunityCategory = Field(default=CommunityCategory.GENERAL)
    avatar_url: str | None = None
    banner_url: str | None = None


class CommunityResponse(BaseModel):
    """Detailed public representation of an interest community."""
    community_id: str
    name: str
    slug: str
    description: str
    category: CommunityCategory
    avatar_url: str | None = None
    banner_url: str | None = None
    creator_id: str
    members_count: int = 1
    is_member: bool = False
    role: str | None = None
    created_at: datetime


class CommunityListResponse(BaseModel):
    """Response for community discovery and memberships."""
    items: list[CommunityResponse]
    total: int


class UserProfileResponse(BaseModel):
    """Public creator/user profile with social metrics and community badges."""
    user_id: str
    name: str
    email: str
    avatar_url: str | None = None
    bio: str = ""
    followers_count: int = 0
    following_count: int = 0
    reels_count: int = 0
    is_following: bool = False
    is_friend: bool = False
    communities: list[CommunityResponse] = Field(default_factory=list)
