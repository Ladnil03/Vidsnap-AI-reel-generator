"""
MongoDB database lifecycle and index management using Motor.
"""

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.errors import OperationFailure

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


class _SafeCollection:
    """Wrapper that prevents startup crashes when an index already exists under a different legacy name."""

    def __init__(self, collection):
        self._col = collection
        self.name = getattr(collection, "name", "collection")

    async def create_index(self, *args, **kwargs):
        try:
            return await self._col.create_index(*args, **kwargs)
        except OperationFailure as err:
            if (
                getattr(err, "code", None) == 85
                or "already exists" in str(err)
                or "IndexOptionsConflict" in str(err)
            ):
                logger.warning(
                    "Index on '%s' already exists with a different name or options; reusing existing index: %s",
                    self.name,
                    err,
                )
                return None
            raise

    async def create_indexes(self, models, **kwargs):
        created = []
        for model in models:
            try:
                res = await self._col.create_indexes([model], **kwargs)
                created.extend(res if isinstance(res, list) else [res])
            except OperationFailure as err:
                if (
                    getattr(err, "code", None) == 85
                    or "already exists" in str(err)
                    or "IndexOptionsConflict" in str(err)
                ):
                    logger.warning(
                        "Index on '%s' already exists with a different name or options; reusing existing index: %s",
                        self.name,
                        err,
                    )
                else:
                    raise
        return created


