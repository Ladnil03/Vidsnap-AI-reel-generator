"""
AI Companion Tool Calling Engine.
Provides local deterministic tool handlers for reel discovery, mood filtering,
smart playlist assembly, and journey curation without heavyweight agent dependencies.
"""

import logging
import re
import uuid
from typing import Any

from backend.app.ai_companion.models import (
    EntertainmentJourney,
    JourneyStep,
    MoodType,
)
from backend.app.core.database import get_db

logger = logging.getLogger(__name__)

# Mood-to-Tag Affinity Mapping
MOOD_TAG_MAP: dict[str, list[str]] = {
    "energized": ["workout", "fitness", "dance", "hype", "sports", "energy", "motivation", "music"],
    "chill": ["relax", "nature", "lofi", "ambient", "peaceful", "sunset", "travel", "meditation"],
    "focused": ["coding", "productivity", "study", "tech", "focus", "science", "tutorial", "dev"],
    "curious": ["science", "history", "facts", "space", "documentary", "mystery", "learning", "animals"],
    "melancholic": ["rain", "poetry", "emotional", "acoustic", "nostalgia", "night", "deep"],
    "inspired": ["motivation", "art", "creativity", "success", "design", "craft", "philosophy"],
    "humorous": ["comedy", "funny", "memes", "jokes", "standup", "humor", "fails", "pets"],
}


async def tool_search_reels(
    query: str | None = None,
    mood: str | None = None,
    limit: int = 5,
    current_user_id: str | None = None,
) -> list[dict[str, Any]]:
    """Search for relevant published native reels and external discovery items."""
    db = get_db()
    limit = max(1, min(limit, 10))
    filters: list[dict[str, Any]] = []

    # 1. Text Query Filter (keyword tokenized regex)
    if query and query.strip():
        words = [re.escape(w.strip()) for w in query.strip().split() if len(w.strip()) >= 3]
        if words:
            word_pattern = "|".join(words)
            filters.append({
                "$or": [
                    {"title": {"$regex": word_pattern, "$options": "i"}},
                    {"description": {"$regex": word_pattern, "$options": "i"}},
                    {"tags": {"$in": [w.lower() for w in words]}},
                ]
            })

    # 2. Mood Affinity Filter
    if mood and mood.lower() in MOOD_TAG_MAP:
        tags = MOOD_TAG_MAP[mood.lower()]
        filters.append({"tags": {"$in": tags}})

    base_conditions: list[dict[str, Any]] = [
        {"status": "published"},
        {"moderation_status": {"$in": ["approved", None]}},
        {"deleted": {"$ne": True}},
    ]
    if current_user_id:
        base_conditions.append({
            "$or": [
                {"visibility": {"$in": ["public", None]}},
                {"user_id": current_user_id},
            ]
        })
    else:
        base_conditions.append({"visibility": {"$in": ["public", None]}})

    if filters:
        base_conditions.extend(filters)

    mongo_query: dict[str, Any] = {"$and": base_conditions}

    results: list[dict[str, Any]] = []
    cursor = db.videos.find(mongo_query).sort("views_count", -1).limit(limit)
    async for doc in cursor:
        results.append({
            "reel_id": doc.get("video_id", str(doc.get("_id"))),
            "title": doc.get("title", "Untitled Reel"),
            "creator_name": doc.get("creator_name", "VidSnap Creator"),
            "media_url": doc.get("playback_url") or doc.get("source_url") or "",
            "thumbnail_url": doc.get("thumbnail_url"),
            "duration_seconds": doc.get("duration_seconds", 30),
            "tags": doc.get("tags", []),
        })

    # Fallback to external videos if native database has few items
    if len(results) < limit:
        ext_cursor = db.external_videos.find({}).sort("view_count", -1).limit(limit - len(results))
        async for ext_doc in ext_cursor:
            results.append({
                "reel_id": ext_doc.get("item_id", str(ext_doc.get("_id"))),
                "title": ext_doc.get("title", "Discovery Video"),
                "creator_name": ext_doc.get("author_name", "Discovery Partner"),
                "media_url": ext_doc.get("embed_url") or ext_doc.get("player_url") or "",
                "thumbnail_url": ext_doc.get("thumbnail_url"),
                "duration_seconds": ext_doc.get("duration", 30),
                "tags": ext_doc.get("tags", []),
            })

    return results


