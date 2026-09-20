"""
Integration tests for Admin v2 Platform Management API.
Tests system-wide metrics and user role promotion/demotion.
"""

from typing import Any

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_admin
from backend.app.main import app


@pytest.fixture
def admin_user() -> dict[str, Any]:
    return {
        "user_id": "usr_super_admin",
        "name": "Super Admin",
        "email": "superadmin@vidsnap.test",
        "roles": ["user", "admin"],
    }


@pytest.mark.asyncio
async def test_admin_system_stats_api(
    async_client: AsyncClient, mock_db, admin_user: dict[str, Any]
):
    """Verify GET /api/v1/admin/stats returns aggregated metrics."""
    app.dependency_overrides[get_current_admin] = lambda: admin_user

    try:
        # Seed test user
        await mock_db.users.insert_one({
            "user_id": "usr_test_target_1",
            "name": "Target User",
            "email": "target@vidsnap.test",
            "tokens_remaining": 100,
            "roles": ["user"],
        })

        res = await async_client.get("/api/v1/admin/stats")
        assert res.status_code == 200
        data = res.json()
        assert "total_users" in data
        assert "total_reels" in data
        assert "tokens_circulating" in data
        assert data["total_users"] >= 1
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_user_role_update_api(
    async_client: AsyncClient, mock_db, admin_user: dict[str, Any]
):
    """Verify PATCH /api/v1/admin/users/{user_id}/roles updates user roles."""
    app.dependency_overrides[get_current_admin] = lambda: admin_user

    try:
        # Seed target user
        await mock_db.users.insert_one({
            "user_id": "usr_role_target",
            "name": "Role Target",
            "email": "roletarget@vidsnap.test",
            "roles": ["user"],
        })

        # 1. Promote to creator
        res_add = await async_client.patch(
            "/api/v1/admin/users/usr_role_target/roles",
            json={"role": "creator", "action": "add"},
        )
        assert res_add.status_code == 200
        roles_after_add = res_add.json()["roles"]
        assert "creator" in roles_after_add
        assert "user" in roles_after_add

        # 2. Revoke creator role
        res_rem = await async_client.patch(
            "/api/v1/admin/users/usr_role_target/roles",
            json={"role": "creator", "action": "remove"},
        )
        assert res_rem.status_code == 200
        roles_after_rem = res_rem.json()["roles"]
        assert "creator" not in roles_after_rem
    finally:
        app.dependency_overrides.clear()
