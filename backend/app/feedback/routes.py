"""
Feedback API Routes (/api/v1/feedback).
"""

from typing import Any

from fastapi import APIRouter, Depends, Query

from backend.app.core.rate_limiter import rate_limit
from backend.app.feedback.models import (
    FeedbackItem,
    FeedbackResponse,
    SubmitFeedbackRequest,
)
from backend.app.feedback.service import FeedbackService
from backend.app.identity.dependencies import get_current_admin, get_current_user

router = APIRouter(tags=["Feedback"])


@router.post(
    "/api/v1/feedback",
    response_model=FeedbackResponse,
    status_code=201,
    dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60))],
)
async def submit_feedback(
    request: SubmitFeedbackRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> FeedbackResponse:
    """Submit feedback from the currently authenticated user."""
    return await FeedbackService.submit_feedback(
        user_id=current_user["user_id"],
        user_name=current_user.get("name", ""),
        user_email=current_user["email"],
        message=request.message,
    )


@router.get(
    "/api/v1/admin/feedback",
    response_model=list[FeedbackItem],
)
async def list_feedback(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin_user: dict[str, Any] = Depends(get_current_admin),
) -> list[FeedbackItem]:
    """Admin endpoint: list all user feedback."""
    return await FeedbackService.get_all_feedback(skip=skip, limit=limit)
