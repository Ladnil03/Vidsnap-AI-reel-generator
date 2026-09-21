"""
Regression tests for W2-1 (WebSocket double delivery) and W2-2 (WebSocket hardening).
"""

import json

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from backend.app.core.security import create_access_token
from backend.app.main import app
from backend.app.rooms.models import ControlMode, CreateRoomRequest, RoomType
from backend.app.rooms.service import RoomService

# ---------------------------------------------------------------------------
# W2-1: Double Delivery
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ws_no_duplicate_messages_with_redis(mock_db):
    """When Redis pub/sub is active, a client must receive each broadcast
    exactly once — not twice (once from local + once from subscriber)."""
    user_id = "ws_dedup_user"
    token = create_access_token(user_id=user_id, email="dedup@vidsnap.ai")

    req = CreateRoomRequest(name="Dedup Room", room_type=RoomType.PUBLIC)
    room = await RoomService.create_room(user_id, "Dedup Tester", req)

    client = TestClient(app)
    with client.websocket_connect(
        f"/api/v1/rooms/{room.room_id}/ws?token={token}"
    ) as websocket:
        # Drain user_joined event
        joined = json.loads(websocket.receive_text())
        assert joined["type"] == "user_joined"

        # Send a chat message — should get exactly ONE chat broadcast back
        websocket.send_text(json.dumps({"type": "chat", "text": "Hello once!"}))
        chat_msg = json.loads(websocket.receive_text())
        assert chat_msg["type"] == "chat"
        assert chat_msg["message"]["text"] == "Hello once!"

        # Send ping to verify the socket is still open and no buffered dup
        websocket.send_text(json.dumps({"type": "ping"}))
        pong = json.loads(websocket.receive_text())
        assert pong["type"] == "pong"
        # If a duplicate had been buffered, we would have received it
        # before the pong — test passes only if exactly one chat was received.


# ---------------------------------------------------------------------------
# W2-2: WebSocket Hardening
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ws_rejects_oversize_frame(mock_db):
    """Messages larger than the configured max frame size must be silently
    dropped or rejected (connection stays open for normal messages)."""
    user_id = "ws_oversize_user"
    token = create_access_token(user_id=user_id, email="oversize@vidsnap.ai")

    req = CreateRoomRequest(name="Oversize Room", room_type=RoomType.PUBLIC)
    room = await RoomService.create_room(user_id, "Oversize Tester", req)

    client = TestClient(app)
    with client.websocket_connect(
        f"/api/v1/rooms/{room.room_id}/ws?token={token}"
    ) as websocket:
        websocket.receive_text()  # drain join

        # Send oversize payload (>4 KB)
        huge = json.dumps({"type": "chat", "text": "A" * 5000})
        websocket.send_text(huge)

        # Should receive an error or the message should be dropped;
        # a subsequent ping must still work
        resp = json.loads(websocket.receive_text())
        assert resp["type"] == "error"

        # Connection still alive
        websocket.send_text(json.dumps({"type": "ping"}))
        pong = json.loads(websocket.receive_text())
        assert pong["type"] == "pong"


@pytest.mark.asyncio
async def test_ws_rejects_long_chat_text(mock_db):
    """Chat text exceeding 500 chars must be rejected."""
    user_id = "ws_longchat_user"
    token = create_access_token(user_id=user_id, email="longchat@vidsnap.ai")

    req = CreateRoomRequest(name="LongChat Room", room_type=RoomType.PUBLIC)
    room = await RoomService.create_room(user_id, "Long Tester", req)

    client = TestClient(app)
    with client.websocket_connect(
        f"/api/v1/rooms/{room.room_id}/ws?token={token}"
    ) as websocket:
        websocket.receive_text()  # drain join

        websocket.send_text(json.dumps({"type": "chat", "text": "B" * 501}))
        resp = json.loads(websocket.receive_text())
        assert resp["type"] == "error"
        assert "too long" in resp.get("detail", resp.get("message", "")).lower()


@pytest.mark.asyncio
async def test_ws_non_host_sync_action_rejected(mock_db):
    """A non-host user must not be able to send sync_action in HOST_ONLY mode."""
    host_id = "ws_host_only"
    guest_id = "ws_guest_sync"
    create_access_token(user_id=host_id, email="host@vidsnap.ai")  # host exists
    guest_token = create_access_token(user_id=guest_id, email="guest@vidsnap.ai")

    req = CreateRoomRequest(
        name="Host-Only Room",
        room_type=RoomType.PUBLIC,
        control_mode=ControlMode.HOST_ONLY,
    )
    room = await RoomService.create_room(host_id, "Host Boss", req)

    client = TestClient(app)
    # Guest connects and tries sync action
    with client.websocket_connect(
        f"/api/v1/rooms/{room.room_id}/ws?token={guest_token}"
    ) as websocket:
        websocket.receive_text()  # drain join

        websocket.send_text(
            json.dumps({
                "type": "sync_action",
                "action": "play",
                "position_seconds": 0.0,
            })
        )
        resp = json.loads(websocket.receive_text())
        assert resp["type"] == "error"


@pytest.mark.asyncio
async def test_ws_unknown_message_type_rejected(mock_db):
    """Unknown message types must receive an error response."""
    user_id = "ws_unknown_type_user"
    token = create_access_token(user_id=user_id, email="unknown@vidsnap.ai")

    req = CreateRoomRequest(name="Unknown Type Room", room_type=RoomType.PUBLIC)
    room = await RoomService.create_room(user_id, "Unknown Tester", req)

    client = TestClient(app)
    with client.websocket_connect(
        f"/api/v1/rooms/{room.room_id}/ws?token={token}"
    ) as websocket:
        websocket.receive_text()  # drain join

        websocket.send_text(json.dumps({"type": "hack_the_planet"}))
        resp = json.loads(websocket.receive_text())
        assert resp["type"] == "error"
        assert "unknown" in resp.get("detail", resp.get("message", "")).lower()


@pytest.mark.asyncio
async def test_ws_expired_token_rejected(mock_db):
    """A WebSocket connection with an expired JWT should be closed with 4001/4401."""
    user_id = "ws_expired_user"
    # Create a token that's already expired (negative expiry)
    from datetime import timedelta
    token = create_access_token(
        user_id=user_id,
        email="expired@vidsnap.ai",
        expires_delta=timedelta(seconds=-10),
    )

    req = CreateRoomRequest(name="Expired Token Room", room_type=RoomType.PUBLIC)
    room = await RoomService.create_room("room_creator", "Creator", req)

    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(
            f"/api/v1/rooms/{room.room_id}/ws?token={token}"
        ) as websocket:
            websocket.receive_text()
    # Should close with 4001 (auth failed) or 4401 (expired)
    assert exc.value.code in (4001, 4401)
