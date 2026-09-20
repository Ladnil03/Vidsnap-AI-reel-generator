"""
AI Companion Service Layer.
Orchestrates conversational assistant interactions, local tool execution,
consent-gated mood states, smart dynamic playlists, journeys, and digital twins.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.app.ai_companion.models import (
    AIPlaylist,
    CompanionChatRequest,
    CompanionChatResponse,
    CompanionMessage,
    CreateAIPlaylistRequest,
    DailyPlan,
    DailyPlanSlot,
    DigitalTwinInteractRequest,
    DigitalTwinInteractResponse,
    DigitalTwinProfile,
    EntertainmentJourney,
    MoodState,
    MoodType,
    SetMoodRequest,
    UpdateDailyPlanRequest,
)
from backend.app.ai_companion.tools import (
    tool_create_playlist,
    tool_curate_journey,
    tool_search_reels,
)
from backend.app.core.database import get_db
from backend.app.core.llm_router import LLMRouter

logger = logging.getLogger(__name__)


def _as_utc(dt: datetime) -> datetime:
    """Normalize datetime to timezone-aware UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class CompanionService:
    """Service handling personal AI companion, mood detection, journeys, and digital twins."""

    @classmethod
    async def get_mood(cls, user_id: str) -> MoodState | None:
        """Fetch active user mood state."""
        db = get_db()
        doc = await db.user_moods.find_one({"user_id": user_id})
        if not doc:
            return None
        return MoodState(**doc)

    @classmethod
    async def set_mood(cls, user_id: str, request: SetMoodRequest) -> MoodState:
        """Update user mood with explicit consent gating."""
        db = get_db()
        now = datetime.now(timezone.utc)

        if not request.consent_given:
            # Privacy: remove stored mood if consent is withdrawn
            await db.user_moods.delete_one({"user_id": user_id})
            return MoodState(
                user_id=user_id,
                mood=request.mood,
                consent_given=False,
                updated_at=now,
            )

        mood_state = MoodState(
            user_id=user_id,
            mood=request.mood,
            intensity=1.0,
            consent_given=True,
            note=request.note,
            updated_at=now,
        )

        await db.user_moods.update_one(
            {"user_id": user_id},
            {"$set": mood_state.model_dump()},
            upsert=True,
        )
        return mood_state

    @classmethod
    async def chat_with_companion(
        cls,
        user_id: str,
        request: CompanionChatRequest,
    ) -> CompanionChatResponse:
        """
        Process personal companion chat turn.
        Executes intent detection, runs local tools when appropriate,
        synthesizes answer via LLMRouter, and records messages.
        """
        db = get_db()
        now = datetime.now(timezone.utc)
        user_text = request.message.strip()

        # 1. Resolve Active Mood
        active_mood = request.mood
        if not active_mood:
            saved_mood = await cls.get_mood(user_id)
            if saved_mood and saved_mood.consent_given:
                active_mood = saved_mood.mood

        # 2. Intent Detection & Tool Execution
        text_lower = user_text.lower()
        tool_reels: list[dict[str, Any]] = []
        tool_actions_taken: list[dict[str, Any]] = []

        # Intent: Search / Recommend reels
        search_triggers = ["find", "search", "show", "recommend", "watch", "reel", "video", "clip", "funny", "relax"]
        if any(trig in text_lower for trig in search_triggers):
            mood_query = active_mood.value if active_mood else None
            # Extract keywords
            clean_query = " ".join([w for w in text_lower.split() if len(w) >= 3 and w not in search_triggers])
            tool_reels = await tool_search_reels(query=clean_query, mood=mood_query, limit=3)
            tool_actions_taken.append({
                "tool": "search_reels",
                "query": clean_query,
                "mood": mood_query,
                "found_count": len(tool_reels),
            })

        # 3. Formulate Prompt for LLMRouter
        system_prompt = (
            "You are the VidSnap AI Entertainment Companion — a warm, witty, and perceptive personal media co-pilot. "
            "Help the viewer discover great reels, tailor their viewing to their current mood, "
            "and organize their daily watch time. Keep answers concise, conversational, and energetic."
        )

        mood_context = f"User's active mood vibe: {active_mood.value}." if active_mood else "No specific mood set."
        tool_context = ""
        if tool_reels:
            reel_titles = ", ".join([f"'{r['title']}' by {r['creator_name']}" for r in tool_reels])
            tool_context = (
                f"\nYou found these matching reels in the catalog: {reel_titles}. "
                "Present them enthusiastically to the user."
            )

        prompt = f"{mood_context}{tool_context}\n\nUser: {user_text}\n\nCompanion response:"

        ai_reply = await LLMRouter.generate_completion(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=200,
            temperature=0.7,
        )

        # 4. Save User and Assistant Messages
        u_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        user_msg = CompanionMessage(
            message_id=u_msg_id,
            role="user",
            content=user_text,
            timestamp=now,
        )
        await db.companion_messages.insert_one({"user_id": user_id, **user_msg.model_dump()})

        a_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        asst_msg = CompanionMessage(
            message_id=a_msg_id,
            role="assistant",
            content=ai_reply,
            tool_calls=tool_actions_taken if tool_actions_taken else None,
            reels=tool_reels if tool_reels else None,
            timestamp=datetime.now(timezone.utc),
        )
        await db.companion_messages.insert_one({"user_id": user_id, **asst_msg.model_dump()})

        # 5. Suggested Follow-Up Actions
        suggested_actions = [
            "⚡ Boost My Energy",
            "🌙 5-Minute Chill Journey",
            "🎬 Create a Smart Playlist",
            "😂 Show Me Something Funny",
        ]

        return CompanionChatResponse(
            message=asst_msg,
            suggested_actions=suggested_actions,
            active_mood=active_mood,
        )

    @classmethod
    async def get_chat_history(cls, user_id: str, limit: int = 30) -> list[CompanionMessage]:
        """Retrieve recent companion conversation history ordered chronologically."""
        db = get_db()
        cursor = db.companion_messages.find({"user_id": user_id}).sort([("timestamp", -1), ("_id", -1)]).limit(limit)
        messages: list[CompanionMessage] = []
        async for doc in cursor:
            doc.pop("user_id", None)
            doc.pop("_id", None)
            messages.append(CompanionMessage(**doc))
        messages.reverse()
        return messages

    @classmethod
    async def clear_chat_history(cls, user_id: str) -> None:
        """Purge companion messages for privacy and user control."""
        db = get_db()
        await db.companion_messages.delete_many({"user_id": user_id})

    @classmethod
    async def create_dynamic_playlist(
        cls,
        user_id: str,
        request: CreateAIPlaylistRequest,
    ) -> AIPlaylist:
        """Generate and save a dynamic AI playlist."""
        db = get_db()
        now = datetime.now(timezone.utc)
        mood_str = request.mood.value if request.mood else None

        playlist_data = await tool_create_playlist(
            user_id=user_id,
            title=request.title,
            description=request.prompt or f"Curated for {mood_str or 'entertainment'}",
            mood=mood_str,
            target_duration_minutes=request.target_duration_minutes,
        )
        playlist_data["created_at"] = now

        playlist = AIPlaylist(**playlist_data)
        await db.ai_playlists.insert_one(playlist.model_dump())
        return playlist

    @classmethod
    async def list_user_playlists(cls, user_id: str) -> list[AIPlaylist]:
        """Fetch all smart playlists created by or for user."""
        db = get_db()
        cursor = db.ai_playlists.find({"user_id": user_id}).sort("created_at", -1).limit(20)
        playlists: list[AIPlaylist] = []
        async for doc in cursor:
            doc.pop("_id", None)
            playlists.append(AIPlaylist(**doc))
        return playlists

    @classmethod
    def get_entertainment_journeys(cls, user_id: str) -> list[EntertainmentJourney]:
        """Return structured entertainment journey options."""
        return [
            tool_curate_journey("morning_spark", duration_minutes=10, mood=MoodType.ENERGIZED),
            tool_curate_journey("focus_flow", duration_minutes=15, mood=MoodType.FOCUSED),
            tool_curate_journey("laugh_break", duration_minutes=5, mood=MoodType.HUMOROUS),
            tool_curate_journey("evening_unwind", duration_minutes=12, mood=MoodType.CHILL),
        ]

    @classmethod
    def get_journey_by_type(cls, journey_type: str, duration: int = 10) -> EntertainmentJourney:
        """Generate journey for a specific journey identifier."""
        return tool_curate_journey(journey_type, duration_minutes=duration)

    @classmethod
    async def get_daily_plan(cls, user_id: str, target_date: str | None = None) -> DailyPlan:
        """Fetch or generate default structured entertainment plan for the day."""
        db = get_db()
        today_str = target_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

        doc = await db.daily_plans.find_one({"user_id": user_id, "date": today_str})
        if doc:
            doc.pop("_id", None)
            return DailyPlan(**doc)

        # Generate default healthy daily slots
        default_slots = [
            DailyPlanSlot(
                slot_id="slot_morning",
                name="Morning Spark ⚡",
                time_of_day="morning",
                duration_minutes=10,
                journey_id="morning_spark",
            ),
            DailyPlanSlot(
                slot_id="slot_lunch",
                name="Midday Laugh Break 😂",
                time_of_day="afternoon",
                duration_minutes=5,
                journey_id="laugh_break",
            ),
            DailyPlanSlot(
                slot_id="slot_evening",
                name="Evening Chill & Lo-Fi 🌙",
                time_of_day="evening",
                duration_minutes=15,
                journey_id="evening_unwind",
            ),
        ]

        plan = DailyPlan(
            user_id=user_id,
            date=today_str,
            slots=default_slots,
            updated_at=datetime.now(timezone.utc),
        )
        await db.daily_plans.update_one(
            {"user_id": user_id, "date": today_str},
            {"$set": plan.model_dump()},
            upsert=True,
        )
        return plan

    @classmethod
    async def update_daily_plan(cls, user_id: str, request: UpdateDailyPlanRequest) -> DailyPlan:
        """Update slots for user's daily entertainment plan."""
        db = get_db()
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        now = datetime.now(timezone.utc)

        plan = DailyPlan(
            user_id=user_id,
            date=today_str,
            slots=request.slots,
            updated_at=now,
        )

        await db.daily_plans.update_one(
            {"user_id": user_id, "date": today_str},
            {"$set": plan.model_dump()},
            upsert=True,
        )
        return plan

    @classmethod
    async def get_digital_twin(cls, creator_id: str) -> DigitalTwinProfile:
        """Fetch creator's digital twin profile, ensuring AI provenance label is enabled."""
        db = get_db()
        doc = await db.digital_twins.find_one({"creator_id": creator_id, "is_active": True})
        if doc:
            doc.pop("_id", None)
            return DigitalTwinProfile(**doc)

        # Default twin template
        return DigitalTwinProfile(
            creator_id=creator_id,
            creator_name="Creator",
            persona_name="AI Twin",
            bio="Interactive digital twin for community discussion and video highlights.",
            is_ai_labeled=True,
        )

    @classmethod
    async def update_digital_twin(
        cls,
        creator_id: str,
        creator_name: str,
        profile: DigitalTwinProfile,
    ) -> DigitalTwinProfile:
        """Save digital twin profile, strictly enforcing is_ai_labeled=True for compliance."""
        db = get_db()
        now = datetime.now(timezone.utc)

        # Enforce compliance
        profile.creator_id = creator_id
        profile.creator_name = creator_name
        profile.is_ai_labeled = True
        profile.updated_at = now

        await db.digital_twins.update_one(
            {"creator_id": creator_id},
            {"$set": profile.model_dump()},
            upsert=True,
        )
        return profile

    @classmethod
    async def interact_with_digital_twin(
        cls,
        creator_id: str,
        request: DigitalTwinInteractRequest,
    ) -> DigitalTwinInteractResponse:
        """Interact with a creator's public digital twin with AI disclosure."""
        twin = await cls.get_digital_twin(creator_id)

        system_prompt = (
            f"You are '{twin.persona_name}', the AI Digital Twin of creator '{twin.creator_name}'. "
            f"Creator bio: {twin.bio}. Voice tone: {twin.voice_tone}. "
            "You MUST speak as this persona, answering viewer questions politely, concisely, and engagingly. "
            "Always be transparent that you are an AI assistant representing the creator."
        )

        reply = await LLMRouter.generate_completion(
            prompt=f"Viewer asks: '{request.message.strip()}'\n\nPersona response:",
            system_prompt=system_prompt,
            max_tokens=150,
            temperature=0.7,
        )

        return DigitalTwinInteractResponse(
            reply=reply,
            creator_id=creator_id,
            persona_name=twin.persona_name,
            is_ai_labeled=True,
            timestamp=datetime.now(timezone.utc),
        )
