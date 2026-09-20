"""
Recommendation Engine Service Layer.
Executes a two-stage recommendation pipeline on CPU:
- Stage 1: Multi-channel candidate generation (Vector ANN, Social Graph, Category Affinity, Trending).
- Stage 2: Multi-objective ranking heuristic with explainability tag generation.
- Stage 3: Diversity and fatigue-prevention reranking.
- Stage 4: Anti-doomscroll digital wellbeing chapter card injection.
- Online Learning: Updates user preference vectors via Exponential Moving Average (EMA).
"""

import logging
import math
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.ai_companion.tools import MOOD_TAG_MAP
from backend.app.content.models import ContentStatus, ContentVisibility
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.discovery.embeddings import get_embedding_service
from backend.app.discovery.models import DiscoverySource, PlayerType
from backend.app.recsys.models import (
    InteractionEventRequest,
    InteractionType,
    RecommendationFeedResponse,
    RecommendationItem,
    UserPreferencesRequest,
    UserVectorResponse,
    WellbeingCard,
)

logger = logging.getLogger(__name__)


class RecSysService:
    """Core recommendation engine and online user profile learning service."""

    def __init__(self, db: AsyncIOMotorDatabase | None = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is not None:
            return self._db
        return get_db()

    async def get_recommendations(
        self,
        user_id: str | None = None,
        session_reel_count: int = 0,
        limit: int = 10,
        mood: str | None = None,
    ) -> RecommendationFeedResponse:
        """
        Generate personalized feed stream with transparent explainability tags
        and anti-doomscroll wellbeing card injection.
        """
        limit = min(limit, 30)
        items: list[RecommendationItem] = []

        # ----------------------------------------------------------------------
        # Stage 0: Anti-Doomscroll Wellbeing Chapter Card
        # ----------------------------------------------------------------------
        interval = max(5, settings.wellbeing_card_interval)
        if session_reel_count > 0 and (session_reel_count % interval == 0):
            wellbeing_card = WellbeingCard(
                card_type="wellbeing_break",
                title="Time for a Mindful Breath 🌿",
                message=(
                    f"You've explored {session_reel_count} reels in this session. "
                    "Take a stretch, hydrate, or pause mindfully."
                ),
                reel_count=session_reel_count,
                suggested_action="Take a Break",
            )
            items.append(
                RecommendationItem(
                    id=f"wellbeing_{session_reel_count}",
                    video_id=f"wellbeing_{session_reel_count}",
                    source=DiscoverySource.COMMUNITY,
                    title="Time for a Mindful Breath 🌿",
                    description=wellbeing_card.message,
                    author_name="VidSnap Wellbeing",
                    source_url="/feed",
                    embed_url="",
                    player_type=PlayerType.DIRECT_VIDEO,
                    attribution_text="VidSnap Digital Wellbeing",
                    explainability_tag="🌿 Digital Wellbeing",
                    recommendation_score=10.0,
                    is_wellbeing_card=True,
                    wellbeing_card=wellbeing_card,
                )
            )

        # ----------------------------------------------------------------------
        # Stage 1: Candidate Generation (Multi-Channel)
        # ----------------------------------------------------------------------
        user_vector, top_categories = await self._get_or_init_user_vector(user_id)

        # Exclude items viewed in last 7 days if user is authenticated
        excluded_ids: set[str] = set()
        if user_id:
            interacted_cursor = self.db["interaction_events"].find(
                {"user_id": user_id},
                {"item_id": 1},
            ).limit(200)
            interacted_docs = await interacted_cursor.to_list(length=200)
            excluded_ids = {d["item_id"] for d in interacted_docs}

        # Candidate pool collector: id -> candidate dict
        candidates: dict[str, dict[str, Any]] = {}

        # Channel 1: Native Community Videos (Published & Public)
        native_cursor = self.db["videos"].find({
            "status": ContentStatus.PUBLISHED.value,
            "visibility": ContentVisibility.PUBLIC.value,
            "deleted": {"$ne": True},
        }).sort("created_at", -1).limit(40)
        native_docs = await native_cursor.to_list(length=40)
        for doc in native_docs:
            vid = doc["video_id"]
            if vid not in excluded_ids:
                candidates[vid] = {
                    "raw": doc,
                    "is_native": True,
                    "title": doc.get("title", ""),
                    "description": doc.get("description", ""),
                    "tags": doc.get("hashtags", []),
                    "author_id": doc.get("user_id"),
                    "author_name": doc.get("author_name", "Creator"),
                    "views": doc.get("views_count", 0),
                    "likes": doc.get("likes_count", 0),
                    "comments": doc.get("comments_count", 0),
                    "created_at": doc.get("created_at"),
                    "source": DiscoverySource.COMMUNITY,
                    "embed_url": doc.get("video_url", ""),
                    "player_type": PlayerType.DIRECT_VIDEO,
                    "source_url": f"/feed?video={vid}",
                    "attribution_text": f"Video by {doc.get('author_name', 'Creator')} on VidSnap",
                }

        # Channel 2: Discovered Catalog (YouTube Shorts, Pexels, Pixabay)
        disc_cursor = self.db["discovery_catalog"].find({}).sort("created_at", -1).limit(50)
        disc_docs = await disc_cursor.to_list(length=50)
        for doc in disc_docs:
            item_id = doc["item_id"]
            if item_id not in excluded_ids and item_id not in candidates:
                candidates[item_id] = {
                    "raw": doc,
                    "is_native": False,
                    "title": doc.get("title", ""),
                    "description": doc.get("description", ""),
                    "tags": doc.get("tags", []),
                    "author_id": None,
                    "author_name": doc.get("author_name", "Creator"),
                    "views": doc.get("views_count", 0),
                    "likes": doc.get("likes_count", 0),
                    "comments": 0,
                    "created_at": doc.get("created_at"),
                    "source": DiscoverySource(doc["source"]),
                    "embed_url": doc.get("embed_url", ""),
                    "player_type": PlayerType(doc.get("player_type", "direct_video")),
                    "source_url": doc.get("source_url", ""),
                    "attribution_text": doc.get("attribution_text", ""),
                }

        # Channel 3: Social Following Signals
        followed_user_ids: set[str] = set()
        if user_id:
            follows = await self.db["social_follows"].find({"follower_id": user_id}).to_list(length=200)
            followed_user_ids = {f["following_id"] for f in follows}

        # ----------------------------------------------------------------------
        # Stage 2: Ranking Heuristic & Explainability
        # ----------------------------------------------------------------------
        embedder = get_embedding_service()
        scored_candidates: list[tuple[float, str, dict[str, Any]]] = []
        now = datetime.now(timezone.utc)

        for _c_id, c in candidates.items():
            # 1. Semantic Cosine Score
            item_embedding = c["raw"].get("embedding")
            if not item_embedding:
                # Compute on the fly if missing
                item_text = f"{c['title']} {c['description']} {' '.join(c['tags'])}"
                item_embedding = embedder.embed_text(item_text)

            sim_score = embedder.cosine_similarity(user_vector, item_embedding)
            # Normalize [-1, 1] to [0, 1]
            norm_sim = max(0.0, (sim_score + 1.0) / 2.0)

            # 2. Social Boost
            social_boost = 1.0 if (c["author_id"] and c["author_id"] in followed_user_ids) else 0.0

            # 3. Category / Tag Affinity Boost
            matched_tags = [t for t in c["tags"] if t.lower().strip("#") in top_categories]
            category_score = min(1.0, len(matched_tags) * 0.4)

            # 4. Trending Engagement Decay
            c_created = c.get("created_at")
            if c_created and c_created.tzinfo is None:
                c_created = c_created.replace(tzinfo=timezone.utc)
            hours_old = (now - c_created).total_seconds() / 3600.0 if c_created else 48.0
            engagement = (c["views"] * 1.0) + (c["likes"] * 3.0) + (c["comments"] * 4.0)
            trending_score = math.log1p(engagement) / math.pow(max(0.0, hours_old) + 2.0, 1.2)

            # Combined Multi-Objective Score
            mood_tags = MOOD_TAG_MAP.get(mood.lower(), []) if mood else []
            has_mood_match = any(t.lower().strip("#") in mood_tags for t in c["tags"])
            mood_boost = 1.0 if has_mood_match else 0.0

            if mood:
                final_score = (
                    (0.35 * norm_sim)
                    + (0.20 * social_boost)
                    + (0.15 * category_score)
                    + (0.15 * min(1.0, trending_score))
                    + (0.15 * mood_boost)
                )
            else:
                final_score = (
                    (0.40 * norm_sim)
                    + (0.25 * social_boost)
                    + (0.20 * category_score)
                    + (0.15 * min(1.0, trending_score))
                )

            # Determine Transparent Explainability Tag
            if has_mood_match and mood:
                explain_tag = f"✨ Tuned to your {mood.title()} vibe"
            elif social_boost > 0:
                explain_tag = f"👥 From creators you follow ({c['author_name']})"
            elif matched_tags:
                explain_tag = f"✨ Because you like #{matched_tags[0].lower().strip('#')}"
            elif norm_sim >= 0.65:
                explain_tag = "🎯 Matched to your taste profile"
            elif trending_score > 0.4:
                explain_tag = "🔥 Trending on VidSnap"
            else:
                explain_tag = "🌟 Recommended for you"

            scored_candidates.append((final_score, explain_tag, c))

        # Sort candidate pool by score descending
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        # ----------------------------------------------------------------------
        # Stage 3: Diversity & Anti-Fatigue Reranking
        # Ensure no more than 2 consecutive reels from the same source or author
        # ----------------------------------------------------------------------
        selected: list[tuple[float, str, dict[str, Any]]] = []
        last_source: DiscoverySource | None = None
        last_author: str | None = None
        consecutive_source_count = 0

        for score, tag, candidate in scored_candidates:
            c_source = candidate["source"]
            c_author = candidate["author_name"]

            if c_source == last_source and c_author == last_author and consecutive_source_count >= 2:
                continue  # Skip to provide variety

            selected.append((score, tag, candidate))
            if c_source == last_source:
                consecutive_source_count += 1
            else:
                consecutive_source_count = 1
                last_source = c_source
                last_author = c_author

            if len(selected) >= limit:
                break

        # Check user engagement states (likes/saves) in bulk
        liked_ids: set[str] = set()
        saved_ids: set[str] = set()
        if user_id and selected:
            v_ids = [cand["raw"].get("video_id") or cand["raw"].get("item_id") for _, _, cand in selected]
            v_ids = [vid for vid in v_ids if vid]

            liked_cursor = self.db["video_likes"].find({"user_id": user_id, "video_id": {"$in": v_ids}})
            for like_doc in await liked_cursor.to_list(length=len(v_ids)):
                liked_ids.add(like_doc["video_id"])

            saved_cursor = self.db["video_saves"].find({"user_id": user_id, "video_id": {"$in": v_ids}})
            for save_doc in await saved_cursor.to_list(length=len(v_ids)):
                saved_ids.add(save_doc["video_id"])

        # Format into RecommendationItem objects
        for score, tag, cand in selected:
            raw = cand["raw"]
            item_id = raw.get("video_id") or raw.get("item_id", "rec_item")
            items.append(
                RecommendationItem(
                    id=item_id,
                    video_id=item_id,
                    source=cand["source"],
                    title=cand["title"],
                    description=cand["description"],
                    author_name=cand["author_name"],
                    author_url=raw.get("author_url"),
                    source_url=cand["source_url"],
                    embed_url=cand["embed_url"],
                    player_type=cand["player_type"],
                    thumbnail_url=raw.get("thumbnail_url"),
                    duration=float(raw.get("duration", 0.0)),
                    tags=cand["tags"],
                    attribution_text=cand["attribution_text"],
                    likes_count=cand["likes"],
                    views_count=cand["views"],
                    has_liked=item_id in liked_ids,
                    has_saved=item_id in saved_ids,
                    explainability_tag=tag,
                    recommendation_score=round(score, 4),
                    is_wellbeing_card=False,
                )
            )

        return RecommendationFeedResponse(
            items=items,
            total=len(items),
            session_reel_count=session_reel_count + len(items),
            has_more=len(items) >= limit,
        )

    # --------------------------------------------------------------------------
    # Online User Vector Updating & Interaction Tracking
    # --------------------------------------------------------------------------

    async def record_interaction(
        self,
        user_id: str | None,
        req: InteractionEventRequest,
    ) -> bool:
        """
        Log interaction event with 15-day TTL index and update user taste vector online.
        Uses Exponential Moving Average (EMA) on positive engagement.
        """
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": user_id or "anonymous",
            "item_id": req.item_id,
            "source": req.source.value,
            "interaction_type": req.interaction_type.value,
            "watched_seconds": req.watched_seconds,
            "total_seconds": req.total_seconds,
            "created_at": now,
        }

        # 1. Log event (auto-expires via 15-day TTL index on created_at)
        await self.db["interaction_events"].insert_one(doc)

        # 2. Check if interaction is positive for taste learning
        is_positive = False
        if req.interaction_type in (InteractionType.LIKE, InteractionType.SAVE, InteractionType.COMPLETE):
            is_positive = True
        elif req.interaction_type == InteractionType.VIEW:
            if req.total_seconds > 0 and (req.watched_seconds / req.total_seconds) >= 0.5:
                is_positive = True

        if is_positive and user_id:
            await self._update_user_vector_online(user_id, req.item_id)

        return True

    async def get_user_preferences(self, user_id: str) -> UserVectorResponse:
        """Fetch current taste vector profile and top interest categories."""
        doc = await self.db["user_vectors"].find_one({"user_id": user_id})
        top_cats = doc.get("top_categories", ["tech", "comedy", "nature"]) if doc else ["tech", "comedy", "nature"]
        count = doc.get("interaction_count", 0) if doc else 0
        updated = doc.get("updated_at", datetime.now(timezone.utc)) if doc else datetime.now(timezone.utc)

        return UserVectorResponse(
            user_id=user_id,
            top_categories=top_cats,
            interaction_count=count,
            updated_at=updated,
        )

    async def set_user_preferences(self, user_id: str, req: UserPreferencesRequest) -> UserVectorResponse:
        """Explicitly select category preferences to seed the recommendation vector."""
        embedder = get_embedding_service()
        categories_text = " ".join(req.preferred_categories)
        vector = embedder.embed_text(categories_text)
        now = datetime.now(timezone.utc)

        await self.db["user_vectors"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "vector": vector,
                    "top_categories": [c.lower().strip() for c in req.preferred_categories],
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "interaction_count": 0,
                    "created_at": now,
                },
            },
            upsert=True,
        )

        return UserVectorResponse(
            user_id=user_id,
            top_categories=req.preferred_categories,
            interaction_count=0,
            updated_at=now,
        )

    # --------------------------------------------------------------------------
    # Helper Methods
    # --------------------------------------------------------------------------

    async def _get_or_init_user_vector(self, user_id: str | None) -> tuple[list[float], list[str]]:
        """Retrieve or initialize normalized user taste vector and top tags."""
        embedder = get_embedding_service()
        if not user_id:
            # Cold start generic seed vector
            return embedder.embed_text("tech comedy entertainment music lifestyle"), ["tech", "comedy", "entertainment"]

        doc = await self.db["user_vectors"].find_one({"user_id": user_id})
        if doc and doc.get("vector"):
            return doc["vector"], doc.get("top_categories", ["tech", "comedy"])

        # Initialize fresh user vector
        initial_vector = embedder.embed_text("tech entertainment humor creative")
        top_cats = ["tech", "entertainment"]
        now = datetime.now(timezone.utc)

        await self.db["user_vectors"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "vector": initial_vector,
                    "top_categories": top_cats,
                    "interaction_count": 0,
                    "updated_at": now,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        return initial_vector, top_cats

    async def _update_user_vector_online(self, user_id: str, item_id: str) -> None:
        """
        Online EMA vector update:
        u_new = normalize((1 - alpha) * u_old + alpha * v_item) with alpha = 0.20
        """
        # Find item embedding
        target_doc = await self.db["discovery_catalog"].find_one({"item_id": item_id})
        if not target_doc:
            target_doc = await self.db["videos"].find_one({"video_id": item_id})

        if not target_doc:
            return

        embedder = get_embedding_service()
        item_vector = target_doc.get("embedding")
        if not item_vector:
            tags = target_doc.get("tags") or target_doc.get("hashtags") or []
            item_text = f"{target_doc.get('title', '')} {' '.join(tags)}"
            item_vector = embedder.embed_text(item_text)

        user_doc = await self.db["user_vectors"].find_one({"user_id": user_id})
        if not user_doc or not user_doc.get("vector"):
            user_vector, top_cats = await self._get_or_init_user_vector(user_id)
        else:
            user_vector = user_doc["vector"]
            top_cats = user_doc.get("top_categories", [])

        # Exponential Moving Average update
        alpha = 0.20
        new_vector = [((1.0 - alpha) * u) + (alpha * v) for u, v in zip(user_vector, item_vector, strict=False)]

        # Re-normalize to unit length
        norm_sq = sum(x * x for x in new_vector)
        if norm_sq > 1e-12:
            norm = math.sqrt(norm_sq)
            new_vector = [round(x / norm, 6) for x in new_vector]

        # Extract and update top category tags
        item_tags = target_doc.get("tags") or target_doc.get("hashtags") or []
        for t in item_tags:
            tag_clean = t.lower().strip("#")
            if tag_clean and tag_clean not in top_cats and len(top_cats) < 8:
                top_cats.append(tag_clean)

        await self.db["user_vectors"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "vector": new_vector,
                    "top_categories": top_cats,
                    "updated_at": datetime.now(timezone.utc),
                },
                "$inc": {"interaction_count": 1},
            },
        )
