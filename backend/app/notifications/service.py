"""
Notifications Service Layer.
Handles in-app notification creation, unread badge aggregation, mark-as-read state,
and Web Push dispatch via RFC 8291/8292.
"""

import logging
import uuid
from datetime import UTC, datetime

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.core.database import get_db
from backend.app.notifications.models import (
    NotificationListResponse,
    NotificationResponse,
    NotificationType,
    PushSubscriptionRequest,
)
from backend.app.notifications.push_adapter import BasePushAdapter, get_push_adapter

logger = logging.getLogger(__name__)


class NotificationsService:
    """Service managing in-app notifications and Web Push dispatch."""

    def __init__(self, db: AsyncIOMotorDatabase | None = None, push_adapter: BasePushAdapter | None = None):
        self._db = db
        self._push_adapter = push_adapter or get_push_adapter()

    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is not None:
            return self._db
        return get_db()

    async def create_notification(
        self,
        recipient_id: str,
        actor_id: str,
        actor_name: str,
        notification_type: str | NotificationType,
        message: str,
        entity_id: str | None = None,
    ) -> NotificationResponse | None:
        """Create an in-app notification and trigger background push notification."""
        # Never send self-notifications
        if recipient_id == actor_id:
            return None

        # Resolve type
        if isinstance(notification_type, str):
            try:
                n_type = NotificationType(notification_type)
            except ValueError:
                n_type = NotificationType.SYSTEM
        else:
            n_type = notification_type

        # Fetch actor avatar
        actor_user = await self.db["users"].find_one({"user_id": actor_id}) or {}
        actor_avatar = actor_user.get("avatar_url")

        notification_id = f"notif_{uuid.uuid4().hex[:12]}"
        now = datetime.now(UTC)

        doc = {
            "notification_id": notification_id,
            "recipient_id": recipient_id,
            "actor_id": actor_id,
            "actor_name": actor_name,
            "actor_avatar": actor_avatar,
            "type": n_type.value,
            "entity_id": entity_id,
            "message": message,
            "is_read": False,
            "created_at": now,
        }
        await self.db["notifications"].insert_one(doc)

        # Trigger Web Push notification if recipient is subscribed
        try:
            subs = await self.db["push_subscriptions"].find({"user_id": recipient_id}).to_list(length=10)
            for sub in subs:
                keys = sub.get("keys", {})
                await self._push_adapter.send_notification(
                    endpoint=sub["endpoint"],
                    p256dh=keys.get("p256dh", ""),
                    auth=keys.get("auth", ""),
                    payload={
                        "title": f"VidSnap • {actor_name}",
                        "body": message,
                        "url": "/feed",
                        "notification_id": notification_id,
                    },
                )
        except Exception as e:
            logger.warning("Failed to dispatch push notification for %s: %s", recipient_id, e)

        return NotificationResponse(
            notification_id=notification_id,
            recipient_id=recipient_id,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_avatar=actor_avatar,
            type=n_type,
            entity_id=entity_id,
            message=message,
            is_read=False,
            created_at=now,
        )

    async def get_notifications(
        self,
        user_id: str,
        limit: int = 30,
        unread_only: bool = False,
    ) -> NotificationListResponse:
        """Fetch notifications and unread badge count for user."""
        filter_q: dict = {"recipient_id": user_id}
        if unread_only:
            filter_q["is_read"] = False

        cursor = self.db["notifications"].find(filter_q).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)

        items = [
            NotificationResponse(
                notification_id=d["notification_id"],
                recipient_id=d["recipient_id"],
                actor_id=d["actor_id"],
                actor_name=d.get("actor_name", "Someone"),
                actor_avatar=d.get("actor_avatar"),
                type=NotificationType(d.get("type", "system")),
                entity_id=d.get("entity_id"),
                message=d.get("message", ""),
                is_read=d.get("is_read", False),
                created_at=d["created_at"],
            )
            for d in docs
        ]

        unread_count = await self.db["notifications"].count_documents({
            "recipient_id": user_id,
            "is_read": False,
        })
        total = await self.db["notifications"].count_documents({"recipient_id": user_id})

        return NotificationListResponse(items=items, unread_count=unread_count, total=total)

    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a single notification as read."""
        res = await self.db["notifications"].update_one(
            {"notification_id": notification_id, "recipient_id": user_id},
            {"$set": {"is_read": True}},
        )
        return res.modified_count > 0

    async def mark_all_read(self, user_id: str) -> int:
        """Mark all notifications for the user as read."""
        res = await self.db["notifications"].update_many(
            {"recipient_id": user_id, "is_read": False},
            {"$set": {"is_read": True}},
        )
        return res.modified_count

    async def register_push_subscription(self, user_id: str, req: PushSubscriptionRequest) -> bool:
        """Store or update browser push subscription."""
        now = datetime.now(UTC)
        await self.db["push_subscriptions"].update_one(
            {"user_id": user_id, "endpoint": req.endpoint},
            {
                "$set": {
                    "user_id": user_id,
                    "endpoint": req.endpoint,
                    "keys": {"p256dh": req.keys.p256dh, "auth": req.keys.auth},
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
        )
        return True

    async def unregister_push_subscription(self, user_id: str, endpoint: str) -> bool:
        """Delete browser push subscription."""
        res = await self.db["push_subscriptions"].delete_one({
            "user_id": user_id,
            "endpoint": endpoint,
        })
        return res.deleted_count > 0
