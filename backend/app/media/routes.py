"""
Media API Routes.
Provides presigned upload target generation and local development media serving.
"""

from pathlib import Path
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from fastapi.responses import FileResponse

from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.core.adapters.storage_local import LocalStorageAdapter
from backend.app.identity.dependencies import get_current_user
from backend.app.media.models import (
    PresignedUploadRequest,
    PresignedUploadResponse,
    PresignedVideoUploadRequest,
    PresignedVideoUploadResponse,
)
from backend.app.media.service import MediaService

router = APIRouter(prefix="/api/v1/media", tags=["Media & Uploads"])


@router.post("/upload-url", response_model=PresignedUploadResponse)
async def get_upload_url(
    request: PresignedUploadRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> PresignedUploadResponse:
    """Generate a pre-signed direct upload URL for client-side uploads."""
    target = await MediaService.create_upload_target(
        user_id=current_user["user_id"],
        filename=request.filename,
        content_type=request.content_type,
    )
    return PresignedUploadResponse(
        upload_url=target["upload_url"],
        key=target["key"],
        method=target.get("method", "PUT"),
        public_url=target["public_url"],
    )


@router.post("/upload-url/video", response_model=PresignedVideoUploadResponse)
async def get_video_upload_url(
    request: PresignedVideoUploadRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> PresignedVideoUploadResponse:
    """
    Generate a pre-signed direct upload URL specifically for video reels.
    Enforces format validation, 50MB file size ceiling, and free-tier user quota check.
    """
    target = await MediaService.create_video_upload_target(
        user_id=current_user["user_id"],
        filename=request.filename,
        content_type=request.content_type,
        size_bytes=request.size_bytes,
    )
    return PresignedVideoUploadResponse(
        upload_url=target["upload_url"],
        key=target["key"],
        method=target.get("method", "PUT"),
        public_url=target["public_url"],
        content_type=target["content_type"],
        max_size_bytes=target["max_size_bytes"],
    )


@router.put("/direct-upload")
async def local_direct_upload(
    request: Request,
    key: str = Query(..., description="Target storage key"),
) -> dict[str, Any]:
    """
    Direct upload endpoint for local development (when STORAGE_PROVIDER=local).
    Reads the raw request body stream and writes to local storage.
    """
    storage = get_storage_adapter()
    if not isinstance(storage, LocalStorageAdapter):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct upload endpoint is only active when using local storage.",
        )

    body = await request.body()
    # Validate image data if it's an image
    if key.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        MediaService.validate_image_bytes(body, Path(key).name)
    elif key.lower().endswith((".mp4", ".webm", ".mov")):
        MediaService.validate_video_bytes(body, Path(key).name)

    public_url = await storage.upload_bytes(body, key)
    return {"status": "uploaded", "key": key, "public_url": public_url}


@router.get("/files/{file_path:path}")
async def serve_local_file(request: Request, file_path: str):
    """
    Serve uploaded media files when running with local storage.
    Includes ETag calculation, Cache-Control headers, and 304 Not Modified validation.
    """
    storage = get_storage_adapter()
    if not isinstance(storage, LocalStorageAdapter):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    full_path = storage._resolve_path(file_path)
    if not full_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    cache_meta = await storage.get_cache_metadata(file_path)
    headers: dict[str, str] = {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    }
    if cache_meta and cache_meta.get("etag"):
        etag = f'"{cache_meta["etag"]}"'
        headers["ETag"] = etag

        if_none_match = request.headers.get("if-none-match", "").strip()
        if if_none_match:
            # Check for exact match or weak-match format
            stripped_inm = if_none_match.replace('W/', '').strip('"')
            raw_etag = cache_meta["etag"].strip('"')
            if stripped_inm == raw_etag:
                return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=headers)

    return FileResponse(str(full_path), headers=headers)

