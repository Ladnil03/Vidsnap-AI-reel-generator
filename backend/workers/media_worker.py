"""
Standalone ARQ Media Worker.
Processes video generation jobs asynchronously out of the web process.
Handles:
1. Audio generation via edge-tts
2. Image downloading from storage to isolated scratch directory
3. FFmpeg video composition (720p 9:16 vertical MP4 with blurred background)
4. Thumbnail generation
5. Uploading output assets to storage
6. Updating MongoDB stage status
7. Cleaning up scratch directory
8. Automatic token refund on failure
"""

import logging
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, ClassVar

from arq.connections import RedisSettings

from backend.app.billing_quota.service import BillingService
from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.core.config import settings
from backend.app.core.database import connect_db, disconnect_db, get_db
from backend.app.core.logging_config import setup_logging
from backend.app.media.ownership import is_key_owned
from backend.app.reel_studio.ffmpeg_builder import generate_thumbnail, render_video
from backend.app.reel_studio.models import JobStage
from backend.app.reel_studio.tts_service import generate_speech

setup_logging(debug=settings.debug)
logger = logging.getLogger("media_worker")


async def startup(ctx: dict[str, Any]) -> None:
    """Worker startup hook: Connects to database."""
    logger.info("Starting Media Worker...")
    await connect_db()
    ctx["db"] = get_db()
    ctx["storage"] = get_storage_adapter()
    logger.info("Media Worker ready to process jobs (Concurrency: %d)", settings.worker_concurrency)


async def shutdown(ctx: dict[str, Any]) -> None:
    """Worker shutdown hook: Closes database connection."""
    logger.info("Shutting down Media Worker...")
    await disconnect_db()
    logger.info("Media Worker stopped.")


async def process_reel_job(ctx: dict[str, Any], job_id: str) -> None:
    """
    Main job processing pipeline executed by worker.
    """
    db = get_db()
    storage = get_storage_adapter()

    # Find job document
    job = await db.jobs.find_one({"job_id": job_id})
    if not job:
        logger.error("Job %s not found in database, aborting", job_id)
        return

    # Check if job was already processed or cancelled
    if job.get("status") in ("done", "failed"):
        logger.warning("Job %s is already in state '%s', skipping", job_id, job["status"])
        return

    logger.info("[%s] Starting processing pipeline for user %s", job_id, job["user_id"])

    # Re-validate image key ownership inside the worker (defense-in-depth)
    user_id = job["user_id"]
    for key in job.get("image_keys", []):
        if not is_key_owned(user_id, key):
            logger.error("[%s] Key ownership violation: key '%s' does not belong to user '%s'", job_id, key, user_id)
            await db.jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "failed",
                    "stage": JobStage.FAILED.value,
                    "error_msg": "Key ownership violation",
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            await BillingService.atomic_refund_token(user_id, job_id, "Key ownership violation")
            return

    now = datetime.now(timezone.utc)

    # Update job to processing
    await db.jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "stage": JobStage.TTS_GENERATING.value, "updated_at": now}},
    )

    # Create isolated temporary scratchpad
    scratch_dir = Path(tempfile.mkdtemp(prefix=f"vidsnap_job_{job_id}_"))

    try:
        # Step 1: Generate Speech Audio
        logger.info("[%s] Stage 1/4: Generating TTS audio...", job_id)
        audio_path = scratch_dir / "audio.mp3"
        await generate_speech(
            text=job["voiceover_text"],
            output_path=audio_path,
            voice=job.get("voice", "en-US-AriaNeural"),
        )

        # Step 2: Download image assets from storage
        logger.info("[%s] Stage 2/4: Downloading %d image(s)...", job_id, len(job["image_keys"]))
        await db.jobs.update_one(
            {"job_id": job_id},
            {"$set": {"stage": JobStage.RENDERING_VIDEO.value, "updated_at": datetime.now(timezone.utc)}},
        )

        local_image_paths: list[Path] = []
        for idx, key in enumerate(job["image_keys"]):
            dest = scratch_dir / f"img_{idx:03d}_{Path(key).name}"
            await storage.download_file(key, dest)
            local_image_paths.append(dest)

        # Step 3: Render 720p MP4 Video with blurred 9:16 background
        logger.info("[%s] Stage 3/4: Rendering video via FFmpeg...", job_id)
        video_path = await render_video(
            image_paths=local_image_paths,
            audio_path=audio_path,
            scratch_dir=scratch_dir,
            image_duration=job.get("image_duration", 3),
        )

        # Generate thumbnail
        thumbnail_path = await generate_thumbnail(video_path, scratch_dir)

        # Step 4: Upload generated assets to storage
        logger.info("[%s] Stage 4/4: Uploading video and thumbnail...", job_id)
        await db.jobs.update_one(
            {"job_id": job_id},
            {"$set": {"stage": JobStage.UPLOADING_MEDIA.value, "updated_at": datetime.now(timezone.utc)}},
        )

        user_id = job["user_id"]
        video_key = f"reels/{user_id}/{job_id}.mp4"
        thumb_key = f"reels/{user_id}/{job_id}_thumb.jpg"

        reel_url = await storage.upload_file(video_path, video_key, "video/mp4")
        thumb_url = await storage.upload_file(thumbnail_path, thumb_key, "image/jpeg")

        # Mark job completed
        await db.jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "done",
                    "stage": JobStage.DONE.value,
                    "reel_url": reel_url,
                    "thumbnail_url": thumb_url,
                    "storage_key": video_key,
                    "thumbnail_key": thumb_key,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        logger.info("[%s] Reel pipeline complete! URL: %s", job_id, reel_url)

    except Exception as e:
        logger.error("[%s] Pipeline failed: %s", job_id, e, exc_info=True)
        # Mark failed
        await db.jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "stage": JobStage.FAILED.value,
                    "error_msg": str(e),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        # Atomic token refund back to user
        await BillingService.atomic_refund_token(
            user_id=job["user_id"],
            job_id=job_id,
            reason=f"Pipeline error: {e}",
        )
    finally:
        # Guarantee scratchpad cleanup regardless of success or failure
        if scratch_dir.exists():
            shutil.rmtree(scratch_dir, ignore_errors=True)
            logger.debug("[%s] Scratchpad cleaned up: %s", job_id, scratch_dir)


