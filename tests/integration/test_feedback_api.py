"""
Integration tests for Feedback API endpoints.
"""

import pytest

from backend.app.core.security import create_access_token


@pytest.mark.asyncio
async def test_feedback_submission_and_admin_list(async_client, mock_db):
    """Test full feedback lifecycle: submit as user, retrieve as admin."""

    # 1. Seed a regular user
    user_doc = {
        "user_id": "fb-user-001",
        "name": "Feedback Tester",
        "email": "feedback@test.com",
        "password_hash": "unused",
        "roles": ["user"],
        "tokens_remaining": 5,
    }
    await mock_db.users.insert_one(user_doc)
    user_token = create_access_token(
        user_id="fb-user-001", email="feedback@test.com", roles=["user"]
    )

    # 2. Submit feedback
    resp = await async_client.post(
        "/api/v1/feedback",
        json={"message": "This platform is great! Love the reel studio."},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["submitted"] is True
    assert "feedback_id" in data

    # 3. Submit a second feedback
    resp2 = await async_client.post(
        "/api/v1/feedback",
        json={"message": "Would love to see dark mode support!"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp2.status_code == 201

    # 4. Seed admin user
    admin_doc = {
        "user_id": "fb-admin-001",
        "name": "Admin",
        "email": "admin@test.com",
        "password_hash": "unused",
        "roles": ["admin"],
        "tokens_remaining": 99,
    }
    await mock_db.users.insert_one(admin_doc)
    admin_token = create_access_token(
        user_id="fb-admin-001", email="admin@test.com", roles=["admin"]
    )

    # 5. Admin lists all feedback
    resp3 = await async_client.get(
        "/api/v1/admin/feedback",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp3.status_code == 200
    feedback_list = resp3.json()
    assert len(feedback_list) == 2
    assert feedback_list[0]["user_email"] == "feedback@test.com"

    # 6. Non-admin cannot access admin feedback list
    resp4 = await async_client.get(
        "/api/v1/admin/feedback",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp4.status_code == 403


@pytest.mark.asyncio
async def test_feedback_validation(async_client, mock_db):
    """Test that feedback message validation is enforced."""

    user_doc = {
        "user_id": "fb-user-002",
        "name": "Validator",
        "email": "validator@test.com",
        "password_hash": "unused",
        "roles": ["user"],
        "tokens_remaining": 5,
    }
    await mock_db.users.insert_one(user_doc)
    token = create_access_token(
        user_id="fb-user-002", email="validator@test.com", roles=["user"]
    )

    # Too short message (< 5 chars)
    resp = await async_client.post(
        "/api/v1/feedback",
        json={"message": "Hi"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422  # Pydantic validation error

    # Missing message field
    resp2 = await async_client.post(
        "/api/v1/feedback",
        json={},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 422
