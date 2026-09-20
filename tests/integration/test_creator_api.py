"""
Integration tests for Creator REST API (/api/v1/creator).
Tests profile, verification applications, audience analytics, copilot, and events.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user, get_optional_current_user
from backend.app.main import app


@pytest.fixture
def creator_user():
    """Mock authenticated creator user."""
    return {
        "user_id": "usr_creator_integ",
        "name": "Leo Creator",
        "email": "leo@creator.test",
        "roles": ["user", "creator"],
    }


@pytest.mark.asyncio
async def test_creator_profile_and_analytics_api(
    async_client: AsyncClient, mock_db, creator_user: dict[str, Any]
):
    """Test GET /api/v1/creator/profile, PUT /profile, and GET /analytics."""
    app.dependency_overrides[get_current_user] = lambda: creator_user
    app.dependency_overrides[get_optional_current_user] = lambda: creator_user

    try:
        # 1. Fetch profile
        prof_res = await async_client.get("/api/v1/creator/profile")
        assert prof_res.status_code == 200
        p_data = prof_res.json()
        assert p_data["user_id"] == creator_user["user_id"]

        # 2. Update profile
        update_res = await async_client.put(
            "/api/v1/creator/profile",
            json={"bio": "Digital storyteller and filmmaker", "niche": "film"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["bio"] == "Digital storyteller and filmmaker"

        # 3. Get analytics
        analytics_res = await async_client.get("/api/v1/creator/analytics?days=14")
        assert analytics_res.status_code == 200
        a_data = analytics_res.json()
        assert a_data["period_days"] == 14
        assert "avg_completion_rate_pct" in a_data
        assert "audience_mood_affinity" in a_data
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_creator_copilot_and_events_api(
    async_client: AsyncClient, mock_db, creator_user: dict[str, Any]
):
    """Test POST /api/v1/creator/copilot and POST /api/v1/creator/events."""
    app.dependency_overrides[get_current_user] = lambda: creator_user
    app.dependency_overrides[get_optional_current_user] = lambda: creator_user

    try:
        # 1. Copilot advice
        copilot_res = await async_client.post(
            "/api/v1/creator/copilot",
            json={
                "topic": "5 AI Tools Everyone Should Know",
                "target_audience": "Students & Creatives",
                "mood_vibe": "informative",
            },
        )
        assert copilot_res.status_code == 200
        c_data = copilot_res.json()
        assert len(c_data["hooks"]) >= 3
        assert c_data["viral_potential_score"] > 50

        # 2. Schedule Event
        future_time = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        evt_res = await async_client.post(
            "/api/v1/creator/events",
            json={
                "title": "Community Movie Night",
                "description": "Streaming indie films together",
                "scheduled_at": future_time,
            },
        )
        assert evt_res.status_code == 201
        e_data = evt_res.json()
        assert e_data["title"] == "Community Movie Night"

        # 3. List events
        list_res = await async_client.get("/api/v1/creator/events")
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1
    finally:
        app.dependency_overrides.clear()
