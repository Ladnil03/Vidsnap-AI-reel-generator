"""
MongoDB database lifecycle and index management using Motor.
"""

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> AsyncIOMotorDatabase:
    """
    Connect to MongoDB, verify connectivity via ping, and ensure indexes.
    Never logs credentials.
    """
    global _client, _db

    if _db is not None:
        return _db

    logger.info("Connecting to MongoDB at %s...", settings.sanitized_mongodb_uri)
    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
    )
    _db = _client[settings.mongodb_db]

    # Verify connectivity
    await _client.admin.command("ping")
    logger.info("MongoDB connection successfully verified (Database: '%s')", settings.mongodb_db)

    # Initialize collections and indexes
    await ensure_indexes(_db)
    return _db


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Ensure all required collection indexes exist."""
    logger.info("Ensuring database indexes...")

    # Users collection indexes
    users = db["users"]
    user_indexes = [
        IndexModel([("user_id", ASCENDING)], unique=True, name="idx_users_user_id_unique"),
        IndexModel([("email", ASCENDING)], unique=True, name="idx_users_email_unique"),
        IndexModel([("created_at", DESCENDING)], name="idx_users_created_at"),
    ]
    await users.create_indexes(user_indexes)

    # Jobs collection indexes
    jobs = db["jobs"]
    job_indexes = [
        IndexModel([("job_id", ASCENDING)], unique=True, name="idx_jobs_job_id_unique"),
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_jobs_user_created"),
        IndexModel([("status", ASCENDING), ("created_at", ASCENDING)], name="idx_jobs_status_created"),
    ]
    await jobs.create_indexes(job_indexes)

    # Credit Ledger collection indexes (append-only audit log)
    ledger = db["credit_ledger"]
    ledger_indexes = [
        IndexModel([("ledger_id", ASCENDING)], unique=True, name="idx_ledger_id_unique"),
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_ledger_user_created"),
        IndexModel([("idempotency_key", ASCENDING)], unique=True, sparse=True, name="idx_ledger_idempotency"),
    ]
    await ledger.create_indexes(ledger_indexes)

    # Feedback collection indexes
    feedback = db["feedback"]
    await feedback.create_index([("created_at", DESCENDING)], name="idx_feedback_created_at")

    # OTPs collection with TTL index (auto-expires after 10 minutes)
    otps = db["otps"]
    await otps.create_index([("email", ASCENDING)], name="idx_otps_email")
    await otps.create_index([("created_at", ASCENDING)], expireAfterSeconds=600, name="idx_otps_ttl_10m")

    # Refresh tokens collection with TTL (auto-expire after max lifetime)
    refresh_tokens = db["refresh_tokens"]
    await refresh_tokens.create_index([("token_hash", ASCENDING)], unique=True, name="idx_rt_hash_unique")
    await refresh_tokens.create_index([("user_id", ASCENDING)], name="idx_rt_user_id")
    await refresh_tokens.create_index(
        [("expires_at", ASCENDING)], expireAfterSeconds=0, name="idx_rt_expires_ttl"
    )

    # Feedback collection indexes
    feedback = db["feedback"]
    await feedback.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_feedback_user_created")
    await feedback.create_index([("created_at", DESCENDING)], name="idx_feedback_created_at")

    # Phase 4: Social Follows collection
    follows = db["social_follows"]
    await follows.create_index(
        [("follower_id", ASCENDING), ("following_id", ASCENDING)],
        unique=True,
        name="idx_follows_pair_unique",
    )
    await follows.create_index([("following_id", ASCENDING)], name="idx_follows_following")
    await follows.create_index([("created_at", DESCENDING)], name="idx_follows_created_at")

    # Communities & Memberships
    communities = db["communities"]
    await communities.create_index([("community_id", ASCENDING)], unique=True, name="idx_communities_id_unique")
    await communities.create_index([("slug", ASCENDING)], unique=True, name="idx_communities_slug_unique")
    await communities.create_index([("category", ASCENDING)], name="idx_communities_category")
    await communities.create_index([("members_count", DESCENDING)], name="idx_communities_members_count")

    community_members = db["community_members"]
    await community_members.create_index(
        [("community_id", ASCENDING), ("user_id", ASCENDING)],
        unique=True,
        name="idx_cm_pair_unique",
    )
    await community_members.create_index([("user_id", ASCENDING)], name="idx_cm_user_id")

    # Notifications collection with 30-day TTL index
    notifications = db["notifications"]
    await notifications.create_index(
        [("recipient_id", ASCENDING), ("created_at", DESCENDING)],
        name="idx_notif_recipient_created",
    )
    await notifications.create_index(
        [("recipient_id", ASCENDING), ("is_read", ASCENDING)],
        name="idx_notif_recipient_is_read",
    )
    await notifications.create_index(
        [("created_at", ASCENDING)],
        expireAfterSeconds=2592000,
        name="idx_notif_ttl_30d",
    )

    # Watch Progress (cross-device sync)
    watch_progress = db["watch_progress"]
    await watch_progress.create_index(
        [("user_id", ASCENDING), ("video_id", ASCENDING)],
        unique=True,
        name="idx_wp_user_video_unique",
    )
    await watch_progress.create_index(
        [("user_id", ASCENDING), ("updated_at", DESCENDING)],
        name="idx_wp_user_updated",
    )

    # Push Subscriptions (Web Push VAPID)
    push_subs = db["push_subscriptions"]
    await push_subs.create_index(
        [("user_id", ASCENDING), ("endpoint", ASCENDING)],
        unique=True,
        name="idx_push_user_endpoint_unique",
    )

    # Phase 5: Discovery Catalog (Capped at 20k items with LRU eviction)
    discovery = db["discovery_catalog"]
    await discovery.create_index(
        [("source", ASCENDING), ("external_id", ASCENDING)],
        unique=True,
        name="idx_discovery_source_external_unique",
    )
    await discovery.create_index([("tags", ASCENDING)], name="idx_discovery_tags")
    await discovery.create_index([("created_at", DESCENDING)], name="idx_discovery_created_at")
    await discovery.create_index([("last_viewed_at", ASCENDING)], name="idx_discovery_last_viewed")

    # Phase 5: RecSys User Vectors
    user_vectors = db["user_vectors"]
    await user_vectors.create_index([("user_id", ASCENDING)], unique=True, name="idx_uv_user_id_unique")

    # Phase 5: Interaction Events with 15-day TTL index (Free-tier capacity protection)
    interactions = db["interaction_events"]
    await interactions.create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)],
        name="idx_interactions_user_created",
    )
    await interactions.create_index(
        [("created_at", ASCENDING)],
        expireAfterSeconds=1296000,
        name="idx_interactions_ttl_15d",
    )

    logger.info("Database indexes ensured successfully.")


async def disconnect_db() -> None:
    """Close MongoDB connection gracefully."""
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB client connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    """Return active MongoDB database instance."""
    if _db is None:
        raise RuntimeError("Database is not connected. Call connect_db() first.")
    return _db


async def ping_db() -> bool:
    """Ping MongoDB to verify health for /health/ready check."""
    if _client is None:
        return False
    try:
        await _client.admin.command("ping")
        return True
    except Exception as e:
        logger.warning("MongoDB ping failed: %s", e)
        return False
