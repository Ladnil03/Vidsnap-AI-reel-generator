"""
Unit tests for Content domain service: publishing, drafts, scheduling, engagement, and retention.
"""

from datetime import datetime, timedelta, timezone

import pytest

from backend.app.content.models import (
    ContentStatus,
    ContentVisibility,
    CreateVideoRequest,
)
from backend.app.content.service import ContentService


@pytest.mark.asyncio
async def test_create_video_published_and_draft(mock_db):
    """Test creating public published videos and private drafts."""
    user_id = "user_content_1"
    author_name = "Creator One"

    # 1. Create published video
    req = CreateVideoRequest(
        title="My First Epic Reel",
        description="A great video description",
        hashtags=["#Epic", "#Viral"],
        visibility=ContentVisibility.PUBLIC,
        video_key="videos/user1/test.mp4",
        duration=15.5,
    )
    video = await ContentService.create_video(user_id, author_name, req)
    assert video.video_id is not None
    assert video.status == ContentStatus.PUBLISHED
    assert video.visibility == ContentVisibility.PUBLIC
    assert video.likes_count == 0

    # 2. Create draft
    draft_req = CreateVideoRequest(
        title="Draft Video Concept",
        description="Not ready yet",
        is_draft=True,
    )
    draft = await ContentService.create_video(user_id, author_name, draft_req)
    assert draft.status == ContentStatus.DRAFT

    # Verify drafts list
    drafts = await ContentService.list_user_drafts(user_id)
    assert len(drafts) == 1
    assert drafts[0].video_id == draft.video_id


@pytest.mark.asyncio
async def test_toggle_like_and_save_atomic_counters(mock_db):
    """Test liking, unliking, saving, and unsaving with atomic counter increments."""
    user_id = "user_like_1"
    req = CreateVideoRequest(title="Like Me Video", video_key="videos/u/vid.mp4")
    video = await ContentService.create_video(user_id, "User One", req)

    # 1. Like
    like_res = await ContentService.toggle_like(user_id, video.video_id)
    assert like_res.liked is True
    assert like_res.likes_count == 1

    # 2. Unlike
    unlike_res = await ContentService.toggle_like(user_id, video.video_id)
    assert unlike_res.liked is False
    assert unlike_res.likes_count == 0

    # 3. Save
    save_res = await ContentService.toggle_save(user_id, video.video_id)
    assert save_res.saved is True
    assert save_res.saves_count == 1

    # 4. Unsave
    unsave_res = await ContentService.toggle_save(user_id, video.video_id)
    assert unsave_res.saved is False
    assert unsave_res.saves_count == 0


@pytest.mark.asyncio
async def test_comment_creation_and_listing(mock_db):
    """Test commenting on a video and retrieving comments."""
    user_id = "commenter_1"
    req = CreateVideoRequest(title="Commentable Reel", video_key="videos/u/vid.mp4")
    video = await ContentService.create_video(user_id, "Creator", req)

    # Add comments
    c1 = await ContentService.add_comment(user_id, "Alice", video.video_id, "Super cool video!")
    assert c1.comment_id is not None
    assert c1.text == "Super cool video!"

    c2 = await ContentService.add_comment("user_2", "Bob", video.video_id, "Amazing editing!")
    assert c2.text == "Amazing editing!"

    # Verify comments list
    comments = await ContentService.list_comments(video.video_id)
    assert len(comments) == 2

    # Verify video document comments counter
    doc = await mock_db.videos.find_one({"video_id": video.video_id})
    assert doc["comments_count"] == 2


@pytest.mark.asyncio
async def test_publish_due_scheduled_videos(mock_db):
    """Test worker task auto-publishing scheduled videos when release time is reached."""
    user_id = "scheduler_user"
    past_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    future_time = datetime.now(timezone.utc) + timedelta(hours=2)

    # 1. Video whose scheduled time has passed
    req_due = CreateVideoRequest(title="Due Video", scheduled_at=past_time)
    due_vid = await ContentService.create_video(user_id, "Creator", req_due)
    # Manually ensure status is scheduled for testing past_time
    await mock_db.videos.update_one({"video_id": due_vid.video_id}, {"$set": {"status": ContentStatus.SCHEDULED.value}})

    # 2. Video scheduled for the future
    req_future = CreateVideoRequest(title="Future Video", scheduled_at=future_time)
    await ContentService.create_video(user_id, "Creator", req_future)

    # Run publisher
    published_count = await ContentService.publish_due_scheduled_videos()
    assert published_count == 1

    # Verify status transition
    doc = await mock_db.videos.find_one({"video_id": due_vid.video_id})
    assert doc["status"] == ContentStatus.PUBLISHED.value


@pytest.mark.asyncio
async def test_clean_expired_retention_reaper(mock_db):
    """Test retention reaper pruning drafts > 30 days and failed jobs > 24 hours."""
    now = datetime.now(timezone.utc)
    old_date = now - timedelta(days=35)
    recent_date = now - timedelta(days=5)

    # Old draft (should be deleted)
    await mock_db.videos.insert_one({
        "video_id": "old_draft_1",
        "status": ContentStatus.DRAFT.value,
        "created_at": old_date,
    })
    # Recent draft (should remain)
    await mock_db.videos.insert_one({
        "video_id": "recent_draft_1",
        "status": ContentStatus.DRAFT.value,
        "created_at": recent_date,
    })

    # Old failed job (should be deleted)
    await mock_db.jobs.insert_one({
        "job_id": "failed_job_1",
        "status": "failed",
        "created_at": now - timedelta(hours=30),
    })

    # Run reaper
    stats = await ContentService.clean_expired_retention(draft_retention_days=30, failed_job_retention_hours=24)
    assert stats["pruned_drafts"] == 1
    assert stats["pruned_failed_jobs"] == 1

    # Verify surviving records
    survivor = await mock_db.videos.find_one({"video_id": "recent_draft_1"})
    assert survivor is not None
