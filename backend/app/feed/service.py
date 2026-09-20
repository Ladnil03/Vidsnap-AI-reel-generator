"""
Universal Feed Service Layer.
Aggregates videos across Trending (popularity decay heuristic), Following, Friends,
Communities, Continue Watching (cross-device sync), and Saved bookmarks.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.content.models import ContentStatus, ContentVisibility, VideoResponse
from backend.app.content.service import ContentService
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.redis import get_redis
from backend.app.feed.models import FeedResponse, FeedTab, WatchProgressRequest, WatchProgressResponse

logger = logging.getLogger(__name__)


class FeedService:
    """Core feed engine serving multi-tab algorithmic and social streams."""

    def __init__(self, db: AsyncIOMotorDatabase | None = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is not None:
            return self._db
        return get_db()

    async def get_feed(
        self,
        tab: FeedTab = FeedTab.TRENDING,
        user_id: str | None = None,
        cursor: str | None = None,
        limit: int = 10,
    ) -> FeedResponse:
        """Fetch videos for a specific feed tab."""
        limit = min(limit, 50)
        docs: list[dict[str, Any]] = []

        if tab == FeedTab.TRENDING:
            docs = await self._get_trending_videos(limit=limit)
        elif tab == FeedTab.FOLLOWING:
            docs = await self._get_following_videos(user_id=user_id, limit=limit)
        elif tab == FeedTab.FRIENDS:
            docs = await self._get_friends_videos(user_id=user_id, limit=limit)
        elif tab == FeedTab.COMMUNITIES:
            docs = await self._get_community_videos(user_id=user_id, limit=limit)
        elif tab == FeedTab.CONTINUE_WATCHING:
            docs = await self._get_continue_watching_videos(user_id=user_id, limit=limit)
        elif tab == FeedTab.SAVED:
            docs = await self._get_saved_videos(user_id=user_id, limit=limit)

        # Bulk check user engagement (liked / saved) to prevent N+1 queries
        liked_ids: set[str] = set()
        saved_ids: set[str] = set()
        if user_id and docs:
            video_ids = [d["video_id"] for d in docs]
            liked_cursor = self.db["video_likes"].find({"user_id": user_id, "video_id": {"$in": video_ids}})
            for item in await liked_cursor.to_list(length=len(video_ids)):
                liked_ids.add(item["video_id"])

            saved_cursor = self.db["video_saves"].find({"user_id": user_id, "video_id": {"$in": video_ids}})
            for item in await saved_cursor.to_list(length=len(video_ids)):
                saved_ids.add(item["video_id"])

        items: list[VideoResponse] = [
            ContentService._doc_to_response(
                d,
                has_liked=d["video_id"] in liked_ids,
                has_saved=d["video_id"] in saved_ids,
            )
            for d in docs
        ]

        return FeedResponse(
            tab=tab,
            items=items,
            total=len(items),
            has_more=len(items) >= limit,
            next_cursor=None,
        )

    async def _get_trending_videos(self, limit: int) -> list[dict[str, Any]]:
        """
        Calculates score for public videos:
        score = (views*1 + likes*3 + comments*5 + saves*4) / ((age_in_hours + 2)^1.5)
        """
        cursor = self.db["videos"].find({
            "status": ContentStatus.PUBLISHED.value,
            "visibility": ContentVisibility.PUBLIC.value,
            "deleted": {"$ne": True},
        }).sort("created_at", -1).limit(limit * 3)

        candidates = await cursor.to_list(length=limit * 3)
        if not candidates:
            return []

        now = datetime.now(timezone.utc)

        def score_doc(doc: dict[str, Any]) -> float:
            created_at = doc.get("created_at")
            if created_at and created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            hours_old = (now - created_at).total_seconds() / 3600.0 if created_at else 72.0

            views = doc.get("views_count", 0)
            likes = doc.get("likes_count", 0)
            comments = doc.get("comments_count", 0)
            saves = doc.get("saves_count", 0)

            engagement = (views * 1.0) + (likes * 3.0) + (comments * 5.0) + (saves * 4.0)
            gravity = (max(0.0, hours_old) + 2.0) ** 1.5
            return engagement / gravity

        candidates.sort(key=score_doc, reverse=True)
        return candidates[:limit]

    async def _get_following_videos(self, user_id: str | None, limit: int) -> list[dict[str, Any]]:
        """Fetch published videos from creators followed by user_id."""
        if not user_id:
            return []

        following_cursor = self.db["social_follows"].find({"follower_id": user_id})
        following_docs = await following_cursor.to_list(length=1000)
        following_ids = [d["following_id"] for d in following_docs]

        if not following_ids:
            return []

        cursor = self.db["videos"].find({
            "user_id": {"$in": following_ids},
            "status": ContentStatus.PUBLISHED.value,
            "visibility": {"$in": [ContentVisibility.PUBLIC.value, ContentVisibility.FOLLOWERS_ONLY.value]},
            "deleted": {"$ne": True},
        }).sort("created_at", -1).limit(limit)

        return await cursor.to_list(length=limit)

    async def _get_friends_videos(self, user_id: str | None, limit: int) -> list[dict[str, Any]]:
        """Fetch published videos from mutual friends."""
        if not user_id:
            return []

        # Find following IDs
        following_docs = await self.db["social_follows"].find({"follower_id": user_id}).to_list(length=1000)
        following_ids = {d["following_id"] for d in following_docs}

        if not following_ids:
            return []

        # Find mutual followers
        mutual_docs = await self.db["social_follows"].find({
            "follower_id": {"$in": list(following_ids)},
            "following_id": user_id,
        }).to_list(length=1000)
        friend_ids = [d["follower_id"] for d in mutual_docs]

        if not friend_ids:
            return []

        cursor = self.db["videos"].find({
            "user_id": {"$in": friend_ids},
            "status": ContentStatus.PUBLISHED.value,
            "visibility": {"$in": [ContentVisibility.PUBLIC.value, ContentVisibility.FOLLOWERS_ONLY.value]},
            "deleted": {"$ne": True},
        }).sort("created_at", -1).limit(limit)

        return await cursor.to_list(length=limit)

    async def _get_community_videos(self, user_id: str | None, limit: int) -> list[dict[str, Any]]:
        """Fetch videos from communities joined by user_id."""
        if not user_id:
            return []

        memberships = await self.db["community_members"].find({"user_id": user_id}).to_list(length=200)
        if not memberships:
            return []

        c_ids = [m["community_id"] for m in memberships]
        community_docs = await self.db["communities"].find({"community_id": {"$in": c_ids}}).to_list(length=200)
        slugs = [c["slug"] for c in community_docs]

        cursor = self.db["videos"].find({
            "status": ContentStatus.PUBLISHED.value,
            "deleted": {"$ne": True},
            "$or": [
                {"community_id": {"$in": c_ids}},
                {"hashtags": {"$in": slugs}},
            ],
        }).sort("created_at", -1).limit(limit)

        return await cursor.to_list(length=limit)

    async def _get_continue_watching_videos(self, user_id: str | None, limit: int) -> list[dict[str, Any]]:
        """Fetch unfinished videos with watch progress (5% - 90%)."""
        if not user_id:
            return []

        progress_cursor = self.db["watch_progress"].find({
            "user_id": user_id,
            "completed": False,
            "percentage": {"$gte": 5.0, "$lt": 90.0},
        }).sort("updated_at", -1).limit(limit)

        progress_docs = await progress_cursor.to_list(length=limit)
        if not progress_docs:
            return []

        video_ids = [p["video_id"] for p in progress_docs]
        cursor = self.db["videos"].find({
            "video_id": {"$in": video_ids},
            "deleted": {"$ne": True},
        })
        v_docs = await cursor.to_list(length=len(video_ids))
        v_map = {v["video_id"]: v for v in v_docs}

        # Maintain sort order from watch_progress
        return [v_map[vid] for vid in video_ids if vid in v_map]

    async def _get_saved_videos(self, user_id: str | None, limit: int) -> list[dict[str, Any]]:
        """Fetch saved/bookmarked videos."""
        if not user_id:
            return []

        saves_cursor = self.db["video_saves"].find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        saves_docs = await saves_cursor.to_list(length=limit)
        if not saves_docs:
            return []

        video_ids = [s["video_id"] for s in saves_docs]
        cursor = self.db["videos"].find({
            "video_id": {"$in": video_ids},
            "deleted": {"$ne": True},
        })
        v_docs = await cursor.to_list(length=len(video_ids))
        v_map = {v["video_id"]: v for v in v_docs}

        return [v_map[vid] for vid in video_ids if vid in v_map]

    # --------------------------------------------------------------------------
    # Watch Progress Synchronization
    # --------------------------------------------------------------------------

    async def record_watch_progress(
        self,
        user_id: str,
        req: WatchProgressRequest,
    ) -> WatchProgressResponse:
        """Upsert playback state and atomically update views with anti-spam cooldown."""
        percentage = min(100.0, max(0.0, (req.watched_seconds / max(0.1, req.total_seconds)) * 100.0))
        completed = req.completed or percentage >= 95.0
        now = datetime.now(timezone.utc)

        await self.db["watch_progress"].update_one(
            {"user_id": user_id, "video_id": req.video_id},
            {
                "$set": {
                    "watched_seconds": req.watched_seconds,
                    "total_seconds": req.total_seconds,
                    "percentage": round(percentage, 1),
                    "completed": completed,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
        )

        # Free-tier anti-spam debounce for view counts
        if req.watched_seconds >= 3.0 or completed:
            should_increment_view = True
            try:
                redis_client = get_redis()
                if redis_client:
                    key = f"view_cooldown:{req.video_id}:{user_id}"
                    # Set key only if not already set (NX) with expiry
                    acquired = await redis_client.set(key, "1", nx=True, ex=settings.view_cooldown_seconds)
                    should_increment_view = bool(acquired)
            except Exception as e:
                logger.debug("Redis view cooldown check skipped: %s", e)

            if should_increment_view:
                await self.db["videos"].update_one(
                    {"video_id": req.video_id},
                    {"$inc": {"views_count": 1}},
                )

        return WatchProgressResponse(
            video_id=req.video_id,
            watched_seconds=req.watched_seconds,
            total_seconds=req.total_seconds,
            percentage=round(percentage, 1),
            completed=completed,
            updated_at=now,
        )

    async def get_watch_progress(self, user_id: str, video_id: str) -> WatchProgressResponse | None:
        """Fetch cross-device resume position for a video."""
        doc = await self.db["watch_progress"].find_one({"user_id": user_id, "video_id": video_id})
        if not doc:
            return None

        return WatchProgressResponse(
            video_id=doc["video_id"],
            watched_seconds=doc.get("watched_seconds", 0.0),
            total_seconds=doc.get("total_seconds", 0.0),
            percentage=doc.get("percentage", 0.0),
            completed=doc.get("completed", False),
            updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
        )
