"""
Moderation API Routes (/api/v1/moderation).
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.identity.dependencies import get_current_user, require_role
from backend.app.identity.models import UserRole
from backend.app.moderation.models import (
    AutomatedModerationResult,
    ContentReport,
    CreateReportRequest,
    ModerationAction,
    ModerationStats,
    ReportStatus,
    ReportTargetType,
    ScanContentRequest,
    TakeActionRequest,
)
from backend.app.moderation.service import ModerationService

router = APIRouter(prefix="/api/v1/moderation", tags=["Moderation"])

get_current_moderator = require_role(UserRole.MODERATOR.value, UserRole.ADMIN.value)


# ==============================================================================
# USER FACING ENDPOINTS
# ==============================================================================


@router.post("/reports", response_model=ContentReport, status_code=status.HTTP_201_CREATED)
async def submit_content_report(
    request: CreateReportRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ContentReport:
    """Submit a report against a video, comment, or user."""
    return await ModerationService.report_content(
        reporter_id=current_user["user_id"],
        request=request,
    )


@router.post("/scan", response_model=AutomatedModerationResult)
async def scan_text_content(
    request: ScanContentRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AutomatedModerationResult:
    """Deterministic offline safety preview for captions, comments, or bios."""
    return ModerationService.scan_content_text(
        text=request.text,
        content_type=request.content_type,
    )


# ==============================================================================
# ADMIN & MODERATOR REVIEW QUEUE
# ==============================================================================


@router.get("/queue", response_model=list[ContentReport])
async def list_moderation_queue(
    report_status: ReportStatus | None = Query(None, alias="status"),
    target_type: ReportTargetType | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    mod_user: dict[str, Any] = Depends(get_current_moderator),
) -> list[ContentReport]:
    """List flagged content reports ordered by urgency priority."""
    return await ModerationService.list_reports(
        status=report_status,
        target_type=target_type,
        skip=skip,
        limit=limit,
    )


@router.get("/reports/{report_id}", response_model=ContentReport)
async def get_report_details(
    report_id: str,
    mod_user: dict[str, Any] = Depends(get_current_moderator),
) -> ContentReport:
    """Inspect full report details along with target metadata preview."""
    try:
        return await ModerationService.get_report(report_id=report_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.post("/reports/{report_id}/action", response_model=ModerationAction)
async def execute_moderation_action(
    report_id: str,
    request: TakeActionRequest,
    mod_user: dict[str, Any] = Depends(get_current_moderator),
) -> ModerationAction:
    """Execute an enforcement action (warn, hide, delete, ban, dismiss)."""
    try:
        return await ModerationService.take_action(
            moderator_id=mod_user["user_id"],
            report_id=report_id,
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.get("/stats", response_model=ModerationStats)
async def get_moderation_overview_stats(
    mod_user: dict[str, Any] = Depends(get_current_moderator),
) -> ModerationStats:
    """Get platform moderation overview metrics."""
    return await ModerationService.get_moderation_stats()
