"""
Rooms Domain Models & Schemas.
Defines types for Watch Together rooms, server-authoritative playback sync, chat, and WebRTC.
"""

import re
from datetime import datetime, timezone
from enum import Enum
from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

_SANITIZE_RE = re.compile(r"<script\b[^>]*>[\s\S]*?</script>|<[^>]*>", re.IGNORECASE)


def sanitize_text(value: str) -> str:
    """Strip HTML/script tags and surrounding whitespace from free-text fields."""
    return _SANITIZE_RE.sub("", value).strip()


class RoomType(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class PlaybackState(str, Enum):
    PLAYING = "playing"
    PAUSED = "paused"
    BUFFERING = "buffering"


class ControlMode(str, Enum):
    HOST_ONLY = "host_only"
    DEMOCRATIC = "democratic"


class MediaType(str, Enum):
    NATIVE = "native"
    YOUTUBE = "youtube"
    STOCK = "stock"


class WatchState(BaseModel):
    """Server-authoritative playback synchronization state."""
    media_url: str = Field(default="", description="URL of currently loaded video or embed")
    media_title: str = Field(default="No video selected", description="Title of current video")
    media_type: MediaType = Field(default=MediaType.NATIVE)
    state: PlaybackState = Field(default=PlaybackState.PAUSED)
    position_seconds: float = Field(default=0.0, ge=0.0)
    playback_rate: float = Field(default=1.0, ge=0.25, le=2.0)
    last_updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by_user_id: str | None = None


class RoomParticipant(BaseModel):
    """Presence information for an active room participant."""
    user_id: str
    name: str
    avatar_url: str | None = None
    is_host: bool = False
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatMessage(BaseModel):
    """Room chat message entity."""
    message_id: str
    room_id: str
    user_id: str
    user_name: str
    avatar_url: str | None = None
    text: str = Field(..., max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_system: bool = False
    is_assistant: bool = False


class CreateRoomRequest(BaseModel):
    """Schema for creating a Watch Party room."""
    name: str = Field(..., min_length=2, max_length=100, description="Room display name")
    description: str = Field(default="", max_length=500)
    room_type: RoomType = Field(default=RoomType.PUBLIC)
    passcode: str | None = Field(
        default=None, max_length=50, description="Required secret (min 8 chars) for private rooms"
    )
    control_mode: ControlMode = Field(default=ControlMode.HOST_ONLY)
    initial_media_url: str | None = None
    initial_media_title: str | None = None
    initial_media_type: MediaType = Field(default=MediaType.NATIVE)

    @model_validator(mode="after")
    def _validate_room(self) -> Self:
        self.name = sanitize_text(self.name)
        if self.description:
            self.description = sanitize_text(self.description)
        if self.room_type == RoomType.PRIVATE:
            if not self.passcode or len(self.passcode) < 8:
                raise ValueError("Private rooms require a passcode of at least 8 characters")
        else:
            self.passcode = None
        return self


class JoinRoomRequest(BaseModel):
    """Schema for joining a room with passcode verification."""
    passcode: str | None = None


class SyncActionRequest(BaseModel):
    """Client playback control command."""
    action: Literal["play", "pause", "seek", "change_media", "set_rate"]
    position_seconds: float | None = None
    playback_rate: float | None = None
    media_url: str | None = None
    media_title: str | None = None
    media_type: MediaType | None = None


class RoomResponse(BaseModel):
    """Public representation of a room."""
    room_id: str
    name: str
    description: str
    room_type: RoomType
    control_mode: ControlMode
    host_id: str
    host_name: str
    watch_state: WatchState
    participant_count: int
    participants: list[RoomParticipant] = []
    created_at: datetime


class LiveKitTokenResponse(BaseModel):
    """Response containing signed LiveKit WebRTC credentials for audio lounges."""
    token: str
    server_url: str
    room_name: str


class RoomSummaryResponse(BaseModel):
    """AI Room Assistant 30-second catch-up summary."""
    room_id: str
    summary: str
    highlights: list[str]
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
