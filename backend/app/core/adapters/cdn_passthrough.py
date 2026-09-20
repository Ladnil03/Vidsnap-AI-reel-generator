"""
Passthrough CDN Adapter.
No-op adapter for local development and offline environments.
Delegates URL construction to the storage adapter and returns default cache headers.
"""

import logging

from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.core.config import settings
from backend.app.core.ports.cdn import CDNPort

logger = logging.getLogger(__name__)


class PassthroughCDNAdapter(CDNPort):
    """CDN adapter that performs no-op caching — delegates to storage URLs directly."""

    async def purge_url(self, url: str) -> bool:
        """No-op: nothing to purge when there's no CDN layer."""
        logger.debug("Passthrough CDN purge (no-op) for URL: %s", url)
        return True

    def get_edge_url(self, key: str) -> str:
        """Delegate to storage adapter's public URL."""
        storage = get_storage_adapter()
        return storage.get_public_url(key)

    def get_cache_headers(self, asset_type: str = "media") -> dict[str, str]:
        """Return default cache headers based on asset type."""
        if asset_type == "media":
            return {
                "Cache-Control": f"public, max-age={settings.cache_max_age_media}, stale-while-revalidate=3600",
            }
        if asset_type == "static":
            return {
                "Cache-Control": "public, max-age=31536000, immutable",
            }
        # API responses
        return {
            "Cache-Control": f"private, max-age={settings.cache_max_age_api}, stale-while-revalidate=30",
        }
