"""
Local Filesystem Storage Adapter.
Provides full StoragePort implementation for local development, tests, and offline use.
"""

import hashlib
import logging
import os
import shutil
from pathlib import Path

import aiofiles
import aiofiles.os

from backend.app.core.config import settings
from backend.app.core.ports.storage import StoragePort

logger = logging.getLogger(__name__)


class LocalStorageAdapter(StoragePort):
    """Storage adapter backed by the local filesystem."""

    def __init__(self, base_dir: Path | None = None):
        self.base_dir = base_dir or settings.local_storage_path
        self.base_dir.mkdir(parents=True, exist_ok=True)
        logger.info("LocalStorageAdapter initialized at %s", self.base_dir.resolve())

    def _resolve_path(self, key: str) -> Path:
        """Sanitize and resolve key within base_dir."""
        # Clean path to prevent path traversal
        clean_key = os.path.normpath(key).lstrip("/\\")
        resolved = (self.base_dir / clean_key).resolve()
        if not resolved.is_relative_to(self.base_dir.resolve()):
            raise ValueError(f"Path traversal detected for key: {key}")
        return resolved

    async def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600,
    ) -> dict[str, str]:
        """
        For local storage, return a local upload URL pointing to the media upload endpoint.
        """
        upload_url = f"{settings.api_v1_prefix}/media/direct-upload?key={key}"
        return {
            "upload_url": upload_url,
            "key": key,
            "method": "PUT",
            "content_type": content_type,
        }

    async def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 3600,
    ) -> str:
        """For local storage, return the standard local file serving URL."""
        return self.get_public_url(key)

    async def upload_file(
        self,
        file_path: Path,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        dest_path = self._resolve_path(key)
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        await aiofiles.os.wrap(shutil.copyfile)(str(file_path), str(dest_path))
        return self.get_public_url(key)

    async def upload_bytes(
        self,
        data: bytes,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        dest_path = self._resolve_path(key)
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(dest_path, "wb") as f:
            await f.write(data)
        return self.get_public_url(key)

    async def download_file(
        self,
        key: str,
        destination_path: Path,
    ) -> Path:
        source_path = self._resolve_path(key)
        if not source_path.exists():
            raise FileNotFoundError(f"Storage key '{key}' not found locally at {source_path}")
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        await aiofiles.os.wrap(shutil.copyfile)(str(source_path), str(destination_path))
        return destination_path

    async def delete_file(
        self,
        key: str,
    ) -> bool:
        target_path = self._resolve_path(key)
        if target_path.exists():
            await aiofiles.os.remove(target_path)
            logger.info("Deleted local file for key: %s", key)
            return True
        return False

    def get_public_url(
        self,
        key: str,
    ) -> str:
        # In local development, files are served under /media_storage/
        clean_key = key.lstrip("/\\").replace("\\", "/")
        return f"{settings.api_v1_prefix}/media/files/{clean_key}"

    async def get_cache_metadata(
        self,
        key: str,
    ) -> dict[str, str] | None:
        """Return cache metadata from local file stat (mtime-based ETag)."""
        try:
            file_path = self._resolve_path(key)
            if not file_path.exists():
                return None
            stat = file_path.stat()
            # Generate weak ETag from file size + modification time
            etag_source = f"{stat.st_size}-{stat.st_mtime_ns}"
            etag = hashlib.md5(etag_source.encode()).hexdigest()  # noqa: S324
            # Derive content type from extension
            import mimetypes
            content_type, _ = mimetypes.guess_type(str(file_path))
            return {
                "etag": etag,
                "content_type": content_type or "application/octet-stream",
                "content_length": str(stat.st_size),
            }
        except (ValueError, OSError) as e:
            logger.warning("Local get_cache_metadata failed for key '%s': %s", key, e)
            return None

    async def head_object(
        self,
        key: str,
    ) -> bool:
        """Check if a file exists in local storage."""
        try:
            file_path = self._resolve_path(key)
            return file_path.is_file()
        except (ValueError, OSError):
            return False
