"""
Unit Tests for Moderation Domain Service.
Verifies deterministic safety scanning, reporting logic, duplicate prevention, and enforcement actions.
"""

import pytest

from backend.app.moderation.models import (
    CreateReportRequest,
    ModerationActionType,
    ReportReason,
    ReportStatus,
    ReportTargetType,
    TakeActionRequest,
)
from backend.app.moderation.service import ModerationService


@pytest.mark.asyncio
async def test_scan_content_text_clean():
    """Verify clean text returns low score and allow recommendation."""
    result = ModerationService.scan_content_text("Just posted an amazing travel reel from the mountains! #travel #vlog")
    assert result.score == 0
    assert result.is_flagged is False
    assert result.recommendation == "allow"
    assert len(result.flags) == 0


@pytest.mark.asyncio
async def test_scan_content_text_toxicity_and_slurs():
    """Verify severe toxicity and slurs trigger blocking recommendations."""
    result = ModerationService.scan_content_text("You are a piece of shit go die right now")
    assert result.score >= 75
    assert result.is_flagged is True
    assert result.recommendation == "block"
    assert any(f in ["self_harm_incitement", "harassment_profanity"] for f in result.flags)


@pytest.mark.asyncio
async def test_scan_content_text_spam_urls():
    """Verify spam and scam keywords trigger flag for review."""
    result = ModerationService.scan_content_text("Check out free crypto giveaway $500 dm to claim now!")
    assert result.score >= 40
    assert result.is_flagged is True
    assert "spam_scam_url" in result.flags


@pytest.mark.asyncio
async def test_scan_content_text_caps_shouting():
    """Verify excessive caps shouting is flagged."""
    result = ModerationService.scan_content_text("STOP DOING THIS RIGHT NOW YOU FOOL")
    assert "excessive_caps_shouting" in result.flags


@pytest.mark.asyncio
async def test_report_content_and_duplicate_prevention(mock_db):
    """Verify reporting content and that duplicate reports by the same reporter are idempotent."""
    req = CreateReportRequest(
        target_type=ReportTargetType.VIDEO,
        target_id="vid_test_123",
        reason=ReportReason.SPAM,
        details="Spam bot reposting external links",
    )

    # First report
    rep1 = await ModerationService.report_content(reporter_id="user_reporter_1", request=req)
    assert rep1.report_id.startswith("rep_")
    assert rep1.status == ReportStatus.PENDING
    assert rep1.report_count == 1
    assert rep1.priority == "normal"

    # Duplicate report by same user
    rep2 = await ModerationService.report_content(reporter_id="user_reporter_1", request=req)
    assert rep2.report_id == rep1.report_id
    assert rep2.report_count == 1


@pytest.mark.asyncio
async def test_report_auto_escalation_to_high_priority(mock_db):
    """Verify that multiple distinct users reporting the same content escalates priority to high."""
    req = CreateReportRequest(
        target_type=ReportTargetType.VIDEO,
        target_id="vid_test_viral_abuse",
        reason=ReportReason.HARASSMENT,
        details="Abusive harassment targeting a student",
    )

    rep1 = await ModerationService.report_content(reporter_id="user_a", request=req)
    assert rep1.priority == "normal"

    rep2 = await ModerationService.report_content(reporter_id="user_b", request=req)
    assert rep2.priority == "normal"

    # Third report pushes count to 3 -> triggers high priority escalation
    rep3 = await ModerationService.report_content(reporter_id="user_c", request=req)
    assert rep3.priority == "high"
    assert rep3.report_count == 3

    # Fetch queue and verify high priority ordering
    queue = await ModerationService.list_reports(status=ReportStatus.PENDING)
    assert len(queue) >= 1
    assert queue[0].priority == "high"


@pytest.mark.asyncio
async def test_take_moderation_action_hide_video(mock_db):
    """Verify moderator can hide reported video content and resolve report."""
    # Seed a video
    await mock_db.videos.insert_one({
        "video_id": "vid_flagged_1",
        "title": "Violating Reel",
        "user_id": "creator_violator",
        "is_hidden": False,
    })

    rep = await ModerationService.report_content(
        reporter_id="user_watcher",
        request=CreateReportRequest(
            target_type=ReportTargetType.VIDEO,
            target_id="vid_flagged_1",
            reason=ReportReason.COPYRIGHT,
            details="Stolen video without license",
        ),
    )

    action_req = TakeActionRequest(
        action_type=ModerationActionType.HIDE_CONTENT,
        resolution_note="Confirmed copyright infringement DMCA notice received.",
    )

    action = await ModerationService.take_action(
        moderator_id="admin_mod_1",
        report_id=rep.report_id,
        request=action_req,
    )

    assert action.action_id.startswith("act_")
    assert action.action_type == ModerationActionType.HIDE_CONTENT

    # Verify video was hidden
    video = await mock_db.videos.find_one({"video_id": "vid_flagged_1"})
    assert video["is_hidden"] is True

    # Verify report status updated
    updated_rep = await ModerationService.get_report(rep.report_id)
    assert updated_rep.status == ReportStatus.RESOLVED_ACTION_TAKEN
    assert updated_rep.reviewed_by == "admin_mod_1"


@pytest.mark.asyncio
async def test_take_moderation_action_ban_user(mock_db):
    """Verify moderator can ban an abusive account."""
    await mock_db.users.insert_one({
        "user_id": "user_spammer_1",
        "email": "spam@example.com",
        "name": "Spam Account",
        "tokens_remaining": 50,
        "is_banned": False,
    })

    rep = await ModerationService.report_content(
        reporter_id="user_innocent",
        request=CreateReportRequest(
            target_type=ReportTargetType.USER,
            target_id="user_spammer_1",
            reason=ReportReason.SPAM,
            details="Automated bot posting phishing links",
        ),
    )

    action = await ModerationService.take_action(
        moderator_id="admin_mod_2",
        report_id=rep.report_id,
        request=TakeActionRequest(
            action_type=ModerationActionType.BAN_USER,
            resolution_note="Bot activity verified and terminated.",
        ),
    )

    assert action.action_type == ModerationActionType.BAN_USER
    user = await mock_db.users.find_one({"user_id": "user_spammer_1"})
    assert user["is_banned"] is True
    assert user["tokens_remaining"] == 0


@pytest.mark.asyncio
async def test_get_moderation_stats(mock_db):
    """Verify moderation stats aggregation."""
    stats = await ModerationService.get_moderation_stats()
    assert isinstance(stats.pending_reports, int)
    assert isinstance(stats.total_actions, int)
