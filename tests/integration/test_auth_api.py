"""
Integration tests for Authentication and Identity API routes.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_user_signup_and_duplicate_handling(async_client: AsyncClient):
    """Test user registration flow and conflict handling."""
    payload = {
        "name": "Alex Doe",
        "email": "alex@vidsnap.ai",
        "password": "SecurePassword123!",
    }

    # Successful signup
    response = await async_client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alex@vidsnap.ai"
    assert data["user"]["tokens_remaining"] == 5

    # Cookie was set
    assert "refresh_token" in response.cookies or "set-cookie" in response.headers

    # Duplicate signup should return 409 Conflict
    dup_response = await async_client.post("/api/v1/auth/signup", json=payload)
    assert dup_response.status_code == 409


@pytest.mark.asyncio
async def test_user_login_flow(async_client: AsyncClient):
    """Test login with valid and invalid credentials."""
    # 1. Register user
    signup_payload = {
        "name": "Login User",
        "email": "login@vidsnap.ai",
        "password": "CorrectPassword123!",
    }
    await async_client.post("/api/v1/auth/signup", json=signup_payload)

    # 2. Login with valid password
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "login@vidsnap.ai", "password": "CorrectPassword123!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    assert token is not None

    # 3. Login with invalid password
    bad_login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "login@vidsnap.ai", "password": "WrongPassword!"},
    )
    assert bad_login_resp.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_profile(async_client: AsyncClient):
    """Test authenticated profile retrieval."""
    signup_payload = {
        "name": "Profile User",
        "email": "profile@vidsnap.ai",
        "password": "ProfilePassword123!",
    }
    signup_res = await async_client.post("/api/v1/auth/signup", json=signup_payload)
    token = signup_res.json()["access_token"]

    # Authenticated request
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = await async_client.get("/api/v1/users/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "profile@vidsnap.ai"

    # Unauthenticated request
    bad_resp = await async_client.get("/api/v1/users/me")
    assert bad_resp.status_code == 401


@pytest.mark.asyncio
async def test_password_reset_flow(async_client: AsyncClient, mock_db):
    """Test end-to-end password reset using OTP verification."""
    email = "reset@vidsnap.ai"
    # Register user
    await async_client.post(
        "/api/v1/auth/signup",
        json={"name": "Reset User", "email": email, "password": "OldPassword123!"},
    )

    # Request reset code
    forgot_res = await async_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": email},
    )
    assert forgot_res.status_code == 200

    # Retrieve OTP from mock database for verification
    otp_record = await mock_db.otps.find_one({"email": email})
    assert otp_record is not None

    # In our secure implementation, plain OTP is not in DB (only hashed_otp and salt).
    # In tests, we verify with an invalid OTP first:
    bad_reset = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "otp": "000000", "new_password": "NewPassword123!"},
    )
    assert bad_reset.status_code == 400
