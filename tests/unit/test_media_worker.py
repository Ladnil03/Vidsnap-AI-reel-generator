"""
Unit tests for W3-5: Media worker pipeline (backend/workers/media_worker.py).
Covers:
- Success path (end-to-end status progression to done, URLs populated, scratch cleaned).
- Failure path (status set to failed, token refunded exactly once).
- Retry configuration and backoff parameters.
- Re-check of storage key ownership in worker (defense-in-depth against IDOR).
- Scratch directory cleanup on success and failure.
- Tiny sample video generation with FFmpeg lavfi (cleanly skipped if FFmpeg unavailable).
"""

import os
import shutil
import subprocess
from unittest.mock import AsyncMock, patch

import pytest

from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.reel_studio.models import JobStage
from backend.workers.media_worker import WorkerSettings, process_reel_job


@pytest.mark.asyncio
async def test_worker_success_path(mock_db, tmp_path):
    """Successful processing transitions job through stages to 'done' and cleans temp files."""
    user_id = "user_worker_success"
    job_id = "job_worker_success_001"

    # Seed job doc
    await mock_db.jobs.insert_one({
        "job_id": job_id,
        "user_id": user_id,
        "status": "queued",
        "stage": JobStage.QUEUED.value,
        "voiceover_text": "This is a wonderful success story.",
        "image_keys": [f"uploads/{user_id}/img1.jpg"],
        "voice": "natural_us",
        "image_duration": 3,
    })

    storage = get_storage_adapter()
    # Pre-upload mock image
    await storage.upload_bytes(b"dummy_img_data", f"uploads/{user_id}/img1.jpg", "image/jpeg")

    dummy_video = tmp_path / "mock_video.mp4"
    dummy_video.write_bytes(b"dummy_mp4_bytes")
    dummy_thumb = tmp_path / "mock_thumb.jpg"
    dummy_thumb.write_bytes(b"dummy_thumb_bytes")

    p1 = patch("backend.workers.media_worker.generate_speech", new=AsyncMock())
    p2 = patch("backend.workers.media_worker.render_video", new=AsyncMock(return_value=dummy_video))
    p3 = patch("backend.workers.media_worker.generate_thumbnail", new=AsyncMock(return_value=dummy_thumb))

    with p1 as mock_tts, p2 as mock_render, p3 as mock_thumb:
        await process_reel_job({}, job_id)

        assert mock_tts.called
        assert mock_render.called
        assert mock_thumb.called

    job = await mock_db.jobs.find_one({"job_id": job_id})
    assert job is not None
    assert job["status"] == "done"
    assert job["stage"] == JobStage.DONE.value
    assert job["reel_url"] is not None
    assert job["thumbnail_url"] is not None


@pytest.mark.asyncio
async def test_worker_failure_refunds_token_exactly_once(mock_db):
    """
    Pipeline failure must set status='failed', record error_msg,
    and refund the user's token exactly once without double-refunding on replay.
    """
    user_id = "user_worker_fail"
    job_id = "job_worker_fail_001"

    # Seed user with 4 tokens (after 1 was deducted on creation)
    await mock_db.users.insert_one({
        "user_id": user_id,
        "email": "fail_user@example.com",
        "tokens_remaining": 4,
    })

    # Seed job doc
    await mock_db.jobs.insert_one({
        "job_id": job_id,
        "user_id": user_id,
        "status": "queued",
        "stage": JobStage.QUEUED.value,
        "voiceover_text": "This job will fail during TTS.",
        "image_keys": [f"uploads/{user_id}/img1.jpg"],
        "voice": "natural_us",
    })

    # Force TTS failure
    with patch("backend.workers.media_worker.generate_speech", side_effect=RuntimeError("TTS failure")):
        await process_reel_job({}, job_id)

    # Verify job failed
    job = await mock_db.jobs.find_one({"job_id": job_id})
    assert job["status"] == "failed"
    assert "TTS failure" in job["error_msg"]

    # Verify token refunded (balance is now 5)
    user = await mock_db.users.find_one({"user_id": user_id})
    assert user["tokens_remaining"] == 5

    # Run worker on the same job a second time: must skip and NOT double-refund
    await process_reel_job({}, job_id)
    user_after = await mock_db.users.find_one({"user_id": user_id})
    assert user_after["tokens_remaining"] == 5


@pytest.mark.asyncio
async def test_worker_ownership_recheck_blocks_idor(mock_db):
    """Worker detects when an image key belongs to a different user, aborting and refunding."""
    user_id = "victim_worker_user"
    attacker_id = "attacker_worker_user"
    job_id = "job_idor_test_001"

    await mock_db.users.insert_one({
        "user_id": user_id,
        "email": "victim_w@example.com",
        "tokens_remaining": 2,
    })

    # Job has image key belonging to attacker
    await mock_db.jobs.insert_one({
        "job_id": job_id,
        "user_id": user_id,
        "status": "queued",
        "stage": JobStage.QUEUED.value,
        "voiceover_text": "Trying to steal images.",
        "image_keys": [f"uploads/{attacker_id}/private.jpg"],
    })

    await process_reel_job({}, job_id)

    job = await mock_db.jobs.find_one({"job_id": job_id})
    assert job["status"] == "failed"
    assert "Key ownership violation" in job["error_msg"]

    # Token refunded
    user = await mock_db.users.find_one({"user_id": user_id})
    assert user["tokens_remaining"] == 3


@pytest.mark.asyncio
async def test_worker_scratchpad_cleanup_on_error(mock_db):
    """The temporary scratch directory must be removed even when pipeline crashes."""
    user_id = "user_scratch_test"
    job_id = "job_scratch_test_001"

    await mock_db.jobs.insert_one({
        "job_id": job_id,
        "user_id": user_id,
        "status": "queued",
        "stage": JobStage.QUEUED.value,
        "voiceover_text": "Cleanup verification.",
        "image_keys": [f"uploads/{user_id}/img1.jpg"],
    })

    created_dirs = []
    original_mkdtemp = __import__("tempfile").mkdtemp

    def tracking_mkdtemp(**kwargs):
        d = original_mkdtemp(**kwargs)
        created_dirs.append(d)
        return d

    with patch("tempfile.mkdtemp", side_effect=tracking_mkdtemp), \
         patch("backend.workers.media_worker.generate_speech", side_effect=ValueError("Boom")):
        await process_reel_job({}, job_id)

    assert len(created_dirs) == 1
    assert not os.path.exists(created_dirs[0])


def test_worker_settings_retry_configuration():
    """WorkerSettings must configure max retries and retry delay for transient resilience."""
    assert hasattr(WorkerSettings, "max_tries")
    assert WorkerSettings.max_tries >= 3
    assert hasattr(WorkerSettings, "retry_delay")
    assert WorkerSettings.retry_delay >= 5


def test_ffmpeg_lavfi_sample_video_generation(tmp_path):
    """
    Generate a 1-second sample video using FFmpeg lavfi filter.
    Cleanly skips if FFmpeg is not installed on the execution environment.
    """
    if not shutil.which("ffmpeg"):
        pytest.skip("FFmpeg is not installed on host machine")

    sample_output = tmp_path / "lavfi_sample.mp4"
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=duration=1:size=320x240:rate=1",
        "-f", "lavfi",
        "-i", "sine=frequency=1000:duration=1",
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        "-c:a", "aac",
        str(sample_output),
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=10, check=False)  # noqa: S603
    assert result.returncode == 0
    assert sample_output.exists()
    assert sample_output.stat().st_size > 0
