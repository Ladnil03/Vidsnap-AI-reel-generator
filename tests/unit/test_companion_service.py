"""
Unit tests for CompanionService: chat loop, tool calling, smart playlists, journeys, and daily plans.
"""

from unittest.mock import patch

import pytest

from backend.app.ai_companion.models import (
    CompanionChatRequest,
    CreateAIPlaylistRequest,
    DailyPlanSlot,
    MoodType,
    UpdateDailyPlanRequest,
)
from backend.app.ai_companion.service import CompanionService
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_companion_chat_and_tool_execution(mock_db):
    """Test AI companion chat processing, search reel tool execution, and message history."""
    user_id = "companion_user_1"

    # Seed a published reel in the database
    await mock_db.videos.insert_one({
        "video_id": "vid_cat_chill",
        "title": "Sleepy Cat Relaxing in Sunlight",
        "description": "Wholesome cat napping",
        "tags": ["nature", "relax", "pets", "chill"],
        "status": "published",
        "creator_name": "CatLovers",
        "playback_url": "https://media.vidsnap.ai/videos/cat.mp4",
        "thumbnail_url": "https://media.vidsnap.ai/thumbs/cat.jpg",
        "duration_seconds": 30,
        "views_count": 100,
    })

    with patch.object(settings, "groq_api_key", None):
        with patch.object(settings, "gemini_api_key", None):
            with patch.object(settings, "openrouter_api_key", None):
                req = CompanionChatRequest(
                    message="Find me some chill relaxing cat reels to unwind",
                    mood=MoodType.CHILL,
                )
                res = await CompanionService.chat_with_companion(user_id, req)

                assert res.message.role == "assistant"
                assert len(res.message.content) > 0
                assert res.active_mood == MoodType.CHILL

                # Check tool calls and reels attached
                assert res.message.tool_calls is not None
                assert len(res.message.tool_calls) > 0
                assert res.message.tool_calls[0]["tool"] == "search_reels"
                assert res.message.reels is not None
                assert len(res.message.reels) >= 1
                assert res.message.reels[0]["title"] == "Sleepy Cat Relaxing in Sunlight"

                # Check history persistence
                history = await CompanionService.get_chat_history(user_id)
                assert len(history) == 2  # user msg + assistant msg
                assert history[0].role == "user"
                assert history[1].role == "assistant"


@pytest.mark.asyncio
async def test_clear_companion_history(mock_db):
    """Test user control over conversation history purge."""
    user_id = "privacy_user_99"

    req = CompanionChatRequest(message="Hello companion!")
    await CompanionService.chat_with_companion(user_id, req)

    history_before = await CompanionService.get_chat_history(user_id)
    assert len(history_before) == 2

    # Clear history
    await CompanionService.clear_chat_history(user_id)
    history_after = await CompanionService.get_chat_history(user_id)
    assert len(history_after) == 0


@pytest.mark.asyncio
async def test_create_dynamic_playlist(mock_db):
    """Test AI playlist generation and retrieval."""
    user_id = "playlist_curator"

    req = CreateAIPlaylistRequest(
        title="Midnight Lo-Fi Focus",
        prompt="Calm ambient beats for late night deep work",
        mood=MoodType.FOCUSED,
        target_duration_minutes=15,
    )
    playlist = await CompanionService.create_dynamic_playlist(user_id, req)

    assert playlist.playlist_id.startswith("pl_")
    assert playlist.title == "Midnight Lo-Fi Focus"
    assert playlist.mood == MoodType.FOCUSED
    assert playlist.target_duration_minutes == 15

    # List playlists
    user_playlists = await CompanionService.list_user_playlists(user_id)
    assert len(user_playlists) == 1
    assert user_playlists[0].playlist_id == playlist.playlist_id


@pytest.mark.asyncio
async def test_entertainment_journeys_and_daily_plan(mock_db):
    """Test structured journey generation and daily entertainment scheduling."""
    user_id = "scheduled_viewer"

    # 1. Journeys
    journeys = CompanionService.get_entertainment_journeys(user_id)
    assert len(journeys) == 4
    journey_types = [j.journey_type for j in journeys]
    assert "morning_spark" in journey_types
    assert "focus_flow" in journey_types
    assert "laugh_break" in journey_types
    assert "evening_unwind" in journey_types

    # 2. Default Daily Plan
    plan = await CompanionService.get_daily_plan(user_id)
    assert plan.user_id == user_id
    assert len(plan.slots) == 3
    assert plan.slots[0].name == "Morning Spark ⚡"

    # 3. Update Daily Plan
    new_slots = [
        DailyPlanSlot(
            slot_id="custom_slot_1",
            name="Afternoon Coffee Break ☕",
            time_of_day="afternoon",
            duration_minutes=8,
            journey_id="laugh_break",
        )
    ]
    updated_plan = await CompanionService.update_daily_plan(
        user_id, UpdateDailyPlanRequest(slots=new_slots)
    )
    assert len(updated_plan.slots) == 1
    assert updated_plan.slots[0].name == "Afternoon Coffee Break ☕"
