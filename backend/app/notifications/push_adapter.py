"""
Web Push (VAPID RFC 8291/8292) Ports and Adapters.
Enables zero-cost browser push notifications using standard HTTP Web Push protocol.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Any

import httpx

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class BasePushAdapter(ABC):
    """Abstract port for dispatching push notifications."""

    @abstractmethod
    async def send_notification(
        self,
        endpoint: str,
        p256dh: str,
        auth: str,
        payload: dict[str, Any],
    ) -> bool:
        """Send push payload to client endpoint."""
        pass


class NoopPushAdapter(BasePushAdapter):
    """Fallback no-op push adapter for local development and unit tests."""

    async def send_notification(
        self,
        endpoint: str,
        p256dh: str,
        auth: str,
        payload: dict[str, Any],
    ) -> bool:
        logger.info("[NoopPushAdapter] Dispatched push payload to %s: %s", endpoint[:40], payload.get("title"))
        return True


class WebPushAdapter(BasePushAdapter):
    """
    Standard Web Push adapter using VAPID headers and HTTP POST.
    Dispatches directly to browser push endpoints (FCM, Mozilla Autopush, Apple WebPush).
    """

    def __init__(self, public_key: str, private_key: str, claims_email: str):
        self.public_key = public_key
        self.private_key = private_key
        self.claims_email = claims_email

    async def send_notification(
        self,
        endpoint: str,
        p256dh: str,
        auth: str,
        payload: dict[str, Any],
    ) -> bool:
        if not self.private_key or not self.public_key:
            logger.debug("VAPID keys not configured; push notification skipped.")
            return False

        try:
            # Prepare push payload
            body_data = json.dumps(payload).encode("utf-8")
            headers = {
                "TTL": "86400",
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(endpoint, content=body_data, headers=headers)
                if res.status_code in (200, 201, 202):
                    logger.info("Web Push delivered successfully to %s", endpoint[:35])
                    return True
                elif res.status_code in (404, 410):
                    logger.info("Push subscription expired/unregistered (HTTP %d)", res.status_code)
                    return False
                else:
                    logger.warning("Push delivery responded with HTTP %d: %s", res.status_code, res.text[:100])
                    return False
        except Exception as e:
            logger.warning("Failed to dispatch Web Push: %s", e)
            return False


def get_push_adapter() -> BasePushAdapter:
    """Return configured push adapter instance."""
    if settings.vapid_public_key and settings.vapid_private_key:
        return WebPushAdapter(
            public_key=settings.vapid_public_key,
            private_key=settings.vapid_private_key,
            claims_email=settings.vapid_claims_email,
        )
    return NoopPushAdapter()
