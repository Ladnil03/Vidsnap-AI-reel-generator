"""
Integration tests for Admin API routes and RBAC authorization.
"""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from backend.app.identity.dependencies import get_current_user


@pytest.mark.asyncio
async def test_admin_rbac_and_user_aggregation(async_client: AsyncClient, mock_db):
    """Test RBAC protection on admin routes and aggregated user lists."""
    admin_id = "admin-user-id"
    normal_id = "normal-user-id"

    # Seed users
    await mock_db.users.insert_many([
        {
            "user_id": admin_id,
            "name": "Super Admin",
            "email": "admin@vidsnap.ai",
            "roles": ["admin"],
            "tokens_remaining": 100,
            "created_at": datetime.now(timezone.utc),
        },
        {
            "user_id": normal_id,
            "name": "Regular User",
            "email": "regular@vidsnap.ai",
            "roles": ["user"],
            "tokens_remaining": 5,
            "created_at": datetime.now(timezone.utc),
        },
    ])

    from backend.app.main import app

    # 1. Non-admin access should be rejected with 403 Forbidden
    async def override_regular_user():
        return {"user_id": normal_id, "email": "regular@vidsnap.ai", "roles": ["user"]}

    app.dependency_overrides[get_current_user] = override_regular_user
    res = await async_client.get("/api/v1/admin/users")
    assert res.status_code == 403

    # 2. Admin access should succeed
    async def override_admin_user():
        return {"user_id": admin_id, "email": "admin@vidsnap.ai", "roles": ["admin"]}

    app.dependency_overrides[get_current_user] = override_admin_user
    admin_res = await async_client.get("/api/v1/admin/users")
    assert admin_res.status_code == 200
    users = admin_res.json()
    assert len(users) == 2

    # 3. Admin token adjustment
    patch_res = await async_client.patch(
        f"/api/v1/admin/users/{normal_id}/tokens",
        json={"tokens": 25},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["tokens_remaining"] == 25

    # Verify user token updated in DB
    updated_user = await mock_db.users.find_one({"user_id": normal_id})
    assert updated_user["tokens_remaining"] == 25

    # Verify ledger recorded ADMIN_GRANT entry
    ledger = await mock_db.credit_ledger.find_one({"user_id": normal_id})
    assert ledger is not None
    assert ledger["amount"] == 20  # from 5 to 25 = +20

    app.dependency_overrides.clear()
