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
    status,
)
from fastapi.responses import FileResponse

from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.core.adapters.storage_local import LocalStorageAdapter
from backend.app.identity.dependencies import get_current_user
from backend.app.media.models import PresignedUploadRequest, PresignedUploadResponse
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

    public_url = await storage.upload_bytes(body, key)
    return {"status": "uploaded", "key": key, "public_url": public_url}


@router.get("/files/{file_path:path}")
async def serve_local_file(file_path: str):
    """Serve uploaded media files when running with local storage."""
    storage = get_storage_adapter()
    if not isinstance(storage, LocalStorageAdapter):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    full_path = storage._resolve_path(file_path)
    if not full_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileResponse(str(full_path))
