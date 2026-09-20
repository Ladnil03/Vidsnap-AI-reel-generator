"""
Notifications and Web Push HTTP Routes.
Exposes endpoints for listing user notifications, marking them read,
registering browser push subscriptions, and retrieving the VAPID public key.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status

from backend.app.core.config import settings
from backend.app.identity.dependencies import get_current_user
from backend.app.notifications.models import (
    NotificationListResponse,
    PushSubscriptionRequest,
    VapidPublicKeyResponse,
)
from backend.app.notifications.service import NotificationsService

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


def get_notifications_service() -> NotificationsService:
    return NotificationsService()


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[NotificationsService, Depends(get_notifications_service)],
    unread_only: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
) -> NotificationListResponse:
    """Retrieve notifications and unread badge count for the current user."""
    return await service.get_notifications(
        user_id=current_user["user_id"],
        limit=limit,
        unread_only=unread_only,
    )


@router.patch("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: str,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[NotificationsService, Depends(get_notifications_service)],
) -> dict[str, bool]:
    """Mark a specific notification as read."""
    success = await service.mark_as_read(notification_id=notification_id, user_id=current_user["user_id"])
    return {"success": success}


@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[NotificationsService, Depends(get_notifications_service)],
) -> dict[str, int]:
    """Mark all notifications for the current user as read."""
    count = await service.mark_all_read(user_id=current_user["user_id"])
    return {"marked_read": count}


@router.post("/push/subscribe", status_code=status.HTTP_201_CREATED)
async def register_push_subscription(
    req: PushSubscriptionRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[NotificationsService, Depends(get_notifications_service)],
) -> dict[str, bool]:
    """Register browser Web Push subscription for the current user."""
    success = await service.register_push_subscription(user_id=current_user["user_id"], req=req)
    return {"subscribed": success}


@router.delete("/push/unsubscribe", status_code=status.HTTP_200_OK)
async def unregister_push_subscription(
    endpoint: str,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: Annotated[NotificationsService, Depends(get_notifications_service)],
) -> dict[str, bool]:
    """Unregister browser Web Push subscription."""
    success = await service.unregister_push_subscription(user_id=current_user["user_id"], endpoint=endpoint)
    return {"unsubscribed": success}


@router.get("/push/vapid-key", response_model=VapidPublicKeyResponse)
async def get_vapid_public_key() -> VapidPublicKeyResponse:
    """Return application server VAPID public key for browser push registration."""
    return VapidPublicKeyResponse(public_key=settings.vapid_public_key)
