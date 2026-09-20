"""
Unit tests for NotificationsService: in-app notifications, mark-read, unread badge counters, and push registration.
"""

import pytest

from backend.app.notifications.models import NotificationType, PushSubscriptionKeys, PushSubscriptionRequest
from backend.app.notifications.push_adapter import NoopPushAdapter
from backend.app.notifications.service import NotificationsService


@pytest.mark.asyncio
async def test_create_and_fetch_notifications(mock_db):
    service = NotificationsService(db=mock_db, push_adapter=NoopPushAdapter())

    # Actor user
    await mock_db.users.insert_one({"user_id": "actor_1", "name": "Elena Rostova", "avatar_url": "https://cdn.io/elena.jpg"})

    # Send notification
    notif = await service.create_notification(
        recipient_id="user_target",
        actor_id="actor_1",
        actor_name="Elena Rostova",
        notification_type=NotificationType.LIKE,
        message="Elena liked your reel.",
        entity_id="video_123",
    )
    assert notif is not None
    assert notif.recipient_id == "user_target"
    assert notif.type == NotificationType.LIKE
    assert notif.is_read is False

    # Fetch list
    res = await service.get_notifications(user_id="user_target")
    assert res.total == 1
    assert res.unread_count == 1
    assert res.items[0].actor_name == "Elena Rostova"


@pytest.mark.asyncio
async def test_no_self_notification(mock_db):
    service = NotificationsService(db=mock_db, push_adapter=NoopPushAdapter())

    # Sending to self should return None
    notif = await service.create_notification(
        recipient_id="user_me",
        actor_id="user_me",
        actor_name="Myself",
        notification_type=NotificationType.LIKE,
        message="Self like",
    )
    assert notif is None

    res = await service.get_notifications(user_id="user_me")
    assert res.total == 0


@pytest.mark.asyncio
async def test_mark_notification_read_and_unread_count(mock_db):
    service = NotificationsService(db=mock_db, push_adapter=NoopPushAdapter())

    n1 = await service.create_notification("user_1", "actor_1", "Actor 1", "follow", "Followed you")
    await service.create_notification("user_1", "actor_2", "Actor 2", "comment", "Commented on reel")

    unread_before = await service.get_notifications("user_1")
    assert unread_before.unread_count == 2

    # Mark n1 read
    await service.mark_as_read(notification_id=n1.notification_id, user_id="user_1")
    unread_after = await service.get_notifications("user_1")
    assert unread_after.unread_count == 1

    # Mark all read
    await service.mark_all_read(user_id="user_1")
    unread_final = await service.get_notifications("user_1")
    assert unread_final.unread_count == 0


@pytest.mark.asyncio
async def test_push_subscription_registration(mock_db):
    service = NotificationsService(db=mock_db, push_adapter=NoopPushAdapter())

    req = PushSubscriptionRequest(
        endpoint="https://fcm.googleapis.com/fcm/send/fake-endpoint-token",
        keys=PushSubscriptionKeys(p256dh="BNcR", auth="tNK"),
    )
    res = await service.register_push_subscription(user_id="user_99", req=req)
    assert res is True

    sub = await mock_db.push_subscriptions.find_one({"user_id": "user_99"})
    assert sub is not None
    assert sub["endpoint"] == "https://fcm.googleapis.com/fcm/send/fake-endpoint-token"

    # Unregister
    unsub = await service.unregister_push_subscription(user_id="user_99", endpoint=req.endpoint)
    assert unsub is True
    assert await mock_db.push_subscriptions.find_one({"user_id": "user_99"}) is None
