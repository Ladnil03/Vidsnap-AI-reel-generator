"""
Security regression tests for W1-8: Gamification security, server-authoritative XP,
timezone-safe streaks, and concurrency guards.
"""

import asyncio
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from backend.app.content.models import CreateVideoRequest
from backend.app.content.service import ContentService
from backend.app.gamification.models import XPAction
from backend.app.gamification.service import GamificationService
from backend.app.identity.dependencies import get_current_user
from backend.app.recsys.models import DiscoverySource, InteractionEventRequest, InteractionType
from backend.app.recsys.service import RecSysService
from backend.app.rooms.models import CreateRoomRequest, RoomType
from backend.app.rooms.service import RoomService


@pytest.fixture
def regular_user():
    return {
        "user_id": "gam_sec_user_1",
        "name": "Regular User",
        "email": "user1@vidsnap.ai",
        "roles": ["user"],
    }


@pytest.fixture
def admin_user():
    return {
        "user_id": "gam_sec_admin_1",
        "name": "Admin User",
        "email": "admin@vidsnap.ai",
        "roles": ["admin"],
    }


@pytest.mark.asyncio
async def test_regular_user_cannot_award_arbitrary_xp(async_client: AsyncClient, regular_user):
    """POST /api/v1/gamification/xp/award must reject non-admin users with 403."""
    from backend.app.main import app
    app.dependency_overrides[get_current_user] = lambda: regular_user
    try:
        res = await async_client.post(
            "/api/v1/gamification/xp/award",
            json={
                "action": "create_reel",
                "idempotency_key": "forged_key_123",
                "amount": 1000,
            },
        )
        assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_forged_streak_date_has_no_effect(async_client: AsyncClient, mock_db, regular_user):
    """Client-supplied date_str must be ignored; server derives today's date in user's timezone."""
    from backend.app.main import app
    await mock_db.users.insert_one({
        "user_id": regular_user["user_id"],
        "email": regular_user["email"],
        "timezone": "UTC",
    })
    app.dependency_overrides[get_current_user] = lambda: regular_user
    try:
        # Client attempts to submit a forged future date
        res = await async_client.post(
            "/api/v1/gamification/streaks/record",
            json={
                "scope": "daily",
                "date_str": "2099-01-01",
            },
        )
        assert res.status_code == 200
        data = res.json()
        today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        assert data["last_active_date"] == today_utc
        assert data["last_active_date"] != "2099-01-01"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_content_create_video_awards_server_xp(mock_db, regular_user):
    """Publishing a video automatically awards XP server-side."""
    req = CreateVideoRequest(
        title="My Amazing Reel",
        duration=15.0,
        is_draft=False,
    )
    video = await ContentService.create_video(
        user_id=regular_user["user_id"],
        author_name=regular_user["name"],
        request=req,
    )

    ledger_entry = await mock_db.xp_ledger.find_one({
        "user_id": regular_user["user_id"],
        "idempotency_key": f"create_reel:{regular_user['user_id']}:{video.video_id}",
    })
    assert ledger_entry is not None
    assert ledger_entry["action"] == XPAction.CREATE_REEL.value


@pytest.mark.asyncio
async def test_like_unlike_like_awards_xp_only_once(mock_db, regular_user):
    """Liking awards XP once; unliking and liking again does not farm duplicate XP."""
    req = CreateVideoRequest(title="Like Farm Target", duration=10.0, is_draft=False)
    video = await ContentService.create_video(
        user_id="creator_abc",
        author_name="Creator ABC",
        request=req,
    )

    # 1. First like
    await ContentService.toggle_like(user_id=regular_user["user_id"], video_id=video.video_id)
    count1 = await mock_db.xp_ledger.count_documents({
        "user_id": regular_user["user_id"],
        "action": XPAction.LIKE_REEL.value,
    })
    assert count1 == 1

    # 2. Unlike
    await ContentService.toggle_like(user_id=regular_user["user_id"], video_id=video.video_id)

    # 3. Second like (should NOT award new XP)
    await ContentService.toggle_like(user_id=regular_user["user_id"], video_id=video.video_id)
    count2 = await mock_db.xp_ledger.count_documents({
        "user_id": regular_user["user_id"],
        "action": XPAction.LIKE_REEL.value,
    })
    assert count2 == 1


