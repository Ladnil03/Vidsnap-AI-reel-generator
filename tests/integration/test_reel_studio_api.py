"""
Integration tests for Reel Studio API routes.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user


@pytest.mark.asyncio
async def test_reel_studio_job_lifecycle(async_client: AsyncClient, mock_db):
    """Test creating a job, querying status, viewing gallery, and soft-deleting."""
    user_id = "reel-user-123"
    # Seed user with 5 tokens
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Reel Creator",
        "email": "creator@vidsnap.ai",
        "roles": ["user"],
        "tokens_remaining": 5,
        "created_at": datetime.now(timezone.utc),
    })

    # Override current_user dependency
    async def override_user():
        return {
            "user_id": user_id,
            "name": "Reel Creator",
            "email": "creator@vidsnap.ai",
            "roles": ["user"],
            "tokens_remaining": 5,
        }

    from backend.app.main import app
    app.dependency_overrides[get_current_user] = override_user

    try:
        # Mock Queue enqueue to simulate Redis ARQ dispatch
        with patch("backend.app.reel_studio.service.get_queue_adapter") as mock_queue_factory:
            mock_queue = AsyncMock()
            mock_queue.enqueue.return_value = "task-uuid-1"
            mock_queue_factory.return_value = mock_queue

            # 1. Create Job with image keys
            payload = {
                "voiceover_text": "This is a great story for our vertical reel.",
                "image_keys": [f"uploads/{user_id}/img1.jpg", f"uploads/{user_id}/img2.jpg"],
                "voice": "en-US-AriaNeural",
                "duration": 3,
            }
            res = await async_client.post("/api/v1/reel-studio/jobs", json=payload)
            assert res.status_code == 201
            job_data = res.json()
            job_id = job_data["job_id"]
            assert job_data["status"] == "queued"

            # Verify token was deducted
            user_doc = await mock_db.users.find_one({"user_id": user_id})
            assert user_doc["tokens_remaining"] == 4

            # 2. Query Job Status
            status_res = await async_client.get(f"/api/v1/reel-studio/jobs/{job_id}")
            assert status_res.status_code == 200
            assert status_res.json()["job_id"] == job_id
            assert status_res.json()["status"] == "queued"

            # 3. Simulate job completion
            await mock_db.jobs.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": "done",
                        "stage": "done",
                        "reel_url": "https://media.vidsnap.ai/reels/video.mp4",
                        "thumbnail_url": "https://media.vidsnap.ai/reels/thumb.jpg",
                    }
                },
            )

            # 4. View User Gallery
            gallery_res = await async_client.get("/api/v1/reel-studio/reels")
            assert gallery_res.status_code == 200
            reels = gallery_res.json()
            assert len(reels) == 1
            assert reels[0]["job_id"] == job_id
            assert reels[0]["reel_url"] == "https://media.vidsnap.ai/reels/video.mp4"

            # 5. Soft-Delete Reel
            del_res = await async_client.delete(f"/api/v1/reel-studio/reels/{job_id}")
            assert del_res.status_code == 200
            assert del_res.json()["deleted"] is True

            # Reel should no longer appear in active gallery
            gallery_res2 = await async_client.get("/api/v1/reel-studio/reels")
            assert len(gallery_res2.json()) == 0

            # But job record remains in database with deleted: True (billing history preserved!)
            persisted_job = await mock_db.jobs.find_one({"job_id": job_id})
            assert persisted_job is not None
            assert persisted_job["deleted"] is True

    finally:
        app.dependency_overrides.clear()

