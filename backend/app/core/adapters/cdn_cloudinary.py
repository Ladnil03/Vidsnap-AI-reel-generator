"""
Cloudinary CDN Adapter.
Integrates with Cloudinary's multi-CDN edge delivery network (Akamai, Fastly, CloudFront),
supporting automatic codec/format optimization (f_auto, q_auto), edge invalidation, and caching headers.
Activated when cdn_provider="cloudinary".
"""

import asyncio
import logging
import re
from pathlib import Path

import cloudinary
import cloudinary.uploader
import cloudinary.utils

from backend.app.core.config import settings
from backend.app.core.ports.cdn import CDNPort

logger = logging.getLogger(__name__)


class CloudinaryCDNAdapter(CDNPort):
    """CDN adapter leveraging Cloudinary's multi-CDN global edge network."""

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
            "CloudinaryCDNAdapter initialized (cloud_name=%s, folder=%s)",
            self.cloud_name,
            self.folder,
        )

    def _extract_public_id_from_url(self, url: str) -> tuple[str, str]:
        """
        Extract (public_id, resource_type) from a Cloudinary URL or clean key.
        Handles URLs like https://res.cloudinary.com/vidsnap/video/upload/v1/folder/id.mp4
        """
        if "/upload/" in url:
            # Parse Cloudinary URL: split after /upload/ (skip transformations/versions)
            parts = url.split("/upload/", 1)[1]
            # Strip version e.g. v12345/ if present
            parts = re.sub(r"^([a-z0-9_,:]+/)?v\d+/", "", parts)
            path_obj = Path(parts)
            public_id = str(path_obj.with_suffix("")).replace("\\", "/")
            resource_type = "video" if "/video/" in url else ("image" if "/image/" in url else "auto")
            return public_id, resource_type

        # It's a storage key
        clean_key = url.lstrip("/")
        path_obj = Path(clean_key)
        ext = path_obj.suffix.lower()
        public_id = str(path_obj.with_suffix("")).replace("\\", "/")
        if self.folder and not public_id.startswith(f"{self.folder}/"):
            public_id = f"{self.folder}/{public_id}"
        if ext in {".mp4", ".webm", ".mov"}:
            resource_type = "video"
        elif ext in {".jpg", ".jpeg", ".png", ".webp"}:
            resource_type = "image"
        else:
            resource_type = "auto"
        return public_id, resource_type

    async def purge_url(self, url: str) -> bool:
        """
        Purge a specific URL from Cloudinary's global edge CDN cache.
        Calls Cloudinary explicit invalidation API across Akamai, Fastly, and CloudFront PoPs.
        """
        if not self.api_key or not self.api_secret:
            logger.debug("Cloudinary purge skipped (credentials not configured) for: %s", url)
            return True

        try:
            public_id, resource_type = self._extract_public_id_from_url(url)
            actual_type = resource_type if resource_type in ("video", "image") else "image"

            result = await asyncio.to_thread(
                cloudinary.uploader.explicit,
                public_id,
                type="upload",
                resource_type=actual_type,
                invalidate=True,
            )
            logger.info(
                "Cloudinary edge cache invalidated for public_id: %s (status=%s)",
                public_id,
                result.get("status"),
            )
            return True
        except Exception as e:
            logger.error("Cloudinary cache purge failed for '%s': %s", url, e)
            return False

    def get_edge_url(self, key: str) -> str:
        """
        Derive CDN-optimized delivery URL with automatic format and quality adaptation (f_auto, q_auto).
        Cloudinary delivers the optimal container/codec (e.g., AV1/VP9/WebM) and perceptual compression
        based on client browser capabilities.
        """
        clean_key = key.lstrip("/")
        path_obj = Path(clean_key)
        ext = path_obj.suffix.lstrip(".")
        public_id = str(path_obj.with_suffix("")).replace("\\", "/")
        if self.folder and not public_id.startswith(f"{self.folder}/"):
            public_id = f"{self.folder}/{public_id}"

        if ext in ("mp4", "webm", "mov"):
            res_type = "video"
        elif ext in ("jpg", "jpeg", "png", "webp"):
            res_type = "image"
        else:
            res_type = "auto"
        actual_type = res_type if res_type in ("video", "image") else "video"

        url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            cloud_name=self.cloud_name,
            resource_type=actual_type,
            format=ext or None,
            fetch_format="auto",
            quality="auto",
            secure=True,
        )
        return url

    def get_cache_headers(self, asset_type: str = "media") -> dict[str, str]:
        """Return recommended cache headers for Cloudinary edge delivery."""
        if asset_type == "media":
            return {
                "Cache-Control": f"public, max-age={settings.cache_max_age_media}, stale-while-revalidate=3600",
                "CDN-Cache-Control": f"max-age={settings.cache_max_age_media}",
            }
        if asset_type == "static":
            return {
                "Cache-Control": "public, max-age=31536000, immutable",
                "CDN-Cache-Control": "max-age=31536000",
            }
        return {
            "Cache-Control": f"private, max-age={settings.cache_max_age_api}, stale-while-revalidate=30",
        }
