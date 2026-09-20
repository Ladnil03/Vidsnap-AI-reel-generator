"""
Integration tests for Watch Together Rooms REST API (/api/v1/rooms).
Tests room creation, discovery, join/leave lifecycle, playback sync, and AI room recap.
"""

from typing import Any

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user
from backend.app.main import app


@pytest.fixture
def auth_user():
    """Mock authenticated user."""
    return {
        "user_id": "test_host_101",
        "name": "Host Alice",
        "email": "alice@vidsnap.ai",
        "roles": ["creator"],
    }


@pytest.fixture
def auth_viewer():
    """Mock second authenticated viewer."""
    return {
        "user_id": "test_viewer_202",
        "name": "Viewer Bob",
        "email": "bob@vidsnap.ai",
        "roles": ["user"],
    }


@pytest.mark.asyncio
async def test_rooms_crud_and_discovery_flow(async_client: AsyncClient, mock_db, auth_user: dict[str, Any]):
    """Test creating a public watch room, listing it, and fetching room details."""
    app.dependency_overrides[get_current_user] = lambda: auth_user

    try:
        # 1. Create Room
        create_payload = {
            "name": "Friday Reel Night",
            "description": "Chill watch party with friends",
            "room_type": "public",
            "control_mode": "host_only",
            "initial_media_url": "https://media.vidsnap.ai/videos/highlight.mp4",
            "initial_media_title": "Epic Highlights 2026",
            "initial_media_type": "native",
        }
        create_res = await async_client.post("/api/v1/rooms", json=create_payload)
        assert create_res.status_code == 201
        room_data = create_res.json()
        room_id = room_data["room_id"]
        assert room_data["name"] == "Friday Reel Night"
        assert room_data["host_id"] == auth_user["user_id"]
        assert room_data["watch_state"]["media_url"] == "https://media.vidsnap.ai/videos/highlight.mp4"

        # 2. List Rooms
        list_res = await async_client.get("/api/v1/rooms?search=Friday")
        assert list_res.status_code == 200
        rooms_list = list_res.json()
        assert len(rooms_list) >= 1
        assert any(r["room_id"] == room_id for r in rooms_list)

        # 3. Get Room Details
        get_res = await async_client.get(f"/api/v1/rooms/{room_id}")
        assert get_res.status_code == 200
        details = get_res.json()
        assert details["room_id"] == room_id
        assert details["participant_count"] >= 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_private_room_access_control(
    async_client: AsyncClient, mock_db, auth_user: dict[str, Any], auth_viewer: dict[str, Any]
):
    """Test passcode enforcement on private rooms."""
    # Create private room as host
    app.dependency_overrides[get_current_user] = lambda: auth_user
    try:
        create_payload = {
            "name": "Secret VIP Room",
            "room_type": "private",
            "passcode": "supersecret99",
        }
        res = await async_client.post("/api/v1/rooms", json=create_payload)
        assert res.status_code == 201
        room_id = res.json()["room_id"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    # Viewer attempts to join
    app.dependency_overrides[get_current_user] = lambda: auth_viewer
    try:
        # Wrong passcode -> 403
        wrong_res = await async_client.post(
            f"/api/v1/rooms/{room_id}/join",
            json={"passcode": "wrong_pass"},
        )
        assert wrong_res.status_code == 403

        # Correct passcode -> 200
        ok_res = await async_client.post(
            f"/api/v1/rooms/{room_id}/join",
            json={"passcode": "supersecret99"},
        )
        assert ok_res.status_code == 200
        assert ok_res.json()["room_id"] == room_id
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_room_playback_sync_action(async_client: AsyncClient, mock_db, auth_user: dict[str, Any]):
    """Test updating authoritative playback state via POST /api/v1/rooms/{room_id}/sync."""
    app.dependency_overrides[get_current_user] = lambda: auth_user

    try:
        # Create room
        res = await async_client.post(
            "/api/v1/rooms",
            json={"name": "Sync Test", "room_type": "public", "control_mode": "host_only"},
        )
        room_id = res.json()["room_id"]

        # Host sends play sync action at position 25.5s
        sync_res = await async_client.post(
            f"/api/v1/rooms/{room_id}/sync",
            json={"action": "play", "position_seconds": 25.5},
        )
        assert sync_res.status_code == 200
        watch_data = sync_res.json()
        assert watch_data["state"] == "playing"
        assert watch_data["position_seconds"] == 25.5
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_room_rtc_token_and_ai_summary(async_client: AsyncClient, mock_db, auth_user: dict[str, Any]):
    """Test generating LiveKit WebRTC credentials and AI 30s recap."""
    app.dependency_overrides[get_current_user] = lambda: auth_user

    try:
        # Create room
        res = await async_client.post(
            "/api/v1/rooms",
            json={"name": "Lounge Party", "room_type": "public"},
        )
        room_id = res.json()["room_id"]

        # 1. RTC Token
        token_res = await async_client.post(f"/api/v1/rooms/{room_id}/rtc-token")
        assert token_res.status_code == 200
        token_data = token_res.json()
        assert "token" in token_data
        assert "server_url" in token_data
        assert token_data["room_name"] == room_id

        # 2. AI Room Summary
        summary_res = await async_client.post(f"/api/v1/rooms/{room_id}/summary")
        assert summary_res.status_code == 200
        summary_data = summary_res.json()
        assert summary_data["room_id"] == room_id
        assert "summary" in summary_data
        assert "highlights" in summary_data
    finally:
        app.dependency_overrides.pop(get_current_user, None)
