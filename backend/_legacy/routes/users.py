"""
User profile routes — get profile, check token balance.
"""

from fastapi import APIRouter, Depends

from backend.models import UserProfile
from backend.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)) -> UserProfile:
    """
    Return the currently logged-in user's profile including their remaining token balance.

    Args:
        current_user: Authenticated user document (injected by dependency).

    Returns:
        UserProfile with user name, email, token balance, and creation timestamp.
    """
    return UserProfile(
        name=current_user["name"],
        email=current_user["email"],
        tokens_remaining=current_user["tokens_remaining"],
        created_at=current_user["created_at"],
    )