@pytest.mark.asyncio
async def test_comment_awards_xp_once_per_video_user(mock_db, regular_user):
    """Commenting on a video awards XP once; multiple comments on the same video do not farm XP."""
    req = CreateVideoRequest(title="Comment Target", duration=10.0, is_draft=False)
    video = await ContentService.create_video(
        user_id="creator_xyz",
        author_name="Creator XYZ",
        request=req,
    )

    await ContentService.add_comment(
        user_id=regular_user["user_id"],
        user_name=regular_user["name"],
        video_id=video.video_id,
        text="First comment!",
    )
    count1 = await mock_db.xp_ledger.count_documents({
        "user_id": regular_user["user_id"],
        "action": XPAction.COMMENT_REEL.value,
    })
    assert count1 == 1

    # Second comment on same video
    await ContentService.add_comment(
        user_id=regular_user["user_id"],
        user_name=regular_user["name"],
        video_id=video.video_id,
        text="Second comment on same video!",
    )
    count2 = await mock_db.xp_ledger.count_documents({
        "user_id": regular_user["user_id"],
        "action": XPAction.COMMENT_REEL.value,
    })
    assert count2 == 1


@pytest.mark.asyncio
async def test_watch_event_threshold_awards_xp(mock_db, regular_user):
    """Watching >= 5.0 seconds or completing awards XP; short views (< 5s) do not."""
    recsys = RecSysService(mock_db)

    # Short view (2 seconds) -> No XP
    short_req = InteractionEventRequest(
        item_id="vid_short_view",
        source=DiscoverySource.COMMUNITY,
        interaction_type=InteractionType.VIEW,
        watched_seconds=2.0,
        total_seconds=15.0,
    )
    await recsys.record_interaction(user_id=regular_user["user_id"], req=short_req)
    short_count = await mock_db.xp_ledger.count_documents({
        "user_id": regular_user["user_id"],
        "action": XPAction.WATCH_REEL.value,
    })
    assert short_count == 0

    # Meaningful view (8 seconds) -> XP awarded
    long_req = InteractionEventRequest(
        item_id="vid_meaningful_view",
        source=DiscoverySource.COMMUNITY,
        interaction_type=InteractionType.VIEW,
        watched_seconds=8.0,
        total_seconds=15.0,
    )
    await recsys.record_interaction(user_id=regular_user["user_id"], req=long_req)
    long_count = await mock_db.xp_ledger.count_documents({
        "user_id": regular_user["user_id"],
        "action": XPAction.WATCH_REEL.value,
    })
    assert long_count == 1


@pytest.mark.asyncio
async def test_hosting_watch_party_awards_xp(mock_db, regular_user):
    """Creating a Watch Together room automatically awards host XP."""
    req = CreateRoomRequest(name="Party Lounge", room_type=RoomType.PUBLIC)
    room = await RoomService.create_room(
        user_id=regular_user["user_id"],
        user_name=regular_user["name"],
        request=req,
    )

    ledger_entry = await mock_db.xp_ledger.find_one({
        "user_id": regular_user["user_id"],
        "idempotency_key": f"watch_party_host:{regular_user['user_id']}:{room.room_id}",
    })
    assert ledger_entry is not None
    assert ledger_entry["action"] == XPAction.WATCH_PARTY_HOST.value


@pytest.mark.asyncio
async def test_concurrent_award_xp_yields_one_ledger_row(mock_db, regular_user):
    """Concurrent identical award_xp calls with same idempotency key yield exactly 1 ledger row."""
    key = f"concurrent_test_key_{regular_user['user_id']}"

    results = await asyncio.gather(
        *(
            GamificationService.award_xp(
                user_id=regular_user["user_id"],
                action=XPAction.CREATE_REEL,
                idempotency_key=key,
                amount=50,
            )
            for _ in range(5)
        ),
        return_exceptions=True,
    )

    # No unhandled exceptions
    for res in results:
        assert not isinstance(res, Exception), f"Unexpected exception: {res}"

    ledger_count = await mock_db.xp_ledger.count_documents({"idempotency_key": key})
    assert ledger_count == 1

    # Total XP awarded exactly once
    level = await GamificationService.get_user_level(regular_user["user_id"])
    assert level.current_xp == 50


@pytest.mark.asyncio
async def test_concurrent_awards_respect_daily_cap(mock_db, regular_user):
    """Daily cap for actions holds strictly under concurrent award calls."""
    from backend.app.gamification.models import DAILY_ACTION_CAPS

    action = XPAction.COMMENT_REEL
    cap = DAILY_ACTION_CAPS[action]  # 50 XP
    user_id = "cap_test_user_conc"

    # Launch 20 concurrent awards of 5 XP each (total requested 100 XP, cap is 50 XP)
    await asyncio.gather(
        *(
            GamificationService.award_xp(
                user_id=user_id,
                action=action,
                idempotency_key=f"comment_cap_test_{user_id}_{i}",
                amount=5,
            )
            for i in range(20)
        )
    )

    level = await GamificationService.get_user_level(user_id)
    assert level.current_xp == cap

