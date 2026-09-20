"""
Admin API Routes (/api/v1/admin).
Protected by RBAC admin dependency.
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.admin.models import AdminReelItem, AdminTokenUpdate, AdminUserItem
from backend.app.admin.service import AdminService
from backend.app.identity.dependencies import get_current_admin

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Portal"])


@router.get("/users", response_model=list[AdminUserItem])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin_user: dict[str, Any] = Depends(get_current_admin),
) -> list[AdminUserItem]:
    """List all registered users with completed reel counts (single query)."""
    return await AdminService.get_users_aggregated(skip=skip, limit=limit)


@router.get("/reels", response_model=list[AdminReelItem])
async def list_reels(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin_user: dict[str, Any] = Depends(get_current_admin),
) -> list[AdminReelItem]:
    """List all completed reels with creator emails (single query)."""
    return await AdminService.get_reels_aggregated(skip=skip, limit=limit)


@router.patch("/users/{user_id}/tokens", response_model=dict[str, Any])
async def update_user_tokens(
    user_id: str,
    request: AdminTokenUpdate,
    admin_user: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    """Update a user's token balance with credit ledger audit logging."""
    try:
        new_balance = await AdminService.set_user_tokens(
            user_id=user_id,
            new_tokens=request.tokens,
            admin_email=admin_user["email"],
        )
        return {
            "updated": True,
            "user_id": user_id,
            "tokens_remaining": new_balance,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
