"""
Gamification & Engagement REST API Routes (/api/v1/gamification).
Exposes endpoints for user level, XP rewards, streaks, quest challenges,
badge achievements, and Redis ZSET global leaderboards.
"""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from backend.app.core.rate_limiter import rate_limit
from backend.app.gamification.models import (
    AwardXPRequest,
    AwardXPResponse,
    FreezeStreakRequest,
    GamificationProfile,
    LeaderboardResponse,
    LeaderboardScope,
    RecordStreakRequest,
    StreakState,
    UserChallenge,
    UserLevel,
)
from backend.app.gamification.service import BADGE_CATALOG, GamificationService
from backend.app.identity.dependencies import get_current_user, get_optional_current_user

router = APIRouter(prefix="/api/v1/gamification", tags=["Gamification & Engagement"])


@router.get(
    "/profile",
    response_model=GamificationProfile,
    summary="Get aggregated user gamification profile",
)
async def get_gamification_profile(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> GamificationProfile:
    """Retrieve user's complete gamification summary (level, streaks, quests, badges, ledger)."""
    return await GamificationService.get_gamification_profile(user_id=current_user["user_id"])


@router.get(
    "/level",
    response_model=UserLevel,
    summary="Get user level and progression status",
)
async def get_user_level(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserLevel:
    """Retrieve current XP, level tier title, and percentage to next level."""
    return await GamificationService.get_user_level(user_id=current_user["user_id"])


@router.post(
    "/xp/award",
    response_model=AwardXPResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))],
    summary="Record an action and award XP idempotently",
)
async def award_action_xp(
    request: AwardXPRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AwardXPResponse:
    """
    Award XP for verified user actions with daily anti-abuse rate limits
    and idempotent ledger verification.
    """
    return await GamificationService.award_xp(
        user_id=current_user["user_id"],
        action=request.action,
        idempotency_key=request.idempotency_key,
        amount=request.amount,
        metadata=request.metadata,
    )


@router.get(
    "/streaks",
    response_model=list[StreakState],
    summary="Get user streaks",
)
async def get_user_streaks(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[StreakState]:
    """Retrieve all active streak states for the authenticated user."""
    profile = await GamificationService.get_gamification_profile(user_id=current_user["user_id"])
    return profile.streaks


@router.post(
    "/streaks/record",
    response_model=StreakState,
    status_code=status.HTTP_200_OK,
    summary="Record daily streak activity",
)
async def record_streak_activity(
    request: RecordStreakRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> StreakState:
    """Record streak activity for today with consecutive rollover or freeze shield protection."""
    return await GamificationService.record_streak_activity(
        user_id=current_user["user_id"],
        scope=request.scope,
        target_id=request.target_id,
        date_str=request.date_str,
    )


@router.post(
    "/streaks/freeze",
    response_model=StreakState,
    status_code=status.HTTP_200_OK,
    summary="Use a freeze token to protect a streak",
)
async def use_freeze_token(
    request: FreezeStreakRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> StreakState:
    """Consume a freeze token to safeguard an ongoing streak against a missed day."""
    return await GamificationService.use_freeze_token(
        user_id=current_user["user_id"],
        scope=request.scope,
        target_id=request.target_id,
    )


@router.get(
    "/challenges",
    response_model=list[UserChallenge],
    summary="Get active daily and weekly quests",
)
async def get_challenges(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[UserChallenge]:
    """Retrieve active daily and weekly engagement challenges with live user progress."""
    return await GamificationService.get_active_challenges(user_id=current_user["user_id"])


@router.post(
    "/challenges/{challenge_id}/claim",
    response_model=AwardXPResponse,
    status_code=status.HTTP_200_OK,
    summary="Claim completed challenge reward",
)
async def claim_challenge(
    challenge_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AwardXPResponse:
    """Claim bonus XP reward upon completing an engagement challenge."""
    return await GamificationService.claim_challenge_reward(
        user_id=current_user["user_id"],
        challenge_id=challenge_id,
    )


@router.get(
    "/badges",
    response_model=list[dict[str, Any]],
    summary="Get badge achievement catalog with unlock status",
)
async def get_badges_catalog(
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> list[dict[str, Any]]:
    """Retrieve full catalog of unlockable achievement badges and user unlock timestamps."""
    unlocked_map = {}
    if current_user:
        unlocked = await GamificationService.get_user_badges(user_id=current_user["user_id"])
        for b in unlocked:
            unlocked_map[b.badge_id] = b.unlocked_at.isoformat()

    catalog: list[dict[str, Any]] = []
    for badge in BADGE_CATALOG:
        is_unlocked = badge.badge_id in unlocked_map
        catalog.append({
            "badge_id": badge.badge_id,
            "name": badge.name,
            "description": badge.description,
            "icon": badge.icon,
            "category": badge.category.value,
            "threshold": badge.threshold,
            "action_type": badge.action_type,
            "is_unlocked": is_unlocked,
            "unlocked_at": unlocked_map.get(badge.badge_id),
        })

    return catalog


@router.get(
    "/leaderboard",
    response_model=LeaderboardResponse,
    summary="Get global XP leaderboard",
)
async def get_leaderboard(
    scope: LeaderboardScope = Query(LeaderboardScope.ALL_TIME, description="Leaderboard timeframe"),
    limit: int = Query(50, ge=1, le=100, description="Max entries to return"),
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> LeaderboardResponse:
    """Retrieve global leaderboard rankings powered by Redis Sorted Sets (with in-memory fallback)."""
    current_uid = current_user["user_id"] if current_user else None
    return await GamificationService.get_leaderboard(
        scope=scope,
        limit=limit,
        current_user_id=current_uid,
    )
