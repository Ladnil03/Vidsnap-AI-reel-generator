"""
Integration tests for Discovery API routes.
Covers /api/v1/discovery/sources, /api/v1/discovery/search, /api/v1/discovery/items/{id},
and /api/v1/discovery/ingest.
"""

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user
from backend.app.main import app


@pytest.mark.asyncio
async def test_discovery_sources_endpoint(async_client: AsyncClient):
    """Test listing available discovery connectors and their statuses."""
    res = await async_client.get("/api/v1/discovery/sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 3

    names = [s["name"] for s in sources]
    assert any("YouTube" in n for n in names)
    assert any("Pexels" in n for n in names)
    assert any("Pixabay" in n for n in names)


@pytest.mark.asyncio
async def test_discovery_search_and_item_details(async_client: AsyncClient):
    """Test searching discovery catalog and retrieving single item details."""
    search_res = await async_client.get("/api/v1/discovery/search?q=coding&limit=5")
    assert search_res.status_code == 200
    data = search_res.json()
    assert "items" in data
    assert len(data["items"]) > 0

    first_item = data["items"][0]
    item_id = first_item["item_id"]
    assert first_item["can_rehost"] is False
    assert first_item["attribution_text"] != ""

    # Fetch item directly
    detail_res = await async_client.get(f"/api/v1/discovery/items/{item_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["item_id"] == item_id
    assert detail["views_count"] >= 1


@pytest.mark.asyncio
async def test_discovery_batch_ingest_endpoint(async_client: AsyncClient, mock_db):
    """Test triggering batch ingestion from a connector with authentication."""
    await mock_db.users.insert_one({"user_id": "u_admin", "email": "admin@vid.ai", "role": "admin"})

    async def override_user():
        return {"user_id": "u_admin", "email": "admin@vid.ai", "role": "admin"}

    app.dependency_overrides[get_current_user] = override_user

    try:
        payload = {
            "source": "youtube_shorts",
            "query": "lofi music",
            "limit": 3,
        }
        res = await async_client.post("/api/v1/discovery/ingest", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["source"] == "youtube_shorts"
        assert data["query"] == "lofi music"
        assert data["ingested_count"] + data["skipped_existing_count"] >= 1
    finally:
        app.dependency_overrides.clear()
