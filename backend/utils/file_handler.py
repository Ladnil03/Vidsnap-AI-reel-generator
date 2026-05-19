"""
Utility functions for validating uploaded image files.
"""

import os
from typing import Any

from fastapi import HTTPException, UploadFile

ALLOWED_CONTENT_TYPES: frozenset[str] = frozenset({
    "image/jpeg",
    "image/png",
    "image/webp",
})

ALLOWED_EXTENSIONS: frozenset[str] = frozenset({
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
})

MAX_IMAGES_PER_JOB: int = 10
MIN_IMAGES_PER_JOB: int = 1


def validate_image(file: UploadFile) -> None:
    """
    Validate a single uploaded file is an accepted image type.

    Checks both the MIME content_type and the file extension.
    Raises HTTPException 400 if either check fails.

    Args:
        file: The uploaded file from FastAPI.

    Raises:
        HTTPException: 400 if content type or extension is not allowed.
    """
    # Check content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"'{file.filename}' has unsupported type '{file.content_type}'. "
            "Accepted types: JPEG, PNG, WEBP.",
        )

    # Check file extension
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"'{file.filename}' has unsupported extension '{ext}'. "
            "Accepted extensions: .jpg, .jpeg, .png, .webp.",
        )


def validate_image_list(files: list[UploadFile]) -> None:
    """
    Validate a list of uploaded files for count and type.

    Args:
        files: List of uploaded files from FastAPI.

    Raises:
        HTTPException: 400 if count is out of range or any file is invalid.
    """
    # Check minimum count
    if len(files) < MIN_IMAGES_PER_JOB:
        raise HTTPException(
            status_code=400,
            detail="At least 1 image is required.",
        )

    # Check maximum count
    if len(files) > MAX_IMAGES_PER_JOB:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_IMAGES_PER_JOB} images allowed per reel. "
            f"You uploaded {len(files)}.",
        )

    # Validate each file
    for file in files:
        validate_image(file)
