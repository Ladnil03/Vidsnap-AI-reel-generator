"""
Cryptographic security, password hashing, JWT tokens, and secure OTP utilities.
Follows OWASP standards:
- Bcrypt with random salts for passwords
- Rotating refresh tokens hashed at rest
- Cryptographically secure random numbers for OTP (secrets module)
- Constant-time comparisons (compare_digest)
"""

import hashlib
import hmac
import logging
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


def hash_password(plain_password: str) -> str:
    """Hash a password using bcrypt with automatic salt generation."""
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception as e:
        logger.error("Password verification error: %s", e)
        return False


def create_access_token(
    user_id: str,
    email: str,
    roles: list[str] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Generate a signed JWT access token.
    Payload includes subject, email, roles, and expiration.
    """
    if roles is None:
        roles = ["user"]

    expire_time = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )

    payload = {
        "sub": user_id,
        "email": email,
        "roles": roles,
        "exp": expire_time,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT access token.
    Raises ValueError if invalid, expired, or wrong type.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "access":
            raise ValueError("Token is not an access token")
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid access token: {e}") from e


def generate_refresh_token() -> str:
    """Generate a high-entropy URL-safe refresh token string."""
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    """Hash a token with SHA-256 for secure persistence at rest."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_secure_otp() -> str:
    """
    Generate a cryptographically secure 6-digit OTP string using secrets.
    Never uses pseudo-random 'random.choices'.
    """
    digits = string.digits
    return "".join(secrets.choice(digits) for _ in range(6))


def hash_otp(otp: str, salt: str) -> str:
    """Hash an OTP with a user-specific salt for storage in database."""
    return hmac.new(salt.encode("utf-8"), otp.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_otp_hash(plain_otp: str, stored_hash: str, salt: str) -> bool:
    """Constant-time verification of OTP against stored hash."""
    calculated = hash_otp(plain_otp, salt)
    return secrets.compare_digest(calculated, stored_hash)
