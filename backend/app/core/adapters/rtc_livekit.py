"""
LiveKit RTC Adapter.
Generates RFC 7519 HMAC-SHA256 JWT access tokens for LiveKit WebRTC audio/video lounges.
Uses python-jose (already installed) — zero new dependencies, zero cost.
"""

import logging
import time
from typing import Any

from jose import jwt

from backend.app.core.config import settings
from backend.app.core.ports.rtc import RTCPort

logger = logging.getLogger(__name__)


class LiveKitRTCAdapter(RTCPort):
    """LiveKit WebRTC token generator supporting LiveKit Cloud Free Tier & self-hosted instances."""

    def __init__(self):
        self.api_key = settings.livekit_api_key or "vidsnap_dev_key"
        self.api_secret = settings.livekit_api_secret or "vidsnap_dev_secret_32_chars_min_key!!"
        self.server_url = settings.livekit_url

        if not settings.livekit_api_key or not settings.livekit_api_secret:
            logger.debug(
                "LiveKit credentials not configured. Operating in local dev mode (signed with dev secret)."
            )

    def generate_token(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: str,
        can_publish: bool = True,
        can_subscribe: bool = True,
        expires_seconds: int = 86400,
    ) -> str:
        """
        Generate an RFC 7519 HS256 signed JWT for LiveKit rooms.
        Claims conform directly to the LiveKit Server Token Specification:
        https://docs.livekit.io/home/get-started/authentication/
        """
        now = int(time.time())
        exp = now + expires_seconds

        video_grant: dict[str, Any] = {
            "room": room_name,
            "roomJoin": True,
            "canPublish": can_publish,
            "canSubscribe": can_subscribe,
        }

        claims: dict[str, Any] = {
            "iss": self.api_key,
            "sub": participant_identity,
            "name": participant_name,
            "nbf": now,
            "exp": exp,
            "video": video_grant,
        }

        token = jwt.encode(claims, self.api_secret, algorithm="HS256")
        return token

    def get_server_url(self) -> str:
        """Return the configured LiveKit WebSocket URL."""
        return self.server_url
