"""
Integration tests for Moderation REST API (/api/v1/moderation) and Observability (/metrics).
"""

from typing import Any

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_admin, get_current_user
from backend.app.main import app


@pytest.fixture
def regular_user() -> dict[str, Any]:
    return {
        "user_id": "usr_regular_reporter",
        "name": "Alex User",
        "email": "alex@user.test",
        "roles": ["user"],
    }


@pytest.fixture
def admin_user() -> dict[str, Any]:
    return {
        "user_id": "usr_admin_mod",
        "name": "Sarah Admin",
        "email": "sarah@admin.test",
        "roles": ["user", "admin", "moderator"],
    }


@pytest.mark.asyncio
async def test_user_report_and_scan_flow(
    async_client: AsyncClient, mock_db, regular_user: dict[str, Any]
):
    """Test standard user submitting a report and requesting safety scan preview."""
    app.dependency_overrides[get_current_user] = lambda: regular_user

    try:
        # 1. Automated safety scan
        scan_res = await async_client.post(
            "/api/v1/moderation/scan",
            json={"text": "Clean educational reel script for physics tutorial", "content_type": "caption"},
        )
        assert scan_res.status_code == 200
        scan_data = scan_res.json()
        assert scan_data["recommendation"] == "allow"
        assert scan_data["is_flagged"] is False

        # 2. Submit report
        rep_res = await async_client.post(
            "/api/v1/moderation/reports",
            json={
                "target_type": "video",
                "target_id": "vid_flagged_integ_1",
                "reason": "spam",
                "details": "Mass unsolicited commercial spam",
            },
        )
        assert rep_res.status_code == 201
        rep_data = rep_res.json()
        assert rep_data["report_id"].startswith("rep_")
        assert rep_data["target_id"] == "vid_flagged_integ_1"
        assert rep_data["status"] == "pending"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_moderation_queue_and_action_flow(
    async_client: AsyncClient, mock_db, regular_user: dict[str, Any], admin_user: dict[str, Any]
):
    """Test admin inspecting the queue, fetching details, and taking action."""
    # 1. User submits report
    app.dependency_overrides[get_current_user] = lambda: regular_user
    rep_res = await async_client.post(
        "/api/v1/moderation/reports",
        json={
            "target_type": "comment",
            "target_id": "cmt_toxic_1",
            "reason": "harassment",
            "details": "Targeted hateful harassment",
        },
    )
    report_id = rep_res.json()["report_id"]
    app.dependency_overrides.clear()

    # 2. Admin operations
    app.dependency_overrides[get_current_admin] = lambda: admin_user
    try:
        # Fetch queue
        queue_res = await async_client.get("/api/v1/moderation/queue?status=pending")
        assert queue_res.status_code == 200
        queue = queue_res.json()
        assert any(r["report_id"] == report_id for r in queue)

        # Fetch single report details
        detail_res = await async_client.get(f"/api/v1/moderation/reports/{report_id}")
        assert detail_res.status_code == 200
        assert detail_res.json()["report_id"] == report_id

        # Take action
        action_res = await async_client.post(
            f"/api/v1/moderation/reports/{report_id}/action",
            json={
                "action_type": "delete_content",
                "resolution_note": "Violated community harassment guidelines.",
            },
        )
        assert action_res.status_code == 200
        action_data = action_res.json()
        assert action_data["action_type"] == "delete_content"

        # Check stats
        stats_res = await async_client.get("/api/v1/moderation/stats")
        assert stats_res.status_code == 200
        assert stats_res.json()["total_actions"] >= 1
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_prometheus_metrics_endpoint(async_client: AsyncClient, mock_db):
    """Verify /metrics returns Prometheus format plaintext exposition."""
    res = await async_client.get("/metrics")
    assert res.status_code == 200
    assert "text/plain" in res.headers["content-type"]
    assert "vidsnap_system_uptime_seconds" in res.text
