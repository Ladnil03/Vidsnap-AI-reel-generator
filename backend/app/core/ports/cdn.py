"""
CDN Port: Abstract interface for Content Delivery Network operations.
Enables pluggable CDN backends: Passthrough (no-op), Cloudflare, AWS CloudFront.
"""

from abc import ABC, abstractmethod


class CDNPort(ABC):
    """Abstract interface defining CDN capabilities."""

    @abstractmethod
    async def purge_url(self, url: str) -> bool:
        """
        Purge a specific URL from CDN edge cache.
        Returns True if successfully purged or if no purge is needed.
        """

    @abstractmethod
    def get_edge_url(self, key: str) -> str:
        """
        Get the CDN-optimized edge URL for a storage key.
        May return a custom domain URL or the direct storage URL.
        """

    @abstractmethod
    def get_cache_headers(self, asset_type: str = "media") -> dict[str, str]:
        """
        Return recommended cache headers for a given asset type.
        asset_type: 'media' (images/videos), 'api' (JSON responses), 'static' (JS/CSS).
        """