async def process_native_video_job(
    ctx: dict[str, Any],
    video_id: str,
    user_id: str,
    video_key: str,
) -> None:
    """Process uploaded native video: 720p vertical transcode, poster thumbnail, and captions."""
    from backend.app.content.models import ContentStatus
    from backend.app.media.captions import generate_captions_from_video
    from backend.app.media.service import MediaService
    from backend.app.media.transcoder import extract_thumbnail, transcode_video_to_720p

    db = get_db()
    storage = get_storage_adapter()
    scratch_dir = Path(tempfile.mkdtemp(prefix=f"native_vid_{video_id}_"))

    # Re-validate video key ownership inside the worker (defense-in-depth)
    if not is_key_owned(user_id, video_key):
        logger.error(
            "[%s] Key ownership violation: video_key '%s' does not belong to user '%s'",
            video_id,
            video_key,
            user_id,
        )
        await db.videos.update_one(
            {"video_id": video_id},
            {
                "$set": {
                    "status": "failed",
                    "error_msg": "Key ownership violation",
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        return

    try:
        logger.info("[%s] Starting native video pipeline for %s...", video_id, video_key)
        raw_video = scratch_dir / "raw_input.mp4"
        await storage.download_file(video_key, raw_video)

        # 1. 720p Transcode
        output_720p = scratch_dir / "output_720p.mp4"
        meta = await transcode_video_to_720p(raw_video, output_720p)

        # 2. Thumbnail
        thumb_path = scratch_dir / "thumb.jpg"
        await extract_thumbnail(output_720p, thumb_path)

        # 3. Captions
        _, captions = await generate_captions_from_video(output_720p, scratch_dir)

        # 4. Upload processed assets
        final_video_key = f"videos/{user_id}/{video_id}_720p.mp4"
        final_thumb_key = f"thumbnails/{user_id}/{video_id}_thumb.jpg"

        await storage.upload_file(output_720p, final_video_key, "video/mp4")
        await storage.upload_file(thumb_path, final_thumb_key, "image/jpeg")

        video_url = storage.get_public_url(final_video_key)
        thumb_url = storage.get_public_url(final_thumb_key)

        await db.videos.update_one(
            {"video_id": video_id},
            {
                "$set": {
                    "video_key": final_video_key,
                    "thumbnail_key": final_thumb_key,
                    "video_url": video_url,
                    "thumbnail_url": thumb_url,
                    "duration": meta.get("duration", 0.0),
                    "captions": captions,
                    "status": ContentStatus.PUBLISHED.value,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        await MediaService.record_asset(user_id, final_video_key, output_720p.stat().st_size, "video_720p")
        await MediaService.record_asset(user_id, final_thumb_key, thumb_path.stat().st_size, "thumbnail")
        logger.info("[%s] Native video pipeline completed successfully: %s", video_id, video_url)
    except Exception as e:
        logger.error("[%s] Native video processing failed: %s", video_id, e)
        await db.videos.update_one(
            {"video_id": video_id},
            {"$set": {"status": "failed", "error_msg": str(e), "updated_at": datetime.now(timezone.utc)}},
        )
    finally:
        if scratch_dir.exists():
            shutil.rmtree(scratch_dir, ignore_errors=True)


async def scheduled_publisher_task(ctx: dict[str, Any]) -> int:
    """Periodic worker task: Publish scheduled videos whose release time has arrived."""
    from backend.app.content.service import ContentService
    return await ContentService.publish_due_scheduled_videos()


async def retention_reaper_task(ctx: dict[str, Any]) -> dict[str, int]:
    """Periodic worker task: Clean up expired drafts and failed job artifacts."""
    from backend.app.content.service import ContentService
    return await ContentService.clean_expired_retention(
        draft_retention_days=settings.draft_retention_days,
        failed_job_retention_hours=settings.failed_job_retention_hours,
    )


class WorkerSettings:
    """ARQ Worker configuration settings."""
    functions: ClassVar[list[Any]] = [
        process_reel_job,
        process_native_video_job,
        scheduled_publisher_task,
        retention_reaper_task,
    ]
    on_startup = startup
    on_shutdown = shutdown
    max_jobs = settings.worker_concurrency
    max_tries = 3
    retry_delay = 10
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    job_timeout = settings.ffmpeg_timeout_seconds + 60
