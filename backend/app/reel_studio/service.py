"""
Reel Studio Domain Service.
Orchestrates job lifecycle, atomic token spending, queue dispatch,
and gallery queries with soft-delete data retention.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status

from backend.app.billing_quota.service import BillingService
from backend.app.core.adapters.factory import get_queue_adapter, get_storage_adapter
from backend.app.core.database import get_db
from backend.app.reel_studio.models import (
    CreateJobRequest,
    JobCreatedResponse,
    JobStage,
    JobStatusResponse,
    ReelItem,
)

logger = logging.getLogger(__name__)


class ReelStudioService:
    """Service managing reel jobs and user gallery."""

    @staticmethod
    async def create_reel_job(
        request: CreateJobRequest,
        user_id: str,
    ) -> JobCreatedResponse:
        """
        Initiate a new reel generation job.
        1. Atomically deducts 1 token from user balance.
        2. Inserts job doc into MongoDB.
        3. Enqueues job to Redis ARQ worker.
        """
        job_id = str(uuid.uuid4())

        # 1. Atomic token deduction
        has_token = await BillingService.atomic_consume_token(user_id, job_id)
        if not has_token:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="You have no tokens remaining. Please contact support or upgrade.",
            )

        now = datetime.now(timezone.utc)
        job_doc = {
            "job_id": job_id,
            "user_id": user_id,
            "status": "queued",
            "stage": JobStage.QUEUED.value,
            "voiceover_text": request.voiceover_text,
            "image_keys": request.image_keys,
            "voice": request.voice,
            "image_duration": request.duration,
            "reel_url": None,
            "thumbnail_url": None,
            "storage_key": None,
            "thumbnail_key": None,
            "error_msg": None,
            "deleted": False,
            "created_at": now,
            "updated_at": now,
        }

        db = get_db()
        await db.jobs.insert_one(job_doc)
        logger.info("Reel job %s created in database for user %s", job_id, user_id)

        # 2. Dispatch to background queue
        queue = get_queue_adapter()
        try:
            await queue.enqueue("process_reel_job", job_id=job_id)
            logger.info("Reel job %s dispatched to worker queue", job_id)
        except Exception as e:
            logger.error("Failed to enqueue job %s: %s (initiating refund)", job_id, e)
            await db.jobs.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": "failed",
                        "error_msg": "Queue dispatch error",
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            await BillingService.atomic_refund_token(user_id, job_id, "Queue dispatch failure")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to queue job for processing. Token has been refunded.",
            ) from e

        return JobCreatedResponse(
            job_id=job_id,
            status="queued",
            stage=JobStage.QUEUED,
            message="Reel generation job successfully queued.",
        )

    @staticmethod
    async def get_job_status(job_id: str, user_id: str, is_admin: bool = False) -> JobStatusResponse:
        """Fetch job status and check ownership."""
        db = get_db()
        job = await db.jobs.find_one({"job_id": job_id})
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")

        if job["user_id"] != user_id and not is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        return JobStatusResponse(
            job_id=job["job_id"],
            status=job["status"],
            stage=JobStage(job.get("stage", JobStage.QUEUED.value)),
            reel_url=job.get("reel_url"),
            thumbnail_url=job.get("thumbnail_url"),
            error_msg=job.get("error_msg"),
            created_at=job["created_at"],
            updated_at=job["updated_at"],
        )

    @staticmethod
    async def get_user_reels(
        user_id: str,
        limit: int = 50,
    ) -> list[ReelItem]:
        """Fetch completed reels for user (excluding soft-deleted ones)."""
        db = get_db()
        cursor = db.jobs.find(
            {
                "user_id": user_id,
                "status": "done",
                "deleted": {"$ne": True},
            },
            sort=[("created_at", -1)],
        ).limit(min(limit, 100))

        reels: list[ReelItem] = []
        async for doc in cursor:
            if doc.get("reel_url"):
                reels.append(
                    ReelItem(
                        job_id=doc["job_id"],
                        reel_url=doc["reel_url"],
                        thumbnail_url=doc.get("thumbnail_url"),
                        created_at=doc["created_at"],
                    )
                )
        return reels

    @staticmethod
    async def soft_delete_reel(job_id: str, user_id: str, is_admin: bool = False) -> None:
        """
        Soft-delete reel from user gallery while preserving billing and audit logs.
        Attempts to prune the video from storage.
        """
        db = get_db()
        job = await db.jobs.find_one({"job_id": job_id})
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")

        if job["user_id"] != user_id and not is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        # Soft delete in database
        now = datetime.now(timezone.utc)
        await db.jobs.update_one(
            {"job_id": job_id},
            {"$set": {"deleted": True, "deleted_at": now, "updated_at": now}},
        )

        # Prune storage asset if key is stored
        storage_key = job.get("storage_key")
        if storage_key:
            storage = get_storage_adapter()
            try:
                await storage.delete_file(storage_key)
            except Exception as e:
                logger.warning("Could not prune storage file '%s': %s", storage_key, e)

        logger.info("Reel %s soft-deleted by user %s", job_id, user_id)
