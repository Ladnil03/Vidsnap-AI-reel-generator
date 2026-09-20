"""
Cloudinary Storage Adapter.
Implements StoragePort for direct signed client uploads, server-side asset management,
and media delivery via Cloudinary's media processing and multi-CDN architecture.
"""

import asyncio
import io
import logging
import time
from pathlib import Path
from typing import Any

import cloudinary
import cloudinary.api
import cloudinary.uploader
import cloudinary.utils
import httpx

from backend.app.core.config import settings
from backend.app.core.ports.storage import StoragePort

logger = logging.getLogger(__name__)


class CloudinaryStorageAdapter(StoragePort):
    """Storage adapter backed by Cloudinary media cloud."""

    def __init__(self):
        self.cloud_name = settings.cloudinary_cloud_name or "vidsnap"
        self.api_key = settings.cloudinary_api_key or ""
        self.api_secret = settings.cloudinary_api_secret or ""
        self.folder = (settings.cloudinary_folder or "vidsnap-reels").strip("/")

        cloudinary.config(
            cloud_name=self.cloud_name,
            api_key=self.api_key,
            api_secret=self.api_secret,
            secure=True,
        )
        logger.info(
            "CloudinaryStorageAdapter initialized (cloud_name=%s, folder=%s)",
            self.cloud_name,
            self.folder,
        )

    def _get_resource_type(self, key: str, content_type: str = "") -> str:
        """Derive Cloudinary resource_type ('video', 'image', or 'auto') from content_type or file extension."""
        if content_type.startswith("video/"):
            return "video"
        if content_type.startswith("image/"):
            return "image"
        ext = Path(key).suffix.lower()
        if ext in {".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v"}:
            return "video"
        if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}:
            return "image"
        return "auto"

    def _key_to_public_id(self, key: str) -> str:
        """
        Derive consistent Cloudinary public_id from a storage key.
        Strips leading slashes and file extensions (Cloudinary manages format separately).
        Prefixes with configured folder if not already present.
        """
        clean_key = key.lstrip("/")
        path_obj = Path(clean_key)
        id_part = str(path_obj.with_suffix("")).replace("\\", "/")
        if self.folder and not id_part.startswith(f"{self.folder}/"):
            return f"{self.folder}/{id_part}"
        return id_part

    def get_public_url(self, key: str) -> str:
        """Derive standard HTTPS delivery URL for asset on Cloudinary CDN."""
        public_id = self._key_to_public_id(key)
        res_type = self._get_resource_type(key)
        ext = Path(key).suffix.lstrip(".") or ("mp4" if res_type == "video" else "jpg")
        actual_type = res_type if res_type in ("video", "image") else "video"

        url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            cloud_name=self.cloud_name,
            resource_type=actual_type,
            format=ext,
            secure=True,
        )
        return url

    async def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600,
    ) -> dict[str, Any]:
        """
        Generate signed parameters and direct upload endpoint for client-side POST upload to Cloudinary.
        Returns upload_url, key, method='POST', content_type, and signed form fields.
        """
        res_type = self._get_resource_type(key, content_type)
        upload_endpoint_type = res_type if res_type in ("video", "image") else "auto"
        upload_url = f"https://api.cloudinary.com/v1_1/{self.cloud_name}/{upload_endpoint_type}/upload"

        timestamp = int(time.time())
        public_id = self._key_to_public_id(key)

        params_to_sign = {
            "public_id": public_id,
            "timestamp": timestamp,
        }
        signature = cloudinary.utils.api_sign_request(params_to_sign, self.api_secret)

        fields = {
            "api_key": self.api_key,
            "timestamp": str(timestamp),
            "signature": signature,
            "public_id": public_id,
        }

        return {
            "upload_url": upload_url,
            "key": key,
            "method": "POST",
            "content_type": content_type,
            "fields": fields,
        }

    async def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 3600,
    ) -> str:
        """Generate a time-limited signed delivery URL for private/unlisted assets."""
        public_id = self._key_to_public_id(key)
        res_type = self._get_resource_type(key)
        ext = Path(key).suffix.lstrip(".") or ("mp4" if res_type == "video" else "jpg")
        actual_type = res_type if res_type in ("video", "image") else "video"
        expires_at = int(time.time()) + expires_in

        url = cloudinary.utils.private_download_url(
            public_id,
            format=ext,
            cloud_name=self.cloud_name,
            api_key=self.api_key,
            api_secret=self.api_secret,
            resource_type=actual_type,
            expires_at=expires_at,
        )
        return url

    async def upload_file(
        self,
        file_path: Path,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload a file from local disk to Cloudinary and return its public URL."""
        public_id = self._key_to_public_id(key)
        res_type = self._get_resource_type(key, content_type)
        actual_type = res_type if res_type in ("video", "image") else "auto"

        result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            str(file_path),
            public_id=public_id,
            resource_type=actual_type,
            overwrite=True,
            invalidate=True,
        )
        return result.get("secure_url") or self.get_public_url(key)

    async def upload_bytes(
        self,
        data: bytes,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload raw bytes to Cloudinary and return its public URL."""
        public_id = self._key_to_public_id(key)
        res_type = self._get_resource_type(key, content_type)
        actual_type = res_type if res_type in ("video", "image") else "auto"
        stream = io.BytesIO(data)

        result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            stream,
            public_id=public_id,
            resource_type=actual_type,
            overwrite=True,
            invalidate=True,
        )
        return result.get("secure_url") or self.get_public_url(key)

    async def download_file(
        self,
        key: str,
        destination_path: Path,
    ) -> Path:
        """Stream an object from Cloudinary CDN to a local disk destination."""
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        url = self.get_public_url(key)

        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("GET", url, follow_redirects=True) as response:
                response.raise_for_status()
                with open(destination_path, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        f.write(chunk)
        return destination_path

    async def delete_file(
        self,
        key: str,
    ) -> bool:
        """Delete an asset from Cloudinary. Returns True if deleted or absent."""
        try:
            public_id = self._key_to_public_id(key)
            res_type = self._get_resource_type(key)
            actual_type = res_type if res_type in ("video", "image") else "image"
            result = await asyncio.to_thread(
                cloudinary.uploader.destroy,
                public_id,
                resource_type=actual_type,
                invalidate=True,
            )
            return result.get("result") in ("ok", "not found")
        except Exception as e:
            logger.error("Cloudinary delete failed for key '%s': %s", key, e)
            return False

    async def get_cache_metadata(
        self,
        key: str,
    ) -> dict[str, str] | None:
        """Return ETag, content-type, and size from Cloudinary metadata."""
        # 1. First attempt lightweight HTTP HEAD on public CDN URL
        try:
            url = self.get_public_url(key)
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.head(url, follow_redirects=True)
                if resp.status_code == 200:
                    return {
                        "etag": resp.headers.get("etag", "").strip('"'),
                        "content_type": resp.headers.get("content-type", "application/octet-stream"),
                        "content_length": resp.headers.get("content-length", "0"),
                    }
        except Exception:
            pass

        # 2. Fallback to Cloudinary Admin API
        try:
            public_id = self._key_to_public_id(key)
            res_type = self._get_resource_type(key)
            admin_res_type = "video" if res_type == "video" else "image"
            data = await asyncio.to_thread(
                cloudinary.api.resource,
                public_id,
                resource_type=admin_res_type,
            )
            return {
                "etag": str(data.get("version", "")),
                "content_type": f"{admin_res_type}/{data.get('format', 'mp4')}",
                "content_length": str(data.get("bytes", 0)),
            }
        except Exception as e:
            logger.warning("Cloudinary get_cache_metadata failed for key '%s': %s", key, e)
            return None

    async def head_object(
        self,
        key: str,
    ) -> bool:
        """Check if an object exists in Cloudinary without downloading it."""
        try:
            url = self.get_public_url(key)
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.head(url, follow_redirects=True)
                if resp.status_code == 200:
                    return True
        except Exception:
            pass

        try:
            public_id = self._key_to_public_id(key)
            res_type = self._get_resource_type(key)
            admin_res_type = "video" if res_type == "video" else "image"
            await asyncio.to_thread(
                cloudinary.api.resource,
                public_id,
                resource_type=admin_res_type,
            )
            return True
        except Exception:
            return False
