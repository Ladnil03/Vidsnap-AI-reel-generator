"""
Feedback Domain Service.
Handles user feedback submission and admin retrieval.
"""

import logging
import uuid
from datetime import datetime, timezone

from backend.app.core.database import get_db
from backend.app.feedback.models import FeedbackItem, FeedbackResponse

logger = logging.getLogger(__name__)


class FeedbackService:
    """Service managing user feedback lifecycle."""

    @staticmethod
    async def submit_feedback(
        user_id: str,
        user_name: str,
        user_email: str,
        message: str,
    ) -> FeedbackResponse:
        """Store user feedback in database."""
        db = get_db()
        feedback_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        doc = {
            "feedback_id": feedback_id,
            "user_id": user_id,
            "user_name": user_name,
            "user_email": user_email,
            "message": message,
            "created_at": now,
        }
        await db.feedback.insert_one(doc)
        logger.info("Feedback submitted by %s (%s)", user_email, feedback_id)

        return FeedbackResponse(feedback_id=feedback_id)

    @staticmethod
    async def get_all_feedback(skip: int = 0, limit: int = 50) -> list[FeedbackItem]:
        """Retrieve all feedback entries for admin view."""
        db = get_db()
        cursor = (
            db.feedback.find(sort=[("created_at", -1)])
            .skip(skip)
            .limit(min(limit, 100))
        )

        results: list[FeedbackItem] = []
        async for doc in cursor:
            results.append(
                FeedbackItem(
                    feedback_id=doc["feedback_id"],
                    user_id=doc["user_id"],
                    user_name=doc.get("user_name", ""),
                    user_email=doc.get("user_email", ""),
                    message=doc["message"],
                    created_at=doc["created_at"],
                )
            )
        return results
