"""
Unit tests for Mood Detection, consent gating, and RecSys mood biasing.
"""

import pytest

from backend.app.ai_companion.models import MoodType, SetMoodRequest
from backend.app.ai_companion.service import CompanionService
from backend.app.recsys.service import RecSysService


@pytest.mark.asyncio
async def test_set_mood_with_consent(mock_db):
    """Test updating user mood with explicit consent."""
    user_id = "mood_user_alpha"

    req = SetMoodRequest(
        mood=MoodType.ENERGIZED,
        consent_given=True,
        note="Feeling pumped after morning workout!",
    )
    state = await CompanionService.set_mood(user_id, req)

    assert state.user_id == user_id
    assert state.mood == MoodType.ENERGIZED
    assert state.consent_given is True
    assert state.note == "Feeling pumped after morning workout!"

    # Retrieve mood
    fetched = await CompanionService.get_mood(user_id)
    assert fetched is not None
    assert fetched.mood == MoodType.ENERGIZED


@pytest.mark.asyncio
async def test_withdraw_mood_consent_purges_data(mock_db):
    """Withdrawing consent immediately purges user mood record (privacy-first)."""
    user_id = "privacy_mood_user"

    # 1. Set initial mood
    await CompanionService.set_mood(
        user_id, SetMoodRequest(mood=MoodType.CHILL, consent_given=True)
    )
    assert await CompanionService.get_mood(user_id) is not None

    # 2. Withdraw consent
    withdrawn = await CompanionService.set_mood(
        user_id, SetMoodRequest(mood=MoodType.CHILL, consent_given=False)
    )
    assert withdrawn.consent_given is False

    # Stored record must be purged
    assert await CompanionService.get_mood(user_id) is None


@pytest.mark.asyncio
async def test_recsys_mood_biasing(mock_db):
    """Test that active mood biases candidate ranking and produces tailored explainability tags."""
    # Seed reels in database: one energized, one focused
    await mock_db.videos.insert_one({
        "video_id": "reel_gym_hype",
        "title": "Insane HIIT Workout Routine",
        "description": "High intensity fitness training",
        "hashtags": ["workout", "fitness", "energy"],
        "status": "published",
        "visibility": "public",
        "author_name": "GymPro",
        "views_count": 1000,
        "likes_count": 80,
    })

    await mock_db.videos.insert_one({
        "video_id": "reel_code_flow",
        "title": "Python Async Architecture",
        "description": "Advanced programming tutorial",
        "hashtags": ["coding", "tech", "dev"],
        "status": "published",
        "visibility": "public",
        "author_name": "DevGuru",
        "views_count": 1000,
        "likes_count": 80,
    })

    service = RecSysService(db=mock_db)

    # 1. Request with Energized mood
    res_energized = await service.get_recommendations(user_id=None, mood="energized", limit=2)
    assert len(res_energized.items) >= 2
    # Top item should be the gym workout reel
    assert res_energized.items[0].video_id == "reel_gym_hype"
    assert "Tuned to your Energized vibe" in res_energized.items[0].explainability_tag

    # 2. Request with Focused mood
    res_focused = await service.get_recommendations(user_id=None, mood="focused", limit=2)
    assert len(res_focused.items) >= 2
    # Top item should be the coding reel
    assert res_focused.items[0].video_id == "reel_code_flow"
    assert "Tuned to your Focused vibe" in res_focused.items[0].explainability_tag
