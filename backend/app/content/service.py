"""
Content Service: Video Creation, Publishing, Scheduling, Drafts, and Engagement.
Handles atomic likes/saves counters, comments, and retention cleanup.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status

from backend.app.content.models import (
    CommentResponse,
    ContentStatus,
    ContentVisibility,
    CreateVideoRequest,
    LikeResponse,
    SaveResponse,
    UpdateVideoRequest,
    VideoResponse,
)
from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.core.database import get_db

logger = logging.getLogger(__name__)


class ContentService:
    """Service orchestrating video posts, drafts, scheduling, and user interactions."""

    @staticmethod
    def _doc_to_response(doc: dict[str, Any], has_liked: bool = False, has_saved: bool = False) -> VideoResponse:
        """Helper to transform MongoDB document into VideoResponse."""
        storage = get_storage_adapter()
        video_url = doc.get("video_url")
        if not video_url and doc.get("video_key"):
            video_url = storage.get_public_url(doc["video_key"])

        thumbnail_url = doc.get("thumbnail_url")
        if not thumbnail_url and doc.get("thumbnail_key"):
            thumbnail_url = storage.get_public_url(doc["thumbnail_key"])

        return VideoResponse(
            video_id=doc["video_id"],
            user_id=doc["user_id"],
            author_name=doc.get("author_name", "Creator"),
            title=doc.get("title", "Untitled Reel"),
            description=doc.get("description", ""),
            hashtags=doc.get("hashtags", []),
            video_url=video_url or "",
            thumbnail_url=thumbnail_url,
            duration=doc.get("duration", 0.0),
            visibility=ContentVisibility(doc.get("visibility", ContentVisibility.PUBLIC.value)),
            status=ContentStatus(doc.get("status", ContentStatus.PUBLISHED.value)),
            scheduled_at=doc.get("scheduled_at"),
            likes_count=doc.get("likes_count", 0),
            saves_count=doc.get("saves_count", 0),
            comments_count=doc.get("comments_count", 0),
            views_count=doc.get("views_count", 0),
            has_liked=has_liked,
            has_saved=has_saved,
            captions=doc.get("captions", []),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
        )

    @classmethod
    async def create_video(
        cls,
        user_id: str,
        author_name: str,
        request: CreateVideoRequest,
    ) -> VideoResponse:
        """Create a new video post or save as draft."""
        db = get_db()
        now = datetime.now(timezone.utc)
        video_id = str(uuid.uuid4())

        # Determine initial status
        if request.is_draft:
            v_status = ContentStatus.DRAFT
        elif request.scheduled_at and request.scheduled_at > now:
            v_status = ContentStatus.SCHEDULED
        else:
            v_status = ContentStatus.PUBLISHED

        storage = get_storage_adapter()
        video_url = storage.get_public_url(request.video_key) if request.video_key else ""
        thumbnail_url = storage.get_public_url(request.thumbnail_key) if request.thumbnail_key else None

        doc = {
            "video_id": video_id,
            "user_id": user_id,
            "author_name": author_name,
            "title": request.title,
            "description": request.description,
            "hashtags": request.hashtags,
            "video_key": request.video_key,
            "thumbnail_key": request.thumbnail_key,
            "video_url": video_url,
            "thumbnail_url": thumbnail_url,
            "duration": request.duration,
            "visibility": request.visibility.value,
            "status": v_status.value,
            "scheduled_at": request.scheduled_at,
            "likes_count": 0,
            "saves_count": 0,
            "comments_count": 0,
            "views_count": 0,
            "captions": [],
            "deleted": False,
            "created_at": now,
            "updated_at": now,
        }

        await db.videos.insert_one(doc)
        logger.info("Video %s created by user %s with status %s", video_id, user_id, v_status.value)
        return cls._doc_to_response(doc)

    @classmethod
    async def get_video(cls, video_id: str, current_user_id: str | None = None) -> VideoResponse:
        """Retrieve video details with viewer engagement flags."""
        db = get_db()
        doc = await db.videos.find_one({"video_id": video_id, "deleted": {"$ne": True}})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

        # Check visibility
        is_owner = current_user_id and current_user_id == doc["user_id"]
        if doc["visibility"] == ContentVisibility.PRIVATE.value and not is_owner:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This video is private.")

        if doc["status"] == ContentStatus.DRAFT.value and not is_owner:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This draft is private.")

        # Increment views atomically
        await db.videos.update_one({"video_id": video_id}, {"$inc": {"views_count": 1}})
        doc["views_count"] = doc.get("views_count", 0) + 1

        # Check user engagement flags
        has_liked = False
        has_saved = False
        if current_user_id:
            like_exists = await db.video_likes.find_one({"video_id": video_id, "user_id": current_user_id})
            has_liked = like_exists is not None
            save_exists = await db.video_saves.find_one({"video_id": video_id, "user_id": current_user_id})
            has_saved = save_exists is not None

        return cls._doc_to_response(doc, has_liked=has_liked, has_saved=has_saved)

    @classmethod
    async def list_videos(
        cls,
        user_id: str | None = None,
        current_user_id: str | None = None,
        visibility: ContentVisibility | None = None,
        status_filter: ContentStatus | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[VideoResponse]:
        """List published videos with pagination and visibility filters."""
        db = get_db()
        query: dict[str, Any] = {"deleted": {"$ne": True}}

        if user_id:
            query["user_id"] = user_id
            if user_id != current_user_id:
                # Viewing someone else's profile — only public published
                query["visibility"] = ContentVisibility.PUBLIC.value
                query["status"] = ContentStatus.PUBLISHED.value
            else:
                if visibility:
                    query["visibility"] = visibility.value
                if status_filter:
                    query["status"] = status_filter.value
        else:
            # Main public discovery feed
            query["visibility"] = ContentVisibility.PUBLIC.value
            query["status"] = ContentStatus.PUBLISHED.value

        cursor = db.videos.find(query).sort("created_at", -1).skip(skip).limit(min(limit, 100))
        docs = await cursor.to_list(limit)

        # Batch check likes for current user
        liked_set = set()
        saved_set = set()
        if current_user_id and docs:
            v_ids = [d["video_id"] for d in docs]
            likes = await db.video_likes.find(
                {"video_id": {"$in": v_ids}, "user_id": current_user_id}
            ).to_list(len(v_ids))
            liked_set = {lk["video_id"] for lk in likes}
            saves = await db.video_saves.find(
                {"video_id": {"$in": v_ids}, "user_id": current_user_id}
            ).to_list(len(v_ids))
            saved_set = {sv["video_id"] for sv in saves}

        return [
            cls._doc_to_response(d, has_liked=d["video_id"] in liked_set, has_saved=d["video_id"] in saved_set)
            for d in docs
        ]

    @classmethod
    async def list_user_drafts(cls, user_id: str) -> list[VideoResponse]:
        """Retrieve all drafts for the authenticated user."""
        db = get_db()
        cursor = db.videos.find({
            "user_id": user_id,
            "status": ContentStatus.DRAFT.value,
            "deleted": {"$ne": True},
        }).sort("updated_at", -1)
        docs = await cursor.to_list(50)
        return [cls._doc_to_response(d) for d in docs]

    @classmethod
    async def update_video(
        cls,
        user_id: str,
        video_id: str,
        request: UpdateVideoRequest,
        is_admin: bool = False,
    ) -> VideoResponse:
        """Update an existing video or draft."""
        db = get_db()
        query = {"video_id": video_id, "deleted": {"$ne": True}}
        if not is_admin:
            query["user_id"] = user_id

        update_fields: dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
        if request.title is not None:
            update_fields["title"] = request.title
        if request.description is not None:
            update_fields["description"] = request.description
        if request.hashtags is not None:
            update_fields["hashtags"] = request.hashtags
        if request.visibility is not None:
            update_fields["visibility"] = request.visibility.value
        if request.scheduled_at is not None:
            update_fields["scheduled_at"] = request.scheduled_at
        if request.status is not None:
            update_fields["status"] = request.status.value

        res = await db.videos.find_one_and_update(
            query,
            {"$set": update_fields},
            return_document=True,
        )
        if not res:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found or permission denied.")

        return cls._doc_to_response(res)

    @classmethod
    async def delete_video(cls, user_id: str, video_id: str, is_admin: bool = False) -> bool:
        """Soft-delete video entity."""
        db = get_db()
        query = {"video_id": video_id, "deleted": {"$ne": True}}
        if not is_admin:
            query["user_id"] = user_id

        res = await db.videos.update_one(query, {"$set": {"deleted": True, "updated_at": datetime.now(timezone.utc)}})
        if res.matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")
        return True

    @classmethod
    async def toggle_like(cls, user_id: str, video_id: str) -> LikeResponse:
        """Atomically toggle a like on a video with counter integrity."""
        db = get_db()
        now = datetime.now(timezone.utc)

        existing = await db.video_likes.find_one({"video_id": video_id, "user_id": user_id})
        if existing:
            # Unlike
            await db.video_likes.delete_one({"video_id": video_id, "user_id": user_id})
            doc = await db.videos.find_one_and_update(
                {"video_id": video_id},
                {"$inc": {"likes_count": -1}},
                return_document=True,
            )
            count = max(0, doc.get("likes_count", 0)) if doc else 0
            return LikeResponse(video_id=video_id, liked=False, likes_count=count)
        else:
            # Like
            await db.video_likes.insert_one({"video_id": video_id, "user_id": user_id, "created_at": now})
            doc = await db.videos.find_one_and_update(
                {"video_id": video_id},
                {"$inc": {"likes_count": 1}},
                return_document=True,
            )
            count = doc.get("likes_count", 1) if doc else 1

            # Dispatch notification to video creator
            try:
                if doc and doc.get("user_id") != user_id:
                    from backend.app.notifications.service import NotificationsService
                    actor_user = await db.users.find_one({"user_id": user_id})
                    actor_name = actor_user.get("name", "Someone") if actor_user else "Someone"
                    notif_svc = NotificationsService(db)
                    await notif_svc.create_notification(
                        recipient_id=doc["user_id"],
                        actor_id=user_id,
                        actor_name=actor_name,
                        notification_type="like",
                        entity_id=video_id,
                        message=f"{actor_name} liked your reel.",
                    )
            except Exception as e:
                logger.debug("Like notification dispatch skipped: %s", e)

            return LikeResponse(video_id=video_id, liked=True, likes_count=count)

    @classmethod
    async def toggle_save(cls, user_id: str, video_id: str) -> SaveResponse:
        """Atomically toggle a save / bookmark on a video."""
        db = get_db()
        now = datetime.now(timezone.utc)

        existing = await db.video_saves.find_one({"video_id": video_id, "user_id": user_id})
        if existing:
            # Unsave
            await db.video_saves.delete_one({"video_id": video_id, "user_id": user_id})
            doc = await db.videos.find_one_and_update(
                {"video_id": video_id},
                {"$inc": {"saves_count": -1}},
                return_document=True,
            )
            count = max(0, doc.get("saves_count", 0)) if doc else 0
            return SaveResponse(video_id=video_id, saved=False, saves_count=count)
        else:
            # Save
            await db.video_saves.insert_one({"video_id": video_id, "user_id": user_id, "created_at": now})
            doc = await db.videos.find_one_and_update(
                {"video_id": video_id},
                {"$inc": {"saves_count": 1}},
                return_document=True,
            )
            count = doc.get("saves_count", 1) if doc else 1
            return SaveResponse(video_id=video_id, saved=True, saves_count=count)

    @classmethod
    async def add_comment(cls, user_id: str, user_name: str, video_id: str, text: str) -> CommentResponse:
        """Add a comment and increment video comments counter."""
        db = get_db()
        now = datetime.now(timezone.utc)
        comment_id = str(uuid.uuid4())

        doc = {
            "comment_id": comment_id,
            "video_id": video_id,
            "user_id": user_id,
            "user_name": user_name,
            "text": text,
            "created_at": now,
        }
        await db.video_comments.insert_one(doc)
        await db.videos.update_one({"video_id": video_id}, {"$inc": {"comments_count": 1}})

        # Dispatch notification to video creator
        try:
            video_doc = await db.videos.find_one({"video_id": video_id})
            if video_doc and video_doc.get("user_id") != user_id:
                from backend.app.notifications.service import NotificationsService
                notif_svc = NotificationsService(db)
                snippet = text[:50] + "..." if len(text) > 50 else text
                await notif_svc.create_notification(
                    recipient_id=video_doc["user_id"],
                    actor_id=user_id,
                    actor_name=user_name,
                    notification_type="comment",
                    entity_id=video_id,
                    message=f'{user_name} commented: "{snippet}"',
                )
        except Exception as e:
            logger.debug("Comment notification dispatch skipped: %s", e)

        return CommentResponse(
            comment_id=comment_id,
            video_id=video_id,
            user_id=user_id,
            user_name=user_name,
            text=text,
            created_at=now,
        )

    @classmethod
    async def list_comments(cls, video_id: str, skip: int = 0, limit: int = 50) -> list[CommentResponse]:
        """List comments for a video ordered by recency."""
        db = get_db()
        cursor = db.video_comments.find({"video_id": video_id}).sort("created_at", -1).skip(skip).limit(min(limit, 100))
        docs = await cursor.to_list(limit)
        return [
            CommentResponse(
                comment_id=d["comment_id"],
                video_id=d["video_id"],
                user_id=d["user_id"],
                user_name=d.get("user_name", "User"),
                text=d["text"],
                created_at=d["created_at"],
            )
            for d in docs
        ]

    @classmethod
    async def publish_due_scheduled_videos(cls) -> int:
        """Worker task: Publish scheduled videos whose release time has arrived."""
        db = get_db()
        now = datetime.now(timezone.utc)
        res = await db.videos.update_many(
            {
                "status": ContentStatus.SCHEDULED.value,
                "scheduled_at": {"$lte": now},
                "deleted": {"$ne": True},
            },
            {
                "$set": {
                    "status": ContentStatus.PUBLISHED.value,
                    "updated_at": now,
                }
            },
        )
        if res.modified_count > 0:
            logger.info("Published %d scheduled videos at %s", res.modified_count, now)
        return res.modified_count

    @classmethod
    async def clean_expired_retention(
        cls,
        draft_retention_days: int = 30,
        failed_job_retention_hours: int = 24,
    ) -> dict[str, int]:
        """Worker task: Retention reaper pruning abandoned drafts and failed jobs."""
        db = get_db()
        now = datetime.now(timezone.utc)

        # 1. Prune abandoned drafts older than 30 days
        draft_cutoff = now - timedelta(days=draft_retention_days)
        draft_res = await db.videos.delete_many({
            "status": ContentStatus.DRAFT.value,
            "created_at": {"$lt": draft_cutoff},
        })

        # 2. Prune failed jobs older than 24 hours
        failed_cutoff = now - timedelta(hours=failed_job_retention_hours)
        job_res = await db.jobs.delete_many({
            "status": "failed",
            "created_at": {"$lt": failed_cutoff},
        })

        logger.info(
            "Retention reaper completed: Removed %d expired drafts, %d failed jobs.",
            draft_res.deleted_count,
            job_res.deleted_count,
        )
        return {
            "pruned_drafts": draft_res.deleted_count,
            "pruned_failed_jobs": job_res.deleted_count,
        }
