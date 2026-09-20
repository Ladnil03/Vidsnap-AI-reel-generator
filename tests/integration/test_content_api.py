"""
Integration tests for Content API endpoints (/api/v1/content).
"""

import io
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user


@pytest.mark.asyncio
async def test_content_video_crud_and_drafts(async_client: AsyncClient, mock_db):
    """Test creating video posts, querying feeds, updating, and saving drafts."""
    user_id = "content_author_1"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Sarah Content",
        "email": "sarah@vidsnap.ai",
        "roles": ["creator"],
        "tokens_remaining": 10,
        "created_at": datetime.now(timezone.utc),
    })

    async def override_user():
        return {
            "user_id": user_id,
            "name": "Sarah Content",
            "email": "sarah@vidsnap.ai",
            "roles": ["creator"],
        }

    from backend.app.main import app
    app.dependency_overrides[get_current_user] = override_user

    try:
        # 1. Create a published video
        payload = {
            "title": "Top 10 Nature Landscapes",
            "description": "Stunning 4K nature vertical reel",
            "hashtags": ["#Nature", "#Travel"],
            "visibility": "public",
            "video_key": f"videos/{user_id}/vid1.mp4",
            "duration": 22.0,
            "is_draft": False,
        }
        res = await async_client.post("/api/v1/content/videos", json=payload)
        assert res.status_code == 201
        data = res.json()
        video_id = data["video_id"]
        assert data["title"] == "Top 10 Nature Landscapes"
        assert data["status"] == "published"

        # 2. Get single video
        get_res = await async_client.get(f"/api/v1/content/videos/{video_id}")
        assert get_res.status_code == 200
        assert get_res.json()["views_count"] == 1

        # 3. Create a draft
        draft_payload = {
            "title": "Unpublished Draft Idea",
            "description": "Work in progress",
            "is_draft": True,
        }
        d_res = await async_client.post("/api/v1/content/videos", json=draft_payload)
        assert d_res.status_code == 201
        draft_id = d_res.json()["video_id"]
        assert draft_id is not None
        assert d_res.json()["status"] == "draft"

        # 4. List drafts
        drafts_res = await async_client.get("/api/v1/content/me/drafts")
        assert drafts_res.status_code == 200
        assert len(drafts_res.json()) >= 1

        # 5. Patch video
        patch_res = await async_client.patch(
            f"/api/v1/content/videos/{video_id}",
            json={"title": "Updated Landscapes Title"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["title"] == "Updated Landscapes Title"

        # 6. Delete video
        del_res = await async_client.delete(f"/api/v1/content/videos/{video_id}")
        assert del_res.status_code == 200
        assert del_res.json()["deleted"] is True
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_content_engagement_endpoints(async_client: AsyncClient, mock_db):
    """Test like, unlike, save, unsave, and commenting on videos."""
    user_id = "engager_user_1"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Engager User",
        "email": "engager@vidsnap.ai",
        "roles": ["user"],
        "tokens_remaining": 5,
    })

    async def override_user():
        return {
            "user_id": user_id,
            "name": "Engager User",
            "email": "engager@vidsnap.ai",
            "roles": ["user"],
        }

    from backend.app.identity.dependencies import get_optional_current_user
    from backend.app.main import app
    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_optional_current_user] = override_user

    try:
        # Create video
        v_res = await async_client.post("/api/v1/content/videos", json={
            "title": "Interactive Engagement Reel",
            "visibility": "public",
        })
        video_id = v_res.json()["video_id"]

        # 1. Like
        like_res = await async_client.post(f"/api/v1/content/videos/{video_id}/like")
        assert like_res.status_code == 200
        assert like_res.json()["liked"] is True
        assert like_res.json()["likes_count"] == 1

        # 2. Save
        save_res = await async_client.post(f"/api/v1/content/videos/{video_id}/save")
        assert save_res.status_code == 200
        assert save_res.json()["saved"] is True
        assert save_res.json()["saves_count"] == 1

        # 3. Add comment
        comment_res = await async_client.post(
            f"/api/v1/content/videos/{video_id}/comments",
            json={"text": "This is a great video!"},
        )
        assert comment_res.status_code == 201
        assert comment_res.json()["text"] == "This is a great video!"

        # 4. List comments
        list_c = await async_client.get(f"/api/v1/content/videos/{video_id}/comments")
        assert list_c.status_code == 200
        assert len(list_c.json()) == 1

        # 5. Verify get_video reflects has_liked and has_saved
        detail = await async_client.get(f"/api/v1/content/videos/{video_id}")
        assert detail.json()["has_liked"] is True
        assert detail.json()["has_saved"] is True
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_ai_suggest_tags_endpoint(async_client: AsyncClient, mock_db):
    """Test AI hashtag recommendation API."""
    async def override_user():
        return {
            "user_id": "tag_user",
            "name": "Tag User",
            "email": "tags@vidsnap.ai",
            "roles": ["user"],
        }

    from backend.app.main import app
    app.dependency_overrides[get_current_user] = override_user

    try:
        res = await async_client.post(
            "/api/v1/content/ai/suggest-tags",
            json={
                "title": "Machine Learning and Neural Networks in 2026",
                "transcript": "Deep learning models have transformed automated video processing.",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["hashtags"]) >= 3
        assert "suggested_hook" in data
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_direct_video_upload_endpoint(async_client: AsyncClient, mock_db):
    """Test direct multipart video upload endpoint."""
    user_id = "video_uploader_1"
    async def override_user():
        return {
            "user_id": user_id,
            "name": "Uploader",
            "email": "uploader@vidsnap.ai",
            "roles": ["creator"],
        }

    from backend.app.main import app
    app.dependency_overrides[get_current_user] = override_user

    try:
        with patch("backend.app.content.routes.get_queue_adapter") as mock_queue_factory:
            mock_queue = AsyncMock()
            mock_queue.enqueue.return_value = "video-job-123"
            mock_queue_factory.return_value = mock_queue

            # Valid MP4 container signature: ftyp
            valid_mp4_bytes = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00" + b"\x00" * 300

            files = {
                "video": ("my_raw_clip.mp4", io.BytesIO(valid_mp4_bytes), "video/mp4"),
            }
            data = {
                "title": "My Uploaded Vertical Video",
                "description": "Uploaded directly to the platform",
                "hashtags": "Viral,Tech,Reel",
                "visibility": "public",
            }

            res = await async_client.post(
                "/api/v1/content/videos/upload",
                data=data,
                files=files,
            )
            assert res.status_code == 201
            resp_data = res.json()
            assert resp_data["title"] == "My Uploaded Vertical Video"
            assert resp_data["video_id"] is not None
            mock_queue.enqueue.assert_called_once()
    finally:
        app.dependency_overrides.clear()
