"""
Feedback routes — submit feedback, admin view all feedback.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from backend.database import get_db
from backend.models import FeedbackRequest, FeedbackResponse
from backend.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


def _build_feedback_document(
    user_id: str,
    user_name: str,
    user_email: str,
    message: str,
) -> dict:
    """
    Build a MongoDB feedback document.
    All feedback fields defined here in one place.

    Args:
        user_id: ID of the user submitting feedback.
        user_name: Name of the user.
        user_email: Email of the user.
        message: Feedback message text.

    Returns:
        Complete feedback document dict ready to insert into MongoDB.
    """
    return {
        "feedback_id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user_name,
        "user_email": user_email,
        "message": message,
        "created_at": datetime.now(timezone.utc),
    }


@router.post("", response_model=FeedbackResponse, status_code=201)
async def submit_feedback(
    request: FeedbackRequest, current_user: dict = Depends(get_current_user)
) -> FeedbackResponse:
    """
    Submit feedback from the currently logged-in user.

    Saves feedback to MongoDB feedback collection with user information and timestamp.

    Args:
        request: Feedback request containing the message.
        current_user: Authenticated user (injected by dependency).

    Returns:
        FeedbackResponse confirming feedback was submitted.
    """
    db = get_db()

    # Build feedback document
    doc = _build_feedback_document(
        user_id=current_user["user_id"],
        user_name=current_user["name"],
        user_email=current_user["email"],
        message=request.message,
    )

    # Insert into MongoDB
    await db.feedback.insert_one(doc)

    logger.info("[Feedback] Received from %s", current_user["email"])

    return FeedbackResponse(
        submitted=True, message="Thank you for your feedback!"
    )
