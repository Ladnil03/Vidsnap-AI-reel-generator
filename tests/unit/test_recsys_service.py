"""
Unit tests for RecSysService personalized ranking, explainability, and wellbeing.
"""

from datetime import datetime, timezone

import pytest

from backend.app.discovery.models import DiscoverySource
from backend.app.recsys.models import (
    InteractionEventRequest,
    InteractionType,
    UserPreferencesRequest,
)
from backend.app.recsys.service import RecSysService


@pytest.mark.asyncio
async def test_recsys_feed_generation_and_explainability(mock_db):
    """Verify recommendation feed produces ranked items with explainability tags."""
    service = RecSysService(db=mock_db)

    # Insert sample published video
    await mock_db["videos"].insert_one({
        "video_id": "vid_tech_101",
        "user_id": "creator_1",
        "author_name": "DevGuru",
        "title": "Build AI Agents with Python",
        "description": "Step by step AI architecture",
        "hashtags": ["tech", "ai", "python"],
        "video_url": "https://cdn.example.com/video.mp4",
        "status": "published",
        "visibility": "public",
        "views_count": 150,
        "likes_count": 25,
        "comments_count": 5,
        "created_at": datetime.now(timezone.utc),
    })

    # Set explicit preference for tech
    await service.set_user_preferences("test_user_1", UserPreferencesRequest(preferred_categories=["tech", "coding"]))

    feed = await service.get_recommendations(user_id="test_user_1", session_reel_count=0, limit=5)
    assert len(feed.items) > 0

    first_item = feed.items[0]
    assert first_item.video_id == "vid_tech_101"
    assert first_item.recommendation_score > 0
    assert (
        "tech" in first_item.explainability_tag.lower()
        or "ai" in first_item.explainability_tag.lower()
        or "matched" in first_item.explainability_tag.lower()
    )


@pytest.mark.asyncio
async def test_recsys_anti_doomscroll_wellbeing_card(mock_db):
    """Verify that an anti-doomscroll wellbeing card is injected at session milestones."""
    service = RecSysService(db=mock_db)

    # Trigger recommendation at session milestone (e.g., 15 continuous reels)
    feed = await service.get_recommendations(user_id="test_user_1", session_reel_count=15, limit=5)

    # The first item must be a wellbeing card
    assert len(feed.items) > 0
    wellbeing_item = feed.items[0]
    assert wellbeing_item.is_wellbeing_card is True
    assert wellbeing_item.wellbeing_card is not None
    assert "Mindful Breath" in wellbeing_item.wellbeing_card.title
    assert wellbeing_item.wellbeing_card.reel_count == 15


@pytest.mark.asyncio
async def test_recsys_online_vector_learning(mock_db):
    """Verify that positive interactions update the user's taste vector online via EMA."""
    service = RecSysService(db=mock_db)

    # Insert sample video
    await mock_db["videos"].insert_one({
        "video_id": "vid_fitness_200",
        "user_id": "coach_mike",
        "author_name": "Coach Mike",
        "title": "5 Minute Kettlebell Workout",
        "description": "High intensity burn",
        "hashtags": ["fitness", "workout"],
        "video_url": "https://cdn.example.com/fit.mp4",
        "status": "published",
        "visibility": "public",
        "created_at": datetime.now(timezone.utc),
    })

    # Record like event
    req = InteractionEventRequest(
        item_id="vid_fitness_200",
        source=DiscoverySource.COMMUNITY,
        interaction_type=InteractionType.LIKE,
        watched_seconds=30.0,
        total_seconds=30.0,
    )
    success = await service.record_interaction("user_learner", req)
    assert success is True

    # User profile should have learned the interaction and added category
    profile = await service.get_user_preferences("user_learner")
    assert profile.interaction_count >= 1
    assert any("fitness" in cat or "workout" in cat for cat in profile.top_categories)

    # Verify event stored with 15-day TTL index capability
    event_doc = await mock_db["interaction_events"].find_one({"user_id": "user_learner"})
    assert event_doc is not None
    assert event_doc["interaction_type"] == "like"
