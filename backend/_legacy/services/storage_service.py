"""
Cloudinary storage service.

Handles uploading the final MP4 reel to Cloudinary and
returning the public URL. Also handles deletion.
This module has no FastAPI imports — it is pure service logic.
"""

import asyncio
import logging
from pathlib import Path

import cloudinary
import cloudinary.uploader

from backend.config import settings

logger = logging.getLogger(__name__)

# Configure Cloudinary at module level
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


async def upload_reel(
    video_path: Path,
    job_id: str,
) -> tuple[str, str]:
    """
    Upload an MP4 file to Cloudinary.

    Uploads the video to the configured Cloudinary folder using
    the job_id as the public_id so each reel has a predictable
    identifier for later deletion.

    Args:
        video_path: Absolute path to the MP4 file to upload.
        job_id: UUID of the job — used as the Cloudinary public_id.

    Returns:
        Tuple of (secure_url, public_id):
        - secure_url: HTTPS URL to stream or download the reel.
        - public_id: Cloudinary identifier needed for deletion.

    Raises:
        RuntimeError: If the Cloudinary upload fails.
    """
    logger.info("[Storage] Uploading reel for job %s...", job_id)

    try:
        import asyncio
        result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            str(video_path),
            resource_type="video",
            folder=settings.cloudinary_folder,
            public_id=job_id,
            overwrite=True,
        )

        secure_url: str = result["secure_url"]
        public_id: str = result["public_id"]

        logger.info("[Storage] Upload complete — %s", secure_url)
        return (secure_url, public_id)

    except Exception as error:
        logger.error("[Storage] Upload failed: %s", error)
        raise RuntimeError(f"Cloudinary upload failed: {error}") from error


async def delete_reel(cloudinary_id: str) -> None:
    """
    Delete a reel from Cloudinary by its public_id.

    Args:
        cloudinary_id: The Cloudinary public_id returned during upload.

    Raises:
        RuntimeError: If the deletion fails.
    """
    logger.info("[Storage] Deleting reel %s from Cloudinary...", cloudinary_id)

    try:
        import asyncio
        await asyncio.to_thread(
            cloudinary.uploader.destroy,
            cloudinary_id,
            resource_type="video",
        )

        logger.info("[Storage] Reel %s deleted from Cloudinary", cloudinary_id)

    except Exception as error:
        logger.error("[Storage] Deletion failed: %s", error)
        raise RuntimeError(f"Cloudinary deletion failed: {error}") from error
