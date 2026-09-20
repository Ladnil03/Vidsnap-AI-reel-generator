"""
Social Graph Service Layer.
Manages user follow relations, mutual friendship graphs, interest communities,
and public creator profiles.
"""

import logging
import re
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.core.database import get_db
from backend.app.social.models import (
    CommunityCategory,
    CommunityCreateRequest,
    CommunityListResponse,
    CommunityResponse,
    FollowersListResponse,
    FollowingListResponse,
    FollowStatusResponse,
    FriendsListResponse,
    SocialUserSummary,
    UserProfileResponse,
)

logger = logging.getLogger(__name__)


class SocialService:
    """Business logic for the social graph and community systems."""

    def __init__(self, db: AsyncIOMotorDatabase | None = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is not None:
            return self._db
        return get_db()

    async def follow_user(self, follower_id: str, target_user_id: str) -> FollowStatusResponse:
        """
        Follow another user. If the target already follows the follower,
        they automatically become mutual friends.
        """
        if follower_id == target_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot follow yourself.",
            )

        target_user = await self.db["users"].find_one({"user_id": target_user_id})
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        # Check existing follow
        existing = await self.db["social_follows"].find_one({
            "follower_id": follower_id,
            "following_id": target_user_id,
        })

        now = datetime.now(UTC)

        if not existing:
            await self.db["social_follows"].insert_one({
                "follower_id": follower_id,
                "following_id": target_user_id,
                "created_at": now,
            })

            # Atomic counters
            await self.db["users"].update_one(
                {"user_id": follower_id},
                {"$inc": {"following_count": 1}},
            )
            await self.db["users"].update_one(
                {"user_id": target_user_id},
                {"$inc": {"followers_count": 1}},
            )

            # Fire in-app notification to target user
            try:
                from backend.app.notifications.service import NotificationsService
                actor_user = await self.db["users"].find_one({"user_id": follower_id})
                actor_name = actor_user.get("name", "Someone") if actor_user else "Someone"
                notif_svc = NotificationsService(self.db)
                await notif_svc.create_notification(
                    recipient_id=target_user_id,
                    actor_id=follower_id,
                    actor_name=actor_name,
                    notification_type="follow",
                    entity_id=follower_id,
                    message=f"{actor_name} started following you.",
                )
            except Exception as e:
                logger.warning("Failed to fire follow notification: %s", e)

        # Check mutual friendship (target follows back)
        target_follows_back = await self.db["social_follows"].find_one({
            "follower_id": target_user_id,
            "following_id": follower_id,
        })
        is_friend = bool(target_follows_back)

        refreshed_target = await self.db["users"].find_one({"user_id": target_user_id}) or {}
        refreshed_follower = await self.db["users"].find_one({"user_id": follower_id}) or {}

        return FollowStatusResponse(
            target_user_id=target_user_id,
            is_following=True,
            is_friend=is_friend,
            followers_count=refreshed_target.get("followers_count", 0),
            following_count=refreshed_follower.get("following_count", 0),
        )

    async def unfollow_user(self, follower_id: str, target_user_id: str) -> FollowStatusResponse:
        """Unfollow a previously followed user."""
        if follower_id == target_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot unfollow yourself.",
            )

        res = await self.db["social_follows"].delete_one({
            "follower_id": follower_id,
            "following_id": target_user_id,
        })

        if res.deleted_count > 0:
            await self.db["users"].update_one(
                {"user_id": follower_id},
                {"$inc": {"following_count": -1}},
            )
            await self.db["users"].update_one(
                {"user_id": target_user_id},
                {"$inc": {"followers_count": -1}},
            )

        refreshed_target = await self.db["users"].find_one({"user_id": target_user_id}) or {}
        refreshed_follower = await self.db["users"].find_one({"user_id": follower_id}) or {}

        return FollowStatusResponse(
            target_user_id=target_user_id,
            is_following=False,
            is_friend=False,
            followers_count=max(0, refreshed_target.get("followers_count", 0)),
            following_count=max(0, refreshed_follower.get("following_count", 0)),
        )

    async def get_follow_status(self, current_user_id: str | None, target_user_id: str) -> FollowStatusResponse:
        """Check follow & friend status between current user and target."""
        target_user = await self.db["users"].find_one({"user_id": target_user_id})
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        if not current_user_id:
            return FollowStatusResponse(
                target_user_id=target_user_id,
                is_following=False,
                is_friend=False,
                followers_count=target_user.get("followers_count", 0),
                following_count=target_user.get("following_count", 0),
            )

        is_following = bool(await self.db["social_follows"].find_one({
            "follower_id": current_user_id,
            "following_id": target_user_id,
        }))
        target_follows_back = bool(await self.db["social_follows"].find_one({
            "follower_id": target_user_id,
            "following_id": current_user_id,
        }))

        current_user_doc = await self.db["users"].find_one({"user_id": current_user_id}) or {}

        return FollowStatusResponse(
            target_user_id=target_user_id,
            is_following=is_following,
            is_friend=is_following and target_follows_back,
            followers_count=target_user.get("followers_count", 0),
            following_count=current_user_doc.get("following_count", 0),
        )

    async def get_followers(
        self,
        target_user_id: str,
        current_user_id: str | None = None,
        limit: int = 50,
    ) -> FollowersListResponse:
        """List accounts following target_user_id."""
        cursor = self.db["social_follows"].find({"following_id": target_user_id}).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)

        items: list[SocialUserSummary] = []
        for doc in docs:
            follower_user_id = doc["follower_id"]
            u = await self.db["users"].find_one({"user_id": follower_user_id})
            if not u:
                continue

            is_following = False
            is_friend = False
            if current_user_id:
                is_following = bool(await self.db["social_follows"].find_one({
                    "follower_id": current_user_id,
                    "following_id": follower_user_id,
                }))
                u_follows_curr = bool(await self.db["social_follows"].find_one({
                    "follower_id": follower_user_id,
                    "following_id": current_user_id,
                }))
                is_friend = is_following and u_follows_curr

            items.append(SocialUserSummary(
                user_id=u["user_id"],
                name=u.get("name", "Creator"),
                email=u.get("email", ""),
                avatar_url=u.get("avatar_url"),
                followers_count=u.get("followers_count", 0),
                following_count=u.get("following_count", 0),
                is_following=is_following,
                is_friend=is_friend,
            ))

        total = await self.db["social_follows"].count_documents({"following_id": target_user_id})
        return FollowersListResponse(items=items, total=total)

    async def get_following(
        self,
        user_id: str,
        current_user_id: str | None = None,
        limit: int = 50,
    ) -> FollowingListResponse:
        """List accounts followed by user_id."""
        cursor = self.db["social_follows"].find({"follower_id": user_id}).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)

        items: list[SocialUserSummary] = []
        for doc in docs:
            following_id = doc["following_id"]
            u = await self.db["users"].find_one({"user_id": following_id})
            if not u:
                continue

            is_following = False
            is_friend = False
            if current_user_id:
                is_following = bool(await self.db["social_follows"].find_one({
                    "follower_id": current_user_id,
                    "following_id": following_id,
                }))
                u_follows_curr = bool(await self.db["social_follows"].find_one({
                    "follower_id": following_id,
                    "following_id": current_user_id,
                }))
                is_friend = is_following and u_follows_curr

            items.append(SocialUserSummary(
                user_id=u["user_id"],
                name=u.get("name", "Creator"),
                email=u.get("email", ""),
                avatar_url=u.get("avatar_url"),
                followers_count=u.get("followers_count", 0),
                following_count=u.get("following_count", 0),
                is_following=is_following,
                is_friend=is_friend,
            ))

        total = await self.db["social_follows"].count_documents({"follower_id": user_id})
        return FollowingListResponse(items=items, total=total)

    async def get_friends(self, user_id: str, limit: int = 50) -> FriendsListResponse:
        """List mutual friends (users who follow each other)."""
        following_cursor = self.db["social_follows"].find({"follower_id": user_id})
        following_docs = await following_cursor.to_list(length=1000)
        following_ids = {d["following_id"] for d in following_docs}

        if not following_ids:
            return FriendsListResponse(items=[], total=0)

        # Find which of those also follow user_id
        mutual_cursor = self.db["social_follows"].find({
            "follower_id": {"$in": list(following_ids)},
            "following_id": user_id,
        }).limit(limit)
        mutual_docs = await mutual_cursor.to_list(length=limit)

        friend_ids = [d["follower_id"] for d in mutual_docs]
        items: list[SocialUserSummary] = []
        for fid in friend_ids:
            u = await self.db["users"].find_one({"user_id": fid})
            if not u:
                continue
            items.append(SocialUserSummary(
                user_id=u["user_id"],
                name=u.get("name", "Friend"),
                email=u.get("email", ""),
                avatar_url=u.get("avatar_url"),
                followers_count=u.get("followers_count", 0),
                following_count=u.get("following_count", 0),
                is_following=True,
                is_friend=True,
            ))

        return FriendsListResponse(items=items, total=len(items))

    async def get_user_profile(
        self,
        target_user_id: str,
        current_user_id: str | None = None,
    ) -> UserProfileResponse:
        """Return public creator/user profile with follower counts, friends status, and communities."""
        u = await self.db["users"].find_one({"user_id": target_user_id})
        if not u:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        reels_count = await self.db["videos"].count_documents({
            "user_id": target_user_id,
            "status": "published",
        })

        is_following = False
        is_friend = False
        if current_user_id:
            is_following = bool(await self.db["social_follows"].find_one({
                "follower_id": current_user_id,
                "following_id": target_user_id,
            }))
            target_follows_back = bool(await self.db["social_follows"].find_one({
                "follower_id": target_user_id,
                "following_id": current_user_id,
            }))
            is_friend = is_following and target_follows_back

        # Fetch joined communities
        memberships = await self.db["community_members"].find({"user_id": target_user_id}).to_list(length=20)
        c_ids = [m["community_id"] for m in memberships]
        community_docs = await self.db["communities"].find({"community_id": {"$in": c_ids}}).to_list(length=20)

        communities: list[CommunityResponse] = []
        for c in community_docs:
            communities.append(CommunityResponse(
                community_id=c["community_id"],
                name=c["name"],
                slug=c["slug"],
                description=c.get("description", ""),
                category=c.get("category", CommunityCategory.GENERAL),
                avatar_url=c.get("avatar_url"),
                banner_url=c.get("banner_url"),
                creator_id=c["creator_id"],
                members_count=c.get("members_count", 1),
                is_member=True,
                created_at=c["created_at"],
            ))

        return UserProfileResponse(
            user_id=u["user_id"],
            name=u.get("name", "Creator"),
            email=u.get("email", ""),
            avatar_url=u.get("avatar_url"),
            bio=u.get("bio", "VidSnap Creator"),
            followers_count=u.get("followers_count", 0),
            following_count=u.get("following_count", 0),
            reels_count=reels_count,
            is_following=is_following,
            is_friend=is_friend,
            communities=communities,
        )

    # --------------------------------------------------------------------------
    # Community Domain Management
    # --------------------------------------------------------------------------

    async def create_community(self, creator_id: str, req: CommunityCreateRequest) -> CommunityResponse:
        """Create a new community and enroll creator as admin."""
        slug = re.sub(r"[^a-z0-9]+", "-", req.name.lower()).strip("-")
        if not slug:
            slug = f"community-{uuid.uuid4().hex[:6]}"

        # Ensure slug uniqueness
        existing = await self.db["communities"].find_one({"slug": slug})
        if existing:
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"

        community_id = f"comm_{uuid.uuid4().hex[:12]}"
        now = datetime.now(UTC)

        doc = {
            "community_id": community_id,
            "name": req.name,
            "slug": slug,
            "description": req.description,
            "category": req.category.value,
            "avatar_url": req.avatar_url,
            "banner_url": req.banner_url,
            "creator_id": creator_id,
            "members_count": 1,
            "created_at": now,
        }
        await self.db["communities"].insert_one(doc)

        # Creator automatically becomes admin member
        await self.db["community_members"].insert_one({
            "community_id": community_id,
            "user_id": creator_id,
            "role": "admin",
            "joined_at": now,
        })

        return CommunityResponse(
            community_id=community_id,
            name=req.name,
            slug=slug,
            description=req.description,
            category=req.category,
            avatar_url=req.avatar_url,
            banner_url=req.banner_url,
            creator_id=creator_id,
            members_count=1,
            is_member=True,
            role="admin",
            created_at=now,
        )

    async def join_community(self, user_id: str, community_id: str) -> CommunityResponse:
        """Join a community."""
        comm = await self.db["communities"].find_one({"community_id": community_id})
        if not comm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found.")

        existing = await self.db["community_members"].find_one({
            "community_id": community_id,
            "user_id": user_id,
        })

        now = datetime.now(UTC)
        if not existing:
            await self.db["community_members"].insert_one({
                "community_id": community_id,
                "user_id": user_id,
                "role": "member",
                "joined_at": now,
            })
            await self.db["communities"].update_one(
                {"community_id": community_id},
                {"$inc": {"members_count": 1}},
            )

        refreshed = await self.db["communities"].find_one({"community_id": community_id}) or comm

        return CommunityResponse(
            community_id=refreshed["community_id"],
            name=refreshed["name"],
            slug=refreshed["slug"],
            description=refreshed.get("description", ""),
            category=refreshed.get("category", CommunityCategory.GENERAL),
            avatar_url=refreshed.get("avatar_url"),
            banner_url=refreshed.get("banner_url"),
            creator_id=refreshed["creator_id"],
            members_count=refreshed.get("members_count", 1),
            is_member=True,
            role="member",
            created_at=refreshed["created_at"],
        )

    async def leave_community(self, user_id: str, community_id: str) -> CommunityResponse:
        """Leave a community."""
        comm = await self.db["communities"].find_one({"community_id": community_id})
        if not comm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found.")

        res = await self.db["community_members"].delete_one({
            "community_id": community_id,
            "user_id": user_id,
        })

        if res.deleted_count > 0:
            await self.db["communities"].update_one(
                {"community_id": community_id},
                {"$inc": {"members_count": -1}},
            )

        refreshed = await self.db["communities"].find_one({"community_id": community_id}) or comm

        return CommunityResponse(
            community_id=refreshed["community_id"],
            name=refreshed["name"],
            slug=refreshed["slug"],
            description=refreshed.get("description", ""),
            category=refreshed.get("category", CommunityCategory.GENERAL),
            avatar_url=refreshed.get("avatar_url"),
            banner_url=refreshed.get("banner_url"),
            creator_id=refreshed["creator_id"],
            members_count=max(0, refreshed.get("members_count", 0)),
            is_member=False,
            role=None,
            created_at=refreshed["created_at"],
        )

    async def list_communities(
        self,
        category: CommunityCategory | None = None,
        query: str | None = None,
        user_id: str | None = None,
        limit: int = 30,
    ) -> CommunityListResponse:
        """List public communities for discovery, optionally filtered by category or search."""
        filter_q: dict = {}
        if category:
            filter_q["category"] = category.value
        if query:
            filter_q["name"] = {"$regex": re.escape(query), "$options": "i"}

        cursor = self.db["communities"].find(filter_q).sort("members_count", -1).limit(limit)
        docs = await cursor.to_list(length=limit)

        user_memberships: dict[str, str] = {}
        if user_id:
            m_docs = await self.db["community_members"].find({"user_id": user_id}).to_list(length=500)
            user_memberships = {m["community_id"]: m.get("role", "member") for m in m_docs}

        items: list[CommunityResponse] = []
        for d in docs:
            cid = d["community_id"]
            items.append(CommunityResponse(
                community_id=cid,
                name=d["name"],
                slug=d["slug"],
                description=d.get("description", ""),
                category=d.get("category", CommunityCategory.GENERAL),
                avatar_url=d.get("avatar_url"),
                banner_url=d.get("banner_url"),
                creator_id=d["creator_id"],
                members_count=d.get("members_count", 1),
                is_member=cid in user_memberships,
                role=user_memberships.get(cid),
                created_at=d["created_at"],
            ))

        total = await self.db["communities"].count_documents(filter_q)
        return CommunityListResponse(items=items, total=total)
