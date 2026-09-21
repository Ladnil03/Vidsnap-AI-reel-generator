"""
Security regression tests for W3-2:
- Idempotency-Key header on POST job creation (deduplicates by user+key with TTL without double charging tokens).
- Stream and size-cap multipart image uploads instead of reading whole files into memory.
- Clean up orphaned uploaded files from storage when quota or validation fails.
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.core.security import create_access_token


@pytest.mark.asyncio
async def test_job_creation_idempotency_key_deduplication(async_client: AsyncClient, mock_db):
    """
    Providing an Idempotency-Key header must deduplicate job creation:
    repeated POST requests return the existing job and do not double-spend tokens.
    """
    user_id = "user_idem_test"
    email = "idem@example.com"
    # Seed user with 5 tokens
    await mock_db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": "Idem User",
        "tokens_remaining": 5,
        "roles": ["user"],
    })
    token = create_access_token(user_id=user_id, email=email, roles=["user"])
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": "unique-idempotency-key-001",
    }
    payload = {
        "voiceover_text": "A fascinating tale of modern artificial intelligence.",
        "image_keys": [f"uploads/{user_id}/scene_1.jpg"],
        "voice": "natural_us",
        "duration": 3,
    }

    # Mock Queue enqueue to simulate Redis ARQ dispatch
    with patch("backend.app.reel_studio.service.get_queue_adapter") as mock_queue_factory:
        mock_queue = AsyncMock()
        mock_queue.enqueue.return_value = "task-uuid-1"
        mock_queue_factory.return_value = mock_queue

        # First request
        resp1 = await async_client.post("/api/v1/reel-studio/jobs", json=payload, headers=headers)
        assert resp1.status_code == 201
        job1_id = resp1.json()["job_id"]

        # Check user has 4 tokens remaining
        user_doc = await mock_db.users.find_one({"user_id": user_id})
        assert user_doc["tokens_remaining"] == 4

        # Second request with SAME Idempotency-Key
        resp2 = await async_client.post("/api/v1/reel-studio/jobs", json=payload, headers=headers)
        assert resp2.status_code in (200, 201)
        assert resp2.json()["job_id"] == job1_id

        # Crucial: Token balance must NOT decrease again
        user_doc_after = await mock_db.users.find_one({"user_id": user_id})
        assert user_doc_after["tokens_remaining"] == 4


@pytest.mark.asyncio
async def test_multipart_upload_size_cap(async_client: AsyncClient, mock_db):
    """Uploading an oversized image in multipart request is rejected with 413."""
    user_id = "user_stream_test"
    email = "stream@example.com"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": "Stream User",
        "tokens_remaining": 5,
        "roles": ["user"],
    })
    token = create_access_token(user_id=user_id, email=email, roles=["user"])
    headers = {"Authorization": f"Bearer {token}"}

    # 15MB dummy file (exceeds default 10MB limit)
    oversized_data = b"X" * (15 * 1024 * 1024)
    files = [("images", ("huge.jpg", oversized_data, "image/jpeg"))]
    data = {"voiceover_text": "This text is valid and over five characters long."}

    resp = await async_client.post(
        "/api/v1/reel-studio/jobs/upload",
        headers=headers,
        data=data,
        files=files,
    )
    assert resp.status_code in (413, 400)


@pytest.mark.asyncio
async def test_multipart_orphan_cleanup_on_failure(async_client: AsyncClient, mock_db):
    """
    If image validation or user quota fails after a valid image is uploaded to storage,
    the orphaned uploaded image must be removed from storage.
    """
    user_id = "user_orphan_test"
    email = "orphan@example.com"
    # Seed user with 0 tokens so job creation fails on billing/quota
    await mock_db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": "Orphan User",
        "tokens_remaining": 0,
        "roles": ["user"],
    })
    token = create_access_token(user_id=user_id, email=email, roles=["user"])
    headers = {"Authorization": f"Bearer {token}"}

    storage = get_storage_adapter()
    deleted_keys = []
    original_delete = storage.delete_file

    async def mock_delete(key: str) -> bool:
        deleted_keys.append(key)
        return await original_delete(key)

    from io import BytesIO

    from PIL import Image

    img = Image.new("RGB", (20, 20), color="blue")
    buf = BytesIO()
    img.save(buf, format="JPEG")
    valid_jpg = buf.getvalue()

    files = [("images", ("valid.jpg", valid_jpg, "image/jpeg"))]
    data = {"voiceover_text": "Valid voiceover text for the reel studio."}

    with patch.object(storage, "delete_file", side_effect=mock_delete):
        resp = await async_client.post(
            "/api/v1/reel-studio/jobs/upload",
            headers=headers,
            data=data,
            files=files,
        )
        assert resp.status_code == 402  # Payment required (0 tokens)
        # Verify that the uploaded image key was cleaned up
        assert len(deleted_keys) >= 1
