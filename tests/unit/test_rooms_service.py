"""
Unit tests for RoomService: room lifecycle, Watch Together state machine, permissions, and presence.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from backend.app.rooms.models import (
    ControlMode,
    CreateRoomRequest,
    PlaybackState,
    RoomType,
    SyncActionRequest,
)
from backend.app.rooms.service import RoomService


@pytest.mark.asyncio
async def test_create_and_get_public_room(mock_db):
    """Test creating a public watch party room and retrieving room details."""
    user_id = "host_user_1"
    user_name = "Host Creator"

    request = CreateRoomRequest(
        name="Epic Tech Shorts Party",
        description="Watching AI breakthroughs together",
        room_type=RoomType.PUBLIC,
        control_mode=ControlMode.HOST_ONLY,
        initial_media_url="https://media.vidsnap.ai/videos/tech_reel.mp4",
        initial_media_title="Tech Reel 2026",
    )

    room = await RoomService.create_room(user_id, user_name, request)
    assert room.room_id.startswith("room_")
    assert room.name == "Epic Tech Shorts Party"
    assert room.host_id == user_id
    assert room.room_type == RoomType.PUBLIC
    assert room.watch_state.media_url == "https://media.vidsnap.ai/videos/tech_reel.mp4"
    assert room.watch_state.state == PlaybackState.PAUSED


@pytest.mark.asyncio
async def test_private_room_passcode_validation(mock_db):
    """Test joining private room requires matching passcode."""
    host_id = "host_user_2"
    request = CreateRoomRequest(
        name="Secret VIP Watch Room",
        room_type=RoomType.PRIVATE,
        passcode="secret_code_123",
    )

    room = await RoomService.create_room(host_id, "VIP Host", request)

    # 1. Join with correct passcode should succeed
    joined = await RoomService.join_room(room.room_id, "guest_user", "Guest", passcode="secret_code_123")
    assert joined.room_id == room.room_id

    # 2. Join with incorrect passcode must raise 403 Forbidden
    with pytest.raises(HTTPException) as exc:
        await RoomService.join_room(room.room_id, "guest_hacker", "Hacker", passcode="wrong_code")
    assert exc.value.status_code == 403
    assert "invalid room passcode" in str(exc.value.detail).lower()


@pytest.mark.asyncio
async def test_watch_together_state_machine_and_drift(mock_db):
    """Test server-authoritative playback position calculation while playing."""
    host_id = "host_sync"
    request = CreateRoomRequest(
        name="Sync Test Room",
        room_type=RoomType.PUBLIC,
        control_mode=ControlMode.HOST_ONLY,
    )
    room = await RoomService.create_room(host_id, "Host", request)

    # 1. Host plays video at position 10.0s
    action_play = SyncActionRequest(action="play", position_seconds=10.0)
    updated_watch = await RoomService.apply_sync_action(room.room_id, host_id, action_play)
    assert updated_watch.state == PlaybackState.PLAYING
    assert updated_watch.position_seconds == 10.0

    # 2. Simulate 5 seconds having elapsed in database
    past_time = datetime.now(timezone.utc) - timedelta(seconds=5)
    await mock_db.rooms.update_one(
        {"room_id": room.room_id},
        {"$set": {"watch_state.last_updated_at": past_time}},
    )

    # 3. Reading room should compute elapsed position (10.0 + 5.0 = ~15.0s)
    current_room = await RoomService.get_room(room.room_id)
    assert current_room.watch_state.position_seconds >= 14.9


@pytest.mark.asyncio
async def test_host_only_control_mode_enforcement(mock_db):
    """Non-hosts must be rejected when room control_mode is HOST_ONLY."""
    host_id = "host_strict"
    viewer_id = "random_viewer"

    request = CreateRoomRequest(
        name="Host Controlled Only",
        control_mode=ControlMode.HOST_ONLY,
    )
    room = await RoomService.create_room(host_id, "Host", request)

    # Viewer attempts to pause
    action_pause = SyncActionRequest(action="pause")
    with pytest.raises(HTTPException) as exc:
        await RoomService.apply_sync_action(room.room_id, viewer_id, action_pause)

    assert exc.value.status_code == 403
    assert "only the room host can control video playback" in str(exc.value.detail).lower()


@pytest.mark.asyncio
async def test_chat_message_persistence_and_retrieval(mock_db):
    """Test adding chat messages to a room and fetching recent history."""
    room_id = "room_chat_test"
    msg1 = await RoomService.add_chat_message(room_id, "u1", "Alice", "Hello watch party!")
    msg2 = await RoomService.add_chat_message(room_id, "u2", "Bob", "Hyped for this reel!")

    history = await RoomService.get_chat_history(room_id, limit=10)
    assert len(history) == 2
    assert history[0].message_id == msg1.message_id
    assert history[1].message_id == msg2.message_id
    assert history[0].text == "Hello watch party!"
