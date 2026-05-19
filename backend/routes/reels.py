"""
Reel management routes for VidSnap AI backend.

Handles reel gallery listing and deletion. Routes perform HTTP operations only.
"""

import logging

from fastapi import APIRouter, HTTPException

from backend.database import get_db
from backend.models import DeleteResponse, ReelItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reels", tags=["Reels"])


@router.get("", response_model=list[ReelItem])
async def list_reels() -> list[ReelItem]:
    """
    Return all completed reels, newest first.

    Queries MongoDB for jobs where status='done' and reel_url is not null.
    Used by the frontend Gallery page to display all generated reels.

    Returns:
        List of ReelItem, sorted by created_at descending.
        Returns an empty list if no reels exist yet.
    """
    db = get_db()
    reels: list[ReelItem] = []

    cursor = db.jobs.find(
        {"status": "done", "reel_url": {"$ne": None}},
        sort=[("created_at", -1)],
    )

    async for job in cursor:
        reel = ReelItem(
            job_id=job["job_id"],
            reel_url=job["reel_url"],
            created_at=job["created_at"],
        )
        reels.append(reel)

    logger.info("Retrieved %d reels from gallery", len(reels))
    return reels


@router.delete("/{job_id}", response_model=DeleteResponse)
async def delete_reel(job_id: str) -> DeleteResponse:
    """
    Delete a reel and its job record.

    Removes the job document from MongoDB.
    Cloudinary deletion is wired in Day 4 when the storage service is added.

    Args:
        job_id: The UUID of the job to delete.

    Returns:
        DeleteResponse confirming deletion.

    Raises:
        HTTPException: 404 if job_id does not exist.
    """
    db = get_db()
    job = await db.jobs.find_one({"job_id": job_id})

    if job is None:
        logger.warning("Job '%s' not found for deletion", job_id)
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    # TODO Day 4: await storage_service.delete_reel(job["cloudinary_id"])

    await db.jobs.delete_one({"job_id": job_id})
    logger.info("[%s] Job deleted from MongoDB", job_id)

    return DeleteResponse(deleted=True, job_id=job_id)
