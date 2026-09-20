"""
Unit tests for LeaderboardService: ranking order, scopes, in-memory fallback, and user rank.
"""

import pytest

from backend.app.gamification.models import LeaderboardScope, XPAction
from backend.app.gamification.service import (
    GamificationService,
    _in_memory_leaderboard_all_time,
    _in_memory_leaderboard_weekly,
)


@pytest.mark.asyncio
async def test_leaderboard_rankings_and_order(mock_db):
    """Test leaderboard returns sorted scores and enriched metadata."""
    # Reset in-memory test states
    _in_memory_leaderboard_all_time.clear()
    _in_memory_leaderboard_weekly.clear()

    # Seed 3 users
    u1, u2, u3 = "player_alice", "player_bob", "player_charlie"

    await mock_db.users.insert_many([
        {"user_id": u1, "name": "Alice Wonderland", "username": "alice_w", "email": "alice@example.com"},
        {"user_id": u2, "name": "Bob Builder", "username": "bob_b", "email": "bob@example.com"},
        {"user_id": u3, "name": "Charlie Chaplin", "username": "charlie_c", "email": "charlie@example.com"},
    ])

    # Award XP: Bob=200, Charlie=150, Alice=50
    await GamificationService.award_xp(
        user_id=u2,
        action=XPAction.CREATE_REEL,
        idempotency_key="bob_xp_1",
        amount=200,
    )
    await GamificationService.award_xp(
        user_id=u3,
        action=XPAction.CREATE_REEL,
        idempotency_key="charlie_xp_1",
        amount=150,
    )
    await GamificationService.award_xp(
        user_id=u1,
        action=XPAction.CREATE_REEL,
        idempotency_key="alice_xp_1",
        amount=50,
    )

    # Query All-time leaderboard
    lb_all = await GamificationService.get_leaderboard(
        scope=LeaderboardScope.ALL_TIME,
        limit=10,
        current_user_id=u1,
    )

    assert len(lb_all.entries) >= 3
    # 1st should be Bob
    assert lb_all.entries[0].user_id == u2
    assert lb_all.entries[0].rank == 1
    assert lb_all.entries[0].score == 200
    assert lb_all.entries[0].display_name == "Bob Builder"

    # 2nd should be Charlie
    assert lb_all.entries[1].user_id == u3
    assert lb_all.entries[1].rank == 2
    assert lb_all.entries[1].score == 150

    # 3rd should be Alice
    assert lb_all.entries[2].user_id == u1
    assert lb_all.entries[2].rank == 3
    assert lb_all.entries[2].score == 50

    # User entry for Alice
    assert lb_all.user_entry is not None
    assert lb_all.user_entry.user_id == u1
    assert lb_all.user_entry.rank == 3


@pytest.mark.asyncio
async def test_weekly_leaderboard_scope(mock_db):
    """Test weekly scoped leaderboard."""
    user_id = "player_david"
    await mock_db.users.insert_one({"user_id": user_id, "name": "David Bowie", "username": "david_b"})

    await GamificationService.award_xp(
        user_id=user_id,
        action=XPAction.DAILY_LOGIN,
        idempotency_key="david_login_xp",
        amount=25,
    )

    lb_week = await GamificationService.get_leaderboard(
        scope=LeaderboardScope.WEEKLY,
        limit=5,
        current_user_id=user_id,
    )

    assert lb_week.scope == LeaderboardScope.WEEKLY
    assert len(lb_week.entries) >= 1
    assert any(e.user_id == user_id for e in lb_week.entries)
