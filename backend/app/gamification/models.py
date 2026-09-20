"""
Gamification & Engagement Domain Models.
Defines schemas for XP ledger, dynamic level calculation, badges,
timezone-aware streaks, daily quests, and leaderboards.
"""

import math
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class XPAction(str, Enum):
    """Supported engagement actions that award Experience Points (XP)."""

    WATCH_REEL = "watch_reel"
    LIKE_REEL = "like_reel"
    COMMENT_REEL = "comment_reel"
    CREATE_REEL = "create_reel"
    DAILY_LOGIN = "daily_login"
    CHALLENGE_COMPLETED = "challenge_completed"
    STREAK_MILESTONE = "streak_milestone"
    WATCH_PARTY_HOST = "watch_party_host"


# Standard XP value per action
ACTION_XP_VALUES: dict[XPAction, int] = {
    XPAction.WATCH_REEL: 10,
    XPAction.LIKE_REEL: 5,
    XPAction.COMMENT_REEL: 10,
    XPAction.CREATE_REEL: 50,
    XPAction.DAILY_LOGIN: 25,
    XPAction.WATCH_PARTY_HOST: 30,
    XPAction.CHALLENGE_COMPLETED: 50,
    XPAction.STREAK_MILESTONE: 70,
}

# Anti-abuse daily caps to prevent bot farming (0 = uncapped)
DAILY_ACTION_CAPS: dict[XPAction, int] = {
    XPAction.WATCH_REEL: 100,       # Max 10 reels / day count toward XP
    XPAction.LIKE_REEL: 40,         # Max 8 likes / day
    XPAction.COMMENT_REEL: 50,      # Max 5 comments / day
    XPAction.CREATE_REEL: 250,      # Max 5 creations / day
    XPAction.DAILY_LOGIN: 25,       # 1 login reward / day
    XPAction.WATCH_PARTY_HOST: 90,  # Max 3 hosted parties / day
}


class XPLedgerEntry(BaseModel):
    """Immutable ledger record of an XP award event."""

    entry_id: str
    user_id: str
    action: XPAction
    amount: int
    idempotency_key: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AwardXPRequest(BaseModel):
    """Request payload to record an engagement event and award XP."""

    action: XPAction
    idempotency_key: str = Field(..., min_length=4, max_length=128)
    amount: int | None = Field(None, ge=1, le=1000)
    metadata: dict[str, Any] | None = None


class AwardXPResponse(BaseModel):
    """Response returned after processing an XP award."""

    awarded: bool
    amount: int
    action: XPAction
    new_total_xp: int
    current_level: int
    leveled_up: bool
    message: str


class UserLevel(BaseModel):
    """Computed level status, tier title, and progression towards next level."""

    user_id: str
    current_xp: int
    level: int
    title: str
    xp_for_current_level: int
    xp_for_next_level: int
    progress_pct: float

    @classmethod
    def calculate(cls, user_id: str, total_xp: int) -> "UserLevel":
        """Compute quadratic level progression from total XP."""
        xp = max(0, total_xp)
        # Level = 1 + floor(sqrt(xp / 100))
        level = 1 + math.isqrt(xp // 100)

        # Boundaries
        xp_curr = ((level - 1) ** 2) * 100
        xp_next = (level ** 2) * 100

        span = max(1, xp_next - xp_curr)
        progress = round(min(100.0, max(0.0, ((xp - xp_curr) / span) * 100.0)), 1)

        # Title assignment
        if level >= 35:
            title = "Living Legend 👑"
        elif level >= 20:
            title = "Superstar 🌟"
        elif level >= 10:
            title = "Trendsetter 🚀"
        elif level >= 5:
            title = "Active Creator 🎨"
        elif level >= 2:
            title = "Rising Talent ✨"
        else:
            title = "Novice Explorer 🧭"

        return cls(
            user_id=user_id,
            current_xp=xp,
            level=level,
            title=title,
            xp_for_current_level=xp_curr,
            xp_for_next_level=xp_next,
            progress_pct=progress,
        )


class BadgeCategory(str, Enum):
    """Categories of unlockable badges."""

    WATCH = "watch"
    CREATION = "creation"
    STREAK = "streak"
    SOCIAL = "social"
    SPECIAL = "special"


class Badge(BaseModel):
    """Catalog definition of an unlockable achievement badge."""

    badge_id: str
    name: str
    description: str
    icon: str
    category: BadgeCategory
    threshold: int
    action_type: str


class UserBadge(BaseModel):
    """Unlocked badge owned by a specific user."""

    badge_id: str
    user_id: str
    name: str
    description: str
    icon: str
    category: BadgeCategory
    unlocked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StreakScope(str, Enum):
    """Streak tracking scope."""

    DAILY = "daily"
    FRIEND = "friend"
    COMMUNITY = "community"


class StreakState(BaseModel):
    """State of an ongoing streak with freeze shield protection."""

    scope: StreakScope = StreakScope.DAILY
    target_id: str | None = None
    current_streak: int = 0
    longest_streak: int = 0
    last_active_date: str | None = None  # Format: YYYY-MM-DD
    freeze_tokens: int = 2
    is_frozen_today: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RecordStreakRequest(BaseModel):
    """Request to update streak activity."""

    scope: StreakScope = StreakScope.DAILY
    target_id: str | None = None
    date_str: str | None = None  # User local date YYYY-MM-DD, defaults to UTC today


class FreezeStreakRequest(BaseModel):
    """Request to consume a freeze token and protect a streak."""

    scope: StreakScope = StreakScope.DAILY
    target_id: str | None = None


class Challenge(BaseModel):
    """Definition of a daily or weekly engagement quest."""

    challenge_id: str
    title: str
    description: str
    action: XPAction
    target_count: int
    reward_xp: int
    is_weekly: bool = False
    icon: str = "🎯"
    expires_at: datetime


class UserChallenge(BaseModel):
    """Challenge instance populated with user's current progress."""

    challenge_id: str
    title: str
    description: str
    action: XPAction
    target_count: int
    current_count: int = 0
    reward_xp: int
    is_completed: bool = False
    is_claimed: bool = False
    is_weekly: bool = False
    icon: str = "🎯"
    expires_at: datetime


class LeaderboardScope(str, Enum):
    """Leaderboard timeframe scope."""

    WEEKLY = "weekly"
    ALL_TIME = "all_time"


class LeaderboardEntry(BaseModel):
    """Single user ranking entry on a leaderboard."""

    rank: int
    user_id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    score: int
    level: int
    title: str


class LeaderboardResponse(BaseModel):
    """Leaderboard ranking response."""

    scope: LeaderboardScope
    entries: list[LeaderboardEntry]
    user_entry: LeaderboardEntry | None = None
    total_participants: int = 0


class GamificationProfile(BaseModel):
    """Aggregated summary of user gamification achievements."""

    user_id: str
    level: UserLevel
    streaks: list[StreakState]
    active_challenges: list[UserChallenge]
    badges_unlocked: list[UserBadge]
    badges_unlocked_count: int
    badges_total_count: int
    freeze_tokens_available: int
    recent_xp_ledger: list[XPLedgerEntry]
