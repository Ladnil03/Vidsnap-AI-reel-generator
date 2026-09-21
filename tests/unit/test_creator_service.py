"""
Unit tests for CreatorService: profiles, verification applications, analytics, copilot, and events.
"""

from datetime import datetime, timedelta, timezone

import pytest

from backend.app.creator.models import (
    CreateEventRequest,
    CreatorCopilotRequest,
    UpdateCreatorProfileRequest,
    VerificationApplyRequest,
    VerificationStatus,
)
from backend.app.creator.service import CreatorService


@pytest.mark.asyncio
async def test_creator_profile_lifecycle(mock_db):
    """Test creator profile auto-provisioning and updating."""
    user_id = "test_creator_101"

    # Seed user in users collection
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Maya Lin",
        "username": "maya_creates",
        "email": "maya@creator.test",
    })

    # Fetch/create profile
    profile = await CreatorService.get_or_create_profile(user_id)
    assert profile.user_id == user_id
    assert profile.display_name == "Maya Lin"
    assert profile.handle == "maya_creates"
    assert profile.verification_status == VerificationStatus.NONE

    # Update profile
    updated = await CreatorService.update_profile(
        user_id,
        UpdateCreatorProfileRequest(
            bio="Visual artist and tech creator",
            niche="tech",
            social_links={"x": "https://x.com/maya", "youtube": "https://youtube.com/@maya"},
        ),
    )
    assert updated.bio == "Visual artist and tech creator"
    assert updated.niche == "tech"
    assert "youtube" in updated.social_links


@pytest.mark.asyncio
async def test_creator_verification_flow(mock_db):
    """Test submitting verification application and admin approval."""
    user_id = "test_creator_102"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Sam Solo",
        "username": "sam_solo",
        "email": "sam@creator.test",
    })
    await mock_db.videos.insert_one({
        "video_id": "vid_sam_1",
        "user_id": user_id,
        "status": "published",
        "title": "Sam's Comedy Reel",
    })

    # Submit verification application
    req = VerificationApplyRequest(
        niche="comedy",
        portfolio_links=["https://vidsnap.ai/profile/sam"],
        statement="Creator with 50+ original sketches seeking verified badge.",
    )
    app = await CreatorService.apply_verification(user_id, req)
    assert app.status == VerificationStatus.PENDING
    assert app.niche == "comedy"

    # Review and approve application
    reviewed = await CreatorService.review_verification(app.application_id, approved=True)
    assert reviewed.status == VerificationStatus.VERIFIED

    # Check updated creator profile
    profile = await CreatorService.get_or_create_profile(user_id)
    assert profile.verification_status == VerificationStatus.VERIFIED

    # Check creator role in user doc
    user_doc = await mock_db.users.find_one({"user_id": user_id})
    assert "creator" in user_doc.get("roles", [])


@pytest.mark.asyncio
async def test_creator_analytics_aggregation(mock_db):
    """Test analytics aggregation over creator videos."""
    user_id = "test_creator_103"

    # Insert published reels
    await mock_db.videos.insert_many([
        {
            "video_id": "v1",
            "creator_id": user_id,
            "status": "published",
            "views_count": 120,
            "likes_count": 25,
            "comments_count": 5,
            "duration_seconds": 30,
            "tags": ["tech", "ai", "future"],
        },
        {
            "video_id": "v2",
            "creator_id": user_id,
            "status": "published",
            "views_count": 80,
            "likes_count": 15,
            "comments_count": 3,
            "duration_seconds": 45,
            "tags": ["tech", "coding"],
        },
    ])

    analytics = await CreatorService.get_analytics(user_id, period_days=14)
    assert analytics.total_views == 200
    assert analytics.total_watch_seconds == (120 * 30 + 80 * 45)
    assert analytics.total_impressions > analytics.total_views
    assert len(analytics.top_tags) >= 1
    assert analytics.top_tags[0]["tag"] == "tech"
    assert len(analytics.daily_views_trend) > 0


@pytest.mark.asyncio
async def test_creator_copilot_insights(mock_db):
    """Test Creator Copilot generates hooks, viral scores, and hashtags."""
    user_id = "test_creator_104"
    req = CreatorCopilotRequest(
        topic="Micro SaaS in 2026",
        target_audience="Developers",
        mood_vibe="inspiring",
    )
    res = await CreatorService.generate_copilot_insights(user_id, req)
    assert res.topic == "Micro SaaS in 2026"
    assert len(res.hooks) >= 3
    assert 0 <= res.viral_potential_score <= 100
    assert "Peak" in res.optimal_posting_window
    assert len(res.recommended_hashtags) >= 3


@pytest.mark.asyncio
async def test_creator_event_scheduling(mock_db):
    """Test creator community watch party event scheduling."""
    user_id = "test_creator_105"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Eva Live",
        "username": "eva_live",
        "email": "eva@live.test",
    })

    future_time = datetime.now(timezone.utc) + timedelta(days=2)
    evt_req = CreateEventRequest(
        title="Live Q&A and Reel Breakdown",
        description="Behind the scenes editing session with viewers",
        scheduled_at=future_time,
    )
    event = await CreatorService.create_event(user_id, evt_req)
    assert event.title == "Live Q&A and Reel Breakdown"
    assert event.creator_id == user_id

    events = await CreatorService.list_events(creator_id=user_id)
    assert len(events) >= 1
    assert events[0].event_id == event.event_id
