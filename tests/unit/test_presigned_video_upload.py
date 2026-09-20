"""
Unit tests for Presigned Video Upload Target generation and validation.
"""

import pytest
from fastapi import HTTPException

from backend.app.media.service import MediaService


@pytest.mark.asyncio
async def test_create_video_upload_target_valid(mock_db):
    """Test generating a presigned video upload target with valid format and size."""
    user_id = "test_creator_123"
    target = await MediaService.create_video_upload_target(
        user_id=user_id,
        filename="my_reel.mp4",
        content_type="video/mp4",
        size_bytes=15 * 1024 * 1024,
    )

    assert "upload_url" in target
    assert "key" in target
    assert target["key"].startswith(f"videos/{user_id}/")
    assert target["key"].endswith(".mp4")
    assert "public_url" in target
    assert target["content_type"] == "video/mp4"


@pytest.mark.asyncio
async def test_create_video_upload_target_webm_and_mov(mock_db):
    """Test generating presigned targets for WebM and MOV video formats."""
    user_id = "test_creator_webm"

    target_webm = await MediaService.create_video_upload_target(
        user_id=user_id,
        filename="clip.webm",
        content_type="video/webm",
        size_bytes=5 * 1024 * 1024,
    )
    assert target_webm["key"].endswith(".webm")

    target_mov = await MediaService.create_video_upload_target(
        user_id=user_id,
        filename="clip.mov",
        content_type="video/quicktime",
        size_bytes=5 * 1024 * 1024,
    )
    assert target_mov["key"].endswith(".mov")


@pytest.mark.asyncio
async def test_create_video_upload_target_rejects_unsupported_extension(mock_db):
    """Test rejecting unsupported video file extension."""
    with pytest.raises(HTTPException) as exc:
        await MediaService.create_video_upload_target(
            user_id="user_test",
            filename="document.pdf",
            content_type="video/mp4",
            size_bytes=1024,
        )
    assert exc.value.status_code == 400
    assert "unsupported video format" in str(exc.value.detail).lower()


@pytest.mark.asyncio
async def test_create_video_upload_target_rejects_oversized_file(mock_db):
    """Test rejecting files larger than the 50MB free-tier limit."""
    with pytest.raises(HTTPException) as exc:
        await MediaService.create_video_upload_target(
            user_id="user_test",
            filename="massive_video.mp4",
            content_type="video/mp4",
            size_bytes=51 * 1024 * 1024,  # 51MB
        )
    assert exc.value.status_code == 400
    assert "exceeds the maximum allowed video size" in str(exc.value.detail).lower()
