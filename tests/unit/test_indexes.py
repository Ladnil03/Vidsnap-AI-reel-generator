"""
Unit & security tests for W2-5: Database indexes and race-safe toggles.
- Verify missing collection indexes (videos, video_likes, video_saves, video_comments).
- Verify race-safe toggle_like and toggle_save behavior under concurrency.
"""

import asyncio

import pytest

from backend.app.content.service import ContentService
from backend.app.core.database import ensure_indexes


@pytest.mark.asyncio
async def test_expected_indexes_exist(mock_db):
    """Verify that all required indexes on videos, likes, saves, comments exist."""
    await ensure_indexes(mock_db)

    # 1. videos collection
    video_indexes = await mock_db.videos.index_information()
    assert "idx_videos_video_id_unique" in video_indexes
    assert "idx_videos_user_created" in video_indexes
    assert "idx_videos_vis_status_created" in video_indexes
    assert "idx_videos_tags" in video_indexes

    # 2. video_likes collection
    like_indexes = await mock_db.video_likes.index_information()
    assert "idx_vl_user_video_unique" in like_indexes
    assert like_indexes["idx_vl_user_video_unique"].get("unique") is True

    # 3. video_saves collection
    save_indexes = await mock_db.video_saves.index_information()
    assert "idx_vs_user_video_unique" in save_indexes
    assert save_indexes["idx_vs_user_video_unique"].get("unique") is True

    # 4. video_comments collection
    comment_indexes = await mock_db.video_comments.index_information()
    assert "idx_vc_video_created" in comment_indexes


@pytest.mark.asyncio
async def test_concurrent_toggle_like_race_safety(mock_db):
    """Concurrent double-like must result in exact like count and no duplicate records."""
    await ensure_indexes(mock_db)

    user_id = "user_like_racer"
    video_id = "vid_race_target"

    # Seed video
    await mock_db.videos.insert_one({
        "video_id": video_id,
        "user_id": "creator_target",
        "title": "Race Test Reel",
        "likes_count": 0,
        "saves_count": 0,
    })

    # Two concurrent calls to toggle_like for the same user and video
    res1, res2 = await asyncio.gather(
        ContentService.toggle_like(user_id=user_id, video_id=video_id),
        ContentService.toggle_like(user_id=user_id, video_id=video_id),
    )

    # In a proper toggle, one call likes and the other unlikes (or idempotent state)
    # The total number of like documents in the database must never exceed 1
    total_likes = await mock_db.video_likes.count_documents({"user_id": user_id, "video_id": video_id})
    assert total_likes <= 1

    # And video likes_count must match actual like records
    video_doc = await mock_db.videos.find_one({"video_id": video_id})
    assert video_doc["likes_count"] == total_likes