async def tool_create_playlist(
    user_id: str,
    title: str,
    description: str = "",
    mood: str | None = None,
    target_duration_minutes: int = 10,
    reel_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Assemble and persist a smart AI playlist."""
    db = get_db()
    playlist_id = f"pl_{uuid.uuid4().hex[:10]}"

    selected_reels: list[dict[str, Any]] = []
    if not reel_ids:
        # Auto-populate reels by mood
        found = await tool_search_reels(mood=mood, limit=6, current_user_id=user_id)
        selected_reels = found
        reel_ids = [r["reel_id"] for r in found]
    else:
        # Look up requested reels (enforcing visibility and moderation status)
        cursor = db.videos.find({
            "video_id": {"$in": reel_ids},
            "status": "published",
            "moderation_status": {"$in": ["approved", None]},
            "deleted": {"$ne": True},
            "$or": [
                {"visibility": {"$in": ["public", None]}},
                {"user_id": user_id},
            ],
        })
        async for doc in cursor:
            selected_reels.append({
                "reel_id": doc.get("video_id"),
                "title": doc.get("title"),
                "creator_name": doc.get("creator_name"),
                "media_url": doc.get("playback_url"),
                "thumbnail_url": doc.get("thumbnail_url"),
                "duration_seconds": doc.get("duration_seconds", 30),
            })

    playlist_doc = {
        "playlist_id": playlist_id,
        "user_id": user_id,
        "title": title.strip(),
        "description": description.strip() or f"AI Curated playlist for {mood or 'entertainment'}",
        "mood": mood,
        "target_duration_minutes": target_duration_minutes,
        "reel_ids": reel_ids,
        "reels": selected_reels,
        "created_at": None,  # Handled by service
    }

    return playlist_doc


def tool_curate_journey(
    journey_type: str,
    duration_minutes: int = 10,
    mood: MoodType = MoodType.ENERGIZED,
) -> EntertainmentJourney:
    """Generate structured entertainment journey blueprint."""
    journey_blueprints = {
        "morning_spark": {
            "title": "Morning Spark ⚡",
            "description": "High-energy motivation and quick breakthroughs to ignite your day.",
            "mood": MoodType.ENERGIZED,
            "steps": [
                JourneyStep(
                    step_number=1,
                    title="Wake-Up Hype 🌅",
                    description="Energizing movement and upbeat vibes.",
                    duration_seconds=60,
                ),
                JourneyStep(
                    step_number=2,
                    title="Daily Innovation 🚀",
                    description="A 60-second breakthrough in tech and science.",
                    duration_seconds=60,
                ),
                JourneyStep(
                    step_number=3,
                    title="Mindset Catalyst 💡",
                    description="One actionable insight for personal excellence.",
                    duration_seconds=60,
                ),
            ],
        },
        "focus_flow": {
            "title": "Deep Focus Flow 🧠",
            "description": "Minimal distraction, ambient visuals, and smart productivity hacks.",
            "mood": MoodType.FOCUSED,
            "steps": [
                JourneyStep(
                    step_number=1,
                    title="Mental Cleansing 🧘",
                    description="Calm ambient rhythms to center your attention.",
                    duration_seconds=90,
                ),
                JourneyStep(
                    step_number=2,
                    title="Deep Craft Demonstration ⚙️",
                    description="Satisfying build or clean coding breakdown.",
                    duration_seconds=90,
                ),
            ],
        },
        "laugh_break": {
            "title": "Laugh Break & Chuckles 😂",
            "description": "Instant mood lifter with viral comedy and relatable humor.",
            "mood": MoodType.HUMOROUS,
            "steps": [
                JourneyStep(
                    step_number=1,
                    title="Warmup Giggles 🐱",
                    description="Wholesome pet chaos and timing comedy.",
                    duration_seconds=45,
                ),
                JourneyStep(
                    step_number=2,
                    title="Punchline Rapidfire 🎤",
                    description="Top stand-up clips and clever skits.",
                    duration_seconds=60,
                ),
            ],
        },
        "evening_unwind": {
            "title": "Evening Unwind 🌙",
            "description": "Gentle transitions, soothing visuals, and mindful reflection.",
            "mood": MoodType.CHILL,
            "steps": [
                JourneyStep(
                    step_number=1,
                    title="Twilight Landscapes 🌄",
                    description="Cinematic drone views of oceans and mountains.",
                    duration_seconds=90,
                ),
                JourneyStep(
                    step_number=2,
                    title="Soft Lo-Fi Cadence ☕",
                    description="Relaxing audio journey to slow down your brainwaves.",
                    duration_seconds=90,
                ),
            ],
        },
    }

    blueprint = journey_blueprints.get(journey_type)
    if not blueprint:
        # Default journey
        blueprint = journey_blueprints["morning_spark"]

    return EntertainmentJourney(
        journey_id=f"journey_{journey_type}_{uuid.uuid4().hex[:8]}",
        title=blueprint["title"],
        description=blueprint["description"],
        journey_type=journey_type,
        mood=blueprint["mood"],
        total_duration_minutes=duration_minutes,
        steps=blueprint["steps"],
    )
