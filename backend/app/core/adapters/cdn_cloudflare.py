"""
Cloudflare CDN Adapter.
Integrates with Cloudflare API for cache purge and edge URL construction.
Activated when cdn_provider=cloudflare and cloudflare_zone_id is configured.
"""

import logging

import httpx

from backend.app.core.config import settings
from backend.app.core.ports.cdn import CDNPort

logger = logging.getLogger(__name__)


class CloudflareCDNAdapter(CDNPort):
    """CDN adapter backed by Cloudflare's global edge network."""

    def __init__(self):
        self.zone_id = settings.cloudflare_zone_id
        self.api_token = settings.cloudflare_api_token
        self.custom_domain = settings.r2_custom_domain
        self.base_api_url = "https://api.cloudflare.com/client/v4"

        if not self.zone_id:
            logger.warning("Cloudflare CDN adapter initialized without zone_id — purge operations will be no-ops.")
        if not self.api_token:
            logger.warning("Cloudflare CDN adapter initialized without api_token — purge operations will fail.")

        logger.info(
            "CloudflareCDNAdapter initialized (zone=%s, custom_domain=%s)",
            self.zone_id or "not-configured",
            self.custom_domain or "not-configured",
        )

    async def purge_url(self, url: str) -> bool:
        """Purge a specific URL from Cloudflare's edge cache."""
        if not self.zone_id or not self.api_token:
            logger.debug("Cloudflare purge skipped (zone_id or api_token missing) for: %s", url)
            return True

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_api_url}/zones/{self.zone_id}/purge_cache",
                    headers={
                        "Authorization": f"Bearer {self.api_token}",
                        "Content-Type": "application/json",
                    },
                    json={"files": [url]},
                    timeout=10.0,
                )
                data = response.json()
                if data.get("success"):
                    logger.info("Cloudflare cache purged for: %s", url)
                    return True
                logger.warning("Cloudflare purge failed for '%s': %s", url, data.get("errors"))
                return False
        except Exception as e:
            logger.error("Cloudflare purge request failed for '%s': %s", url, e)
            return False

    def get_edge_url(self, key: str) -> str:
        """Return CDN-optimized URL using custom domain if configured, else R2 public URL."""
        clean_key = key.lstrip("/")
        if self.custom_domain:
            base = self.custom_domain.rstrip("/")
            return f"https://{base}/{clean_key}"
        # Fallback to R2 public URL
        r2_url = settings.r2_public_url
        if r2_url:
            return f"{r2_url.rstrip('/')}/{clean_key}"
        return f"https://{settings.r2_bucket_name}.r2.cloudflarestorage.com/{clean_key}"

    def get_cache_headers(self, asset_type: str = "media") -> dict[str, str]:
        """Return Cloudflare-optimized cache headers."""
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
        # API responses — Cloudflare respects CDN-Cache-Control separately
        return {
            "Cache-Control": f"private, max-age={settings.cache_max_age_api}, stale-while-revalidate=30",
        }
