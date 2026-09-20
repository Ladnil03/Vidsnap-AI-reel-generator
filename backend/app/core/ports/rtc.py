"""
RTC Port: Abstract interface for Real-Time Communication & WebRTC voice/video lounges.
Enables pluggable backends: LiveKit Cloud (free tier), self-hosted LiveKit, or Mock RTC.
"""

from abc import ABC, abstractmethod


class RTCPort(ABC):
    """Abstract interface defining required WebRTC access and token generation capabilities."""

    @abstractmethod
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
        Generate a cryptographically signed WebRTC access token.
        Returns a JWT token readable by the LiveKit client SDK.
        """

    @abstractmethod
    def get_server_url(self) -> str:
        """Return the WebRTC server WebSocket endpoint URL."""
