"""
Integration tests for POST /api/v1/content/videos/from-key endpoint.
Tests registering videos from pre-uploaded storage keys and enqueuing transcode jobs.
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.identity.dependencies import get_current_user
from backend.app.main import app


@pytest.mark.asyncio
async def test_create_video_from_key_success(async_client: AsyncClient, mock_db):
    """Test creating a video post from an already-uploaded storage key."""
    user_id = "creator_key_test"

    async def override_user():
        return {
            "user_id": user_id,
            "name": "Direct Creator",
            "email": "direct@vidsnap.ai",
            "roles": ["creator"],
        }

    app.dependency_overrides[get_current_user] = override_user

    storage = get_storage_adapter()
    video_key = f"videos/{user_id}/pre_uploaded_video.mp4"
    fake_video_content = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 300

    # Put object in storage
    await storage.upload_bytes(fake_video_content, video_key, "video/mp4")

    try:
        with patch(
            "backend.app.core.adapters.queue_arq.ARQQueueAdapter.enqueue", new_callable=AsyncMock
        ) as mock_enqueue:
            payload = {
                "key": video_key,
                "title": "Direct Cloudinary Upload Reel",
                "description": "Uploaded directly to edge bucket without backend proxying",
                "hashtags": ["#Edge", "#Cloudinary", "#Fast"],
                "visibility": "public",
                "is_draft": False,
            }
            res = await async_client.post("/api/v1/content/videos/from-key", json=payload)
            assert res.status_code == 201
            data = res.json()
            assert data["title"] == "Direct Cloudinary Upload Reel"
            assert "video_url" in data
            assert data["user_id"] == user_id

            # Verify background transcode job enqueued
            mock_enqueue.assert_called_once()
            call_args = mock_enqueue.call_args
            assert call_args[0][0] == "process_native_video_job"
            assert call_args[1]["video_id"] == data["video_id"]
            assert call_args[1]["video_key"] == video_key

            # Verify asset tracked in database
            asset = await mock_db.assets.find_one({"key": video_key})
            assert asset is not None
            assert asset["user_id"] == user_id
            assert asset["asset_type"] == "native_video"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        await storage.delete_file(video_key)


@pytest.mark.asyncio
async def test_create_video_from_key_missing_object_returns_404(async_client: AsyncClient, mock_db):
    """When the storage key does not exist in storage, endpoint should return 404."""
    user_id = "creator_key_test_404"

    async def override_user():
        return {
            "user_id": user_id,
            "name": "Direct Creator",
            "email": "direct@vidsnap.ai",
            "roles": ["creator"],
        }

    app.dependency_overrides[get_current_user] = override_user

    try:
        payload = {
            "key": "videos/non_existent_key_123456.mp4",
            "title": "Ghost Video",
            "description": "Should fail",
            "hashtags": ["#Error"],
        }
        res = await async_client.post("/api/v1/content/videos/from-key", json=payload)
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
