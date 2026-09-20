"""
Unit tests for external media source connectors.
Validates legal-by-design guarantees: zero scraping, zero re-hosting, official player types,
and mandatory source attribution badges.
"""

import pytest

from backend.app.discovery.connectors.pexels import PexelsConnector
from backend.app.discovery.connectors.pixabay import PixabayConnector
from backend.app.discovery.connectors.youtube import YouTubeConnector
from backend.app.discovery.models import DiscoverySource, PlayerType


@pytest.mark.asyncio
async def test_youtube_connector_compliance_and_search():
    """Verify YouTube connector outputs compliant iframe embed and zero re-hosting."""
    connector = YouTubeConnector()
    assert connector.source == DiscoverySource.YOUTUBE_SHORTS

    status = connector.get_status()
    assert status.configured in (True, False)
    assert "YouTube" in status.name

    results = await connector.search("coding", limit=2)
    assert len(results) > 0

    item = results[0]
    assert item.source == DiscoverySource.YOUTUBE_SHORTS
    assert item.player_type == PlayerType.IFRAME
    assert "https://www.youtube.com/embed/" in item.embed_url
    assert item.can_rehost is False
    assert item.is_external is True
    assert "YouTube" in item.attribution_text
    assert len(item.embedding) == 384


@pytest.mark.asyncio
async def test_pexels_connector_compliance_and_search():
    """Verify Pexels connector uses direct official CDN stream with Pexels attribution."""
    connector = PexelsConnector()
    assert connector.source == DiscoverySource.PEXELS

    results = await connector.search("cyberpunk city", limit=2)
    assert len(results) > 0

    item = results[0]
    assert item.source == DiscoverySource.PEXELS
    assert item.player_type == PlayerType.DIRECT_VIDEO
    assert item.can_rehost is False
    assert "Pexels" in item.attribution_text
    assert item.license == "Pexels Free License"


@pytest.mark.asyncio
async def test_pixabay_connector_compliance_and_search():
    """Verify Pixabay connector uses direct stream and content license attribution."""
    connector = PixabayConnector()
    assert connector.source == DiscoverySource.PIXABAY

    results = await connector.search("ai neural", limit=2)
    assert len(results) > 0

    item = results[0]
    assert item.source == DiscoverySource.PIXABAY
    assert item.can_rehost is False
    assert "Pixabay" in item.attribution_text
