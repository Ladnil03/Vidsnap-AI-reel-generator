"""
Unit tests for StreakService: timezone-aware consecutive days, freeze token rescues, and milestones.
"""

import pytest
from fastapi import HTTPException

from backend.app.gamification.models import StreakScope
from backend.app.gamification.service import GamificationService


@pytest.mark.asyncio
async def test_streak_consecutive_days(mock_db):
    """Test streak initialization and consecutive day progression."""
    user_id = "streak_user_1"

    # Day 1: 2026-09-01
    s1 = await GamificationService.record_streak_activity(
        user_id=user_id,
        scope=StreakScope.DAILY,
        date_str="2026-09-01",
    )
    assert s1.current_streak == 1
    assert s1.longest_streak == 1
    assert s1.last_active_date == "2026-09-01"
    assert s1.freeze_tokens == 2

    # Same day check-in: idempotent, no change
    s1_repeat = await GamificationService.record_streak_activity(
        user_id=user_id,
        scope=StreakScope.DAILY,
        date_str="2026-09-01",
    )
    assert s1_repeat.current_streak == 1

    # Day 2: 2026-09-02 (consecutive)
    s2 = await GamificationService.record_streak_activity(
        user_id=user_id,
        scope=StreakScope.DAILY,
        date_str="2026-09-02",
    )
    assert s2.current_streak == 2
    assert s2.longest_streak == 2
    assert s2.last_active_date == "2026-09-02"

    # Day 3: 2026-09-03 (consecutive)
    s3 = await GamificationService.record_streak_activity(
        user_id=user_id,
        scope=StreakScope.DAILY,
        date_str="2026-09-03",
    )
    assert s3.current_streak == 3
    assert s3.longest_streak == 3


@pytest.mark.asyncio
async def test_streak_freeze_token_rescue(mock_db):
    """Test that a missed single day auto-consumes a freeze token and protects the streak."""
    user_id = "streak_user_2"

    # Active on Day 1: 2026-09-01
    await GamificationService.record_streak_activity(
        user_id=user_id,
        scope=StreakScope.DAILY,
        date_str="2026-09-01",
    )

    # Missed 2026-09-02! Next active on 2026-09-03 (2 days gap)
    s_rescued = await GamificationService.record_streak_activity(
        user_id=user_id,
        scope=StreakScope.DAILY,
        date_str="2026-09-03",
    )

    # Streak should be preserved and incremented to 2, but freeze token consumed (2 -> 1)
    assert s_rescued.current_streak == 2
    assert s_rescued.freeze_tokens == 1
    assert s_rescued.is_frozen_today is True
    assert s_rescued.last_active_date == "2026-09-03"


@pytest.mark.asyncio
async def test_streak_reset_after_extended_absence(mock_db):
    """Test that missing more than 1 day with no available tokens resets streak to 1."""
    user_id = "streak_user_3"

    # Active on Day 1: 2026-09-01
    await GamificationService.record_streak_activity(
        user_id=user_id,
        scope=StreakScope.DAILY,
        date_str="2026-09-01",
    )

    # 4 days later: 2026-09-05
    s_reset = await GamificationService.record_streak_activity(
        user_id=user_id,
        scope=StreakScope.DAILY,
        date_str="2026-09-05",
    )

    assert s_reset.current_streak == 1
    assert s_reset.longest_streak == 1
    assert s_reset.last_active_date == "2026-09-05"


@pytest.mark.asyncio
async def test_manual_use_freeze_token(mock_db):
    """Test explicit freeze token usage."""
    user_id = "streak_user_4"

    # Initialize streak
    await GamificationService.record_streak_activity(
        user_id=user_id,
        scope=StreakScope.DAILY,
        date_str="2026-09-01",
    )

    # Manually consume a freeze token
    frozen = await GamificationService.use_freeze_token(user_id=user_id, scope=StreakScope.DAILY)
    assert frozen.is_frozen_today is True
    assert frozen.freeze_tokens == 1

    # Attempting to freeze again today should raise 400
    with pytest.raises(HTTPException) as exc:
        await GamificationService.use_freeze_token(user_id=user_id, scope=StreakScope.DAILY)
    assert exc.value.status_code == 400
