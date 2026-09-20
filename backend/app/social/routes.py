"""
Social Graph and Community HTTP API Routes.
Exposes endpoints for follows, mutual friends, community creation & membership,
and public creator profiles.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status

from backend.app.identity.dependencies import get_current_user, get_optional_current_user
from backend.app.social.models import (
    CommunityCategory,
    CommunityCreateRequest,
    CommunityListResponse,
    CommunityResponse,
    FollowersListResponse,
    FollowingListResponse,
    FollowStatusResponse,
    FriendsListResponse,
    UserProfileResponse,
)
from backend.app.social.service import SocialService

router = APIRouter(prefix="/api/v1/social", tags=["Social Graph"])


def get_social_service() -> SocialService:
    return SocialService()


@router.post("/follow/{user_id}", response_model=FollowStatusResponse, status_code=status.HTTP_200_OK)
async def follow_user(
    user_id: str,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
) -> FollowStatusResponse:
    """Follow a user or creator. If mutual, status updates to friends."""
    return await service.follow_user(follower_id=current_user["user_id"], target_user_id=user_id)


@router.delete("/follow/{user_id}", response_model=FollowStatusResponse, status_code=status.HTTP_200_OK)
async def unfollow_user(
    user_id: str,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
) -> FollowStatusResponse:
    """Unfollow a previously followed user or creator."""
    return await service.unfollow_user(follower_id=current_user["user_id"], target_user_id=user_id)


@router.get("/follow-status/{user_id}", response_model=FollowStatusResponse)
async def get_follow_status(
    user_id: str,
    current_user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
) -> FollowStatusResponse:
    """Check follow and friendship status between current viewer and target."""
    current_user_id = current_user["user_id"] if current_user else None
    return await service.get_follow_status(current_user_id=current_user_id, target_user_id=user_id)


@router.get("/followers/{user_id}", response_model=FollowersListResponse)
async def get_followers(
    user_id: str,
    current_user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> FollowersListResponse:
    """List followers for a user or creator."""
    current_user_id = current_user["user_id"] if current_user else None
    return await service.get_followers(target_user_id=user_id, current_user_id=current_user_id, limit=limit)


@router.get("/following/{user_id}", response_model=FollowingListResponse)
async def get_following(
    user_id: str,
    current_user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> FollowingListResponse:
    """List creators and accounts followed by a user."""
    current_user_id = current_user["user_id"] if current_user else None
    return await service.get_following(user_id=user_id, current_user_id=current_user_id, limit=limit)


@router.get("/friends", response_model=FriendsListResponse)
async def get_friends(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> FriendsListResponse:
    """List mutual friends (users who follow each other)."""
    return await service.get_friends(user_id=current_user["user_id"], limit=limit)


@router.get("/profile/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str,
    current_user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
) -> UserProfileResponse:
    """Retrieve full public creator profile with social stats and communities."""
    current_user_id = current_user["user_id"] if current_user else None
    return await service.get_user_profile(target_user_id=user_id, current_user_id=current_user_id)


# ------------------------------------------------------------------------------
# Community Endpoints
# ------------------------------------------------------------------------------


@router.post("/communities", response_model=CommunityResponse, status_code=status.HTTP_201_CREATED)
async def create_community(
    req: CommunityCreateRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
) -> CommunityResponse:
    """Create a new community and become admin."""
    return await service.create_community(creator_id=current_user["user_id"], req=req)


@router.get("/communities", response_model=CommunityListResponse)
async def list_communities(
    current_user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
    category: CommunityCategory | None = None,
    q: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
) -> CommunityListResponse:
    """Discover public communities with optional category and search filter."""
    current_user_id = current_user["user_id"] if current_user else None
    return await service.list_communities(category=category, query=q, user_id=current_user_id, limit=limit)


@router.post("/communities/{community_id}/join", response_model=CommunityResponse)
async def join_community(
    community_id: str,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
) -> CommunityResponse:
    """Join an interest community."""
    return await service.join_community(user_id=current_user["user_id"], community_id=community_id)


@router.post("/communities/{community_id}/leave", response_model=CommunityResponse)
async def leave_community(
    community_id: str,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[SocialService, Depends(get_social_service)],
) -> CommunityResponse:
    """Leave an interest community."""
    return await service.leave_community(user_id=current_user["user_id"], community_id=community_id)
