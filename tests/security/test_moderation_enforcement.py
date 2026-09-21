"""
Regression tests for W1-9: Moderation Wiring & Safety Enforcement.
Ensures unmoderated, flagged, and blocked content cannot be ingested,
recsys / discovery / feeds do not leak unapproved content,
comments and room chat are moderated,
and moderation review queue endpoints support the 'moderator' role.
"""

from unittest.mock import patch

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from backend.app.business.models import CreateCampaignRequest
from backend.app.business.service import BusinessService
from backend.app.content.models import (
    ContentStatus,
    CreateVideoRequest,
)
from backend.app.content.service import ContentService
from backend.app.identity.dependencies import get_current_user
from backend.app.main import app
from backend.app.recsys.service import RecSysService
from backend.app.rooms.service import RoomService


@pytest.fixture
def test_user():
    return {
        "user_id": "usr_mod_author_1",
        "name": "Author Alice",
        "email": "alice@vidsnap.ai",
        "roles": ["user"],
    }


@pytest.fixture
def moderator_user():
    return {
        "user_id": "usr_mod_staff_1",
        "name": "Moderator Bob",
        "email": "bob@vidsnap.ai",
        "roles": ["moderator"],
    }


# --------------------------------------------------------------------------
# 1. Video Ingestion Moderation
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_video_creation_blocked_toxic_content(mock_db, test_user):
    """Creating a video with severe toxic content must fail immediately (HTTP 422)."""
    req = CreateVideoRequest(
        title="Harmful Title",
        description="Go kill yourself right now",
        duration=10.0,
    )
    with pytest.raises(HTTPException) as exc_info:
        await ContentService.create_video(
            user_id=test_user["user_id"],
            author_name=test_user["name"],
            request=req,
        )
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_video_creation_flagged_content_sets_in_review(mock_db, test_user):
    """Creating a video with flagged content must not be published immediately; sets status='in_review'."""
    req = CreateVideoRequest(
        title="Check this out bitch",
        description="harassment text here",
        duration=10.0,
    )
    video = await ContentService.create_video(
        user_id=test_user["user_id"],
        author_name=test_user["name"],
        request=req,
    )
    assert video.status == ContentStatus.IN_REVIEW
    assert getattr(video, "moderation_status", None) == "flagged"


@pytest.mark.asyncio
async def test_video_creation_fails_closed_on_moderation_error(mock_db, test_user):
    """If moderation service throws an error during creation, fail closed (status='in_review')."""
    req = CreateVideoRequest(
        title="Innocent Video",
        description="Should pass but moderation service crashes",
        duration=10.0,
    )
    with patch(
        "backend.app.moderation.service.ModerationService.scan_content_text",
        side_effect=RuntimeError("AI safety provider unavailable"),
    ):
        video = await ContentService.create_video(
            user_id=test_user["user_id"],
            author_name=test_user["name"],
            request=req,
        )
        assert video.status == ContentStatus.IN_REVIEW
        assert getattr(video, "moderation_status", None) == "pending"


# --------------------------------------------------------------------------
# 2. Public Feeds & RecSys Filtering
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unmoderated_video_hidden_from_public_feed_and_viewers(mock_db, test_user):
    """Videos in_review or flagged must not appear in public feeds or to other users."""
    # 1. Clean approved video
    clean_req = CreateVideoRequest(title="Sunny Beach Walk", description="A beautiful day", duration=15.0)
    clean_vid = await ContentService.create_video(
        user_id=test_user["user_id"],
        author_name=test_user["name"],
        request=clean_req,
    )

    # 2. Flagged video
    flagged_req = CreateVideoRequest(title="Free crypto giveaway", description="dm to claim", duration=15.0)
    flagged_vid = await ContentService.create_video(
        user_id=test_user["user_id"],
        author_name=test_user["name"],
        request=flagged_req,
    )

    # Public list_videos for other users must only contain clean_vid
    viewer_feed = await ContentService.list_videos(current_user_id="other_viewer_123")
    feed_ids = [v.video_id for v in viewer_feed]
    assert clean_vid.video_id in feed_ids
    assert flagged_vid.video_id not in feed_ids

    # Direct get_video by another user on flagged_vid must be forbidden / 404
    with pytest.raises(HTTPException) as exc_info:
        await ContentService.get_video(flagged_vid.video_id, current_user_id="other_viewer_123")
    assert exc_info.value.status_code in (403, 404)

    # But author CAN still retrieve their own video
    author_view = await ContentService.get_video(flagged_vid.video_id, current_user_id=test_user["user_id"])
    assert author_view.video_id == flagged_vid.video_id


