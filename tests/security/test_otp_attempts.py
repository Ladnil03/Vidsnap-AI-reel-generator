"""Regression tests for W1-6: OTP attempt-counter abuse on resend."""

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.app.identity.service import IdentityService


async def _register(mock_db, email: str) -> str:
    user_id = f"user-{email}"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "OTP User",
        "email": email,
        "password_hash": "unused",
        "roles": ["user"],
        "tokens_remaining": 5,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })
    return user_id


async def _wrong_attempts(mock_db, email: str, count: int) -> None:
    for _ in range(count):
        with pytest.raises(HTTPException):
            await IdentityService.verify_and_reset_password(
                SimpleNamespace(email=email, otp="000000", new_password="NewPassword123!")
            )


@pytest.mark.asyncio
async def test_resend_keeps_attempt_counter(mock_db):
    """Re-requesting an OTP must not reset the in-flight attempt counter."""
    email = "counter@vidsnap.ai"
    await _register(mock_db, email)
    await IdentityService.request_password_reset(email)

    for _ in range(4):
        await _wrong_attempts(mock_db, email, 1)
    record = await mock_db.otps.find_one({"email": email})
    assert record["attempts"] == 4

    await IdentityService.request_password_reset(email)

    record = await mock_db.otps.find_one({"email": email})
    assert record["attempts"] == 4


@pytest.mark.asyncio
async def test_resend_cooldown_blocks_regeneration(mock_db):
    """A second request within 60s must not mint a new code."""
    email = "cooldown@vidsnap.ai"
    await _register(mock_db, email)
    await IdentityService.request_password_reset(email)

    first = await mock_db.otps.find_one({"email": email})

    await IdentityService.request_password_reset(email)

    second = await mock_db.otps.find_one({"email": email})
    assert second["hashed_otp"] == first["hashed_otp"]
    assert second["salt"] == first["salt"]
    assert second["created_at"] == first["created_at"]


@pytest.mark.asyncio
async def test_lockout_is_not_bypassed_by_resend(mock_db):
    """A locked OTP must stay locked even if the user requests a new code."""
    email = "lockout@vidsnap.ai"
    await _register(mock_db, email)
    await IdentityService.request_password_reset(email)

    await _wrong_attempts(mock_db, email, 5)
    record = await mock_db.otps.find_one({"email": email})
    assert record["attempts"] == 5
    locked_hash = record["hashed_otp"]

    await IdentityService.request_password_reset(email)

    record = await mock_db.otps.find_one({"email": email})
    assert record["attempts"] == 5
    assert record["hashed_otp"] == locked_hash
