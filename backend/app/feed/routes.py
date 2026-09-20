"""
Universal Feed HTTP API Routes.
Exposes multi-tab video streams and cross-device watch progress endpoints.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status

from backend.app.feed.models import FeedResponse, FeedTab, WatchProgressRequest, WatchProgressResponse
from backend.app.feed.service import FeedService
from backend.app.identity.dependencies import get_current_user, get_optional_current_user

router = APIRouter(prefix="/api/v1/feed", tags=["Universal Feed"])


def get_feed_service() -> FeedService:
    return FeedService()


@router.get("", response_model=FeedResponse)
async def get_universal_feed(
    current_user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)],
    service: Annotated[FeedService, Depends(get_feed_service)],
    tab: FeedTab = FeedTab.TRENDING,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> FeedResponse:
    """
    Retrieve curated video streams for a specific feed tab:
    Trending (time-decayed popularity), Following, Friends, Communities,
    Continue Watching, or Saved.
    """
    user_id = current_user["user_id"] if current_user else None
    return await service.get_feed(
        tab=tab,
        user_id=user_id,
        cursor=cursor,
        limit=limit,
    )


@router.post("/watch-progress", response_model=WatchProgressResponse, status_code=status.HTTP_200_OK)
async def record_watch_progress(
    req: WatchProgressRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[FeedService, Depends(get_feed_service)],
) -> WatchProgressResponse:
    """Record video playback position to sync progress across mobile, tablet, and desktop."""
    return await service.record_watch_progress(user_id=current_user["user_id"], req=req)


@router.get("/watch-progress/{video_id}", response_model=WatchProgressResponse | None)
async def get_watch_progress(
    video_id: str,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[FeedService, Depends(get_feed_service)],
) -> WatchProgressResponse | None:
    return await service.get_watch_progress(user_id=current_user["user_id"], video_id=video_id)