@pytest.mark.asyncio
async def test_unapproved_video_excluded_from_recsys(mock_db, test_user):
    """Recsys candidate pool must only select published & moderation-approved reels."""
    # Direct DB injection simulating a published video that was flagged or unapproved
    await mock_db.videos.insert_one({
        "video_id": "vid_flagged_leak_test",
        "user_id": "some_user_xyz",
        "author_name": "Some User",
        "title": "Flagged Video",
        "description": "Spam video",
        "hashtags": ["viral"],
        "video_url": "https://cdn.vidsnap.ai/test.mp4",
        "duration": 15.0,
        "visibility": "public",
        "status": "published",
        "moderation_status": "flagged",
        "deleted": False,
    })

    recsys = RecSysService(mock_db)
    recs = await recsys.get_recommendations(user_id="viewer_test_recsys", limit=20)
    rec_ids = [item.video_id for item in recs.items]
    assert "vid_flagged_leak_test" not in rec_ids


# --------------------------------------------------------------------------
# 3. Comment Moderation
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_comment_moderation_blocks_toxic_content(mock_db, test_user):
    """Posting a toxic comment must be rejected with 400 Bad Request."""
    clean_req = CreateVideoRequest(title="Nice Reel", description="Chill vibes", duration=10.0)
    video = await ContentService.create_video(
        user_id=test_user["user_id"],
        author_name=test_user["name"],
        request=clean_req,
    )

    with pytest.raises(HTTPException) as exc_info:
        await ContentService.add_comment(
            user_id="commenter_1",
            user_name="Commenter",
            video_id=video.video_id,
            text="go die kill yourself",
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_comment_moderation_flags_and_hides_content(mock_db, test_user):
    """Flagged comments must have is_hidden=True and be omitted from list_comments."""
    clean_req = CreateVideoRequest(title="Nice Reel 2", description="Chill vibes", duration=10.0)
    video = await ContentService.create_video(
        user_id=test_user["user_id"],
        author_name=test_user["name"],
        request=clean_req,
    )

    comment = await ContentService.add_comment(
        user_id="commenter_2",
        user_name="Commenter 2",
        video_id=video.video_id,
        text="free crypto giveaway click link in bio",
    )
    comments = await ContentService.list_comments(video_id=video.video_id)
    comment_ids = [c.comment_id for c in comments]
    assert comment.comment_id not in comment_ids


# --------------------------------------------------------------------------
# 4. Room Chat Moderation
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_room_chat_moderation_blocks_toxic(mock_db, test_user):
    """Sending toxic messages in watch room chat must be rejected with 400."""
    from backend.app.rooms.models import CreateRoomRequest
    room = await RoomService.create_room(
        user_id=test_user["user_id"],
        user_name=test_user["name"],
        request=CreateRoomRequest(name="Movie Night"),
    )
    with pytest.raises(HTTPException) as exc_info:
        await RoomService.add_chat_message(
            room_id=room.room_id,
            user_id=test_user["user_id"],
            user_name=test_user["name"],
            text="kys and hang yourself",
        )
    assert exc_info.value.status_code == 400


# --------------------------------------------------------------------------
# 5. Brand Brief Moderation
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_brand_brief_moderation_blocks_toxic(mock_db, test_user):
    """Creating a brand campaign brief with prohibited text must be rejected with 422."""
    from datetime import datetime, timedelta, timezone
    req = CreateCampaignRequest(
        title="Hacked accounts giveaway campaign",
        description="We sell counterfeit items and hacked accounts",
        category="Tech",
        budget_perk="$500 Cash",
        target_creators_count=3,
        deadline=datetime.now(timezone.utc) + timedelta(days=7),
    )
    with pytest.raises(HTTPException) as exc_info:
        await BusinessService.create_campaign(user_id=test_user["user_id"], request=req)
    assert exc_info.value.status_code == 422


# --------------------------------------------------------------------------
# 6. Moderation Queue RBAC: Moderator and Admin Allowed, User Forbidden
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_moderator_role_can_access_queue(async_client: AsyncClient, mock_db, moderator_user):
    """User with 'moderator' role can access /api/v1/moderation/queue."""
    app.dependency_overrides[get_current_user] = lambda: moderator_user
    try:
        res = await async_client.get("/api/v1/moderation/queue")
        assert res.status_code == 200
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_regular_user_cannot_access_queue(async_client: AsyncClient, mock_db, test_user):
    """User with only 'user' role cannot access /api/v1/moderation/queue (403 Forbidden)."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    try:
        res = await async_client.get("/api/v1/moderation/queue")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)
