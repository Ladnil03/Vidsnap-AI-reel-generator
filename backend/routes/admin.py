"""
Admin-only routes — view all users, all reels, all feedback,
and adjust user token balances.
All routes require admin access via get_current_admin dependency.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from backend.database import get_db
from backend.models import (
    AdminFeedbackItem,
    AdminTokenUpdate,
    AdminUserItem,
)
from backend.utils.dependencies import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users", response_model=list[AdminUserItem])
async def get_all_users(
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> list[AdminUserItem]:
    """
    Return all registered users with their token balance and total reel count.

    Sorted by account creation date, newest first.

    Args:
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        admin: Authenticated admin user (injected by dependency).

    Returns:
        List of AdminUserItem containing user info and reel count.
    """
    db = get_db()
    users_list: list[AdminUserItem] = []

    cursor = db.users.find(sort=[("created_at", -1)]).skip(skip).limit(limit)

    async for user in cursor:
        # Count completed reels for this user
        total_reels = await db.jobs.count_documents(
            {"user_id": user["user_id"], "status": "done"}
        )

        admin_user = AdminUserItem(
            user_id=user["user_id"],
            name=user["name"],
            email=user["email"],
            tokens_remaining=user["tokens_remaining"],
            total_reels=total_reels,
            created_at=user["created_at"],
        )
        users_list.append(admin_user)

    logger.info("[Admin] Retrieved list of %d users", len(users_list))
    return users_list


@router.patch("/users/{user_id}/tokens", response_model=dict)
async def update_user_tokens(
    user_id: str,
    request: AdminTokenUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Manually set a user's token balance.

    Used by admin to give more tokens to a user or adjust their balance.

    Args:
        user_id: The user ID to update.
        request: Token update request containing new token count.
        admin: Authenticated admin user (injected by dependency).

    Returns:
        Confirmation dict with updated token count.

    Raises:
        HTTPException: 404 if user not found.
    """
    db = get_db()

    # Find user
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )

    # Update token balance
    await db.users.update_one(
        {"user_id": user_id}, {"$set": {"tokens_remaining": request.tokens}}
    )

    logger.info(
        "[Admin] Tokens set to %d for user %s by admin %s",
        request.tokens,
        user["email"],
        admin["email"],
    )

    return {"updated": True, "tokens_remaining": request.tokens}


@router.get("/reels", response_model=list[dict])
async def get_all_reels(
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """
    Return all completed reels across all users.

    Includes user email for admin reference. Sorted by creation date, newest first.

    Args:
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        admin: Authenticated admin user (injected by dependency).

    Returns:
        List of dicts with job_id, reel_url, created_at, and user_email.
    """
    db = get_db()
    reels_list: list[dict] = []

    cursor = db.jobs.find(
        {"status": "done", "reel_url": {"$ne": None}},
        sort=[("created_at", -1)],
    ).skip(skip).limit(limit)

    async for job in cursor:
        # Fetch user email
        user = await db.users.find_one({"user_id": job["user_id"]})
        user_email = user["email"] if user else "Unknown"

        reel_item = {
            "job_id": job["job_id"],
            "reel_url": job["reel_url"],
            "created_at": job["created_at"],
            "user_email": user_email,
        }
        reels_list.append(reel_item)

    logger.info("[Admin] Retrieved list of %d reels", len(reels_list))
    return reels_list


@router.get("/feedback", response_model=list[AdminFeedbackItem])
async def get_all_feedback(
    admin: dict = Depends(get_current_admin),
) -> list[AdminFeedbackItem]:
    """
    Return all user feedback from the platform.

    Sorted by submission date, newest first.

    Args:
        admin: Authenticated admin user (injected by dependency).

    Returns:
        List of AdminFeedbackItem with all feedback details.
    """
    db = get_db()
    feedback_list: list[AdminFeedbackItem] = []

    cursor = db.feedback.find(sort=[("created_at", -1)])

    async for feedback in cursor:
        feedback_item = AdminFeedbackItem(
            feedback_id=feedback["feedback_id"],
            user_id=feedback["user_id"],
            user_name=feedback["user_name"],
            user_email=feedback["user_email"],
            message=feedback["message"],
            created_at=feedback["created_at"],
        )
        feedback_list.append(feedback_item)

    logger.info("[Admin] Retrieved %d feedback entries", len(feedback_list))
    return feedback_list


@router.get("/stats", response_model=dict)
async def get_platform_stats(
    admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Return platform-wide statistics for admin dashboard.

    Includes total users, reels, feedback, and reels created today.

    Args:
        admin: Authenticated admin user (injected by dependency).

    Returns:
        Dictionary with platform statistics.
    """
    db = get_db()

    # Total users
    total_users = await db.users.count_documents({})

    # Total completed reels
    total_reels = await db.jobs.count_documents({"status": "done"})

    # Total feedback
    total_feedback = await db.feedback.count_documents({})

    # Reels created today
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    reels_today = await db.jobs.count_documents(
        {"status": "done", "created_at": {"$gte": today_start}}
    )

    stats = {
        "total_users": total_users,
        "total_reels": total_reels,
        "total_feedback": total_feedback,
        "reels_today": reels_today,
    }

    logger.info("[Admin] Stats retrieved: %s", stats)
    return stats
