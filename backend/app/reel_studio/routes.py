"""
Reel Studio API Routes (/api/v1/reel-studio & backward-compatible aliases).
"""

import logging
import os
from typing import Annotated, Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.core.config import settings
from backend.app.core.rate_limiter import rate_limit_per_user
from backend.app.identity.dependencies import get_current_user
from backend.app.media.service import MediaService
from backend.app.reel_studio.models import (
    CreateJobRequest,
    DeleteReelResponse,
    JobCreatedResponse,
    JobStatusResponse,
    ReelItem,
    VoiceChoice,
)
from backend.app.reel_studio.service import ReelStudioService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Reel Studio"])

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB per image cap
CHUNK_SIZE = 64 * 1024  # 64 KB streaming chunk


@router.post(
    "/api/v1/reel-studio/jobs",
    response_model=JobCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_per_user(max_requests=10, window_seconds=60))],
)
async def create_job_from_keys(
    request: CreateJobRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> JobCreatedResponse:
    """Create a reel generation job using pre-uploaded storage keys with idempotency support."""
    return await ReelStudioService.create_reel_job(
        request=request,
        user_id=current_user["user_id"],
        idempotency_key=idempotency_key,
    )


@router.post(
    "/api/v1/reel-studio/jobs/upload",
    response_model=JobCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_per_user(max_requests=10, window_seconds=60))],
)
async def create_job_multipart(
    voiceover_text: Annotated[str, Form(min_length=5, max_length=900)],
    images: Annotated[list[UploadFile], File()],
    voice: Annotated[str, Form()] = VoiceChoice.NATURAL_US.value,
    duration: Annotated[int, Form(ge=1, le=10)] = 3,
    current_user: dict[str, Any] = Depends(get_current_user),
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> JobCreatedResponse:
    """
    Multipart upload endpoint for backwards-compatible job creation.
    Streams images in bounded chunks, validates images with Pillow, saves to StoragePort,
    and guarantees immediate cleanup of orphaned storage objects if quota/validation fails.
    """
    if len(images) < 1 or len(images) > settings.max_images_per_job:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Please upload between 1 and {settings.max_images_per_job} images.",
        )

    storage = get_storage_adapter()
    image_keys: list[str] = []
    user_id = current_user["user_id"]

    try:
        for idx, img in enumerate(images):
            # Stream in chunks with size limit to prevent memory exhaustion
            file_buffer = bytearray()
            while chunk := await img.read(CHUNK_SIZE):
                file_buffer.extend(chunk)
                if len(file_buffer) > MAX_IMAGE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail=f"Image '{img.filename or idx}' exceeds maximum size of 10MB.",
                    )

            content = bytes(file_buffer)
            MediaService.validate_image_bytes(content, img.filename or f"image_{idx}.jpg")

            _, ext = os.path.splitext(img.filename or "")
            safe_ext = ext.lower() if ext else ".jpg"
            key = f"uploads/{user_id}/job_direct_{idx}_{os.urandom(4).hex()}{safe_ext}"

            await storage.upload_bytes(content, key, img.content_type or "image/jpeg")
            image_keys.append(key)

        req = CreateJobRequest(
            voiceover_text=voiceover_text,
            image_keys=image_keys,
            voice=voice,
            duration=duration,
        )
        return await ReelStudioService.create_reel_job(
            request=req,
            user_id=user_id,
            idempotency_key=idempotency_key,
        )
    except Exception:
        # Clean up any orphaned uploaded files if quota, validation, or dispatch fails
        for orphaned_key in image_keys:
            try:
                await storage.delete_file(orphaned_key)
            except Exception as cleanup_err:
                logger.warning("Failed to clean up orphaned image %s: %s", orphaned_key, cleanup_err)
        raise


@router.get(
    "/api/v1/reel-studio/jobs/{job_id}",
    response_model=JobStatusResponse,
)
async def get_job_status(
    job_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> JobStatusResponse:
    """Poll the status and progress stage of a reel job."""
    is_admin = "admin" in current_user.get("roles", [])
    return await ReelStudioService.get_job_status(
        job_id=job_id,
        user_id=current_user["user_id"],
        is_admin=is_admin,
    )


@router.get(
    "/api/v1/reel-studio/reels",
    response_model=list[ReelItem],
)
async def get_user_reels(
    limit: int = Query(50, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[ReelItem]:
    """Retrieve all completed reels for the current user's gallery."""
    return await ReelStudioService.get_user_reels(
        user_id=current_user["user_id"],
        limit=limit,
    )


@router.delete(
    "/api/v1/reel-studio/reels/{job_id}",
    response_model=DeleteReelResponse,
)
async def delete_reel(
    job_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> DeleteReelResponse:
    """Soft-delete a reel from the gallery."""
    is_admin = "admin" in current_user.get("roles", [])
    await ReelStudioService.soft_delete_reel(
        job_id=job_id,
        user_id=current_user["user_id"],
        is_admin=is_admin,
    )
    return DeleteReelResponse(deleted=True, job_id=job_id)
