"""
Unit tests for LiveKit RTC Adapter: RFC 7519 HS256 JWT generation, video grants, and factory wiring.
"""

import time

from jose import jwt

from backend.app.core.adapters.factory import get_rtc_adapter
from backend.app.core.adapters.rtc_livekit import LiveKitRTCAdapter


def test_livekit_token_generation_and_claims():
    """Test standard LiveKit token generation and verify RFC 7519 HS256 claims."""
    adapter = LiveKitRTCAdapter()
    room_name = "chill_lounge_42"
    user_id = "user_test_99"
    user_name = "DJ Streamer"

    token = adapter.generate_token(
        room_name=room_name,
        participant_identity=user_id,
        participant_name=user_name,
        can_publish=True,
        can_subscribe=True,
        expires_seconds=7200,
    )

    assert isinstance(token, str)
    assert len(token.split(".")) == 3  # Valid JWT format: header.payload.signature

    # Decode and verify payload
    decoded = jwt.decode(token, adapter.api_secret, algorithms=["HS256"])
    assert decoded["iss"] == adapter.api_key
    assert decoded["sub"] == user_id
    assert decoded["name"] == user_name
    assert decoded["exp"] > int(time.time())

    video_grant = decoded.get("video", {})
    assert video_grant["room"] == room_name
    assert video_grant["roomJoin"] is True
    assert video_grant["canPublish"] is True
    assert video_grant["canSubscribe"] is True


def test_livekit_token_listen_only_permissions():
    """Test token generation with restricted publisher privileges."""
    adapter = LiveKitRTCAdapter()
    token = adapter.generate_token(
        room_name="silent_theater",
        participant_identity="lurker_1",
        participant_name="Lurker",
        can_publish=False,
        can_subscribe=True,
    )

    decoded = jwt.decode(token, adapter.api_secret, algorithms=["HS256"])
    video_grant = decoded.get("video", {})
    assert video_grant["canPublish"] is False
    assert video_grant["canSubscribe"] is True


def test_livekit_server_url():
    """Test retrieval of server URL."""
    adapter = LiveKitRTCAdapter()
    url = adapter.get_server_url()
    assert isinstance(url, str)
    assert "wss://" in url or "ws://" in url


def test_rtc_adapter_factory():
    """Test get_rtc_adapter returns a singleton/instance implementing RTCPort."""
    adapter = get_rtc_adapter()
    assert isinstance(adapter, LiveKitRTCAdapter)
