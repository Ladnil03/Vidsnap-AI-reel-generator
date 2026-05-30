"""
Job management routes for VidSnap AI backend.

Handles job creation (POST /api/jobs) and status polling (GET /api/jobs/{job_id}).
Routes perform HTTP validation only — business logic is delegated to background workers.
"""

import logging
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from backend.config import settings
from backend.database import get_db
from backend.models import JobCreatedResponse, JobStatusResponse
from backend.utils.dependencies import get_current_user
from backend.utils.file_handler import validate_image_list

logger = logging.getLogger(__name__)

TMP_BASE: Path = Path("/tmp/vidsnap")

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


def _generate_job_id() -> str:
    """
    Generate a unique job ID using UUID4.

    Returns:
        str: A unique identifier for the job.
    """
    return str(uuid.uuid4())


def _build_job_document(
    job_id: str,
    voiceover_text: str,
    tmp_dir: Path,
    image_filenames: list[str],
    user_id: str,
) -> dict:
    """
    Build the MongoDB job document for a new reel job.

    All fields are defined here in one place for easy reference.
    Status is always 'queued' on creation.

    Args:
        job_id: Unique job identifier.
        voiceover_text: The narration script for the reel.
        tmp_dir: Path to temporary directory where images are stored.
        image_filenames: List of saved image filenames (without directory).
        user_id: ID of the user who created this job.

    Returns:
        dict: A complete job document ready for insertion into MongoDB.
    """
    now = datetime.now(timezone.utc)
    return {
        "job_id": job_id,
        "user_id": user_id,
        "status": "queued",
        "voiceover_text": voiceover_text,
        "image_count": len(image_filenames),
        "image_files": image_filenames,
        "tmp_dir": str(tmp_dir),
        "reel_url": None,
        "cloudinary_id": None,
        "error_msg": None,
        "created_at": now,
        "updated_at": now,
    }


@router.post("", response_model=JobCreatedResponse, status_code=201)
async def create_job(
    voiceover_text: Annotated[str, Form()],
    images: Annotated[list[UploadFile], File()],
    current_user: dict = Depends(get_current_user),
) -> JobCreatedResponse:
    """
    Create a new reel generation job.

    Validates uploaded images, saves them to a temporary directory,
    and inserts a job document into MongoDB with status='queued'.
    Returns the job_id immediately. Actual processing happens in the
    background worker — poll GET /api/jobs/{job_id} for updates.

    Args:
        voiceover_text: The narration script to convert to speech.
        images: One to 10 image files (JPEG, PNG, or WEBP).
        current_user: Authenticated user (injected by dependency).

    Returns:
        JobCreatedResponse with job_id and status='queued'.

    Raises:
        HTTPException: 400 if images are invalid or file sizes exceed limit.
        HTTPException: 402 if user has no tokens remaining.
    """
    # Validate images
    validate_image_list(images)

    # Check token balance
    if current_user["tokens_remaining"] <= 0:
        raise HTTPException(
            status_code=402,
            detail="You have no tokens remaining. Contact admin to get more tokens.",
        )

    # Generate job ID and temporary directory
    job_id = _generate_job_id()
    tmp_dir = TMP_BASE / job_id
    tmp_dir.mkdir(parents=True, exist_ok=True)
    logger.info("[%s] Temporary directory created at %s", job_id, tmp_dir)

    # Save images to temporary directory
    image_filenames: list[str] = []
    for i, image in enumerate(images):
        # Extract file extension from original filename
        _, ext = os.path.splitext(image.filename or "image.jpg")
        ext = ext.lower()

        # Generate sequential filename
        filename = f"image_{i:02d}{ext}"
        image_filenames.append(filename)

        # Read file content
        file_bytes = await image.read()

        # Validate file size
        if len(file_bytes) > settings.max_image_size_bytes:
            shutil.rmtree(tmp_dir)
            logger.warning(
                "[%s] File '%s' exceeds size limit, cleaned up job directory",
                job_id,
                image.filename,
            )
            raise HTTPException(
                status_code=400,
                detail=f"'{image.filename}' exceeds the {settings.max_image_size_mb} MB limit.",
            )

        # Write file to disk
        file_path = tmp_dir / filename
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_bytes)
        logger.debug("[%s] Saved %s (%d bytes)", job_id, filename, len(file_bytes))

    # Create job document
    doc = _build_job_document(job_id, voiceover_text, tmp_dir, image_filenames, current_user["user_id"])

    # Insert into MongoDB
    await get_db().jobs.insert_one(doc)
    logger.info("[%s] Job queued — %d image(s)", job_id, len(images))

    # Deduct one token from user
    await get_db().users.update_one(
        {"user_id": current_user["user_id"]},
        {"$inc": {"tokens_remaining": -1}},
    )
    logger.info(
        "[%s] Token consumed — %d remaining",
        job_id,
        current_user["tokens_remaining"] - 1,
    )

    # Return response
    return JobCreatedResponse(
        job_id=job_id,
        status="queued",
        message=f"Reel generation job {job_id} created. Check status by polling /api/jobs/{job_id}.",
    )


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str, current_user: dict = Depends(get_current_user)
) -> JobStatusResponse:
    """
    Return the current status of a reel generation job.

    Designed to be polled by the frontend every 3 seconds after job creation.
    Returns reel_url when status='done', error_msg when status='failed'.

    Args:
        job_id: The UUID returned by POST /api/jobs.
        current_user: Authenticated user (injected by dependency).

    Returns:
        JobStatusResponse with current status and reel_url or error_msg.

    Raises:
        HTTPException: 403 if user does not own the job and is not admin.
        HTTPException: 404 if job_id does not exist.
    """
    job = await get_db().jobs.find_one({"job_id": job_id})

    if job is None:
        logger.warning("Job '%s' not found", job_id)
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    # Check ownership — allow job creator or admin
    if job["user_id"] != current_user["user_id"] and not current_user.get("is_admin"):
        raise HTTPException(
            status_code=403, detail="You do not have access to this job."
        )

    logger.debug("[%s] Status query — current status: %s", job_id, job.get("status"))

    return JobStatusResponse(
        job_id=job["job_id"],
        status=job["status"],
        reel_url=job.get("reel_url"),
        error_msg=job.get("error_msg"),
        created_at=job["created_at"],
        updated_at=job["updated_at"],
    )
