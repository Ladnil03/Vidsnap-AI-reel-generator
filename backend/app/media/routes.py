"""
Media API Routes.
Provides presigned upload target generation and local development media serving.
"""

import logging
from pathlib import PurePosixPath
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
from backend.app.core.config import settings
from backend.app.identity.dependencies import get_current_user
from backend.app.media.models import (
    PresignedUploadRequest,
    PresignedUploadResponse,
    PresignedVideoUploadRequest,
    PresignedVideoUploadResponse,
)
from backend.app.media.service import MediaService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/media", tags=["Media & Uploads"])

# Allowed extensions for direct upload
_ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
_ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
_ALLOWED_EXTENSIONS = _ALLOWED_IMAGE_EXTENSIONS | _ALLOWED_VIDEO_EXTENSIONS

# Allowed key prefixes (format string with {user_id} placeholder)
_ALLOWED_KEY_PREFIXES = ("uploads/{user_id}/", "videos/{user_id}/")


def _validate_upload_key(key: str, user_id: str) -> None:
    """
    Validate that a storage key is safe and owned by the requesting user.

    Rejects:
    - Path traversal components (..)
    - Backslashes
    - Absolute paths
    - Keys not under the user's allowed prefixes
    - Disallowed file extensions
    """
    # Reject backslashes and absolute paths
    if "\\" in key or key.startswith("/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid storage key: backslashes and absolute paths are not allowed.",
        )

    # Reject path traversal
    if ".." in key.split("/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid storage key: path traversal is not allowed.",
        )

    # Check key starts with an allowed per-user prefix
    allowed = any(
        key.startswith(prefix.format(user_id=user_id))
        for prefix in _ALLOWED_KEY_PREFIXES
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: you can only upload to your own storage prefix.",
        )

    # Check extension allow-list
    ext = PurePosixPath(key).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed: {sorted(_ALLOWED_EXTENSIONS)}",
        )


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
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Direct upload endpoint for local development (when STORAGE_PROVIDER=local).
    Streams the request body with a size cap and writes to local storage.
    Requires authentication and validates key ownership.
    Disabled in production.
    """
    # Guard: disabled in production
    if settings.environment == "production":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct upload endpoint is disabled in production.",
        )

    storage = get_storage_adapter()
    if not isinstance(storage, LocalStorageAdapter):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct upload endpoint is only active when using local storage.",
        )

    user_id = current_user["user_id"]

    # Validate the key is safe and owned by this user
    _validate_upload_key(key, user_id)

    # Determine max size based on file type
    ext = PurePosixPath(key).suffix.lower()
    if ext in _ALLOWED_VIDEO_EXTENSIONS:
        max_bytes = settings.max_video_size_bytes
    else:
        max_bytes = settings.max_image_size_bytes

    # Stream the body with a size cap (avoid reading unbounded data into memory)
    chunks: list[bytes] = []
    total = 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Upload exceeds maximum allowed size of {max_bytes} bytes.",
            )
        chunks.append(chunk)
    body = b"".join(chunks)

    # Validate content (magic bytes / image integrity)
    if ext in _ALLOWED_IMAGE_EXTENSIONS:
        MediaService.validate_image_bytes(body, PurePosixPath(key).name)
    elif ext in _ALLOWED_VIDEO_EXTENSIONS:
        MediaService.validate_video_bytes(body, PurePosixPath(key).name)

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

