"""
AI Companion & Personalization API Routes (/api/v1/companion).
Provides endpoints for Personal Companion Chat, Mood Detection, Dynamic Playlists,
Entertainment Journeys, Daily Planner, and Creator Digital Twins.
"""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from backend.app.ai_companion.models import (
    AIPlaylist,
    CompanionChatRequest,
    CompanionChatResponse,
    CompanionMessage,
    CreateAIPlaylistRequest,
    DailyPlan,
    DigitalTwinInteractRequest,
    DigitalTwinInteractResponse,
    DigitalTwinProfile,
    EntertainmentJourney,
    MoodState,
    SetMoodRequest,
    UpdateDailyPlanRequest,
)
from backend.app.ai_companion.service import CompanionService
from backend.app.core.rate_limiter import rate_limit
from backend.app.identity.dependencies import get_current_user, get_optional_current_user

router = APIRouter(prefix="/api/v1/companion", tags=["AI Companion & Personalization"])


@router.post(
    "/chat",
    response_model=CompanionChatResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))],
)
async def chat_with_companion(
    request: CompanionChatRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CompanionChatResponse:
    """Chat with personal AI entertainment companion with intent parsing and tool calling."""
    return await CompanionService.chat_with_companion(
        user_id=current_user["user_id"],
        request=request,
    )


@router.get(
    "/history",
    response_model=list[CompanionMessage],
)
async def get_companion_history(
    limit: int = Query(30, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[CompanionMessage]:
    """Retrieve recent companion conversation history."""
    return await CompanionService.get_chat_history(
        user_id=current_user["user_id"],
        limit=limit,
    )


@router.delete(
    "/history",
    status_code=status.HTTP_200_OK,
)
async def clear_companion_history(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, bool]:
    """Purge companion history for data control and privacy compliance."""
    await CompanionService.clear_chat_history(current_user["user_id"])
    return {"cleared": True}


@router.get(
    "/mood",
    response_model=MoodState | None,
)
async def get_active_mood(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> MoodState | None:
    """Get active user mood preference."""
    return await CompanionService.get_mood(current_user["user_id"])


@router.post(
    "/mood",
    response_model=MoodState,
    status_code=status.HTTP_200_OK,
)
async def set_active_mood(
    request: SetMoodRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> MoodState:
    """Update active mood with consent gating."""
    return await CompanionService.set_mood(
        user_id=current_user["user_id"],
        request=request,
    )


@router.post(
    "/playlists/generate",
    response_model=AIPlaylist,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)
async def generate_smart_playlist(
    request: CreateAIPlaylistRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AIPlaylist:
    """Generate dynamic AI playlist based on vibe, duration, or prompt."""
    return await CompanionService.create_dynamic_playlist(
        user_id=current_user["user_id"],
        request=request,
    )


@router.get(
    "/playlists",
    response_model=list[AIPlaylist],
)
async def list_user_playlists(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[AIPlaylist]:
    """List saved dynamic playlists for user."""
    return await CompanionService.list_user_playlists(current_user["user_id"])


@router.get(
    "/journeys",
    response_model=list[EntertainmentJourney],
)
async def list_entertainment_journeys(
    current_user: dict[str, Any] = Depends(get_optional_current_user),
) -> list[EntertainmentJourney]:
    """List structured entertainment journey presets."""
    user_id = current_user.get("user_id") if current_user else "anonymous"
    return CompanionService.get_entertainment_journeys(user_id)


@router.get(
    "/journeys/{journey_type}",
    response_model=EntertainmentJourney,
)
async def get_journey_detail(
    journey_type: str,
    duration: int = Query(10, ge=3, le=60),
    current_user: dict[str, Any] = Depends(get_optional_current_user),
) -> EntertainmentJourney:
    """Fetch details and steps for a specific entertainment journey."""
    return CompanionService.get_journey_by_type(journey_type, duration=duration)


@router.get(
    "/daily-planner",
    response_model=DailyPlan,
)
async def get_daily_entertainment_plan(
    date: str | None = Query(None),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> DailyPlan:
    """Retrieve scheduled viewing blocks for today."""
    return await CompanionService.get_daily_plan(
        user_id=current_user["user_id"],
        target_date=date,
    )


@router.put(
    "/daily-planner",
    response_model=DailyPlan,
)
async def update_daily_entertainment_plan(
    request: UpdateDailyPlanRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> DailyPlan:
    """Configure healthy viewing blocks in daily planner."""
    return await CompanionService.update_daily_plan(
        user_id=current_user["user_id"],
        request=request,
    )


@router.get(
    "/digital-twin/{creator_id}",
    response_model=DigitalTwinProfile,
)
async def get_creator_digital_twin(
    creator_id: str,
) -> DigitalTwinProfile:
    """Fetch creator's AI digital twin profile and provenance disclosure."""
    return await CompanionService.get_digital_twin(creator_id)


@router.put(
    "/digital-twin",
    response_model=DigitalTwinProfile,
)
async def update_digital_twin_profile(
    profile: DigitalTwinProfile,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> DigitalTwinProfile:
    """Update creator's own AI digital twin with mandatory AI provenance labeling."""
    return await CompanionService.update_digital_twin(
        creator_id=current_user["user_id"],
        creator_name=current_user.get("name", "Creator"),
        profile=profile,
    )


@router.post(
    "/digital-twin/{creator_id}/interact",
    response_model=DigitalTwinInteractResponse,
    dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))],
)
async def interact_with_creator_digital_twin(
    creator_id: str,
    request: DigitalTwinInteractRequest,
    current_user: dict[str, Any] = Depends(get_optional_current_user),
) -> DigitalTwinInteractResponse:
    """Chat with a creator's public digital twin."""
    return await CompanionService.interact_with_digital_twin(
        creator_id=creator_id,
        request=request,
    )
