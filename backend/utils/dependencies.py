"""
FastAPI dependencies for authentication and authorization.
Import get_current_user wherever a route requires a logged-in user.
Import get_current_admin wherever a route requires admin access.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from backend.database import get_db
from backend.utils.auth_utils import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency — extracts and validates the JWT from the
    Authorization: Bearer header. Returns the user document from MongoDB.

    Use this as a dependency in any route that requires authentication:
        current_user: dict = Depends(get_current_user)

    Args:
        token: JWT token from Authorization header (injected by oauth2_scheme).

    Returns:
        Full MongoDB user document as dict.

    Raises:
        HTTPException 401 if token is missing, expired, or invalid.
        HTTPException 401 if user no longer exists in database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except ValueError:
        raise credentials_exception

    db = get_db()
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise credentials_exception
    return user


async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency — same as get_current_user but also checks
    that the user has admin role.

    Use this as a dependency in any admin route:
        admin: dict = Depends(get_current_admin)

    Args:
        current_user: Authenticated user document (injected by get_current_user).

    Returns:
        Full MongoDB user document if user is admin.

    Raises:
        HTTPException 403 if user exists but is not an admin.
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user