class _SafeDatabaseWrapper:
    def __init__(self, db: AsyncIOMotorDatabase):
        self._db = db

    def __getitem__(self, name: str) -> _SafeCollection:
        return _SafeCollection(self._db[name])


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
    db = _SafeDatabaseWrapper(db)  # type: ignore[assignment]

    # Users collection indexes
    users = db["users"]
    user_indexes = [
        IndexModel([("user_id", ASCENDING)], unique=True, name="idx_users_user_id_unique"),
        IndexModel([("email", ASCENDING)], unique=True, name="idx_users_email_unique"),
        IndexModel([("created_at", DESCENDING)], name="idx_users_created_at"),
    ]
    await users.create_indexes(user_indexes)

    # Video Content, Likes, Saves, Comments
    videos = db["videos"]
    await videos.create_index([("video_id", ASCENDING)], unique=True, name="idx_videos_video_id_unique")
    await videos.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_videos_user_created")
    await videos.create_index(
        [("visibility", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)],
        name="idx_videos_vis_status_created",
    )
    await videos.create_index([("tags", ASCENDING)], name="idx_videos_tags")

    video_likes = db["video_likes"]
    await video_likes.create_index(
        [("user_id", ASCENDING), ("video_id", ASCENDING)],
        unique=True,
        name="idx_vl_user_video_unique",
    )
    await video_likes.create_index([("video_id", ASCENDING)], name="idx_vl_video_id")

    video_saves = db["video_saves"]
    await video_saves.create_index(
        [("user_id", ASCENDING), ("video_id", ASCENDING)],
        unique=True,
        name="idx_vs_user_video_unique",
    )
    await video_saves.create_index([("video_id", ASCENDING)], name="idx_vs_video_id")

    video_comments = db["video_comments"]
    await video_comments.create_index(
        [("video_id", ASCENDING), ("created_at", DESCENDING)],
        name="idx_vc_video_created",
    )

    # Jobs collection indexes
    jobs = db["jobs"]
    job_indexes = [
        IndexModel([("job_id", ASCENDING)], unique=True, name="idx_jobs_job_id_unique"),
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_jobs_user_created"),
        IndexModel([("status", ASCENDING), ("created_at", ASCENDING)], name="idx_jobs_status_created"),
    ]
    await jobs.create_indexes(job_indexes)

    # Job Idempotency collection indexes with 24-hour TTL
    job_idempotency = db["job_idempotency"]
    job_idem_indexes = [
        IndexModel(
            [("user_id", ASCENDING), ("idempotency_key", ASCENDING)],
            unique=True,
            name="idx_job_idem_user_key_unique",
        ),
        IndexModel([("created_at", ASCENDING)], expireAfterSeconds=86400, name="idx_job_idem_ttl_24h"),
    ]
    await job_idempotency.create_indexes(job_idem_indexes)

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
    await refresh_tokens.create_index([("family_id", ASCENDING)], name="idx_rt_family_id")
    await refresh_tokens.create_index(
        [("expires_at", ASCENDING)], expireAfterSeconds=0, name="idx_rt_expires_ttl"
    )

    # Security Audit Logs collection
    security_audit_logs = db["security_audit_logs"]
    await security_audit_logs.create_index(
        [("user_id", ASCENDING), ("timestamp", DESCENDING)], name="idx_sal_user_time"
    )
    await security_audit_logs.create_index([("event", ASCENDING), ("timestamp", DESCENDING)], name="idx_sal_event_time")

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

    # Phase 8: AI Companion & Personalization Indexes
    user_moods = db["user_moods"]
    await user_moods.create_index([("user_id", ASCENDING)], unique=True, name="idx_mood_user_id_unique")

    companion_messages = db["companion_messages"]
    await companion_messages.create_index(
        [("user_id", ASCENDING), ("timestamp", DESCENDING)],
        name="idx_companion_user_timestamp",
    )
    await companion_messages.create_index(
        [("timestamp", ASCENDING)],
        expireAfterSeconds=2592000,
        name="idx_companion_ttl_30d",
    )

    ai_playlists = db["ai_playlists"]
    await ai_playlists.create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)],
        name="idx_playlists_user_created",
    )

    daily_plans = db["daily_plans"]
    await daily_plans.create_index(
        [("user_id", ASCENDING), ("date", ASCENDING)],
        unique=True,
        name="idx_daily_plans_user_date_unique",
    )

    digital_twins = db["digital_twins"]
    await digital_twins.create_index(
        [("creator_id", ASCENDING)],
        unique=True,
        name="idx_digital_twins_creator_unique",
    )

    # Phase 7: Watch Together Rooms & Chat
    rooms = db["rooms"]
    await rooms.create_index([("room_id", ASCENDING)], unique=True, name="idx_rooms_room_id_unique")
    await rooms.create_index(
        [("is_active", ASCENDING), ("room_type", ASCENDING), ("created_at", DESCENDING)],
        name="idx_rooms_active_type_created",
    )

    room_members = db["room_members"]
    await room_members.create_index(
        [("room_id", ASCENDING), ("user_id", ASCENDING)],
        unique=True,
        name="idx_rm_pair_unique",
    )
    await room_members.create_index([("user_id", ASCENDING)], name="idx_rm_user_id")

    room_messages = db["room_messages"]
    await room_messages.create_index(
        [("room_id", ASCENDING), ("created_at", DESCENDING)],
        name="idx_room_messages_room_created",
    )
    await room_messages.create_index(
        [("created_at", ASCENDING)],
        expireAfterSeconds=604800,
        name="idx_room_messages_ttl_7d",
    )

    # Phase 9: Gamification & Engagement Indexes
    xp_ledger = db["xp_ledger"]
    await xp_ledger.create_index([("idempotency_key", ASCENDING)], unique=True, name="idx_xp_idempotency_unique")
    await xp_ledger.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_xp_user_created")
    await xp_ledger.create_index(
        [("user_id", ASCENDING), ("action", ASCENDING), ("created_at", DESCENDING)],
        name="idx_xp_user_action",
    )

    user_levels = db["user_levels"]
    await user_levels.create_index([("user_id", ASCENDING)], unique=True, name="idx_user_levels_uid_unique")
    await user_levels.create_index([("total_xp", DESCENDING)], name="idx_user_levels_xp_desc")

    user_streaks = db["user_streaks"]
    await user_streaks.create_index(
        [("user_id", ASCENDING), ("scope", ASCENDING), ("target_id", ASCENDING)],
        unique=True,
        name="idx_streaks_user_scope_target_unique",
    )

    user_challenges = db["user_challenges"]
    await user_challenges.create_index(
        [("user_id", ASCENDING), ("challenge_id", ASCENDING), ("period_key", ASCENDING)],
        unique=True,
        name="idx_challenges_user_ch_period_unique",
    )

    user_badges = db["user_badges"]
    await user_badges.create_index(
        [("user_id", ASCENDING), ("badge_id", ASCENDING)],
        unique=True,
        name="idx_badges_user_badge_unique",
    )
    await user_badges.create_index(
        [("user_id", ASCENDING), ("unlocked_at", DESCENDING)],
        name="idx_badges_user_unlocked",
    )

    # Phase 10: Creator & Business Platforms Indexes
    creator_profiles = db["creator_profiles"]
    await creator_profiles.create_index([("user_id", ASCENDING)], unique=True, name="idx_cp_user_id_unique")

    creator_verifications = db["creator_verifications"]
    await creator_verifications.create_index(
        [("user_id", ASCENDING), ("status", ASCENDING)],
        name="idx_cv_user_status",
    )

    creator_events = db["creator_events"]
    await creator_events.create_index([("creator_id", ASCENDING)], name="idx_ce_creator_id")
    await creator_events.create_index([("scheduled_at", DESCENDING)], name="idx_ce_scheduled_desc")

    business_profiles = db["business_profiles"]
    await business_profiles.create_index([("user_id", ASCENDING)], unique=True, name="idx_bp_user_id_unique")

    campaigns = db["campaigns"]
    await campaigns.create_index([("business_id", ASCENDING)], name="idx_cmp_business_id")
    await campaigns.create_index(
        [("status", ASCENDING), ("created_at", DESCENDING)],
        name="idx_cmp_status_created",
    )

    collab_applications = db["collab_applications"]
    await collab_applications.create_index(
        [("campaign_id", ASCENDING), ("creator_id", ASCENDING)],
        unique=True,
        name="idx_ca_campaign_creator_unique",
    )
    await collab_applications.create_index([("creator_id", ASCENDING)], name="idx_ca_creator_id")

    # Phase 11: Moderation & Trust Layer Indexes
    content_reports = db["content_reports"]
    await content_reports.create_index(
        [("reporter_id", ASCENDING), ("target_type", ASCENDING), ("target_id", ASCENDING)],
        name="idx_cr_reporter_target",
    )
    await content_reports.create_index(
        [("status", ASCENDING), ("priority", DESCENDING), ("created_at", DESCENDING)],
        name="idx_cr_status_priority_created",
    )
    await content_reports.create_index(
        [("target_type", ASCENDING), ("target_id", ASCENDING)],
        name="idx_cr_target_lookup",
    )

    moderation_actions = db["moderation_actions"]
    await moderation_actions.create_index([("report_id", ASCENDING)], name="idx_ma_report_id")
    await moderation_actions.create_index(
        [("moderator_id", ASCENDING), ("created_at", DESCENDING)],
        name="idx_ma_moderator_created",
    )
    await moderation_actions.create_index([("target_type", ASCENDING), ("target_id", ASCENDING)], name="idx_ma_target")

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
