"""
Security regression tests for W2-7: Signup abuse prevention.
- Email verification required before granting free signup tokens (tokens_remaining starts at 0, email_verified=False).
- Correct OTP verification sets email_verified=True and grants free_tokens_on_signup.
- Existing users without email_verified are grandfathered on login.
- Per-IP rate limiting (3 signups / hour) rejects excessive accounts with 429.
- Captcha validation when enabled.
"""

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from backend.app.core.config import settings
from backend.app.core.rate_limiter import _in_memory_windows
from backend.app.core.security import hash_password
from backend.app.identity.models import LoginRequest, SignupRequest, VerifyEmailRequest
from backend.app.identity.service import IdentityService


@pytest.fixture(autouse=True)
def reset_rate_limit_windows():
    _in_memory_windows.clear()
    yield
    _in_memory_windows.clear()


@pytest.mark.asyncio
async def test_signup_sets_email_unverified_and_zero_tokens(mock_db):
    """Signup must leave tokens at 0 and email_verified False until OTP is confirmed."""
    req = SignupRequest(
        name="Abuse Target",
        email="target@abuse.com",
        password="ValidPassword123!",
    )
    auth_resp = await IdentityService.register_user(req)
    assert auth_resp.user.email_verified is False
    assert auth_resp.user.tokens_remaining == 0

    user_doc = await mock_db.users.find_one({"email": "target@abuse.com"})
    assert user_doc["email_verified"] is False
    assert user_doc["tokens_remaining"] == 0

    # No credit ledger entry before verification
    ledger_count = await mock_db.credit_ledger.count_documents({"user_id": user_doc["user_id"]})
    assert ledger_count == 0


@pytest.mark.asyncio
async def test_verify_email_otp_grants_tokens(mock_db):
    """Verifying email OTP sets email_verified=True and awards signup bonus tokens."""
    req = SignupRequest(
        name="Verified Candidate",
        email="candidate@verified.com",
        password="ValidPassword123!",
    )
    auth_resp = await IdentityService.register_user(req)
    user_id = auth_resp.user.user_id

    # Find the generated OTP for this user
    otp_doc = await mock_db.otps.find_one({"email": "candidate@verified.com"})
    assert otp_doc is not None

    # Verify with wrong OTP fails
    with pytest.raises(HTTPException):
        await IdentityService.verify_email(
            VerifyEmailRequest(email="candidate@verified.com", otp="000000")
        )

    # Use test helper or verify OTP
    from backend.app.core.security import hash_otp
    test_otp = "123456"
    salt = otp_doc["salt"]
    await mock_db.otps.update_one(
        {"email": "candidate@verified.com"},
        {"$set": {"hashed_otp": hash_otp(test_otp, salt), "attempts": 0}},
    )

    await IdentityService.verify_email(
        VerifyEmailRequest(email="candidate@verified.com", otp=test_otp)
    )

    user_doc = await mock_db.users.find_one({"user_id": user_id})
    assert user_doc["email_verified"] is True
    assert user_doc["tokens_remaining"] == settings.free_tokens_on_signup

    # Bonus recorded in ledger
    ledger_entry = await mock_db.credit_ledger.find_one({"user_id": user_id})
    assert ledger_entry is not None
    assert ledger_entry["amount"] == settings.free_tokens_on_signup


@pytest.mark.asyncio
async def test_grandfathering_existing_user_on_login(mock_db):
    """Existing users without email_verified must be grandfathered on login."""
    now = datetime.now(timezone.utc)
    old_user = {
        "user_id": "usr_legacy_123",
        "name": "Legacy User",
        "email": "legacy@vidsnap.ai",
        "password_hash": hash_password("LegacyPass123!"),
        "roles": ["user"],
        "tokens_remaining": 10,
        "created_at": now,
        "updated_at": now,
    }
    await mock_db.users.insert_one(old_user)

    # Authenticate user
    user = await IdentityService.authenticate_user(
        LoginRequest(email="legacy@vidsnap.ai", password="LegacyPass123!")
    )
    assert user.get("email_verified") is True

    # Check DB was updated lazily
    db_user = await mock_db.users.find_one({"user_id": "usr_legacy_123"})
    assert db_user.get("email_verified") is True


@pytest.mark.asyncio
async def test_per_ip_signup_rate_limit(async_client: AsyncClient, mock_db):
    """More than 3 signups per hour from the same IP must trigger 429."""
    for i in range(3):
        res = await async_client.post(
            "/api/v1/auth/signup",
            json={
                "name": f"User {i}",
                "email": f"user_{i}@limit.com",
                "password": "Password123!",
            },
        )
        assert res.status_code == 201

    # 4th signup from same client IP must be rejected
    res_4 = await async_client.post(
        "/api/v1/auth/signup",
        json={
            "name": "User 4",
            "email": "user_4@limit.com",
            "password": "Password123!",
        },
    )
    assert res_4.status_code == 429


@pytest.mark.asyncio
async def test_captcha_validation_when_enabled(async_client: AsyncClient, mock_db):
    """When CAPTCHA is enabled, signup without valid captcha_token is rejected with 400."""
    with patch.object(settings, "captcha_enabled", True), \
         patch.object(settings, "captcha_secret", "dummy-secret"):
        res = await async_client.post(
            "/api/v1/auth/signup",
            json={
                "name": "Captcha Bot",
                "email": "bot@captcha.com",
                "password": "Password123!",
                "captcha_token": None,
            },
        )
        assert res.status_code == 400
        assert "captcha" in res.text.lower()
