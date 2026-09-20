"""
Integration tests for Real-Time Watch Together WebSocket Gateway (/api/v1/rooms/{room_id}/ws).
Tests auth handshake, presence heartbeats, chat broadcast, reaction bursts, and synchronized playback.
"""

import json

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from backend.app.core.security import create_access_token
from backend.app.main import app
from backend.app.rooms.models import ControlMode, CreateRoomRequest, RoomType
from backend.app.rooms.service import RoomService


@pytest.mark.asyncio
async def test_rooms_websocket_connection_and_heartbeat(mock_db):
    """Test connecting to room WebSocket with auth token, receiving user_joined, and ping/pong."""
    user_id = "ws_user_alpha"
    email = "alpha@vidsnap.ai"
    token = create_access_token(user_id=user_id, email=email)

    # 1. Create a room
    req = CreateRoomRequest(name="WS Chill Party", room_type=RoomType.PUBLIC)
    room = await RoomService.create_room(user_id, "Alice Alpha", req)

    # 2. Connect via TestClient
    client = TestClient(app)
    with client.websocket_connect(f"/api/v1/rooms/{room.room_id}/ws?token={token}") as websocket:
        # Upon connection, manager broadcasts 'user_joined'
        joined_raw = websocket.receive_text()
        joined_data = json.loads(joined_raw)
        assert joined_data["type"] == "user_joined"
        assert joined_data["user_id"] == user_id

        # Send heartbeat ping
        websocket.send_text(json.dumps({"type": "ping"}))
        pong_raw = websocket.receive_text()
        pong_data = json.loads(pong_raw)
        assert pong_data["type"] == "pong"


@pytest.mark.asyncio
async def test_rooms_websocket_chat_and_reaction_broadcast(mock_db):
    """Test sending chat messages and emoji reaction bursts over WebSocket."""
    user_id = "ws_user_beta"
    email = "beta@vidsnap.ai"
    token = create_access_token(user_id=user_id, email=email)

    req = CreateRoomRequest(name="Chat & Burst Party", room_type=RoomType.PUBLIC)
    room = await RoomService.create_room(user_id, "Bob Beta", req)

    client = TestClient(app)
    with client.websocket_connect(f"/api/v1/rooms/{room.room_id}/ws?token={token}") as websocket:
        # Drain join event
        websocket.receive_text()

        # 1. Send chat message
        websocket.send_text(json.dumps({"type": "chat", "text": "Let's watch this reel!"}))
        chat_raw = websocket.receive_text()
        chat_data = json.loads(chat_raw)
        assert chat_data["type"] == "chat"
        assert chat_data["message"]["text"] == "Let's watch this reel!"
        assert chat_data["message"]["user_id"] == user_id

        # 2. Send emoji reaction burst
        websocket.send_text(json.dumps({"type": "reaction", "emoji": "🎉"}))
        reaction_raw = websocket.receive_text()
        reaction_data = json.loads(reaction_raw)
        assert reaction_data["type"] == "reaction"
        assert reaction_data["emoji"] == "🎉"
        assert reaction_data["user_id"] == user_id


@pytest.mark.asyncio
async def test_rooms_websocket_sync_playback_state(mock_db):
    """Test updating room playback position and broadcasting authoritative sync state."""
    host_id = "ws_host_sync"
    token = create_access_token(user_id=host_id, email="host@vidsnap.ai")

    req = CreateRoomRequest(
        name="Sync Stream Party",
        room_type=RoomType.PUBLIC,
        control_mode=ControlMode.HOST_ONLY,
    )
    room = await RoomService.create_room(host_id, "Captain Host", req)

    client = TestClient(app)
    with client.websocket_connect(f"/api/v1/rooms/{room.room_id}/ws?token={token}") as websocket:
        # Drain join event
        websocket.receive_text()

        # Host sends play command at 45.0 seconds
        websocket.send_text(
            json.dumps({
                "type": "sync_action",
                "action": "play",
                "position_seconds": 45.0,
            })
        )
        sync_raw = websocket.receive_text()
        sync_data = json.loads(sync_raw)
        assert sync_data["type"] == "sync_state"
        assert sync_data["watch_state"]["state"] == "playing"
        assert sync_data["watch_state"]["position_seconds"] == 45.0


@pytest.mark.asyncio
async def test_rooms_websocket_unauthenticated_close():
    """Connecting without token and failing handshake closes connection with 4001."""
    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/api/v1/rooms/room_no_auth/ws") as websocket:
            # Send non-auth invalid payload
            websocket.send_text(json.dumps({"type": "hello"}))
            websocket.receive_text()
    assert exc.value.code == 4001
