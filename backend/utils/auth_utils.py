"""
Authentication utilities — password hashing, JWT creation and verification.
No FastAPI imports, no database imports. Pure utility functions.
"""

import logging
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.config import settings

logger = logging.getLogger(__name__)

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Hash a plain text password using bcrypt.
    Never store plain text passwords.

    Args:
        plain_password: The raw password from the user.

    Returns:
        Bcrypt hashed password string.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a bcrypt hash.

    Args:
        plain_password: Raw password from login form.
        hashed_password: Stored bcrypt hash from database.

    Returns:
        True if password matches, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, email: str) -> str:
    """
    Create a signed JWT access token for an authenticated user.
    Token expires after settings.jwt_expire_minutes.

    Args:
        user_id: MongoDB user document _id as string.
        email: User email — included in token payload.

    Returns:
        Signed JWT token string.
    """
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.

    Args:
        token: JWT token string from Authorization header.

    Returns:
        Decoded payload dict containing 'sub' (user_id) and 'email'.

    Raises:
        ValueError: If token is expired or invalid.
    """
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as error:
        raise ValueError(f"Invalid or expired token: {error}")
