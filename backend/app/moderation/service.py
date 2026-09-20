"""
Moderation Domain Service.
Provides deterministic safety & toxicity scanning, user reporting, and moderator enforcement.
"""

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.app.core.database import get_db
from backend.app.moderation.models import (
    AutomatedModerationResult,
    ContentReport,
    CreateReportRequest,
    ModerationAction,
    ModerationActionType,
    ModerationStats,
    ReportReason,
    ReportStatus,
    ReportTargetType,
    TakeActionRequest,
)

logger = logging.getLogger(__name__)


# Deterministic offline safety lexicons and regex patterns ($0 API cost, <1ms)
TOXICITY_PATTERNS: list[tuple[re.Pattern[str], str, int]] = [
    # (Regex pattern, flag category, severity score)
    (re.compile(r"\b(kill yourself|kys|go die|hang yourself)\b", re.IGNORECASE), "self_harm_incitement", 95),
    (re.compile(r"\b(nigger|faggot|retard|chink|kike|spic)\b", re.IGNORECASE), "hate_speech_slur", 90),
    (re.compile(r"\b(rape|molest|child porn|cp|pedophil)\b", re.IGNORECASE), "severe_harm_illegal", 100),
    (re.compile(r"\b(fuck you|piece of shit|bitch|bastard|asshole)\b", re.IGNORECASE), "harassment_profanity", 55),
    (
        re.compile(
            r"\b(free crypto|t\.me\/[a-zA-Z0-9_]+|whatsapp \+\d+|giveaway \$?\d+|dm to claim|earn \$\d+ daily)\b",
            re.IGNORECASE,
        ),
        "spam_scam_url",
        65,
    ),
    (
        re.compile(r"\b(leaked full movie|free download link in bio|download pirated|crack torrent)\b", re.IGNORECASE),
        "copyright_piracy",
        60,
    ),
    (re.compile(r"\b(buy fake id|counterfeit|hacked accounts|sell drugs)\b", re.IGNORECASE), "dangerous_goods", 85),
]


