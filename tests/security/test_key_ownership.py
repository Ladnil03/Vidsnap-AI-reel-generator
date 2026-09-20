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
