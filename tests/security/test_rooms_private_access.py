"""
Regression tests for W1-7: private room access control, passcode policy, and cleanup.
"""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from backend.app.core.security import create_access_token
from backend.app.identity.dependencies import get_current_user
from backend.app.main import app


@pytest.fixture
def host_user():
    uid = f"sec_host_{uuid.uuid4().hex[:6]}"
    return {"user_id": uid, "name": "Secure Host", "email": f"{uid}@vidsnap.ai", "roles": ["creator"]}


@pytest.fixture
def intruder():
    uid = f"sec_intruder_{uuid.uuid4().hex[:6]}"
    return {"user_id": uid, "name": "Intruder", "email": f"{uid}@vidsnap.ai", "roles": ["user"]}


async def _create_private_room(
    async_client: AsyncClient, auth_user: dict[str, Any], control_mode: str = "host_only"
) -> str:
    app.dependency_overrides[get_current_user] = lambda: auth_user
    try:
        res = await async_client.post(
            "/api/v1/rooms",
            json={
                "name": "Secret Room",
                "room_type": "private",
                "passcode": "secret12345",
                "control_mode": control_mode,
            },
        )
        assert res.status_code == 201
        return res.json()["room_id"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_private_room_detail_requires_membership(async_client: AsyncClient, mock_db, host_user, intruder):
    await mock_db.users.insert_one(intruder)
    room_id = await _create_private_room(async_client, host_user)

    app.dependency_overrides[get_current_user] = lambda: intruder
    try:
        res = await async_client.get(f"/api/v1/rooms/{room_id}")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    join_res = await async_client.post(
        f"/api/v1/rooms/{room_id}/join",
        json={"passcode": "secret12345"},
        headers={"Authorization": f"Bearer {create_access_token(intruder['user_id'], intruder['email'])}"},
    )
    assert join_res.status_code == 200

    app.dependency_overrides[get_current_user] = lambda: intruder
    try:
        res = await async_client.get(f"/api/v1/rooms/{room_id}")
        assert res.status_code == 200
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_private_room_messages_require_membership(async_client: AsyncClient, host_user, intruder):
    room_id = await _create_private_room(async_client, host_user)

    app.dependency_overrides[get_current_user] = lambda: intruder
    try:
        res = await async_client.get(f"/api/v1/rooms/{room_id}/messages")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_private_room_sync_requires_membership(async_client: AsyncClient, host_user, intruder):
    room_id = await _create_private_room(async_client, host_user, control_mode="democratic")

    app.dependency_overrides[get_current_user] = lambda: intruder
    try:
        res = await async_client.post(f"/api/v1/rooms/{room_id}/sync", json={"action": "pause"})
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_private_room_rtc_token_requires_membership(async_client: AsyncClient, host_user, intruder):
    room_id = await _create_private_room(async_client, host_user)

    app.dependency_overrides[get_current_user] = lambda: intruder
    try:
        res = await async_client.post(f"/api/v1/rooms/{room_id}/rtc-token")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_private_room_summary_requires_membership(async_client: AsyncClient, host_user, intruder):
    room_id = await _create_private_room(async_client, host_user)

    app.dependency_overrides[get_current_user] = lambda: intruder
    try:
        res = await async_client.post(f"/api/v1/rooms/{room_id}/summary")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_private_room_wrong_passcode_rejected(async_client: AsyncClient, host_user, intruder):
    room_id = await _create_private_room(async_client, host_user)

    app.dependency_overrides[get_current_user] = lambda: intruder
    try:
        res = await async_client.post(
            f"/api/v1/rooms/{room_id}/join",
            json={"passcode": "wrongpassword123"},
        )
        assert res.status_code == 403
        assert "Invalid room passcode" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_passcode_never_in_responses_and_hashed_at_rest(async_client: AsyncClient, mock_db, host_user):
    app.dependency_overrides[get_current_user] = lambda: host_user
    try:
        create_res = await async_client.post(
            "/api/v1/rooms",
            json={
                "name": "Hash Check Room",
                "room_type": "private",
                "passcode": "supersecretpasscode",
            },
        )
        assert create_res.status_code == 201
        data = create_res.json()
        assert "passcode" not in data
        assert "passcode_hash" not in data

        room_id = data["room_id"]
        get_res = await async_client.get(f"/api/v1/rooms/{room_id}")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert "passcode" not in get_data
        assert "passcode_hash" not in get_data

        doc = await mock_db.rooms.find_one({"room_id": room_id})
        assert doc is not None
        assert "passcode" not in doc or doc["passcode"] is None
        assert "passcode_hash" in doc
        assert doc["passcode_hash"] != "supersecretpasscode"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_lazy_migration_for_plaintext_passcode(async_client: AsyncClient, mock_db, host_user, intruder):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    room_id = "room_legacy_migration"
    await mock_db.rooms.insert_one({
        "room_id": room_id,
        "name": "Legacy Room",
        "room_type": "private",
        "passcode": "plaintextpass123",
        "control_mode": "host_only",
        "host_id": host_user["user_id"],
        "host_name": host_user["name"],
        "watch_state": {},
        "created_at": now,
        "is_active": True,
    })

    app.dependency_overrides[get_current_user] = lambda: intruder
    try:
        join_res = await async_client.post(
            f"/api/v1/rooms/{room_id}/join",
            json={"passcode": "plaintextpass123"},
        )
        assert join_res.status_code == 200

        doc = await mock_db.rooms.find_one({"room_id": room_id})
        assert "passcode" not in doc
        assert "passcode_hash" in doc
        assert doc["passcode_hash"] != "plaintextpass123"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_private_room_ws_rejected_for_nonmember(mock_db, host_user, intruder):
    from backend.app.rooms.models import CreateRoomRequest, RoomType
    from backend.app.rooms.service import RoomService

    req = CreateRoomRequest(name="Secret WS", room_type=RoomType.PRIVATE, passcode="secret12345")
    room = await RoomService.create_room(host_user["user_id"], host_user["name"], req)

    token = create_access_token(intruder["user_id"], intruder["email"])
    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/api/v1/rooms/{room.room_id}/ws?token={token}") as websocket:
            websocket.receive_text()
    assert exc.value.code == 4003


@pytest.mark.asyncio
async def test_private_room_requires_min_8_char_passcode(async_client: AsyncClient, host_user):
    app.dependency_overrides[get_current_user] = lambda: host_user
    try:
        no_pass = await async_client.post(
            "/api/v1/rooms", json={"name": "No Pass", "room_type": "private"}
        )
        assert no_pass.status_code == 422

        weak_pass = await async_client.post(
            "/api/v1/rooms", json={"name": "Weak Pass", "room_type": "private", "passcode": "short1"}
        )
        assert weak_pass.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_room_name_script_tags_stripped(async_client: AsyncClient, host_user):
    app.dependency_overrides[get_current_user] = lambda: host_user
    try:
        res = await async_client.post(
            "/api/v1/rooms",
            json={"name": "<script>alert(1)</script>Trip", "room_type": "public"},
        )
        assert res.status_code == 201
        assert res.json()["name"] == "Trip"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_host_leave_deactivates_empty_private_room(async_client: AsyncClient, mock_db, host_user):
    room_id = await _create_private_room(async_client, host_user)

    app.dependency_overrides[get_current_user] = lambda: host_user
    try:
        leave_res = await async_client.post(f"/api/v1/rooms/{room_id}/leave")
        assert leave_res.status_code == 200

        details = await async_client.get(f"/api/v1/rooms/{room_id}")
        assert details.status_code == 404

        members = await mock_db.room_members.find({"room_id": room_id}).to_list(length=10)
        assert members == []
    finally:
        app.dependency_overrides.pop(get_current_user, None)
