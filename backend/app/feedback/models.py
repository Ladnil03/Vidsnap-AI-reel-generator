"""
Feedback Domain — Pydantic Models.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class SubmitFeedbackRequest(BaseModel):
    """Payload for user feedback submission."""
    message: str = Field(..., min_length=5, max_length=2000, description="Feedback message text")


class FeedbackResponse(BaseModel):
    """Response after feedback submission."""
    feedback_id: str
    submitted: bool = True
    message: str = "Thank you for your feedback!"


class FeedbackItem(BaseModel):
    """Admin view of a single feedback entry."""
    feedback_id: str
    user_id: str
    user_name: str
    user_email: str
    message: str
    created_at: datetime
