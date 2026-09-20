"""
Integration tests for Recommendation System API routes.
Covers /api/v1/recsys/feed, /api/v1/recsys/interactions, and /api/v1/recsys/preferences.
"""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user, get_optional_current_user
from backend.app.main import app


@pytest.mark.asyncio
async def test_recsys_feed_cold_start(async_client: AsyncClient, mock_db):
    """Test recommendation feed without authentication (cold start mode)."""
    await mock_db.videos.insert_one({
        "video_id": "vid_pub_1",
        "user_id": "creator_a",
        "author_name": "Creator A",
        "title": "Inspiring Cinematic Travel",
        "hashtags": ["travel", "cinematic"],
        "video_url": "https://cdn.example.com/travel.mp4",
        "status": "published",
        "visibility": "public",
        "created_at": datetime.now(timezone.utc),
    })

    res = await async_client.get("/api/v1/recsys/feed?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) > 0

    item = data["items"][0]
    assert "explainability_tag" in item
    assert item["explainability_tag"] != ""


@pytest.mark.asyncio
async def test_recsys_feed_wellbeing_break_card(async_client: AsyncClient):
    """Test that requesting feed with session_reel_count at interval returns wellbeing break."""
    res = await async_client.get("/api/v1/recsys/feed?session_reel_count=15&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) > 0

    first = data["items"][0]
    assert first["is_wellbeing_card"] is True
    assert first["wellbeing_card"] is not None
    assert "Mindful Breath" in first["wellbeing_card"]["title"]


@pytest.mark.asyncio
async def test_recsys_interaction_and_preferences_flow(async_client: AsyncClient, mock_db):
    """Test user preferences update and interaction event recording."""
    await mock_db.users.insert_one({"user_id": "u_recsys_user", "email": "rec@vid.ai"})

    async def override_user():
        return {"user_id": "u_recsys_user", "email": "rec@vid.ai"}

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_optional_current_user] = override_user

    try:
        # 1. Update preferences
        pref_payload = {"preferred_categories": ["tech", "ai", "coding"]}
        pref_res = await async_client.post("/api/v1/recsys/preferences", json=pref_payload)
        assert pref_res.status_code == 200
        pref_data = pref_res.json()
        assert pref_data["user_id"] == "u_recsys_user"
        assert "tech" in pref_data["top_categories"]

        # 2. Get preferences
        get_res = await async_client.get("/api/v1/recsys/preferences")
        assert get_res.status_code == 200
        assert get_res.json()["user_id"] == "u_recsys_user"

        # 3. Record interaction event
        event_payload = {
            "item_id": "vid_pub_1",
            "source": "community",
            "interaction_type": "like",
            "watched_seconds": 20.0,
            "total_seconds": 25.0,
        }
        event_res = await async_client.post("/api/v1/recsys/interactions", json=event_payload)
        assert event_res.status_code == 200
        assert event_res.json()["success"] is True
    finally:
        app.dependency_overrides.clear()