class ModerationService:
    """Core domain service for content moderation and safety enforcement."""

    @staticmethod
    def scan_content_text(text: str, content_type: str = "caption") -> AutomatedModerationResult:
        """
        Scan text using deterministic regex rules for zero-cost immediate assessment.
        Returns safety risk score (0-100), detected flags, and action recommendation.
        """
        if not text or not text.strip():
            return AutomatedModerationResult(
                score=0,
                is_flagged=False,
                flags=[],
                confidence=1.0,
                recommendation="allow",
            )

        detected_flags: list[str] = []
        max_severity = 0

        for pattern, flag, severity in TOXICITY_PATTERNS:
            if pattern.search(text):
                detected_flags.append(flag)
                if severity > max_severity:
                    max_severity = severity

        # Additional heuristics: excessive uppercase/caps lock shouting
        words = text.split()
        if len(words) >= 4 and sum(1 for w in words if w.isupper() and len(w) > 1) / len(words) > 0.7:
            detected_flags.append("excessive_caps_shouting")
            max_severity = max(max_severity, 25)

        # Recommendation logic
        if max_severity >= 75:
            recommendation = "block"
            is_flagged = True
        elif max_severity >= 40:
            recommendation = "flag_for_review"
            is_flagged = True
        else:
            recommendation = "allow"
            is_flagged = False

        return AutomatedModerationResult(
            score=max_severity,
            is_flagged=is_flagged,
            flags=detected_flags,
            confidence=0.95,
            recommendation=recommendation,
        )

    @classmethod
    async def report_content(
        cls, reporter_id: str, request: CreateReportRequest
    ) -> ContentReport:
        """
        Submit a content report with duplicate detection and auto-escalation.
        """
        db = get_db()
        now = datetime.now(timezone.utc)

        # 1. Check if this reporter already reported this exact target
        existing = await db.content_reports.find_one({
            "reporter_id": reporter_id,
            "target_type": request.target_type.value,
            "target_id": request.target_id,
        })
        if existing:
            return ContentReport(
                report_id=existing["report_id"],
                reporter_id=existing["reporter_id"],
                target_type=ReportTargetType(existing["target_type"]),
                target_id=existing["target_id"],
                reason=ReportReason(existing["reason"]),
                details=existing.get("details"),
                status=ReportStatus(existing.get("status", "pending")),
                report_count=existing.get("report_count", 1),
                priority=existing.get("priority", "normal"),
                resolution_note=existing.get("resolution_note"),
                reviewed_by=existing.get("reviewed_by"),
                created_at=existing["created_at"],
                reviewed_at=existing.get("reviewed_at"),
            )

        # 2. Check total existing reports for this target to determine count & priority
        total_reports_on_target = await db.content_reports.count_documents({
            "target_type": request.target_type.value,
            "target_id": request.target_id,
        })
        report_count = total_reports_on_target + 1
        priority = "high" if report_count >= 3 else "normal"

        report_id = f"rep_{uuid.uuid4().hex[:12]}"
        doc = {
            "report_id": report_id,
            "reporter_id": reporter_id,
            "target_type": request.target_type.value,
            "target_id": request.target_id,
            "reason": request.reason.value,
            "details": request.details,
            "status": ReportStatus.PENDING.value,
            "report_count": report_count,
            "priority": priority,
            "resolution_note": None,
            "reviewed_by": None,
            "created_at": now,
            "reviewed_at": None,
        }

        await db.content_reports.insert_one(doc)

        # If priority escalated to high, also mark existing reports on this target as high
        if priority == "high":
            await db.content_reports.update_many(
                {"target_type": request.target_type.value, "target_id": request.target_id},
                {"$set": {"priority": "high", "report_count": report_count}},
            )

        logger.info(
            "New moderation report %s filed by user %s on %s %s (Reason: %s, Priority: %s)",
            report_id, reporter_id, request.target_type.value, request.target_id, request.reason.value, priority,
        )

        return ContentReport(
            report_id=report_id,
            reporter_id=reporter_id,
            target_type=request.target_type,
            target_id=request.target_id,
            reason=request.reason,
            details=request.details,
            status=ReportStatus.PENDING,
            report_count=report_count,
            priority=priority,
            created_at=now,
        )

    @classmethod
    async def list_reports(
        cls,
        status: ReportStatus | None = None,
        target_type: ReportTargetType | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ContentReport]:
        """
        List reports for the moderation queue, sorted by priority (high first) and recency.
        """
        db = get_db()
        query: dict[str, Any] = {}
        if status:
            query["status"] = status.value
        if target_type:
            query["target_type"] = target_type.value

        cursor = (
            db.content_reports.find(query)
            .sort([("priority", -1), ("created_at", -1)])
            .skip(skip)
            .limit(min(limit, 100))
        )

        reports: list[ContentReport] = []
        async for doc in cursor:
            # Optionally enrich with target metadata
            target_meta = await cls._fetch_target_meta(doc["target_type"], doc["target_id"])

            reports.append(
                ContentReport(
                    report_id=doc["report_id"],
                    reporter_id=doc["reporter_id"],
                    target_type=ReportTargetType(doc["target_type"]),
                    target_id=doc["target_id"],
                    reason=ReportReason(doc["reason"]),
                    details=doc.get("details"),
                    status=ReportStatus(doc.get("status", "pending")),
                    report_count=doc.get("report_count", 1),
                    priority=doc.get("priority", "normal"),
                    resolution_note=doc.get("resolution_note"),
                    reviewed_by=doc.get("reviewed_by"),
                    created_at=doc["created_at"],
                    reviewed_at=doc.get("reviewed_at"),
                    target_meta=target_meta,
                )
            )
        return reports

    @classmethod
    async def get_report(cls, report_id: str) -> ContentReport:
        """Fetch a specific report by its identifier."""
        db = get_db()
        doc = await db.content_reports.find_one({"report_id": report_id})
        if not doc:
            raise ValueError(f"Report '{report_id}' not found.")

        target_meta = await cls._fetch_target_meta(doc["target_type"], doc["target_id"])

        return ContentReport(
            report_id=doc["report_id"],
            reporter_id=doc["reporter_id"],
            target_type=ReportTargetType(doc["target_type"]),
            target_id=doc["target_id"],
            reason=ReportReason(doc["reason"]),
            details=doc.get("details"),
            status=ReportStatus(doc.get("status", "pending")),
            report_count=doc.get("report_count", 1),
            priority=doc.get("priority", "normal"),
            resolution_note=doc.get("resolution_note"),
            reviewed_by=doc.get("reviewed_by"),
            created_at=doc["created_at"],
            reviewed_at=doc.get("reviewed_at"),
            target_meta=target_meta,
        )

    @classmethod
    async def take_action(
        cls,
        moderator_id: str,
        report_id: str,
        request: TakeActionRequest,
    ) -> ModerationAction:
        """
        Execute an enforcement action on reported content and resolve associated reports.
        """
        db = get_db()
        doc = await db.content_reports.find_one({"report_id": report_id})
        if not doc:
            raise ValueError(f"Report '{report_id}' not found.")

        now = datetime.now(timezone.utc)
        target_type = doc["target_type"]
        target_id = doc["target_id"]

        # 1. Apply target enforcement based on action_type
        if request.action_type == ModerationActionType.HIDE_CONTENT:
            if target_type == ReportTargetType.VIDEO.value:
                await db.videos.update_one(
                    {"video_id": target_id},
                    {"$set": {"is_hidden": True, "visibility": "private"}},
                )
            elif target_type == ReportTargetType.COMMENT.value:
                await db.comments.update_one({"comment_id": target_id}, {"$set": {"is_hidden": True}})

        elif request.action_type == ModerationActionType.DELETE_CONTENT:
            if target_type == ReportTargetType.VIDEO.value:
                await db.videos.update_one({"video_id": target_id}, {"$set": {"deleted": True, "status": "deleted"}})
                await db.jobs.update_one({"job_id": target_id}, {"$set": {"deleted": True}})
            elif target_type == ReportTargetType.COMMENT.value:
                await db.comments.update_one({"comment_id": target_id}, {"$set": {"deleted": True}})

        elif request.action_type == ModerationActionType.BAN_USER:
            user_to_ban = target_id if target_type == ReportTargetType.USER.value else None
            if not user_to_ban and target_type == ReportTargetType.VIDEO.value:
                video_doc = await db.videos.find_one({"video_id": target_id})
                if video_doc:
                    user_to_ban = video_doc.get("user_id")

            if user_to_ban:
                await db.users.update_one(
                    {"user_id": user_to_ban},
                    {"$set": {"is_banned": True, "tokens_remaining": 0, "banned_at": now}},
                )

        # 2. Mark report(s) as resolved
        new_status = (
            ReportStatus.RESOLVED_DISMISSED.value
            if request.action_type == ModerationActionType.DISMISS
            else ReportStatus.RESOLVED_ACTION_TAKEN.value
        )

        # Resolve all reports targeting this exact item
        await db.content_reports.update_many(
            {"target_type": target_type, "target_id": target_id, "status": ReportStatus.PENDING.value},
            {
                "$set": {
                    "status": new_status,
                    "resolution_note": request.resolution_note,
                    "reviewed_by": moderator_id,
                    "reviewed_at": now,
                }
            },
        )

        # 3. Create immutable audit action log entry
        action_id = f"act_{uuid.uuid4().hex[:12]}"
        action_doc = {
            "action_id": action_id,
            "report_id": report_id,
            "target_type": target_type,
            "target_id": target_id,
            "action_type": request.action_type.value,
            "moderator_id": moderator_id,
            "reason": request.resolution_note,
            "created_at": now,
        }
        await db.moderation_actions.insert_one(action_doc)

        logger.info(
            "Moderation action %s (%s) taken by %s on %s %s. Note: %s",
            action_id, request.action_type.value, moderator_id, target_type, target_id, request.resolution_note,
        )

        return ModerationAction(
            action_id=action_id,
            report_id=report_id,
            target_type=ReportTargetType(target_type),
            target_id=target_id,
            action_type=request.action_type,
            moderator_id=moderator_id,
            reason=request.resolution_note,
            created_at=now,
        )

    @classmethod
    async def get_moderation_stats(cls) -> ModerationStats:
        """Aggregate moderation pipeline metrics for admin dashboard."""
        db = get_db()
        pending = await db.content_reports.count_documents({"status": ReportStatus.PENDING.value})
        reviewing = await db.content_reports.count_documents({"status": ReportStatus.REVIEWING.value})
        resolved = await db.content_reports.count_documents({
            "status": {"$in": [ReportStatus.RESOLVED_ACTION_TAKEN.value, ReportStatus.RESOLVED_DISMISSED.value]}
        })
        total_actions = await db.moderation_actions.count_documents({})

        # Reasons breakdown
        pipeline_reasons = [
            {"$group": {"_id": "$reason", "count": {"$sum": 1}}},
        ]
        reasons_map: dict[str, int] = {}
        async for r in db.content_reports.aggregate(pipeline_reasons):
            if r.get("_id"):
                reasons_map[r["_id"]] = r["count"]

        # Actions breakdown
        pipeline_actions = [
            {"$group": {"_id": "$action_type", "count": {"$sum": 1}}},
        ]
        actions_map: dict[str, int] = {}
        async for a in db.moderation_actions.aggregate(pipeline_actions):
            if a.get("_id"):
                actions_map[a["_id"]] = a["count"]

        return ModerationStats(
            pending_reports=pending,
            reviewing_reports=reviewing,
            resolved_reports=resolved,
            total_actions=total_actions,
            reports_by_reason=reasons_map,
            actions_by_type=actions_map,
        )

    @staticmethod
    async def _fetch_target_meta(target_type: str, target_id: str) -> dict[str, Any] | None:
        """Helper to fetch display snippet for the reported content."""
        db = get_db()
        try:
            if target_type == ReportTargetType.VIDEO.value:
                video = await db.videos.find_one({"video_id": target_id})
                if video:
                    return {
                        "title": video.get("title", "Untitled Reel"),
                        "creator_id": video.get("user_id"),
                        "thumbnail_url": video.get("thumbnail_url"),
                        "is_hidden": video.get("is_hidden", False),
                    }
                # Fallback to jobs collection if native video
                job = await db.jobs.find_one({"job_id": target_id})
                if job:
                    return {
                        "title": job.get("title", f"Reel {target_id[:8]}"),
                        "creator_id": job.get("user_id"),
                        "thumbnail_url": job.get("thumbnail_url"),
                    }
            elif target_type == ReportTargetType.COMMENT.value:
                comment = await db.comments.find_one({"comment_id": target_id})
                if comment:
                    return {
                        "text": comment.get("text", ""),
                        "user_id": comment.get("user_id"),
                        "video_id": comment.get("video_id"),
                    }
            elif target_type == ReportTargetType.USER.value:
                user = await db.users.find_one({"user_id": target_id})
                if user:
                    return {
                        "name": user.get("name", "Unknown"),
                        "email": user.get("email", ""),
                        "is_banned": user.get("is_banned", False),
                    }
        except Exception as e:
            logger.debug("Failed to fetch target metadata for %s %s: %s", target_type, target_id, e)
        return None
