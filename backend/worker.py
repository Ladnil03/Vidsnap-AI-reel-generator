"""
Background worker for processing reel generation jobs.

Runs as an asyncio task started on app startup.
Continuously polls MongoDB for queued jobs and processes them
one at a time through the full pipeline:
  1. Groq TTS  — voiceover text → audio.mp3
  2. FFmpeg    — images + audio → output.mp4
  3. Cloudinary — output.mp4 → public HTTPS URL
Updates the job status in MongoDB at every stage.
Cleans up temporary files after each job regardless of outcome.
"""

import asyncio
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path

from backend.config import settings
from backend.database import get_db
from backend.services.ffmpeg_service import generate_reel
from backend.services.storage_service import delete_reel, upload_reel
from backend.services.tts_service import generate_audio

logger = logging.getLogger(__name__)


async def _claim_next_job() -> dict | None:
    """
    Atomically claim the next queued job for processing.

    Uses MongoDB find_one_and_update to claim a job in a single
    atomic operation. This prevents two worker instances from
    ever processing the same job simultaneously.

    Returns:
        The job document if a queued job was found, otherwise None.
    """
    db = get_db()
    job = await db.jobs.find_one_and_update(
        filter={"status": "queued"},
        update={"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc)}},
        sort=[("created_at", 1)],
        return_document=True,
    )
    return job


async def _mark_done(job_id: str, reel_url: str, cloudinary_id: str) -> None:
    """
    Update a job's status to 'done' after successful processing.

    Args:
        job_id: The UUID of the completed job.
        reel_url: The Cloudinary HTTPS URL of the uploaded reel.
        cloudinary_id: The Cloudinary public_id for future deletion.
    """
    db = get_db()
    await db.jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {
                "status": "done",
                "reel_url": reel_url,
                "cloudinary_id": cloudinary_id,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    logger.info("[%s] Marked as done", job_id)


async def _mark_failed(job_id: str, error_message: str) -> None:
    """
    Update a job's status to 'failed' with a descriptive error message.

    The error_message is returned to the frontend via GET /api/jobs/{id}
    so the user can see what went wrong.

    Args:
        job_id: The UUID of the failed job.
        error_message: Human-readable description of what went wrong.
    """
    db = get_db()
    await db.jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {
                "status": "failed",
                "error_msg": error_message,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    logger.info("[%s] Marked as failed — %s", job_id, error_message)


async def _cleanup_tmp(tmp_dir: str) -> None:
    """
    Delete the temporary directory created for this job.

    Called after every job — whether it succeeded or failed.
    Prevents disk from filling up with leftover images and audio files.

    Args:
        tmp_dir: String path to the temporary directory.
    """
    path = Path(tmp_dir)
    shutil.rmtree(path, ignore_errors=True)
    logger.info("[Worker] Cleaned up tmp dir: %s", path)


async def _process_job(job: dict) -> None:
    """
    Run the full pipeline for a single job.

    Executes three steps in sequence:
      Step 1 — generate_audio (edge-tts)
      Step 2 — generate_reel (FFmpeg)
      Step 3 — upload_reel (Cloudinary)
    Updates MongoDB status at each step boundary.
    Cleans up tmp files in a finally block so cleanup always runs.

    Args:
        job: The full MongoDB job document as a dict.
    """
    job_id: str = job["job_id"]
    tmp_dir: str = job["tmp_dir"]

    # Use Path() which normalizes separators for the current OS.
    # MongoDB stores tmp_dir as a string, and path separators may differ
    # between the OS that created the job and the OS currently running.
    tmp_path: Path = Path(tmp_dir)

    # Guard — tmp_dir may have been wiped if the server restarted.
    # Failing fast here gives the user a clear, actionable error message.
    if not tmp_path.exists():
        await _mark_failed(
            job_id,
            "Temporary files were lost (server may have restarted). "
            "Please submit the job again."
        )
        return

    try:
        # Step 1 — Text to Speech
        logger.info("[%s] Step 1/3 — Generating audio...", job_id)
        audio_path = await generate_audio(
            text=job["voiceover_text"],
            output_dir=tmp_path,
        )

        # Step 2 — FFmpeg reel
        logger.info("[%s] Step 2/3 — Generating reel...", job_id)
        video_path = await generate_reel(
            image_filenames=job["image_files"],
            tmp_dir=tmp_path,
            audio_path=audio_path,
        )

        # Step 3 — Upload to Cloudinary
        logger.info("[%s] Step 3/3 — Uploading to Cloudinary...", job_id)
        reel_url, cloudinary_id = await upload_reel(
            video_path=video_path,
            job_id=job_id,
        )

        await _mark_done(job_id, reel_url, cloudinary_id)
        logger.info("[%s] Pipeline complete", job_id)

    except Exception as error:
        logger.error("[%s] Pipeline failed: %s", job_id, error, exc_info=True)
        await _mark_failed(job_id, str(error))

    finally:
        await _cleanup_tmp(str(tmp_path))


async def run_worker() -> None:
    """
    Main worker loop. Runs forever as an asyncio background task.

    Polls MongoDB every WORKER_POLL_SECONDS for queued jobs.
    Processes one job per poll cycle.
    Never raises — all errors are handled inside _process_job.
    """
    logger.info("[Worker] Started — polling every %ds", settings.worker_poll_seconds)

    while True:
        try:
            job = await _claim_next_job()
            if job:
                logger.info("[Worker] Picked up job %s", job["job_id"])
                await _process_job(job)
            else:
                logger.debug("[Worker] No queued jobs")
        except Exception as error:
            logger.error("[Worker] Unexpected error in poll loop: %s", error, exc_info=True)
        finally:
            await asyncio.sleep(settings.worker_poll_seconds)
