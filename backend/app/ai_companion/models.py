"""
AI Companion & Personalization Domain Models.
Defines schemas for Mood States, Companion Chat, Smart AI Playlists,
Entertainment Journeys, Daily Plans, and Consented Digital Twins.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class MoodType(str, Enum):
    """Supported user mood categories for personalization and recommendations."""

    ENERGIZED = "energized"
    CHILL = "chill"
    FOCUSED = "focused"
    CURIOUS = "curious"
    MELANCHOLIC = "melancholic"
    INSPIRED = "inspired"
    HUMOROUS = "humorous"


class MoodState(BaseModel):
    """User's current mood state with consent gating."""

    user_id: str
    mood: MoodType
    intensity: float = Field(1.0, ge=0.0, le=1.0)
    consent_given: bool = True
    note: str | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SetMoodRequest(BaseModel):
    """Request to update active emotional state."""

    mood: MoodType
    consent_given: bool = True
    note: str | None = Field(None, max_length=200)


class CompanionMessage(BaseModel):
    """Individual message in personal companion conversation."""

    message_id: str
    role: str = Field(..., pattern="^(user|assistant|system|tool)$")
    content: str
    tool_calls: list[dict[str, Any]] | None = None
    reels: list[dict[str, Any]] | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CompanionChatRequest(BaseModel):
    """Prompt sent to personal AI Companion."""

    message: str = Field(..., min_length=1, max_length=1000)
    mood: MoodType | None = None


class CompanionChatResponse(BaseModel):
    """Companion response with synthesized text, embedded reels, and follow-up chips."""

    message: CompanionMessage
    suggested_actions: list[str] = Field(default_factory=list)
    active_mood: MoodType | None = None


class AIPlaylist(BaseModel):
    """Smart dynamically assembled video playlist."""

    playlist_id: str
    user_id: str
    title: str
    description: str = ""
    mood: MoodType | None = None
    target_duration_minutes: int = 10
    reel_ids: list[str] = Field(default_factory=list)
    reels: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CreateAIPlaylistRequest(BaseModel):
    """Request payload to generate a smart playlist."""

    title: str = Field(..., min_length=1, max_length=100)
    prompt: str | None = Field(None, max_length=300)
    mood: MoodType | None = None
    target_duration_minutes: int = Field(10, ge=3, le=60)


class JourneyStep(BaseModel):
    """Single step within a structured entertainment journey."""

    step_number: int
    title: str
    description: str = ""
    duration_seconds: int = 60
    reel_id: str | None = None
    reel_title: str | None = None
    reel_url: str | None = None
    thumbnail_url: str | None = None


class EntertainmentJourney(BaseModel):
    """Curated multi-step entertainment journey tailored to a vibe and timeframe."""

    journey_id: str
    title: str
    description: str
    journey_type: str  # e.g., "morning_spark", "focus_flow", "laugh_break", "evening_unwind"
    mood: MoodType
    total_duration_minutes: int
    steps: list[JourneyStep] = Field(default_factory=list)


class DailyPlanSlot(BaseModel):
    """Scheduled viewing slot within user's daily entertainment plan."""

    slot_id: str
    name: str  # e.g. "Morning Commute", "Lunch Break", "Late Night Chill"
    time_of_day: str = Field("morning", pattern="^(morning|afternoon|evening|night)$")
    duration_minutes: int = Field(10, ge=3, le=60)
    journey_id: str | None = None
    is_completed: bool = False


class DailyPlan(BaseModel):
    """User's daily entertainment plan with healthy session boundaries."""

    user_id: str
    date: str  # YYYY-MM-DD
    slots: list[DailyPlanSlot] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UpdateDailyPlanRequest(BaseModel):
    """Update payload for daily entertainment planner."""

    slots: list[DailyPlanSlot]


class DigitalTwinProfile(BaseModel):
    """Consented creator AI digital twin configuration with mandatory AI provenance labeling."""

    creator_id: str
    creator_name: str
    persona_name: str = "Digital Twin"
    bio: str = Field("", max_length=500)
    voice_tone: str = Field("friendly, engaging, witty", max_length=100)
    greeting_template: str = Field(
        "Hey there! I'm {creator_name}'s AI Digital Twin. Ask me anything about our reels!",
        max_length=300,
    )
    topics: list[str] = Field(default_factory=list)
    is_ai_labeled: bool = True  # Strict provenance requirement
    is_active: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DigitalTwinInteractRequest(BaseModel):
    """User interaction with a creator's public digital twin."""

    message: str = Field(..., min_length=1, max_length=500)


class DigitalTwinInteractResponse(BaseModel):
    """Response generated by the creator's digital twin co-pilot."""

    reply: str
    creator_id: str
    persona_name: str
    is_ai_labeled: bool = True
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
