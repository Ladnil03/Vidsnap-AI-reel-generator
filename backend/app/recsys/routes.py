"""
Recommendation System API Router.
Provides personalized stream generation, interaction logging,
anti-doomscroll wellbeing card handling, and user interest preference management.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from backend.app.identity.dependencies import get_current_user, get_optional_current_user
from backend.app.recsys.models import (
    InteractionEventRequest,
    RecommendationFeedResponse,
    UserPreferencesRequest,
    UserVectorResponse,
)
from backend.app.recsys.service import RecSysService

router = APIRouter(prefix="/api/v1/recsys", tags=["Recommendation Engine"])


def get_recsys_service() -> RecSysService:
    return RecSysService()


@router.get("/feed", response_model=RecommendationFeedResponse)
async def get_recommended_feed(
    session_reel_count: int = Query(0, ge=0, description="Number of reels watched so far in current session"),
    limit: int = Query(10, ge=1, le=30),
    current_user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)] = None,
    service: RecSysService = Depends(get_recsys_service),
) -> RecommendationFeedResponse:
    """
    Fetch personalized recommendation feed.
    Returns reels scored by two-stage ranking heuristic, transparent explainability tags,
    and anti-doomscroll digital wellbeing cards at designated session milestones.
    """
    user_id = current_user["user_id"] if current_user else None
    return await service.get_recommendations(
        user_id=user_id,
        session_reel_count=session_reel_count,
        limit=limit,
    )


@router.post("/interactions")
async def record_interaction(
    req: InteractionEventRequest,
    current_user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)] = None,
    service: RecSysService = Depends(get_recsys_service),
) -> dict[str, bool]:
    """
    Record an interaction event (view, like, save, skip, complete).
    Automatically updates the user's taste vector online via Exponential Moving Average (EMA).
    """
    user_id = current_user["user_id"] if current_user else None
    success = await service.record_interaction(user_id=user_id, req=req)
    return {"success": success}


@router.get("/preferences", response_model=UserVectorResponse)
async def get_user_preferences(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: RecSysService = Depends(get_recsys_service),
) -> UserVectorResponse:
    """Fetch user's current learned taste profile, top categories, and interaction count."""
    return await service.get_user_preferences(current_user["user_id"])


@router.post("/preferences", response_model=UserVectorResponse)
async def update_user_preferences(
    req: UserPreferencesRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: RecSysService = Depends(get_recsys_service),
) -> UserVectorResponse:
    """Explicitly select favorite topic categories to anchor the recommendation vector."""
    return await service.set_user_preferences(current_user["user_id"], req)
