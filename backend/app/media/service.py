"""
Media Domain Service.
Validates uploaded files with Pillow / magic bytes and generates presigned URLs.
"""

import io
import logging
import os
import uuid
from typing import Any

from fastapi import HTTPException, status
from PIL import Image

from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Max pixel count guard (prevents decompression bomb attacks)
MAX_PIXELS = 1920 * 1080 * 4  # ~8.3 megapixels
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


class MediaService:
    """Service handling asset validation and storage orchestration."""

    @staticmethod
    def validate_image_bytes(data: bytes, filename: str) -> None:
        """
        Validate image integrity using Pillow.
        Verifies magic bytes, valid image headers, and checks decompression bomb bounds.
        """
        if len(data) > settings.max_image_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{filename}' exceeds the maximum allowed size of {settings.max_image_size_mb} MB.",
            )

        try:
            with Image.open(io.BytesIO(data)) as img:
                img.verify()
                if img.format not in ALLOWED_IMAGE_FORMATS:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"'{filename}' has unsupported format '{img.format}'. Allowed: JPEG, PNG, WEBP.",
                    )

            # Re-open to check dimensions (verify() invalidates image state)
            with Image.open(io.BytesIO(data)) as img:
                width, height = img.size
                if width * height > MAX_PIXELS:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"'{filename}' exceeds max resolution of 8 megapixels.",
                    )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Corrupt or invalid image uploaded (%s): %s", filename, e)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' is not a valid or readable image.",
            ) from e

    @staticmethod
    def validate_video_bytes(data: bytes, filename: str) -> None:
        """
        Validate video file size and container format signatures.
        Ensures files do not exceed the 50MB free-tier cap and match supported video container types.
        """
        if len(data) < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{filename}' is too small to be a valid video.",
            )

        if len(data) > settings.max_video_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{filename}' exceeds the maximum allowed video size of {settings.max_video_size_mb} MB.",
            )

        _, ext = os.path.splitext(filename)
        ext = ext.lower()
        if ext not in {".mp4", ".webm", ".mov", ".mkv"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported video format '{ext}'. Allowed: .mp4, .webm, .mov, .mkv",
            )

        # Container signature verification
        is_mp4_mov = len(data) >= 12 and (b"ftyp" in data[:16] or b"moov" in data[:32] or b"mdat" in data[:32])
        is_webm = data[:4] == b"\x1a\x45\xdf\xa3"
        is_avi = len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"AVI "

        if not (is_mp4_mov or is_webm or is_avi):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{filename}' has an invalid or corrupted video container header.",
            )

    @staticmethod
    async def check_user_storage_quota(user_id: str, new_bytes: int) -> None:
        """
        Enforce 500MB per-user free tier storage quota.
        Raises 400 Bad Request if user exceeds their quota.
        """
        from backend.app.core.database import get_db
        db = get_db()

        # Aggregate user's current uploaded assets
        pipeline = [
            {"$match": {"user_id": user_id, "deleted": {"$ne": True}}},
            {"$group": {"_id": None, "total_bytes": {"$sum": "$size_bytes"}}},
        ]
        res = await db.assets.aggregate(pipeline).to_list(1)
        current_bytes = res[0]["total_bytes"] if res else 0

        if current_bytes + new_bytes > settings.user_storage_quota_bytes:
            used_mb = round(current_bytes / (1024 * 1024), 1)
            quota_mb = settings.user_storage_quota_mb
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Storage quota exceeded: You are using {used_mb}MB of your {quota_mb}MB free-tier storage. "
                    "Please delete older reels to free up space."
                ),
            )

    @staticmethod
    async def record_asset(user_id: str, key: str, size_bytes: int, asset_type: str) -> None:
        """Track asset in the storage catalog for quota calculation and retention."""
        from datetime import datetime, timezone

        from backend.app.core.database import get_db
        db = get_db()
        await db.assets.update_one(
            {"key": key},
            {
                "$set": {
                    "user_id": user_id,
                    "key": key,
                    "size_bytes": size_bytes,
                    "asset_type": asset_type,
                    "created_at": datetime.now(timezone.utc),
                    "deleted": False,
                }
            },
            upsert=True,
        )

    @staticmethod
    async def create_upload_target(
        user_id: str,
        filename: str,
        content_type: str,
    ) -> dict[str, str]:
        """Generate a presigned upload URL directly to storage."""
        storage = get_storage_adapter()
        _, ext = os.path.splitext(filename)
        safe_ext = ext.lower() if ext else ".jpg"
        unique_id = uuid.uuid4().hex[:12]
        key = f"uploads/{user_id}/{unique_id}{safe_ext}"

        presigned = await storage.generate_presigned_upload_url(
            key=key,
            content_type=content_type,
            expires_in=3600,
        )
        presigned["public_url"] = storage.get_public_url(key)
        return presigned

    @staticmethod
    async def create_video_upload_target(
        user_id: str,
        filename: str,
        content_type: str,
        size_bytes: int,
    ) -> dict[str, Any]:
        """
        Generate a presigned upload URL for a native video.
        Validates video extension, maximum size limit (50MB), and checks user storage quota.
        """
        _, ext = os.path.splitext(filename)
        safe_ext = ext.lower()
        if safe_ext not in {".mp4", ".webm", ".mov"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported video format '{safe_ext}'. Allowed: .mp4, .webm, .mov",
            )

        if size_bytes > settings.max_video_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{filename}' exceeds the maximum allowed video size of {settings.max_video_size_mb} MB.",
            )

        # Enforce storage quota before issuing presigned upload ticket
        await MediaService.check_user_storage_quota(user_id, size_bytes)

        storage = get_storage_adapter()
        unique_id = uuid.uuid4().hex[:12]
        key = f"videos/{user_id}/{unique_id}{safe_ext}"

        presigned = await storage.generate_presigned_upload_url(
            key=key,
            content_type=content_type,
            expires_in=3600,
        )
        presigned["public_url"] = storage.get_public_url(key)
        presigned["content_type"] = content_type
        presigned["max_size_bytes"] = settings.max_video_size_bytes
        return presigned

