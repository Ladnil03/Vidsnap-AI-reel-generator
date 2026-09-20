"""
Moderation Domain Models & Schemas.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ReportTargetType(str, Enum):
    VIDEO = "video"
    COMMENT = "comment"
    USER = "user"
    ROOM = "room"


class ReportReason(str, Enum):
    SPAM = "spam"
    HARASSMENT = "harassment"
    HATE_SPEECH = "hate_speech"
    NUDITY_NSFW = "nudity_nsfw"
    COPYRIGHT = "copyright"
    MISINFORMATION = "misinformation"
    DANGEROUS = "dangerous"
    OTHER = "other"


class ReportStatus(str, Enum):
    PENDING = "pending"
    REVIEWING = "reviewing"
    RESOLVED_ACTION_TAKEN = "resolved_action_taken"
    RESOLVED_DISMISSED = "resolved_dismissed"


class ModerationActionType(str, Enum):
    DISMISS = "dismiss"
    WARN_USER = "warn_user"
    HIDE_CONTENT = "hide_content"
    DELETE_CONTENT = "delete_content"
    BAN_USER = "ban_user"


class CreateReportRequest(BaseModel):
    """Schema for users submitting a report on inappropriate content."""
    target_type: ReportTargetType
    target_id: str = Field(..., min_length=1, max_length=128)
    reason: ReportReason
    details: str | None = Field(None, max_length=1000)


class ContentReport(BaseModel):
    """Domain model for a content moderation report."""
    report_id: str
    reporter_id: str
    target_type: ReportTargetType
    target_id: str
    reason: ReportReason
    details: str | None = None
    status: ReportStatus = ReportStatus.PENDING
    report_count: int = 1
    priority: str = "normal"  # "normal" or "high" (if >= 3 reports)
    resolution_note: str | None = None
    reviewed_by: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None
    target_meta: dict[str, Any] | None = None


class TakeActionRequest(BaseModel):
    """Schema for moderators resolving a reported item."""
    action_type: ModerationActionType
    resolution_note: str = Field(..., min_length=3, max_length=1000)
    auto_notify_reporter: bool = True


class ModerationAction(BaseModel):
    """Audit log entry for moderation enforcement."""
    action_id: str
    report_id: str
    target_type: ReportTargetType
    target_id: str
    action_type: ModerationActionType
    moderator_id: str
    reason: str
    created_at: datetime


class AutomatedModerationResult(BaseModel):
    """Heuristic / AI safety classification assessment."""
    score: int = Field(..., ge=0, le=100, description="Toxicity risk score from 0 (clean) to 100 (toxic)")
    is_flagged: bool
    flags: list[str] = Field(default_factory=list)
    confidence: float = 1.0
    recommendation: str = Field(..., description="'allow', 'flag_for_review', or 'block'")


class ScanContentRequest(BaseModel):
    """Request payload for deterministic text scanning."""
    text: str = Field(..., min_length=1, max_length=10000)
    content_type: str = Field("caption", description="e.g. caption, comment, bio, chat")


class ModerationStats(BaseModel):
    """Summary overview for the moderation dashboard."""
    pending_reports: int
    reviewing_reports: int
    resolved_reports: int
    total_actions: int
    reports_by_reason: dict[str, int] = Field(default_factory=dict)
    actions_by_type: dict[str, int] = Field(default_factory=dict)
