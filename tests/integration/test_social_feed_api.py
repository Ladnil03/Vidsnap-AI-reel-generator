"""
Integration tests for Social, Feed, and Notifications API endpoints.
Covers /api/v1/social, /api/v1/feed, and /api/v1/notifications.
"""

from datetime import UTC, datetime

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user, get_optional_current_user
from backend.app.main import app


@pytest.mark.asyncio
async def test_social_follow_and_friends_flow(async_client: AsyncClient, mock_db):
    """Test follow, mutual friends detection, and unfollow endpoints."""
    await mock_db.users.insert_one({"user_id": "u_alice", "name": "Alice", "email": "alice@vid.ai"})
    await mock_db.users.insert_one({"user_id": "u_bob", "name": "Bob", "email": "bob@vid.ai"})

    async def override_alice():
        return {"user_id": "u_alice", "name": "Alice", "email": "alice@vid.ai"}

    app.dependency_overrides[get_current_user] = override_alice
    app.dependency_overrides[get_optional_current_user] = override_alice

    try:
        # Alice follows Bob
        follow_res = await async_client.post("/api/v1/social/follow/u_bob")
        assert follow_res.status_code == 200
        assert follow_res.json()["is_following"] is True
        assert follow_res.json()["is_friend"] is False

        # Check follow status
        status_res = await async_client.get("/api/v1/social/follow-status/u_bob")
        assert status_res.status_code == 200
        assert status_res.json()["is_following"] is True

        # Now Bob follows Alice -> Mutual friends
        async def override_bob():
            return {"user_id": "u_bob", "name": "Bob", "email": "bob@vid.ai"}

        app.dependency_overrides[get_current_user] = override_bob
        app.dependency_overrides[get_optional_current_user] = override_bob

        bob_follow = await async_client.post("/api/v1/social/follow/u_alice")
        assert bob_follow.status_code == 200
        assert bob_follow.json()["is_following"] is True
        assert bob_follow.json()["is_friend"] is True

        # Check Bob's friends list
        friends_res = await async_client.get("/api/v1/social/friends")
        assert friends_res.status_code == 200
        friends_data = friends_res.json()
        assert friends_data["total"] == 1
        assert friends_data["items"][0]["user_id"] == "u_alice"

        # Bob unfollows Alice
        unfollow_res = await async_client.delete("/api/v1/social/follow/u_alice")
        assert unfollow_res.status_code == 200
        assert unfollow_res.json()["is_following"] is False
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_optional_current_user, None)


@pytest.mark.asyncio
async def test_communities_api_flow(async_client: AsyncClient, mock_db):
    """Test creating, listing, joining, and leaving interest communities."""
    async def override_user():
        return {"user_id": "u_comm_creator", "name": "Creator", "email": "creator@vid.ai"}

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_optional_current_user] = override_user

    try:
        # 1. Create Community
        payload = {
            "name": "Cinematography Masters",
            "description": "Visual storytellers and lens enthusiasts",
            "category": "art",
        }
        res = await async_client.post("/api/v1/social/communities", json=payload)
        assert res.status_code == 201
        comm_data = res.json()
        comm_id = comm_data["community_id"]
        assert comm_data["name"] == "Cinematography Masters"
        assert comm_data["is_member"] is True

        # 2. List Communities
        list_res = await async_client.get("/api/v1/social/communities")
        assert list_res.status_code == 200
        assert list_res.json()["total"] >= 1

        # 3. Join / Leave Community
        leave_res = await async_client.post(f"/api/v1/social/communities/{comm_id}/leave")
        assert leave_res.status_code == 200
        assert leave_res.json()["is_member"] is False

        join_res = await async_client.post(f"/api/v1/social/communities/{comm_id}/join")
        assert join_res.status_code == 200
        assert join_res.json()["is_member"] is True
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_optional_current_user, None)


@pytest.mark.asyncio
async def test_notifications_api_flow(async_client: AsyncClient, mock_db):
    """Test notification retrieval, mark-as-read, and push subscription."""
    await mock_db.notifications.insert_one({
        "notification_id": "notif_999",
        "recipient_id": "u_notif_target",
        "actor_id": "u_actor",
        "actor_name": "Maya",
        "type": "like",
        "message": "Maya liked your reel",
        "is_read": False,
        "created_at": datetime.now(UTC),
    })

    async def override_target():
        return {"user_id": "u_notif_target", "name": "Target", "email": "target@vid.ai"}

    app.dependency_overrides[get_current_user] = override_target

    try:
        # 1. List notifications
        res = await async_client.get("/api/v1/notifications")
        assert res.status_code == 200
        data = res.json()
        assert data["unread_count"] == 1
        assert len(data["items"]) == 1

        # 2. Mark single notification read
        read_res = await async_client.patch("/api/v1/notifications/notif_999/read")
        assert read_res.status_code == 200
        assert read_res.json()["success"] is True

        # 3. Web Push subscription endpoint
        push_payload = {
            "endpoint": "https://push.services.mozilla.com/fake-token",
            "keys": {"p256dh": "dummy-p256dh-key", "auth": "dummy-auth-key"},
        }
        push_res = await async_client.post("/api/v1/notifications/push/subscribe", json=push_payload)
        assert push_res.status_code == 201
        assert push_res.json()["subscribed"] is True

        # 4. VAPID public key endpoint
        vapid_res = await async_client.get("/api/v1/notifications/push/vapid-key")
        assert vapid_res.status_code == 200
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_universal_feed_endpoint(async_client: AsyncClient, mock_db):
    """Test feed queries across tabs and watch progress synchronization."""
    now = datetime.now(UTC)
    await mock_db.videos.insert_one({
        "video_id": "v_feed_1",
        "user_id": "creator_1",
        "title": "Epic Reel",
        "status": "published",
        "visibility": "public",
        "views_count": 50,
        "likes_count": 10,
        "duration": 30.0,
        "created_at": now,
    })

    async def override_viewer():
        return {"user_id": "u_viewer", "name": "Viewer", "email": "viewer@vid.ai"}

    app.dependency_overrides[get_current_user] = override_viewer
    app.dependency_overrides[get_optional_current_user] = override_viewer

    try:
        # 1. Get Trending feed
        feed_res = await async_client.get("/api/v1/feed?tab=trending")
        assert feed_res.status_code == 200
        data = feed_res.json()
        assert data["tab"] == "trending"
        assert len(data["items"]) >= 1

        # 2. Record watch progress
        progress_payload = {
            "video_id": "v_feed_1",
            "watched_seconds": 15.0,
            "total_seconds": 30.0,
            "completed": False,
        }
        wp_res = await async_client.post("/api/v1/feed/watch-progress", json=progress_payload)
        assert wp_res.status_code == 200
        assert wp_res.json()["percentage"] == 50.0

        # 3. Query Continue Watching tab
        cw_res = await async_client.get("/api/v1/feed?tab=continue_watching")
        assert cw_res.status_code == 200
        cw_data = cw_res.json()
        assert len(cw_data["items"]) == 1
        assert cw_data["items"][0]["video_id"] == "v_feed_1"

        # 4. Get individual resume point
        resume_res = await async_client.get("/api/v1/feed/watch-progress/v_feed_1")
        assert resume_res.status_code == 200
        assert resume_res.json()["watched_seconds"] == 15.0
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_optional_current_user, None)
