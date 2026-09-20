"""
Unit tests for core cryptographic security and OTP mechanisms.
"""

import pytest

from backend.app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    generate_secure_otp,
    hash_otp,
    hash_password,
    hash_token,
    verify_otp_hash,
    verify_password,
)


def test_password_hashing_and_verification():
    """Verify bcrypt hashes passwords with unique salts and checks correctly."""
    plain = "SuperSecurePassword123!"
    hashed1 = hash_password(plain)
    hashed2 = hash_password(plain)

    # Unique salts mean different hashes
    assert hashed1 != hashed2
    assert verify_password(plain, hashed1) is True
    assert verify_password(plain, hashed2) is True
    assert verify_password("WrongPassword123!", hashed1) is False


def test_jwt_access_token_lifecycle():
    """Verify JWT access token creation, claims, and validation."""
    user_id = "test-user-uuid-123"
    email = "user@vidsnap.ai"
    roles = ["user", "creator"]

    token = create_access_token(user_id=user_id, email=email, roles=roles)
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["roles"] == roles
    assert payload["type"] == "access"


def test_jwt_invalid_token():
    """Verify invalid JWT tokens raise ValueError."""
    with pytest.raises(ValueError):
        decode_access_token("invalid.jwt.token")


def test_refresh_token_generation_and_hashing():
    """Verify high entropy refresh tokens and SHA-256 persistence hashing."""
    token1 = generate_refresh_token()
    token2 = generate_refresh_token()

    assert len(token1) >= 48
    assert token1 != token2

    hash1 = hash_token(token1)
    hash2 = hash_token(token1)
    assert hash1 == hash2  # Deterministic hash for DB lookup
    assert hash1 != hash_token(token2)


def test_secure_otp_generation_and_verification():
    """Verify 6-digit cryptographic OTP generation and constant-time verification."""
    otp = generate_secure_otp()
    assert len(otp) == 6
    assert otp.isdigit()

    salt = "random_salt_123"
    hashed = hash_otp(otp, salt)

    # Valid check
    assert verify_otp_hash(otp, hashed, salt) is True
    # Invalid check
    assert verify_otp_hash("000000", hashed, salt) is False
