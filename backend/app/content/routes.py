"""
Content API Routes (/api/v1/content).
Endpoints for video posts, native uploads, drafts, scheduling, comments, and engagement.
"""

import os
from typing import Annotated, Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Query,
    UploadFile,
    status,
)

from backend.app.content.ai_helpers import generate_hashtags_and_hook
from backend.app.content.models import (
    CommentCreateRequest,
    CommentResponse,
    ContentVisibility,
    CreateVideoRequest,
    HashtagSuggestionRequest,
    HashtagSuggestionResponse,
    LikeResponse,
    SaveResponse,
    UpdateVideoRequest,
    VideoResponse,
)
from backend.app.content.service import ContentService
from backend.app.core.adapters.factory import get_queue_adapter, get_storage_adapter
from backend.app.core.rate_limiter import rate_limit
from backend.app.identity.dependencies import get_current_user, get_optional_current_user
from backend.app.media.service import MediaService

router = APIRouter(prefix="/api/v1/content", tags=["Content & Video Platform"])


@router.post(
    "/videos",
    response_model=VideoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))],
)
async def create_video(
    request: CreateVideoRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> VideoResponse:
    """Create a new video post or save a draft using pre-uploaded storage keys."""
    return await ContentService.create_video(
        user_id=current_user["user_id"],
        author_name=current_user.get("name", "Creator"),
        request=request,
    )


@router.post(
    "/videos/upload",
    response_model=VideoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)
async def upload_native_video(
    title: Annotated[str, Form(min_length=1, max_length=150)],
    video: Annotated[UploadFile, File()],
    description: Annotated[str, Form(max_length=2000)] = "",
    hashtags: Annotated[str, Form()] = "",
    visibility: Annotated[str, Form()] = ContentVisibility.PUBLIC.value,
    is_draft: Annotated[bool, Form()] = False,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> VideoResponse:
    """
    Direct multipart native video upload endpoint.
    Validates container headers and size cap, enforces storage quota,
    saves asset, and registers video post.
    """
    content = await video.read()
    MediaService.validate_video_bytes(content, video.filename or "video.mp4")

    # Enforce 500MB storage quota
    await MediaService.check_user_storage_quota(current_user["user_id"], len(content))

    storage = get_storage_adapter()
    _, ext = os.path.splitext(video.filename or "")
    safe_ext = ext.lower() if ext else ".mp4"
    video_key = f"videos/{current_user['user_id']}/{os.urandom(8).hex()}{safe_ext}"

    # Upload to storage
    await storage.upload_bytes(content, video_key, video.content_type or "video/mp4")
    await MediaService.record_asset(
        user_id=current_user["user_id"],
        key=video_key,
        size_bytes=len(content),
        asset_type="native_video",
    )

    parsed_tags = [t.strip() for t in hashtags.split(",") if t.strip()] if hashtags else []

    create_req = CreateVideoRequest(
        title=title,
        description=description,
        hashtags=parsed_tags,
        visibility=ContentVisibility(visibility),
        video_key=video_key,
        is_draft=is_draft,
    )

    video_resp = await ContentService.create_video(
        user_id=current_user["user_id"],
        author_name=current_user.get("name", "Creator"),
        request=create_req,
    )

    # Enqueue background transcode & thumbnail generation via ARQ
    queue = get_queue_adapter()
    await queue.enqueue(
        "process_native_video_job",
        video_id=video_resp.video_id,
        user_id=current_user["user_id"],
        video_key=video_key,
    )

    return video_resp


@router.get(
    "/videos",
    response_model=list[VideoResponse],
)
async def list_videos(
    user_id: str | None = Query(None, description="Filter by creator ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> list[VideoResponse]:
    """Retrieve public discovery feed or specific user's videos."""
    curr_id = current_user["user_id"] if current_user else None
    return await ContentService.list_videos(
        user_id=user_id,
        current_user_id=curr_id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/me/drafts",
    response_model=list[VideoResponse],
)
async def list_my_drafts(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[VideoResponse]:
    """List all saved drafts for the logged-in user."""
    return await ContentService.list_user_drafts(user_id=current_user["user_id"])


@router.get(
    "/videos/{video_id}",
    response_model=VideoResponse,
)
async def get_video(
    video_id: str,
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> VideoResponse:
    """Get single video details and engagement flags."""
    curr_id = current_user["user_id"] if current_user else None
    return await ContentService.get_video(video_id=video_id, current_user_id=curr_id)


@router.patch(
    "/videos/{video_id}",
    response_model=VideoResponse,
)
async def update_video(
    video_id: str,
    request: UpdateVideoRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> VideoResponse:
    """Update title, description, visibility, or scheduling of a video."""
    is_admin = "admin" in current_user.get("roles", [])
    return await ContentService.update_video(
        user_id=current_user["user_id"],
        video_id=video_id,
        request=request,
        is_admin=is_admin,
    )


@router.delete(
    "/videos/{video_id}",
    response_model=dict[str, Any],
)
async def delete_video(
    video_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Soft-delete a video entity."""
    is_admin = "admin" in current_user.get("roles", [])
    await ContentService.delete_video(
        user_id=current_user["user_id"],
        video_id=video_id,
        is_admin=is_admin,
    )
    return {"deleted": True, "video_id": video_id}


@router.post(
    "/videos/{video_id}/like",
    response_model=LikeResponse,
)
async def like_video(
    video_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> LikeResponse:
    """Toggle like on a video."""
    return await ContentService.toggle_like(user_id=current_user["user_id"], video_id=video_id)


@router.delete(
    "/videos/{video_id}/like",
    response_model=LikeResponse,
)
async def unlike_video(
    video_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> LikeResponse:
    """Unlike a video."""
    return await ContentService.toggle_like(user_id=current_user["user_id"], video_id=video_id)


@router.post(
    "/videos/{video_id}/save",
    response_model=SaveResponse,
)
async def save_video(
    video_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SaveResponse:
    """Toggle bookmark/save on a video."""
    return await ContentService.toggle_save(user_id=current_user["user_id"], video_id=video_id)


@router.delete(
    "/videos/{video_id}/save",
    response_model=SaveResponse,
)
async def unsave_video(
    video_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SaveResponse:
    """Unsave a video."""
    return await ContentService.toggle_save(user_id=current_user["user_id"], video_id=video_id)


@router.post(
    "/videos/{video_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=15, window_seconds=60))],
)
async def add_comment(
    video_id: str,
    request: CommentCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CommentResponse:
    """Add a comment to a video."""
    return await ContentService.add_comment(
        user_id=current_user["user_id"],
        user_name=current_user.get("name", "User"),
        video_id=video_id,
        text=request.text,
    )


@router.get(
    "/videos/{video_id}/comments",
    response_model=list[CommentResponse],
)
async def list_comments(
    video_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> list[CommentResponse]:
    """List comments for a video."""
    return await ContentService.list_comments(video_id=video_id, skip=skip, limit=limit)


@router.post(
    "/ai/suggest-tags",
    response_model=HashtagSuggestionResponse,
)
async def suggest_tags(
    request: HashtagSuggestionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> HashtagSuggestionResponse:
    """AI Assistant: Suggest viral hashtags and engagement hooks."""
    result = await generate_hashtags_and_hook(title=request.title, transcript=request.transcript)
    return HashtagSuggestionResponse(
        hashtags=result["hashtags"],
        suggested_hook=result["suggested_hook"],
    )
