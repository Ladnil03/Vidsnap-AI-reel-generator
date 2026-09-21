"""
Security regression tests for W3-1: Refresh-token reuse detection.
- Each login/session is assigned a family_id.
- Rotating a valid refresh token issues a new token within the same family and marks old as rotated.
- Presenting an already-rotated token triggers reuse detection, revokes the entire family,
  writes a security audit log, and rejects subsequent rotations with tokens from that family.
"""

import pytest
from fastapi import HTTPException

from backend.app.identity.models import SignupRequest
from backend.app.identity.service import IdentityService


@pytest.mark.asyncio
async def test_refresh_token_normal_rotation(mock_db):
    """A valid refresh token can be rotated successfully once."""
    signup_req = SignupRequest(
        name="Rotation User",
        email="rotate@example.com",
        password="ValidPassword123!",
    )
    auth_resp1 = await IdentityService.register_user(signup_req)
    token1 = auth_resp1.refresh_token
    assert token1 is not None

    # Rotate token1 -> gets token2
    auth_resp2 = await IdentityService.rotate_refresh_token(token1)
    token2 = auth_resp2.refresh_token
    assert token2 is not None
    assert token2 != token1

    # Check that both tokens share the same family_id
    token_docs = await mock_db.refresh_tokens.find({"user_id": auth_resp1.user.user_id}).to_list(length=10)
    assert len(token_docs) == 2
    assert token_docs[0]["family_id"] == token_docs[1]["family_id"]


@pytest.mark.asyncio
async def test_refresh_token_reuse_revokes_entire_family(mock_db):
    """
    If an already-rotated token is presented again (replay attack / token theft),
    reuse detection must trigger, the entire token family must be revoked,
    a security audit log entry must be created, and subsequent use of any token
    in the family must be rejected with 401.
    """
    signup_req = SignupRequest(
        name="Reuse Victim",
        email="victim@example.com",
        password="ValidPassword123!",
    )
    auth_resp1 = await IdentityService.register_user(signup_req)
    token1 = auth_resp1.refresh_token
    assert token1 is not None

    # Legitimate user rotates token1 -> gets token2
    auth_resp2 = await IdentityService.rotate_refresh_token(token1)
    token2 = auth_resp2.refresh_token
    assert token2 is not None

    # Attacker attempts to replay token1
    with pytest.raises(HTTPException) as exc_info:
        await IdentityService.rotate_refresh_token(token1)

    assert exc_info.value.status_code == 401
    assert "reuse" in exc_info.value.detail.lower()

    # The entire family must now be revoked: token2 should ALSO fail
    with pytest.raises(HTTPException) as exc_info2:
        await IdentityService.rotate_refresh_token(token2)
    assert exc_info2.value.status_code == 401

    # Audit log check: audit collection
    audit_entry = await mock_db.security_audit_logs.find_one({
        "event": "refresh_token_reuse_detected",
        "user_id": auth_resp1.user.user_id,
    })
    assert audit_entry is not None


@pytest.mark.asyncio
async def test_logout_revokes_token_family(mock_db):
    """Logging out revokes all tokens in the family, blocking further rotations."""
    signup_req = SignupRequest(
        name="Logout User",
        email="logout@example.com",
        password="ValidPassword123!",
    )
    auth_resp = await IdentityService.register_user(signup_req)
    token = auth_resp.refresh_token

    # Logout
    await IdentityService.revoke_session(token)

    # Attempting to rotate revoked token fails with 401
    with pytest.raises(HTTPException) as exc_info:
        await IdentityService.rotate_refresh_token(token)
    assert exc_info.value.status_code == 401
