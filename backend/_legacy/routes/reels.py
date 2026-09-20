"""
Reel management routes for VidSnap AI backend.

Handles reel gallery listing and deletion. Routes perform HTTP operations only.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from backend.database import get_db
from backend.models import DeleteResponse, ReelItem
from backend.services.storage_service import delete_reel as delete_reel_from_cloudinary
from backend.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reels", tags=["Reels"])


@router.get("", response_model=list[ReelItem])
async def list_reels(
    skip: int = 0,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
) -> list[ReelItem]:
    """
    Return all completed reels for the current user, newest first.

    Queries MongoDB for jobs where status='done', reel_url is not null,
    and user_id matches the authenticated user.
    Used by the frontend Gallery page to display generated reels.

    Args:
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        current_user: Authenticated user (injected by dependency).

    Returns:
        List of ReelItem for this user, sorted by created_at descending.
        Returns an empty list if user has no completed reels.
    """
    db = get_db()
    reels: list[ReelItem] = []

    cursor = db.jobs.find(
        {"user_id": current_user["user_id"], "status": "done", "reel_url": {"$ne": None}},
        sort=[("created_at", -1)],
    ).skip(skip).limit(limit)

    async for job in cursor:
        reel = ReelItem(
            job_id=job["job_id"],
            reel_url=job["reel_url"],
            created_at=job["created_at"],
        )
        reels.append(reel)

    logger.info("Retrieved %d reels from gallery for user %s", len(reels), current_user["user_id"])
    return reels


@router.delete("/{job_id}", response_model=DeleteResponse)
async def delete_reel(
    job_id: str, current_user: dict = Depends(get_current_user)
) -> DeleteResponse:
    """
    Delete a reel from Cloudinary and remove its job record from MongoDB.

    Verifies user owns the reel (or is admin). Cloudinary deletion is attempted
    first. If it fails, the error is logged but MongoDB deletion still proceeds
    so the gallery stays clean.

    Args:
        job_id: The UUID of the job to delete.
        current_user: Authenticated user (injected by dependency).

    Returns:
        DeleteResponse confirming deletion.

    Raises:
        HTTPException: 403 if user does not own the reel and is not admin.
        HTTPException: 404 if job_id does not exist.
    """
    db = get_db()
    job = await db.jobs.find_one({"job_id": job_id})

    if job is None:
        logger.warning("Job '%s' not found for deletion", job_id)
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    # Check ownership — allow job creator or admin
    if job["user_id"] != current_user["user_id"] and not current_user.get("is_admin"):
        raise HTTPException(
            status_code=403, detail="You do not have access to delete this reel."
        )

    # Attempt Cloudinary deletion if cloudinary_id exists
    if job.get("cloudinary_id") is not None:
        try:
            await delete_reel_from_cloudinary(job["cloudinary_id"])
        except Exception as error:
            logger.error(
                "[%s] Cloudinary deletion failed: %s — proceeding with MongoDB cleanup",
                job_id,
                error,
            )

    # Delete from MongoDB (source of truth for gallery)
    await db.jobs.delete_one({"job_id": job_id})
    logger.info("[%s] Reel deleted — Cloudinary and MongoDB", job_id)

    return DeleteResponse(deleted=True, job_id=job_id)
