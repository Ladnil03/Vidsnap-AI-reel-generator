"""
Unit tests for Video validation, storage quota enforcement, and AI hashtag helpers.
"""

import pytest
from fastapi import HTTPException

from backend.app.content.ai_helpers import generate_hashtags_and_hook
from backend.app.media.service import MediaService


def test_validate_video_bytes_valid_mp4():
    """Test accepting valid MP4 file container headers."""
    # Valid MP4 signature: 4 bytes size + 'ftyp' + brand
    data = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00" + b"\x00" * 200
    MediaService.validate_video_bytes(data, "test.mp4")


def test_validate_video_bytes_valid_webm():
    """Test accepting valid WebM file container headers."""
    # WebM signature: 0x1A 0x45 0xDF 0xA3 (EBML)
    data = b"\x1a\x45\xdf\xa3" + b"\x00" * 200
    MediaService.validate_video_bytes(data, "test.webm")


def test_validate_video_bytes_invalid_container():
    """Test rejecting file with corrupted or non-video bytes."""
    corrupted_data = b"NOT_A_VIDEO_FILE_CONTENT_AT_ALL" + b"\x00" * 150
    with pytest.raises(HTTPException) as exc:
        MediaService.validate_video_bytes(corrupted_data, "bad.mp4")
    assert exc.value.status_code == 400
    assert "invalid or corrupted" in str(exc.value.detail).lower()


def test_validate_video_bytes_unsupported_extension():
    """Test rejecting unsupported extension."""
    data = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 200
    with pytest.raises(HTTPException) as exc:
        MediaService.validate_video_bytes(data, "malicious.exe")
    assert exc.value.status_code == 400
    assert "unsupported video format" in str(exc.value.detail).lower()


@pytest.mark.asyncio
async def test_user_storage_quota_enforcement(mock_db):
    """Test enforcing 500MB per-user storage quota."""
    user_id = "quota_test_user"

    # User uploads 480MB of assets
    await mock_db.assets.insert_one({
        "user_id": user_id,
        "key": "videos/u/large.mp4",
        "size_bytes": 480 * 1024 * 1024,
        "deleted": False,
    })

    # Uploading another 10MB (total 490MB <= 500MB) should pass
    await MediaService.check_user_storage_quota(user_id, 10 * 1024 * 1024)

    # Uploading 30MB (total 510MB > 500MB) must fail with 400 Bad Request
    with pytest.raises(HTTPException) as exc:
        await MediaService.check_user_storage_quota(user_id, 30 * 1024 * 1024)
    assert exc.value.status_code == 400
    assert "quota exceeded" in str(exc.value.detail).lower()


@pytest.mark.asyncio
async def test_ai_hashtags_and_hook_generator():
    """Test generating hashtags and hooks from video title and transcript."""
    result = await generate_hashtags_and_hook(
        title="5 Incredible Productivity Secrets for Programmers",
        transcript="In this video we explore how top software engineers manage their daily workflow.",
    )
    assert len(result["hashtags"]) >= 3
    assert any("programmers" in t.lower() or "productivity" in t.lower() for t in result["hashtags"])
    assert "Watch this:" in result["suggested_hook"] or "🔥" in result["suggested_hook"]
