"""
Security regression tests for storage key ownership (W1-2 IDOR).

Tests verify that user A cannot reference user B's storage keys in:
- Reel studio job creation (image_keys)
- Content from-key endpoint (video key)
- Central assert_key_owned helper
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user
from backend.app.main import app
from backend.app.media.ownership import assert_key_owned, assert_keys_owned

USER_A = "user_a_owner"
USER_B = "user_b_attacker"


def _make_user_override(user_id: str):
    async def override():
        return {
            "user_id": user_id,
            "name": "Test User",
            "email": f"{user_id}@test.com",
            "roles": ["user"],
        }
    return override


# ───── Unit tests for assert_key_owned ─────

class TestAssertKeyOwned:
    def test_own_key_passes(self):
        """User's own key should not raise."""
        assert_key_owned(USER_A, f"uploads/{USER_A}/photo.png")
        assert_key_owned(USER_A, f"videos/{USER_A}/vid.mp4")
        assert_key_owned(USER_A, f"reels/{USER_A}/reel.mp4")
        assert_key_owned(USER_A, f"thumbnails/{USER_A}/thumb.jpg")

    def test_foreign_key_raises_403(self):
        """Another user's key must raise 403."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            assert_key_owned(USER_A, f"uploads/{USER_B}/photo.png")
        assert exc_info.value.status_code == 403

    def test_traversal_key_raises_400(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            assert_key_owned(USER_A, f"uploads/{USER_A}/../../etc/passwd")
        assert exc_info.value.status_code == 400

    def test_invalid_format_raises_400(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            assert_key_owned(USER_A, "just-a-file.png")
        assert exc_info.value.status_code == 400

    def test_unknown_prefix_raises_400(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            assert_key_owned(USER_A, f"admin/{USER_A}/secret.txt")
        assert exc_info.value.status_code == 400

    def test_assert_keys_owned_batch(self):
        """Batch helper should reject if any key is foreign."""
        from fastapi import HTTPException
        # All own keys: OK
        assert_keys_owned(USER_A, [f"uploads/{USER_A}/a.png", f"uploads/{USER_A}/b.png"])
        # One foreign key: should fail
        with pytest.raises(HTTPException) as exc_info:
            assert_keys_owned(USER_A, [f"uploads/{USER_A}/a.png", f"uploads/{USER_B}/evil.png"])
        assert exc_info.value.status_code == 403


# ───── Integration: Reel studio foreign image_keys -> 403 ─────

@pytest.mark.asyncio
async def test_reel_studio_foreign_image_key_rejected(async_client: AsyncClient, mock_db):
    """Creating a reel job with another user's image key must return 403."""
    await mock_db.users.insert_one({
        "user_id": USER_A,
        "name": "User A",
        "email": "a@test.com",
        "roles": ["user"],
        "tokens_remaining": 5,
        "created_at": datetime.now(timezone.utc),
    })

    app.dependency_overrides[get_current_user] = _make_user_override(USER_A)
    try:
        res = await async_client.post(
            "/api/v1/reel-studio/jobs",
            json={
                "voiceover_text": "This is a test voiceover script for the reel.",
                "image_keys": [f"uploads/{USER_B}/stolen_photo.png"],
                "voice": "en-US-AriaNeural",
                "duration": 3,
            },
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_reel_studio_own_image_key_accepted(async_client: AsyncClient, mock_db):
    """Creating a reel job with the user's own image key should succeed (or fail later, not 403)."""
    await mock_db.users.insert_one({
        "user_id": USER_A,
        "name": "User A",
        "email": "a@test.com",
        "roles": ["user"],
        "tokens_remaining": 5,
        "created_at": datetime.now(timezone.utc),
    })

    app.dependency_overrides[get_current_user] = _make_user_override(USER_A)
    try:
        with patch("backend.app.reel_studio.service.get_queue_adapter") as mock_queue:
            mock_queue.return_value = AsyncMock()
            mock_queue.return_value.enqueue = AsyncMock()

            res = await async_client.post(
                "/api/v1/reel-studio/jobs",
                json={
                    "voiceover_text": "This is a test voiceover script for the reel.",
                    "image_keys": [f"uploads/{USER_A}/my_photo.png"],
                    "voice": "en-US-AriaNeural",
                    "duration": 3,
                },
            )
            # Should not be 403 — any other status (201, 402, 500) is fine
            assert res.status_code != 403, f"Own key wrongly rejected: {res.text}"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


# ───── Integration: POST /videos create with foreign video_key/thumbnail_key -> 403 ─────

@pytest.mark.asyncio
async def test_create_video_foreign_video_key_rejected(async_client: AsyncClient, mock_db):
    """Creating a video with another user's video_key must return 403 (W1-2)."""
    await mock_db.users.insert_one({
        "user_id": USER_A,
        "name": "User A",
        "email": "a@test.com",
        "roles": ["user"],
        "tokens_remaining": 5,
        "created_at": datetime.now(timezone.utc),
    })

    app.dependency_overrides[get_current_user] = _make_user_override(USER_A)
    try:
        res = await async_client.post(
            "/api/v1/content/videos",
            json={
                "title": "Stolen Video",
                "description": "",
                "visibility": "public",
                "video_key": f"videos/{USER_B}/stolen_video.mp4",
            },
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        # Must NOT have persisted the video doc
        assert await mock_db.videos.count_documents({}) == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_create_video_foreign_thumbnail_key_rejected(async_client: AsyncClient, mock_db):
    """Own video key but a foreign thumbnail_key must still return 403 (W1-2)."""
    await mock_db.users.insert_one({
        "user_id": USER_A,
        "name": "User A",
        "email": "a@test.com",
        "roles": ["user"],
        "tokens_remaining": 5,
        "created_at": datetime.now(timezone.utc),
    })

    app.dependency_overrides[get_current_user] = _make_user_override(USER_A)
    try:
        res = await async_client.post(
            "/api/v1/content/videos",
            json={
                "title": "My Own Video",
                "video_key": f"videos/{USER_A}/my_video.mp4",
                "thumbnail_key": f"videos/{USER_B}/stolen_thumb.jpg",
            },
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_create_video_own_keys_accepted(async_client: AsyncClient, mock_db):
    """Own keys must NOT be rejected by the ownership check (W1-2)."""
    await mock_db.users.insert_one({
        "user_id": USER_A,
        "name": "User A",
        "email": "a@test.com",
        "roles": ["user"],
        "tokens_remaining": 5,
        "created_at": datetime.now(timezone.utc),
    })

    app.dependency_overrides[get_current_user] = _make_user_override(USER_A)
    try:
        res = await async_client.post(
            "/api/v1/content/videos",
            json={
                "title": "My Own Video",
                "video_key": f"videos/{USER_A}/my_video.mp4",
            },
        )
        assert res.status_code == 201, f"Own keys wrongly rejected: {res.text}"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


# ───── Worker defense-in-depth: re-check via central helper ─────

@pytest.mark.asyncio
async def test_worker_rejects_traversal_key_with_own_user_prefix(async_client: AsyncClient, mock_db):
    """
    W1-2: the worker must use the central ownership helper. A key like
    'uploads/{user_a}/..\\{user_b}/x.png' passes the old ad-hoc parts[1] check
    (parts[1] == user_id, no '..' component) but must be rejected as traversal.
    """
    from unittest.mock import AsyncMock

    import backend.app.reel_studio.tts_service as tts_module
    from backend.workers.media_worker import process_reel_job

    user_a = USER_A
    await mock_db.users.insert_one({
        "user_id": user_a,
        "name": "User A",
        "email": "a@test.com",
        "roles": ["user"],
        "tokens_remaining": 4,  # 1 token already consumed when the job was queued
        "created_at": datetime.now(timezone.utc),
    })

    evil_key = f"uploads/{user_a}/..\\{USER_B}/x.png"
    await mock_db.jobs.insert_one({
        "job_id": "job-ownership-recheck",
        "user_id": user_a,
        "status": "queued",
        "stage": "queued",
        "voiceover_text": "Some narration text for a reel.",
        "image_keys": [evil_key],
        "voice": "en-US-AriaNeural",
        "image_duration": 3,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })

    with patch.object(tts_module, "generate_speech", new_callable=AsyncMock):
        await process_reel_job({}, "job-ownership-recheck")

    job = await mock_db.jobs.find_one({"job_id": "job-ownership-recheck"})
    assert job["status"] == "failed", f"Job should be failed, got {job['status']}"
    assert "Key ownership violation" in job.get("error_msg", ""), f"Got: {job.get('error_msg')}"

    # Token must be refunded exactly once (back to the pre-consumption balance)
    user = await mock_db.users.find_one({"user_id": user_a})
    assert user["tokens_remaining"] == 5

    refund_count = await mock_db.credit_ledger.count_documents(
        {"user_id": user_a, "reference_id": "job-ownership-recheck", "amount": 1}
    )
    assert refund_count == 1


# ───── Cloudinary signed upload must restrict resource/format/size ─────

@pytest.mark.asyncio
async def test_cloudinary_presigned_signature_restricts_upload(mock_db):
    """W1-2: Cloudinary signed upload params must pin resource_type, allowed_formats, max_file_size."""
    from backend.app.core.adapters.storage_cloudinary import CloudinaryStorageAdapter
    from backend.app.core.config import settings

    with patch.object(settings, "cloudinary_cloud_name", "test-cloud"), \
         patch.object(settings, "cloudinary_api_key", "test-key-123"), \
         patch.object(settings, "cloudinary_api_secret", "test-secret-456"), \
         patch.object(settings, "cloudinary_folder", "vidsnap-reels"):
        adapter = CloudinaryStorageAdapter()
        target = await adapter.generate_presigned_upload_url(
            key=f"videos/{USER_A}/clip.mp4",
            content_type="video/mp4",
        )
        fields = target["fields"]
        assert "resource_type" in fields, f"resource_type missing from signed fields: {fields}"
        assert fields["resource_type"] == "video"
        assert fields.get("allowed_formats") == "mp4", f"allowed_formats wrong: {fields.get('allowed_formats')}"
        assert int(fields["max_file_size"]) > 0, f"max_file_size missing: {fields}"
        assert f"/videos/{USER_A}/" in fields["public_id"], f"public_id not under user prefix: {fields}"


# ───── Integration: Content from-key foreign key -> 403 ─────

@pytest.mark.asyncio
async def test_content_from_key_foreign_key_rejected(async_client: AsyncClient, mock_db):
    """Creating video from another user's storage key must return 403."""
    await mock_db.users.insert_one({
        "user_id": USER_A,
        "name": "User A",
        "email": "a@test.com",
        "roles": ["user"],
        "tokens_remaining": 5,
        "created_at": datetime.now(timezone.utc),
    })

    app.dependency_overrides[get_current_user] = _make_user_override(USER_A)
    try:
        res = await async_client.post(
            "/api/v1/content/videos/from-key",
            json={
                "title": "Test Video",
                "key": f"videos/{USER_B}/stolen_video.mp4",
            },
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
