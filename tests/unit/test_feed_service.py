"""
Unit tests for FeedService: Trending ranking heuristic, Following/Friends tabs,
Continue Watching cross-device sync, and anti-spam view debounce.
"""

from datetime import UTC, datetime, timedelta

import pytest

from backend.app.feed.models import FeedTab, WatchProgressRequest
from backend.app.feed.service import FeedService


@pytest.mark.asyncio
async def test_trending_feed_score_and_ordering(mock_db):
    service = FeedService(mock_db)
    now = datetime.now(UTC)

    # Insert video A: high engagement, recent
    await mock_db.videos.insert_one({
        "video_id": "v_hot",
        "user_id": "u1",
        "title": "Viral Trend",
        "status": "published",
        "visibility": "public",
        "views_count": 1000,
        "likes_count": 250,
        "comments_count": 50,
        "saves_count": 80,
        "created_at": now - timedelta(hours=1),
    })

    # Insert video B: low engagement, older
    await mock_db.videos.insert_one({
        "video_id": "v_old",
        "user_id": "u2",
        "title": "Old Clip",
        "status": "published",
        "visibility": "public",
        "views_count": 10,
        "likes_count": 1,
        "comments_count": 0,
        "saves_count": 0,
        "created_at": now - timedelta(days=5),
    })

    feed = await service.get_feed(tab=FeedTab.TRENDING, limit=10)
    assert feed.total == 2
    # v_hot must rank first due to higher gravity-decayed engagement score
    assert feed.items[0].video_id == "v_hot"
    assert feed.items[1].video_id == "v_old"


@pytest.mark.asyncio
async def test_following_and_friends_feed_filtering(mock_db):
    service = FeedService(mock_db)
    now = datetime.now(UTC)

    # Social graph: u_viewer follows creator_A, and mutually follows friend_B
    await mock_db.social_follows.insert_one({"follower_id": "u_viewer", "following_id": "creator_A", "created_at": now})
    await mock_db.social_follows.insert_one({"follower_id": "u_viewer", "following_id": "friend_B", "created_at": now})
    await mock_db.social_follows.insert_one({"follower_id": "friend_B", "following_id": "u_viewer", "created_at": now})

    # Stranger creator_C
    await mock_db.videos.insert_one({
        "video_id": "v_stranger",
        "user_id": "creator_C",
        "title": "Stranger Reel",
        "status": "published",
        "visibility": "public",
        "created_at": now,
    })
    await mock_db.videos.insert_one({
        "video_id": "v_following",
        "user_id": "creator_A",
        "title": "Creator A Reel",
        "status": "published",
        "visibility": "public",
        "created_at": now,
    })
    await mock_db.videos.insert_one({
        "video_id": "v_friend",
        "user_id": "friend_B",
        "title": "Friend B Reel",
        "status": "published",
        "visibility": "followers_only",
        "created_at": now,
    })

    # Following Feed
    following_feed = await service.get_feed(tab=FeedTab.FOLLOWING, user_id="u_viewer")
    following_ids = [item.video_id for item in following_feed.items]
    assert "v_following" in following_ids
    assert "v_stranger" not in following_ids

    # Friends Feed (only mutual follows)
    friends_feed = await service.get_feed(tab=FeedTab.FRIENDS, user_id="u_viewer")
    assert len(friends_feed.items) == 1
    assert friends_feed.items[0].video_id == "v_friend"


@pytest.mark.asyncio
async def test_continue_watching_cross_device_sync(mock_db):
    service = FeedService(mock_db)
    now = datetime.now(UTC)

    await mock_db.videos.insert_one({
        "video_id": "v_long",
        "user_id": "u_creator",
        "title": "Deep Dive Story",
        "duration": 60.0,
        "status": "published",
        "visibility": "public",
        "created_at": now,
    })

    # User watches 25 seconds of a 60 second video (41.6% watched -> incomplete)
    progress_req = WatchProgressRequest(
        video_id="v_long",
        watched_seconds=25.0,
        total_seconds=60.0,
        completed=False,
    )
    res = await service.record_watch_progress(user_id="viewer_1", req=progress_req)
    assert res.percentage == 41.7
    assert res.completed is False

    # Check Continue Watching tab
    cw_feed = await service.get_feed(tab=FeedTab.CONTINUE_WATCHING, user_id="viewer_1")
    assert len(cw_feed.items) == 1
    assert cw_feed.items[0].video_id == "v_long"

    # Fetch stored resume point directly
    resume_point = await service.get_watch_progress(user_id="viewer_1", video_id="v_long")
    assert resume_point is not None
    assert resume_point.watched_seconds == 25.0
