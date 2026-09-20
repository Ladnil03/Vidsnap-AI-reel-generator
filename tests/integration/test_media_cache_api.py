"""
Integration tests for Media API cache headers, ETag validation, 304 conditional requests, and presigned video uploads.
"""

import pytest
from httpx import AsyncClient

from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.identity.dependencies import get_current_user
from backend.app.main import app


@pytest.mark.asyncio
async def test_presigned_video_upload_endpoint(async_client: AsyncClient, mock_db):
    """Test generating a presigned video upload URL via POST /api/v1/media/upload-url/video."""
    user_id = "test_creator_media"

    async def override_user():
        return {
            "user_id": user_id,
            "name": "Media Creator",
            "email": "media@vidsnap.ai",
            "roles": ["creator"],
        }

    app.dependency_overrides[get_current_user] = override_user

    try:
        payload = {
            "filename": "sunset_drone.mp4",
            "content_type": "video/mp4",
            "size_bytes": 10 * 1024 * 1024,
        }
        res = await async_client.post("/api/v1/media/upload-url/video", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "upload_url" in data
        assert "key" in data
        assert data["key"].startswith(f"videos/{user_id}/")
        assert data["content_type"] == "video/mp4"
        assert data["max_size_bytes"] == 50 * 1024 * 1024
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_media_file_caching_and_etag_flow(async_client: AsyncClient, tmp_path):
    """Test local media file serving with Cache-Control headers and 304 Not Modified response."""
    storage = get_storage_adapter()
    test_key = "test_media/sample_cache.txt"
    test_content = b"Cached video frame content for edge performance test"

    # Upload test bytes to local storage
    await storage.upload_bytes(test_content, test_key, "text/plain")

    # 1. First GET: expect 200 OK with Cache-Control and ETag headers
    res1 = await async_client.get(f"/api/v1/media/files/{test_key}")
    assert res1.status_code == 200
    assert "Cache-Control" in res1.headers
    assert "public" in res1.headers["Cache-Control"]
    assert "ETag" in res1.headers
    etag = res1.headers["ETag"]
    assert etag.strip('"') != ""

    # 2. Second GET with matching If-None-Match: expect 304 Not Modified
    res2 = await async_client.get(
        f"/api/v1/media/files/{test_key}",
        headers={"If-None-Match": etag},
    )
    assert res2.status_code == 304
    assert res2.content == b""

    # Clean up test file
    await storage.delete_file(test_key)
