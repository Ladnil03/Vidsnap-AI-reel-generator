"""
Integration tests for AI Companion & Personalization REST API (/api/v1/companion).
Tests chat conversation, mood state updates, dynamic playlist generation,
entertainment journeys, daily planner, and creator digital twins.
"""

from typing import Any

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user
from backend.app.main import app


@pytest.fixture
def companion_user():
    """Mock authenticated companion user."""
    return {
        "user_id": "user_companion_integ",
        "name": "Sarah Explorer",
        "email": "sarah@vidsnap.ai",
        "roles": ["user"],
    }


@pytest.mark.asyncio
async def test_companion_chat_and_history_api(
    async_client: AsyncClient, mock_db, companion_user: dict[str, Any]
):
    """Test POST /api/v1/companion/chat, GET /history, and DELETE /history."""
    app.dependency_overrides[get_current_user] = lambda: companion_user

    try:
        # 1. Send chat message
        chat_res = await async_client.post(
            "/api/v1/companion/chat",
            json={"message": "Hey! Show me something inspiring to motivate my afternoon work."},
        )
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert "message" in chat_data
        assert chat_data["message"]["role"] == "assistant"
        assert len(chat_data["suggested_actions"]) > 0

        # 2. Get history
        hist_res = await async_client.get("/api/v1/companion/history")
        assert hist_res.status_code == 200
        hist_data = hist_res.json()
        assert len(hist_data) == 2  # user + assistant

        # 3. Clear history
        del_res = await async_client.delete("/api/v1/companion/history")
        assert del_res.status_code == 200
        assert del_res.json()["cleared"] is True

        # Verify history is now empty
        empty_hist = await async_client.get("/api/v1/companion/history")
        assert len(empty_hist.json()) == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_companion_mood_api(
    async_client: AsyncClient, mock_db, companion_user: dict[str, Any]
):
    """Test POST /api/v1/companion/mood and GET /api/v1/companion/mood."""
    app.dependency_overrides[get_current_user] = lambda: companion_user

    try:
        # Set mood
        set_res = await async_client.post(
            "/api/v1/companion/mood",
            json={"mood": "chill", "consent_given": True, "note": "Relaxing with tea"},
        )
        assert set_res.status_code == 200
        mood_data = set_res.json()
        assert mood_data["mood"] == "chill"
        assert mood_data["consent_given"] is True

        # Get mood
        get_res = await async_client.get("/api/v1/companion/mood")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["mood"] == "chill"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_companion_playlists_and_journeys_api(
    async_client: AsyncClient, mock_db, companion_user: dict[str, Any]
):
    """Test generating dynamic playlists and retrieving entertainment journeys."""
    app.dependency_overrides[get_current_user] = lambda: companion_user

    try:
        # 1. Generate Playlist
        pl_res = await async_client.post(
            "/api/v1/companion/playlists/generate",
            json={
                "title": "Ambient Coding Waves",
                "prompt": "Deep focus coding session",
                "mood": "focused",
                "target_duration_minutes": 15,
            },
        )
        assert pl_res.status_code == 201
        pl_data = pl_res.json()
        assert pl_data["title"] == "Ambient Coding Waves"
        assert pl_data["target_duration_minutes"] == 15

        # 2. List Playlists
        list_res = await async_client.get("/api/v1/companion/playlists")
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # 3. List Journeys
        journeys_res = await async_client.get("/api/v1/companion/journeys")
        assert journeys_res.status_code == 200
        journeys = journeys_res.json()
        assert len(journeys) == 4

        # 4. Get Journey Detail
        detail_res = await async_client.get("/api/v1/companion/journeys/morning_spark")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["journey_type"] == "morning_spark"
        assert len(detail["steps"]) >= 2
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_companion_daily_planner_and_digital_twin_api(
    async_client: AsyncClient, mock_db, companion_user: dict[str, Any]
):
    """Test daily planner and creator digital twin interactions."""
    app.dependency_overrides[get_current_user] = lambda: companion_user

    try:
        # 1. Get Daily Plan (auto-initializes default slots)
        plan_res = await async_client.get("/api/v1/companion/daily-planner")
        assert plan_res.status_code == 200
        plan = plan_res.json()
        assert len(plan["slots"]) == 3

        # 2. Digital Twin
        creator_id = "creator_star"
        twin_res = await async_client.get(f"/api/v1/companion/digital-twin/{creator_id}")
        assert twin_res.status_code == 200
        twin = twin_res.json()
        assert twin["is_ai_labeled"] is True

        # Interact with digital twin
        interact_res = await async_client.post(
            f"/api/v1/companion/digital-twin/{creator_id}/interact",
            json={"message": "What is your favorite editing trick?"},
        )
        assert interact_res.status_code == 200
        interact_data = interact_res.json()
        assert interact_data["is_ai_labeled"] is True
        assert len(interact_data["reply"]) > 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)
