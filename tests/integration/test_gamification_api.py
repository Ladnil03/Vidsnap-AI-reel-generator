"""
Integration tests for Gamification & Engagement REST API (/api/v1/gamification).
Verifies level status, XP awarding, daily streaks, quest progress, badge unlocking, and leaderboards.
"""

from datetime import datetime, timezone
from typing import Any

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user, get_optional_current_user
from backend.app.main import app


@pytest.fixture
def gamer_user():
    """Mock authenticated user for gamification tests."""
    return {
        "user_id": "usr_gamification_integ",
        "name": "Jordan Player",
        "email": "jordan@vidsnap.ai",
        "roles": ["user"],
    }


@pytest.mark.asyncio
async def test_gamification_profile_and_level_endpoints(
    async_client: AsyncClient, mock_db, gamer_user: dict[str, Any]
):
    """Test GET /api/v1/gamification/profile and GET /api/v1/gamification/level."""
    app.dependency_overrides[get_current_user] = lambda: gamer_user
    app.dependency_overrides[get_optional_current_user] = lambda: gamer_user

    try:
        # 1. Check initial level
        res_level = await async_client.get("/api/v1/gamification/level")
        assert res_level.status_code == 200
        lvl_data = res_level.json()
        assert lvl_data["user_id"] == gamer_user["user_id"]
        assert lvl_data["level"] == 1
        assert lvl_data["current_xp"] == 0

        # 2. Check full profile
        res_prof = await async_client.get("/api/v1/gamification/profile")
        assert res_prof.status_code == 200
        prof_data = res_prof.json()
        assert "level" in prof_data
        assert "streaks" in prof_data
        assert "active_challenges" in prof_data
        assert "badges_unlocked" in prof_data
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_award_xp_and_streak_api(
    async_client: AsyncClient, mock_db, gamer_user: dict[str, Any]
):
    """Test POST /api/v1/gamification/xp/award and POST /api/v1/gamification/streaks/record."""
    gamer_user["roles"] = ["admin"]
    app.dependency_overrides[get_current_user] = lambda: gamer_user
    app.dependency_overrides[get_optional_current_user] = lambda: gamer_user

    try:
        # 1. Award XP
        award_res = await async_client.post(
            "/api/v1/gamification/xp/award",
            json={
                "action": "create_reel",
                "idempotency_key": "api_test_award_1",
                "amount": 50,
            },
        )
        assert award_res.status_code == 200
        data = award_res.json()
        assert data["awarded"] is True
        assert data["amount"] == 50
        assert data["new_total_xp"] == 50

        # 2. Record streak
        streak_res = await async_client.post(
            "/api/v1/gamification/streaks/record",
            json={
                "scope": "daily",
                "date_str": "2026-09-20",
            },
        )
        assert streak_res.status_code == 200
        s_data = streak_res.json()
        assert s_data["current_streak"] == 1
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        assert s_data["last_active_date"] == today_str
    finally:
        app.dependency_overrides.clear()



@pytest.mark.asyncio
async def test_challenges_and_claim_api(
    async_client: AsyncClient, mock_db, gamer_user: dict[str, Any]
):
    """Test GET /api/v1/gamification/challenges and claiming completed quest."""
    gamer_user["roles"] = ["admin"]
    app.dependency_overrides[get_current_user] = lambda: gamer_user
    app.dependency_overrides[get_optional_current_user] = lambda: gamer_user

    try:
        # 1. Fetch active challenges
        ch_res = await async_client.get("/api/v1/gamification/challenges")
        assert ch_res.status_code == 200
        challenges = ch_res.json()
        assert len(challenges) >= 3

        # Daily comment target is 1 comment
        comment_ch = next(c for c in challenges if c["challenge_id"] == "daily_comment_1")
        assert comment_ch["is_completed"] is False

        # 2. Trigger comment action to fulfill quest
        await async_client.post(
            "/api/v1/gamification/xp/award",
            json={
                "action": "comment_reel",
                "idempotency_key": "api_ch_comment_1",
            },
        )

        # 3. Check challenge status now
        ch_res_2 = await async_client.get("/api/v1/gamification/challenges")
        challenges_2 = ch_res_2.json()
        comment_ch_2 = next(c for c in challenges_2 if c["challenge_id"] == "daily_comment_1")
        assert comment_ch_2["is_completed"] is True
        assert comment_ch_2["is_claimed"] is False

        # 4. Claim reward
        claim_res = await async_client.post("/api/v1/gamification/challenges/daily_comment_1/claim")
        assert claim_res.status_code == 200
        claim_data = claim_res.json()
        assert claim_data["awarded"] is True
        assert claim_data["amount"] == 25
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_badges_and_leaderboard_api(
    async_client: AsyncClient, mock_db, gamer_user: dict[str, Any]
):
    """Test GET /api/v1/gamification/badges and GET /api/v1/gamification/leaderboard."""
    app.dependency_overrides[get_current_user] = lambda: gamer_user
    app.dependency_overrides[get_optional_current_user] = lambda: gamer_user

    try:
        # 1. Badges catalog
        badges_res = await async_client.get("/api/v1/gamification/badges")
        assert badges_res.status_code == 200
        badges_list = badges_res.json()
        assert len(badges_list) >= 10
        assert any(b["badge_id"] == "first_watch" for b in badges_list)

        # 2. Leaderboard
        lb_res = await async_client.get("/api/v1/gamification/leaderboard?scope=all_time&limit=10")
        assert lb_res.status_code == 200
        lb_data = lb_res.json()
        assert lb_data["scope"] == "all_time"
        assert "entries" in lb_data
    finally:
        app.dependency_overrides.clear()
