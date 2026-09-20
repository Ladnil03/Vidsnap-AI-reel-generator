"""
Unit tests for GamificationService: XP ledger, daily caps, level calculations, and badges.
"""

import pytest

from backend.app.gamification.models import StreakScope, XPAction
from backend.app.gamification.service import GamificationService


@pytest.mark.asyncio
async def test_award_xp_and_level_progression(mock_db):
    """Test standard XP awarding, level derivation, and level-up detection."""
    user_id = "gamer_user_1"

    # Initial level should be 1 with 0 XP
    init_lvl = await GamificationService.get_user_level(user_id)
    assert init_lvl.level == 1
    assert init_lvl.current_xp == 0
    assert init_lvl.title == "Novice Explorer 🧭"

    # Award 50 XP (Create reel)
    res1 = await GamificationService.award_xp(
        user_id=user_id,
        action=XPAction.CREATE_REEL,
        idempotency_key="create_vid_101",
        amount=50,
    )
    assert res1.awarded is True
    assert res1.amount == 50
    assert res1.new_total_xp == 50
    assert res1.current_level == 1
    assert res1.leveled_up is False

    # Award another 60 XP to cross 100 XP threshold -> Level 2
    res2 = await GamificationService.award_xp(
        user_id=user_id,
        action=XPAction.CREATE_REEL,
        idempotency_key="create_vid_102",
        amount=60,
    )
    assert res2.awarded is True
    assert res2.amount == 60
    assert res2.new_total_xp == 110
    assert res2.current_level == 2
    assert res2.leveled_up is True

    # Check updated level status
    updated_lvl = await GamificationService.get_user_level(user_id)
    assert updated_lvl.level == 2
    assert updated_lvl.title == "Rising Talent ✨"
    assert updated_lvl.xp_for_current_level == 100
    assert updated_lvl.xp_for_next_level == 400


@pytest.mark.asyncio
async def test_award_xp_idempotency(mock_db):
    """Test that repeating the same idempotency_key prevents duplicate XP awards."""
    user_id = "gamer_user_2"
    key = "idem_watch_123"

    # First call
    res1 = await GamificationService.award_xp(
        user_id=user_id,
        action=XPAction.WATCH_REEL,
        idempotency_key=key,
        amount=10,
    )
    assert res1.awarded is True
    assert res1.amount == 10
    assert res1.new_total_xp == 10

    # Second duplicate call
    res2 = await GamificationService.award_xp(
        user_id=user_id,
        action=XPAction.WATCH_REEL,
        idempotency_key=key,
        amount=10,
    )
    assert res2.awarded is False
    assert "already awarded" in res2.message.lower()
    assert res2.new_total_xp == 10


@pytest.mark.asyncio
async def test_daily_anti_abuse_caps(mock_db):
    """Test that repetitive passive actions are capped at their configured daily limit."""
    user_id = "gamer_user_3"

    # WATCH_REEL has a cap of 100 XP per day
    # Award 90 XP in 9 chunks of 10
    for i in range(9):
        res = await GamificationService.award_xp(
            user_id=user_id,
            action=XPAction.WATCH_REEL,
            idempotency_key=f"watch_chunk_{i}",
            amount=10,
        )
        assert res.awarded is True

    lvl = await GamificationService.get_user_level(user_id)
    assert lvl.current_xp == 90

    # 10th chunk brings it to exactly 100 XP (cap)
    res_10 = await GamificationService.award_xp(
        user_id=user_id,
        action=XPAction.WATCH_REEL,
        idempotency_key="watch_chunk_9",
        amount=10,
    )
    assert res_10.awarded is True
    assert res_10.new_total_xp == 100

    # 11th chunk should be rejected due to daily cap
    res_11 = await GamificationService.award_xp(
        user_id=user_id,
        action=XPAction.WATCH_REEL,
        idempotency_key="watch_chunk_10",
        amount=10,
    )
    assert res_11.awarded is False
    assert res_11.amount == 0
    assert "limit reached" in res_11.message.lower()

    # Total XP must remain 100
    lvl_after = await GamificationService.get_user_level(user_id)
    assert lvl_after.current_xp == 100


@pytest.mark.asyncio
async def test_badge_evaluation_and_unlocking(mock_db):
    """Test unlocking declarative achievement badges upon reaching criteria."""
    user_id = "gamer_user_4"

    # Watch 1 reel -> unlocks 'first_watch'
    await GamificationService.award_xp(
        user_id=user_id,
        action=XPAction.WATCH_REEL,
        idempotency_key="first_watch_event",
        amount=10,
    )

    badges = await GamificationService.get_user_badges(user_id)
    unlocked_ids = {b.badge_id for b in badges}
    assert "first_watch" in unlocked_ids

    # Create 1 reel -> unlocks 'creator_spark'
    await GamificationService.award_xp(
        user_id=user_id,
        action=XPAction.CREATE_REEL,
        idempotency_key="first_create_event",
        amount=50,
    )

    badges_after = await GamificationService.get_user_badges(user_id)
    unlocked_ids_after = {b.badge_id for b in badges_after}
    assert "first_watch" in unlocked_ids_after
    assert "creator_spark" in unlocked_ids_after


@pytest.mark.asyncio
async def test_gamification_profile_aggregation(mock_db):
    """Test full profile aggregation including level, streaks, quests, and ledger."""
    user_id = "gamer_user_5"

    await GamificationService.award_xp(
        user_id=user_id,
        action=XPAction.WATCH_REEL,
        idempotency_key="profile_test_watch",
        amount=10,
    )
    await GamificationService.record_streak_activity(
        user_id=user_id,
        scope=StreakScope.DAILY,
        date_str="2026-09-20",
    )

    profile = await GamificationService.get_gamification_profile(user_id)
    assert profile.user_id == user_id
    assert profile.level.level >= 1
    assert len(profile.streaks) >= 1
    assert len(profile.active_challenges) >= 1
    assert profile.freeze_tokens_available >= 1
    assert len(profile.recent_xp_ledger) >= 1
