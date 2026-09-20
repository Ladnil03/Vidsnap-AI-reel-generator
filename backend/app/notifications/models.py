"""
Notification and Web Push Domain Models and Schemas.
Defines in-app notifications, VAPID push subscriptions, and push payload contracts.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    """Event category for user notifications."""
    LIKE = "like"
    COMMENT = "comment"
    FOLLOW = "follow"
    FRIEND = "friend"
    COMMUNITY = "community"
    SYSTEM = "system"


class NotificationResponse(BaseModel):
    """Public representation of an in-app user notification."""
    notification_id: str
    recipient_id: str
    actor_id: str
    actor_name: str
    actor_avatar: str | None = None
    type: NotificationType
    entity_id: str | None = None
    message: str
    is_read: bool = False
    created_at: datetime


class NotificationListResponse(BaseModel):
    """List of notifications accompanied by unread badge counter."""
    items: list[NotificationResponse]
    unread_count: int
    total: int


class PushSubscriptionKeys(BaseModel):
    """Cryptographic client keys for Web Push (RFC 8291)."""
    p256dh: str
    auth: str


class PushSubscriptionRequest(BaseModel):
    """Browser PushSubscription payload received from navigator.serviceWorker."""
    endpoint: str = Field(description="Push service endpoint URL")
    keys: PushSubscriptionKeys


class VapidPublicKeyResponse(BaseModel):
    """Returns application server VAPID public key for browser push registration."""
    public_key: str
