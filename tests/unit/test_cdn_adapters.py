"""
Unit tests for CDN adapters (PassthroughCDNAdapter, CloudinaryCDNAdapter) and adapter factory.
"""

from unittest.mock import patch

import pytest

from backend.app.core.adapters.cdn_cloudinary import CloudinaryCDNAdapter
from backend.app.core.adapters.cdn_passthrough import PassthroughCDNAdapter
from backend.app.core.adapters.factory import get_cdn_adapter
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_passthrough_cdn_adapter():
    """Test PassthroughCDNAdapter behaviors for free tier / local development."""
    adapter = PassthroughCDNAdapter()

    # Purge is always a no-op returning True
    purged = await adapter.purge_url("https://media.vidsnap.ai/test.mp4")
    assert purged is True

    # Edge URL delegates to storage adapter public URL
    edge_url = adapter.get_edge_url("videos/test1234.mp4")
    assert "videos/test1234.mp4" in edge_url

    # Cache headers for media, static, and api
    media_headers = adapter.get_cache_headers("media")
    assert "public" in media_headers["Cache-Control"]
    assert "max-age=" in media_headers["Cache-Control"]

    static_headers = adapter.get_cache_headers("static")
    assert "immutable" in static_headers["Cache-Control"]

    api_headers = adapter.get_cache_headers("api")
    assert "private" in api_headers["Cache-Control"]


def test_factory_get_cdn_adapter():
    """Test factory resolves the configured CDN adapter."""
    get_cdn_adapter.cache_clear()

    with patch.object(settings, "cdn_provider", "passthrough"):
        adapter = get_cdn_adapter()
        assert isinstance(adapter, PassthroughCDNAdapter)

    get_cdn_adapter.cache_clear()
    with patch.object(settings, "cdn_provider", "cloudinary"):
        adapter = get_cdn_adapter()
        assert isinstance(adapter, CloudinaryCDNAdapter)

    get_cdn_adapter.cache_clear()
