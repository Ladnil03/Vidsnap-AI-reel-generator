"""
Creator API Routes (/api/v1/creator).
Exposes endpoints for creator profile, verification badge applications,
audience analytics, Creator Copilot AI, and community live events.
"""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from backend.app.core.rate_limiter import rate_limit
from backend.app.creator.models import (
    CreateEventRequest,
    CreatorAnalytics,
    CreatorCopilotRequest,
    CreatorCopilotResponse,
    CreatorEvent,
    CreatorProfile,
    UpdateCreatorProfileRequest,
    VerificationApplication,
    VerificationApplyRequest,
)
from backend.app.creator.service import CreatorService
from backend.app.identity.dependencies import get_current_user, get_optional_current_user

router = APIRouter(prefix="/api/v1/creator", tags=["Creator Platform"])


@router.get(
    "/profile",
    response_model=CreatorProfile,
    summary="Get current user's creator profile",
)
async def get_creator_profile(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CreatorProfile:
    """Retrieve creator profile with live reel stats, views, and verification status."""
    return await CreatorService.get_or_create_profile(user_id=current_user["user_id"])


@router.put(
    "/profile",
    response_model=CreatorProfile,
    summary="Update creator profile information",
)
async def update_creator_profile(
    request: UpdateCreatorProfileRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CreatorProfile:
    """Update creator bio, niche, or external social media links."""
    return await CreatorService.update_profile(user_id=current_user["user_id"], request=request)


@router.post(
    "/verify/apply",
    response_model=VerificationApplication,
    status_code=status.HTTP_201_CREATED,
    summary="Apply for official creator verification badge",
)
async def apply_for_verification(
    request: VerificationApplyRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> VerificationApplication:
    """Submit a creator verification badge application with portfolio references."""
    return await CreatorService.apply_verification(user_id=current_user["user_id"], request=request)


@router.get(
    "/analytics",
    response_model=CreatorAnalytics,
    summary="Get creator audience metrics and insights",
)
async def get_creator_analytics(
    days: int = Query(30, ge=7, le=90, description="Timeframe in days"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CreatorAnalytics:
    """Aggregate impressions, completion rates, watch time, and audience mood affinities."""
    return await CreatorService.get_analytics(user_id=current_user["user_id"], period_days=days)


@router.post(
    "/copilot",
    response_model=CreatorCopilotResponse,
    dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))],
    summary="Generate AI hooks and viral strategy with Creator Copilot",
)
async def get_copilot_insights(
    request: CreatorCopilotRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CreatorCopilotResponse:
    """AI-powered content strategist: suggests high-retention hooks, viral score, and peak posting times."""
    return await CreatorService.generate_copilot_insights(
        user_id=current_user["user_id"], request=request
    )


@router.get(
    "/events",
    response_model=list[CreatorEvent],
    summary="List upcoming creator community events",
)
async def list_creator_events(
    creator_id: str | None = Query(None, description="Optional creator filter"),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> list[CreatorEvent]:
    """List scheduled watch party and live community events."""
    return await CreatorService.list_events(creator_id=creator_id, limit=limit)


@router.post(
    "/events",
    response_model=CreatorEvent,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a creator watch party or community event",
)
async def schedule_creator_event(
    request: CreateEventRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CreatorEvent:
    """Schedule a live community event or Watch Together party."""
    return await CreatorService.create_event(user_id=current_user["user_id"], request=request)


@router.post(
    "/verify/{application_id}/review",
    response_model=VerificationApplication,
    summary="Review verification application (Admin/Moderator)",
)
async def review_verification_application(
    application_id: str,
    approve: bool = Query(..., description="True to approve, False to reject"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> VerificationApplication:
    """Admin review endpoint to grant or reject verified creator status."""
    return await CreatorService.review_verification(application_id=application_id, approved=approve)
