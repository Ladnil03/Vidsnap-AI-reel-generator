"""
Admin Domain Service.
Uses MongoDB aggregation pipelines to eliminate N+1 queries.
"""

import logging

from backend.app.admin.models import AdminReelItem, AdminSystemStats, AdminUserItem
from backend.app.billing_quota.models import TransactionType
from backend.app.billing_quota.service import BillingService
from backend.app.core.database import get_db

logger = logging.getLogger(__name__)


class AdminService:
    """Service handling administrative queries and operations."""

    @staticmethod
    async def get_users_aggregated(skip: int = 0, limit: int = 50) -> list[AdminUserItem]:
        """
        Fetch all users with completed reel counts in a single aggregation query (0 N+1).
        """
        db = get_db()
        pipeline = [
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": min(limit, 100)},
            {
                "$lookup": {
                    "from": "jobs",
                    "localField": "user_id",
                    "foreignField": "user_id",
                    "as": "all_jobs",
                }
            },
            {
                "$project": {
                    "user_id": 1,
                    "name": 1,
                    "email": 1,
                    "tokens_remaining": 1,
                    "roles": 1,
                    "created_at": 1,
                    "all_jobs": 1,
                }
            },
        ]

        results: list[AdminUserItem] = []
        async for doc in db.users.aggregate(pipeline):
            completed_reels = sum(
                1 for j in doc.get("all_jobs", [])
                if j.get("status") == "done" and not j.get("deleted")
            )
            results.append(
                AdminUserItem(
                    user_id=doc["user_id"],
                    name=doc["name"],
                    email=doc["email"],
                    tokens_remaining=doc.get("tokens_remaining", 0),
                    roles=doc.get("roles", ["user"]),
                    total_reels=completed_reels,
                    created_at=doc["created_at"],
                )
            )
        return results

    @staticmethod
    async def get_reels_aggregated(skip: int = 0, limit: int = 50) -> list[AdminReelItem]:
        """
        Fetch all reels with joined author email in a single aggregation query (0 N+1).
        """
        db = get_db()
        pipeline = [
            {
                "$match": {
                    "status": "done",
                    "reel_url": {"$ne": None},
                    "deleted": {"$ne": True},
                }
            },
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": min(limit, 100)},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "user_id",
                    "as": "author",
                }
            },
            {
                "$project": {
                    "job_id": 1,
                    "reel_url": 1,
                    "thumbnail_url": 1,
                    "created_at": 1,
                    "user_email": {"$ifNull": [{"$arrayElemAt": ["$author.email", 0]}, "Unknown"]},
                }
            },
        ]

        results: list[AdminReelItem] = []
        async for doc in db.jobs.aggregate(pipeline):
            results.append(
                AdminReelItem(
                    job_id=doc["job_id"],
                    reel_url=doc["reel_url"],
                    thumbnail_url=doc.get("thumbnail_url"),
                    user_email=doc.get("user_email", "Unknown"),
                    created_at=doc["created_at"],
                )
            )
        return results

    @staticmethod
    async def set_user_tokens(user_id: str, new_tokens: int, admin_email: str) -> int:
        """Manually adjust a user's token balance and record in credit ledger."""
        db = get_db()
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            raise ValueError(f"User '{user_id}' not found.")

        current_tokens = user.get("tokens_remaining", 0)
        diff = new_tokens - current_tokens

        return await BillingService.grant_tokens(
            user_id=user_id,
            amount=diff,
            transaction_type=TransactionType.ADMIN_GRANT,
            memo=f"Admin {admin_email} adjusted tokens from {current_tokens} to {new_tokens}",
        )

    @staticmethod
    async def get_system_stats() -> AdminSystemStats:
        """
        Aggregate platform-wide health, adoption, and moderation metrics.
        """
        db = get_db()
        total_users = await db.users.count_documents({})
        total_creators = await db.users.count_documents({"roles": "creator"})
        total_businesses = await db.users.count_documents({"roles": "business"})
        total_reels = await db.jobs.count_documents({"status": "done", "deleted": {"$ne": True}})
        pending_reports = await db.content_reports.count_documents({"status": "pending"})

        # Active watch rooms
        active_rooms = await db.rooms.count_documents({"status": "active"}) if hasattr(db, "rooms") else 0

        # Aggregated tokens circulating
        pipeline_tokens = [
            {"$group": {"_id": None, "total": {"$sum": "$tokens_remaining"}}}
        ]
        tokens_circulating = 0
        async for r in db.users.aggregate(pipeline_tokens):
            tokens_circulating = r.get("total", 0)

        # Total reel views
        pipeline_views = [
            {"$group": {"_id": None, "total": {"$sum": "$views_count"}}}
        ]
        total_views = 0
        if hasattr(db, "videos"):
            async for r in db.videos.aggregate(pipeline_views):
                total_views = r.get("total", 0)

        return AdminSystemStats(
            total_users=total_users,
            total_creators=total_creators,
            total_businesses=total_businesses,
            total_reels=total_reels,
            total_views=total_views,
            active_rooms=active_rooms,
            pending_reports=pending_reports,
            tokens_circulating=tokens_circulating,
        )

    @staticmethod
    async def update_user_role(
        user_id: str,
        role: str,
        action: str,
        admin_email: str,
    ) -> list[str]:
        """
        Grant or revoke a specific role from a user.
        """
        db = get_db()
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            raise ValueError(f"User '{user_id}' not found.")

        current_roles: list[str] = user.get("roles", ["user"])
        cleaned_role = role.strip().lower()

        if action == "add":
            if cleaned_role not in current_roles:
                current_roles.append(cleaned_role)
        elif action == "remove":
            if cleaned_role in current_roles:
                current_roles.remove(cleaned_role)
                if not current_roles:
                    current_roles = ["user"]

        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"roles": current_roles}},
        )

        logger.info(
            "Admin %s modified roles for %s (Action: %s %s -> Result: %s)",
            admin_email, user_id, action, cleaned_role, current_roles,
        )
        return current_roles
