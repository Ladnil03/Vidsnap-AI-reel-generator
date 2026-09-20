"""
Unit tests for DiscoveryService catalog indexing, deduplication, and LRU pruning.
"""

from datetime import datetime, timezone

import pytest

from backend.app.core.config import settings
from backend.app.discovery.models import (
    BatchIngestRequest,
    DiscoveryItem,
    DiscoverySearchRequest,
    DiscoverySource,
    PlayerType,
)
from backend.app.discovery.service import DiscoveryService


@pytest.mark.asyncio
async def test_discovery_ingestion_and_deduplication(mock_db):
    """Verify items are ingested and duplicate source/external_id pairs are updated."""
    service = DiscoveryService(db=mock_db)

    item1 = DiscoveryItem(
        item_id="yt_test123",
        source=DiscoverySource.YOUTUBE_SHORTS,
        external_id="test1234",
        title="Modern Python Async Programming",
        description="Asyncio in Python 3.12",
        author_name="Pythonista",
        source_url="https://youtube.com/shorts/test1234",
        embed_url="https://youtube.com/embed/test1234",
        player_type=PlayerType.IFRAME,
        attribution_text="Watch on YouTube • Pythonista",
        created_at=datetime.now(timezone.utc),
        tags=["python", "async", "coding"],
    )

    # First ingestion
    await service.ingest_item(item1)
    count = await mock_db["discovery_catalog"].count_documents({})
    assert count == 1

    # Duplicate ingestion with updated title
    item1_updated = item1.model_copy(update={"title": "Modern Python Asyncio Deep Dive"})
    await service.ingest_item(item1_updated)
    count_after = await mock_db["discovery_catalog"].count_documents({})
    assert count_after == 1  # Deduplicated

    fetched = await service.get_item("yt_test123")
    assert fetched is not None
    assert fetched.title == "Modern Python Asyncio Deep Dive"
    assert fetched.views_count == 1  # Incremented on view


@pytest.mark.asyncio
async def test_discovery_lru_capacity_pruning(mock_db, monkeypatch):
    """Verify that catalog size strictly enforces max capacity by pruning oldest items."""
    # Temporarily set max catalog size to 3 for testing
    monkeypatch.setattr(settings, "max_discovery_catalog_size", 3)
    service = DiscoveryService(db=mock_db)

    # Ingest 5 items sequentially
    for i in range(5):
        item = DiscoveryItem(
            item_id=f"item_{i}",
            source=DiscoverySource.PEXELS,
            external_id=f"ext_{i}",
            title=f"Sample Video {i}",
            author_name="Creator",
            source_url="https://pexels.com",
            embed_url="https://video.mp4",
            player_type=PlayerType.DIRECT_VIDEO,
            attribution_text="Pexels Video",
            created_at=datetime.now(timezone.utc),
            tags=["sample"],
        )
        await service.ingest_item(item)

    total = await mock_db["discovery_catalog"].count_documents({})
    # Should not exceed max capacity
    assert total <= 3


@pytest.mark.asyncio
async def test_discovery_search_and_tag_filter(mock_db):
    """Verify search returns matching items ranked by query similarity."""
    service = DiscoveryService(db=mock_db)

    req = BatchIngestRequest(source=DiscoverySource.YOUTUBE_SHORTS, query="tech coding", limit=3)
    ingest_res = await service.batch_ingest(req)
    assert ingest_res.ingested_count > 0

    search_res = await service.search(DiscoverySearchRequest(q="coding", limit=10))
    assert len(search_res.items) > 0
    assert any("coding" in it.tags or "coding" in it.title.lower() for it in search_res.items)
