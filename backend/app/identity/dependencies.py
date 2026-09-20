"""
FastAPI Security & RBAC Dependencies.
Extracts and validates JWT access tokens from Authorization headers or httpOnly cookies.
"""

from collections.abc import Callable
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token
from backend.app.identity.models import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
) -> dict[str, Any]:
    """
    Extract and validate current authenticated user.
    Inspects Authorization header first, then falls back to 'access_token' cookie.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Check header token or cookie token
    jwt_token = token or request.cookies.get("access_token")
    if not jwt_token:
        raise credentials_exception

    try:
        payload = decode_access_token(jwt_token)
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except ValueError:
        raise credentials_exception from None

    db = get_db()
    # Uses indexed user_id field!
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise credentials_exception

    return user


def require_role(*allowed_roles: str) -> Callable:
    """
    Dependency factory checking if current user possesses at least one of the required roles.
    Admins are always authorized.
    """
    async def role_checker(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        user_roles = set(current_user.get("roles", []))
        # Admin bypass
        if UserRole.ADMIN.value in user_roles:
            return current_user

        if not any(role in user_roles for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {list(allowed_roles)}",
            )
        return current_user

    return role_checker


# Convenient aliases
get_current_admin = require_role(UserRole.ADMIN.value)


async def get_optional_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
) -> dict[str, Any] | None:
    """Extract authenticated user if token present, otherwise return None."""
    jwt_token = token or request.cookies.get("access_token")
    if not jwt_token:
        return None
    try:
        payload = decode_access_token(jwt_token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        db = get_db()
        return await db.users.find_one({"user_id": user_id})
    except Exception:
        return None
