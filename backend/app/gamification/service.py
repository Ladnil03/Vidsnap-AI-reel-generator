"""
Gamification Service Implementation.
Handles XP awarding with anti-abuse daily caps, idempotent transaction ledger,
dynamic level calculation, declarative badge evaluation, timezone-aware streaks,
daily/weekly quest progress, and Redis ZSET leaderboards with in-memory fallbacks.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from pymongo import DESCENDING
from pymongo.errors import DuplicateKeyError

from backend.app.core.database import get_db
from backend.app.core.redis import get_redis
from backend.app.gamification.models import (
    ACTION_XP_VALUES,
    DAILY_ACTION_CAPS,
    AwardXPResponse,
    Badge,
    BadgeCategory,
    Challenge,
    GamificationProfile,
    LeaderboardEntry,
    LeaderboardResponse,
    LeaderboardScope,
    StreakScope,
    StreakState,
    UserBadge,
    UserChallenge,
    UserLevel,
    XPAction,
    XPLedgerEntry,
)

logger = logging.getLogger(__name__)

# Standard declarative badge catalog
BADGE_CATALOG: list[Badge] = [
    Badge(
        badge_id="first_watch",
        name="First Look 👁️",
        description="Watched your first reel on VidSnap",
        icon="👁️",
        category=BadgeCategory.WATCH,
        threshold=1,
        action_type="watch_reel",
    ),
    Badge(
        badge_id="binge_watcher",
        name="Binge Watcher 🍿",
        description="Watched 25 reels",
        icon="🍿",
        category=BadgeCategory.WATCH,
        threshold=25,
        action_type="watch_reel",
    ),
    Badge(
        badge_id="cinema_virtuoso",
        name="Cinema Virtuoso 🎬",
        description="Watched 100 reels",
        icon="🎬",
        category=BadgeCategory.WATCH,
        threshold=100,
        action_type="watch_reel",
    ),
    Badge(
        badge_id="creator_spark",
        name="Creator Spark 💡",
        description="Created your first reel",
        icon="💡",
        category=BadgeCategory.CREATION,
        threshold=1,
        action_type="create_reel",
    ),
    Badge(
        badge_id="content_machine",
        name="Content Machine ⚡",
        description="Created 10 reels",
        icon="⚡",
        category=BadgeCategory.CREATION,
        threshold=10,
        action_type="create_reel",
    ),
    Badge(
        badge_id="on_fire",
        name="On Fire 🔥",
        description="Maintained a 3-day daily streak",
        icon="🔥",
        category=BadgeCategory.STREAK,
        threshold=3,
        action_type="streak_days",
    ),
    Badge(
        badge_id="week_glory",
        name="Week of Glory ⚡",
        description="Maintained a 7-day daily streak",
        icon="⚡",
        category=BadgeCategory.STREAK,
        threshold=7,
        action_type="streak_days",
    ),
    Badge(
        badge_id="unstoppable",
        name="Unstoppable 🏆",
        description="Maintained a 30-day daily streak",
        icon="🏆",
        category=BadgeCategory.STREAK,
        threshold=30,
        action_type="streak_days",
    ),
    Badge(
        badge_id="social_butterfly",
        name="Social Butterfly 🦋",
        description="Liked 20 reels",
        icon="🦋",
        category=BadgeCategory.SOCIAL,
        threshold=20,
        action_type="like_reel",
    ),
    Badge(
        badge_id="reel_critic",
        name="Reel Critic ✍️",
        description="Commented on 10 reels",
        icon="✍️",
        category=BadgeCategory.SOCIAL,
        threshold=10,
        action_type="comment_reel",
    ),
    Badge(
        badge_id="party_starter",
        name="Party Starter 🎉",
        description="Hosted a Watch Together party room",
        icon="🎉",
        category=BadgeCategory.SPECIAL,
        threshold=1,
        action_type="watch_party_host",
    ),
    Badge(
        badge_id="century_club",
        name="Century Club 💯",
        description="Reached Creator Rank (Level 10)",
        icon="💯",
        category=BadgeCategory.SPECIAL,
        threshold=10,
        action_type="level_milestone",
    ),
]

# In-memory leaderboard fallback stores
_in_memory_leaderboard_all_time: dict[str, int] = {}
_in_memory_leaderboard_weekly: dict[str, dict[str, int]] = {}


class GamificationService:
    """Core domain service for gamification and engagement."""

    @classmethod
    def _get_weekly_key(cls, dt: datetime | None = None) -> str:
        """Derive weekly leaderboard identifier e.g. 2026-W38."""
        target = dt or datetime.now(timezone.utc)
        iso_year, iso_week, _ = target.isocalendar()
        return f"leaderboard:weekly:{iso_year}-W{iso_week:02d}"

    @classmethod
    async def award_xp(
        cls,
        user_id: str,
        action: XPAction,
        idempotency_key: str,
        amount: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AwardXPResponse:
        """
        Award XP idempotently with anti-abuse daily limits and level progression.
        """
        db = get_db()
        ledger_col = db["xp_ledger"]

        # 1. Check idempotency
        existing = await ledger_col.find_one({"idempotency_key": idempotency_key})
        if existing:
            current_lvl = await cls.get_user_level(user_id)
            return AwardXPResponse(
                awarded=False,
                amount=existing.get("amount", 0),
                action=action,
                new_total_xp=current_lvl.current_xp,
                current_level=current_lvl.level,
                leveled_up=False,
                message="Action already awarded (idempotent request)",
            )

        # 2. Determine base amount
        base_amount = amount if amount is not None else ACTION_XP_VALUES.get(action, 10)

        # 3. Check anti-abuse daily caps (race-safe via atomic counter document)
        cap = DAILY_ACTION_CAPS.get(action)
        awarded_amount = base_amount
        counter_id = None

        if cap is not None and cap > 0:
            now_utc = datetime.now(timezone.utc)
            today_date_str = now_utc.strftime("%Y-%m-%d")
            counter_id = f"{user_id}:{action.value}:{today_date_str}"
            counter_col = db["daily_xp_caps"]

            try:
                counter_doc = await counter_col.find_one_and_update(
                    {"_id": counter_id, "total": {"$lt": cap}},
                    {
                        "$inc": {"total": base_amount},
                        "$setOnInsert": {
                            "user_id": user_id,
                            "action": action.value,
                            "date": today_date_str,
                        },
                    },
                    upsert=True,
                    return_document=True,
                )
            except DuplicateKeyError:
                counter_doc = None

            if not counter_doc:
                current_lvl = await cls.get_user_level(user_id)
                return AwardXPResponse(
                    awarded=False,
                    amount=0,
                    action=action,
                    new_total_xp=current_lvl.current_xp,
                    current_level=current_lvl.level,
                    leveled_up=False,
                    message=f"Daily XP limit reached for {action.value} (cap: {cap} XP)",
                )

            new_total = counter_doc.get("total", base_amount)
            if new_total > cap:
                awarded_amount = cap - (new_total - base_amount)
                await counter_col.update_one({"_id": counter_id}, {"$set": {"total": cap}})
            else:
                awarded_amount = base_amount

        if awarded_amount <= 0:
            current_lvl = await cls.get_user_level(user_id)
            return AwardXPResponse(
                awarded=False,
                amount=0,
                action=action,
                new_total_xp=current_lvl.current_xp,
                current_level=current_lvl.level,
                leveled_up=False,
                message="No XP eligible for award",
            )

        # 4. Insert ledger entry (with DuplicateKeyError catch)
        entry = XPLedgerEntry(
            entry_id=str(uuid.uuid4()),
            user_id=user_id,
            action=action,
            amount=awarded_amount,
            idempotency_key=idempotency_key,
            metadata=metadata or {},
        )
        try:
            await ledger_col.insert_one(entry.model_dump())
        except DuplicateKeyError:
            if counter_id:
                await db["daily_xp_caps"].update_one(
                    {"_id": counter_id}, {"$inc": {"total": -awarded_amount}}
                )
            current_lvl = await cls.get_user_level(user_id)
            existing = await ledger_col.find_one({"idempotency_key": idempotency_key})
            return AwardXPResponse(
                awarded=False,
                amount=existing.get("amount", 0) if existing else 0,
                action=action,
                new_total_xp=current_lvl.current_xp,
                current_level=current_lvl.level,
                leveled_up=False,
                message="Action already awarded (idempotent request)",
            )

        # 5. Fetch previous level and update total XP atomically
        levels_col = db["user_levels"]
        user_record = await levels_col.find_one({"user_id": user_id})
        prev_xp = user_record.get("total_xp", 0) if user_record else 0
        prev_level_obj = UserLevel.calculate(user_id, prev_xp)

        new_xp = prev_xp + awarded_amount
        new_level_obj = UserLevel.calculate(user_id, new_xp)
        leveled_up = new_level_obj.level > prev_level_obj.level

        await levels_col.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "total_xp": new_xp,
                    "level": new_level_obj.level,
                    "title": new_level_obj.title,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )

        # If leveled up, grant +1 freeze token
        if leveled_up:
            streaks_col = db["user_streaks"]
            await streaks_col.update_one(
                {"user_id": user_id, "scope": StreakScope.DAILY.value},
                {"$inc": {"freeze_tokens": 1}},
                upsert=False,
            )

        # 6. Update Leaderboards (Redis + in-memory fallback)
        weekly_key = cls._get_weekly_key()
        redis_client = get_redis()
        if redis_client is not None:
            try:
                await redis_client.zincrby("leaderboard:all_time", awarded_amount, user_id)
                await redis_client.zincrby(weekly_key, awarded_amount, user_id)
                await redis_client.expire(weekly_key, 1209600)  # 14 days TTL
            except Exception as e:
                logger.warning("Redis leaderboard update failed, falling back to memory: %s", e)

        # Update in-memory fallback stores
        _in_memory_leaderboard_all_time[user_id] = (
            _in_memory_leaderboard_all_time.get(user_id, 0) + awarded_amount
        )
        week_dict = _in_memory_leaderboard_weekly.setdefault(weekly_key, {})
        week_dict[user_id] = week_dict.get(user_id, 0) + awarded_amount

        # 7. Update active quests matching this action
        await cls._increment_matching_challenges(user_id, action)

        # 8. Evaluate Badges automatically
        await cls.evaluate_badges(user_id)

        return AwardXPResponse(
            awarded=True,
            amount=awarded_amount,
            action=action,
            new_total_xp=new_xp,
            current_level=new_level_obj.level,
            leveled_up=leveled_up,
            message=f"Awarded +{awarded_amount} XP!"
            + (f" 🎉 Leveled up to Level {new_level_obj.level} ({new_level_obj.title})!" if leveled_up else ""),
        )

    @classmethod
    async def get_user_level(cls, user_id: str) -> UserLevel:
        """Retrieve dynamic level progression and rank title for user."""
        db = get_db()
        record = await db["user_levels"].find_one({"user_id": user_id})
        total_xp = record.get("total_xp", 0) if record else 0
        return UserLevel.calculate(user_id, total_xp)

    @classmethod
    async def record_streak_activity(
        cls,
        user_id: str,
        scope: StreakScope = StreakScope.DAILY,
        target_id: str | None = None,
        date_str: str | None = None,
    ) -> StreakState:
        """
        Record streak activity for current day.
        Handles consecutive day progression, missed day freeze rescue, and milestone rewards.
        """
        db = get_db()
        streaks_col = db["user_streaks"]

        # If date_str is not provided (e.g. from client API), derive server-side in user's timezone.
        if date_str:
            today_str = date_str
        else:
            user_doc = await db.users.find_one({"user_id": user_id})
            tz_name = user_doc.get("timezone", "UTC") if user_doc else "UTC"
            try:
                import zoneinfo
                user_tz = zoneinfo.ZoneInfo(tz_name)
            except Exception:
                user_tz = timezone.utc
            today_str = datetime.now(user_tz).strftime("%Y-%m-%d")

        today_date = datetime.strptime(today_str, "%Y-%m-%d").date()

        filter_query = {
            "user_id": user_id,
            "scope": scope.value,
            "target_id": target_id,
        }
        record = await streaks_col.find_one(filter_query)

        if not record:
            # First active day
            new_state = StreakState(
                scope=scope,
                target_id=target_id,
                current_streak=1,
                longest_streak=1,
                last_active_date=today_str,
                freeze_tokens=2,
                is_frozen_today=False,
            )
            doc = new_state.model_dump()
            doc["user_id"] = user_id
            await streaks_col.insert_one(doc)

            # Award streak activity XP
            await cls.award_xp(
                user_id=user_id,
                action=XPAction.DAILY_LOGIN,
                idempotency_key=f"streak_login:{user_id}:{today_str}",
            )
            return new_state

        last_date_str = record.get("last_active_date")
        current_streak = record.get("current_streak", 0)
        longest_streak = record.get("longest_streak", 0)
        freeze_tokens = record.get("freeze_tokens", 2)
        is_frozen_today = record.get("is_frozen_today", False)

        if last_date_str == today_str:
            # Already active today
            return StreakState(
                scope=scope,
                target_id=target_id,
                current_streak=current_streak,
                longest_streak=longest_streak,
                last_active_date=last_date_str,
                freeze_tokens=freeze_tokens,
                is_frozen_today=is_frozen_today,
            )

        last_date = datetime.strptime(last_date_str, "%Y-%m-%d").date()
        diff_days = (today_date - last_date).days

        if diff_days == 1:
            # Consecutive day!
            current_streak += 1
            is_frozen_today = False
        elif diff_days == 2 and freeze_tokens > 0:
            # Missed exactly 1 day, auto-consume freeze shield
            freeze_tokens -= 1
            current_streak += 1
            is_frozen_today = True
        elif diff_days > 1:
            # Streak broken
            current_streak = 1
            is_frozen_today = False
        elif diff_days <= 0:
            # Date in past, do not alter streak
            return StreakState(
                scope=scope,
                target_id=target_id,
                current_streak=current_streak,
                longest_streak=longest_streak,
                last_active_date=last_date_str,
                freeze_tokens=freeze_tokens,
                is_frozen_today=is_frozen_today,
            )

        longest_streak = max(longest_streak, current_streak)

        await streaks_col.update_one(
            filter_query,
            {
                "$set": {
                    "current_streak": current_streak,
                    "longest_streak": longest_streak,
                    "last_active_date": today_str,
                    "freeze_tokens": freeze_tokens,
                    "is_frozen_today": is_frozen_today,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        # Check for 7-day milestone
        if current_streak > 0 and current_streak % 7 == 0:
            await cls.award_xp(
                user_id=user_id,
                action=XPAction.STREAK_MILESTONE,
                idempotency_key=f"streak_milestone:{user_id}:{current_streak}:{today_str}",
                amount=70,
                metadata={"streak_length": current_streak},
            )
            # Award an extra freeze token on 7-day milestone
            await streaks_col.update_one(filter_query, {"$inc": {"freeze_tokens": 1}})
            freeze_tokens += 1
        else:
            await cls.award_xp(
                user_id=user_id,
                action=XPAction.DAILY_LOGIN,
                idempotency_key=f"streak_login:{user_id}:{today_str}",
            )

        # Evaluate streak badges
        await cls.evaluate_badges(user_id)

        return StreakState(
            scope=scope,
            target_id=target_id,
            current_streak=current_streak,
            longest_streak=longest_streak,
            last_active_date=today_str,
            freeze_tokens=freeze_tokens,
            is_frozen_today=is_frozen_today,
        )

    @classmethod
    async def use_freeze_token(
        cls,
        user_id: str,
        scope: StreakScope = StreakScope.DAILY,
        target_id: str | None = None,
    ) -> StreakState:
        """Consume a streak freeze token to protect against a missed day."""
        db = get_db()
        streaks_col = db["user_streaks"]

        filter_query = {
            "user_id": user_id,
            "scope": scope.value,
            "target_id": target_id,
        }
        record = await streaks_col.find_one(filter_query)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active streak found to freeze",
            )

        freeze_tokens = record.get("freeze_tokens", 0)
        if freeze_tokens <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No streak freeze tokens available",
            )

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if record.get("is_frozen_today", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Streak is already protected for today",
            )

        await streaks_col.update_one(
            filter_query,
            {
                "$inc": {"freeze_tokens": -1},
                "$set": {
                    "is_frozen_today": True,
                    "last_active_date": today_str,
                    "updated_at": datetime.now(timezone.utc),
                },
            },
        )

        return StreakState(
            scope=scope,
            target_id=target_id,
            current_streak=record.get("current_streak", 1),
            longest_streak=record.get("longest_streak", 1),
            last_active_date=today_str,
            freeze_tokens=freeze_tokens - 1,
            is_frozen_today=True,
        )

    @classmethod
    def _generate_period_challenges(cls) -> list[Challenge]:
        """Generate active daily and weekly quest templates."""
        now_utc = datetime.now(timezone.utc)
        # End of day UTC
        end_of_day = now_utc.replace(hour=23, minute=59, second=59, microsecond=999999)
        # End of week (Sunday 23:59:59 UTC)
        days_ahead = 6 - now_utc.weekday()
        end_of_week = (now_utc.replace(hour=23, minute=59, second=59, microsecond=999999)).replace(
            day=now_utc.day + days_ahead
        )

        return [
            Challenge(
                challenge_id="daily_watch_3",
                title="Watch 3 Reels",
                description="Enjoy 3 reels from community creators",
                action=XPAction.WATCH_REEL,
                target_count=3,
                reward_xp=30,
                is_weekly=False,
                icon="👀",
                expires_at=end_of_day,
            ),
            Challenge(
                challenge_id="daily_like_2",
                title="Spread the Love",
                description="Like 2 reels that made you smile",
                action=XPAction.LIKE_REEL,
                target_count=2,
                reward_xp=20,
                is_weekly=False,
                icon="❤️",
                expires_at=end_of_day,
            ),
            Challenge(
                challenge_id="daily_comment_1",
                title="Voice Your Thoughts",
                description="Leave a constructive comment on a reel",
                action=XPAction.COMMENT_REEL,
                target_count=1,
                reward_xp=25,
                is_weekly=False,
                icon="💬",
                expires_at=end_of_day,
            ),
            Challenge(
                challenge_id="weekly_watch_20",
                title="Marathon Viewer",
                description="Watch 20 reels throughout the week",
                action=XPAction.WATCH_REEL,
                target_count=20,
                reward_xp=150,
                is_weekly=True,
                icon="🍿",
                expires_at=end_of_week,
            ),
            Challenge(
                challenge_id="weekly_create_1",
                title="Creator's Spotlight",
                description="Publish 1 new reel to the community",
                action=XPAction.CREATE_REEL,
                target_count=1,
                reward_xp=150,
                is_weekly=True,
                icon="🎨",
                expires_at=end_of_week,
            ),
        ]

    @classmethod
    async def get_active_challenges(cls, user_id: str) -> list[UserChallenge]:
        """Fetch all daily and weekly challenges with user progress."""
        db = get_db()
        challenges_col = db["user_challenges"]
        now_utc = datetime.now(timezone.utc)
        today_key = now_utc.strftime("%Y-%m-%d")
        week_key = cls._get_weekly_key(now_utc)

        templates = cls._generate_period_challenges()
        result: list[UserChallenge] = []

        for ch in templates:
            period_key = week_key if ch.is_weekly else today_key
            record = await challenges_col.find_one({
                "user_id": user_id,
                "challenge_id": ch.challenge_id,
                "period_key": period_key,
            })

            current_count = record.get("current_count", 0) if record else 0
            is_claimed = record.get("is_claimed", False) if record else False
            is_completed = current_count >= ch.target_count

            result.append(
                UserChallenge(
                    challenge_id=ch.challenge_id,
                    title=ch.title,
                    description=ch.description,
                    action=ch.action,
                    target_count=ch.target_count,
                    current_count=current_count,
                    reward_xp=ch.reward_xp,
                    is_completed=is_completed,
                    is_claimed=is_claimed,
                    is_weekly=ch.is_weekly,
                    icon=ch.icon,
                    expires_at=ch.expires_at,
                )
            )

        return result

    @classmethod
    async def _increment_matching_challenges(cls, user_id: str, action: XPAction) -> None:
        """Increment challenge progress when a matching action occurs."""
        db = get_db()
        challenges_col = db["user_challenges"]
        now_utc = datetime.now(timezone.utc)
        today_key = now_utc.strftime("%Y-%m-%d")
        week_key = cls._get_weekly_key(now_utc)

        templates = [ch for ch in cls._generate_period_challenges() if ch.action == action]
        for ch in templates:
            period_key = week_key if ch.is_weekly else today_key
            await challenges_col.update_one(
                {
                    "user_id": user_id,
                    "challenge_id": ch.challenge_id,
                    "period_key": period_key,
                },
                {
                    "$inc": {"current_count": 1},
                    "$setOnInsert": {"is_claimed": False, "created_at": now_utc},
                },
                upsert=True,
            )

    @classmethod
    async def claim_challenge_reward(cls, user_id: str, challenge_id: str) -> AwardXPResponse:
        """Claim XP reward for a completed challenge."""
        db = get_db()
        challenges_col = db["user_challenges"]
        now_utc = datetime.now(timezone.utc)
        today_key = now_utc.strftime("%Y-%m-%d")
        week_key = cls._get_weekly_key(now_utc)

        # Match template
        template = next(
            (ch for ch in cls._generate_period_challenges() if ch.challenge_id == challenge_id),
            None,
        )
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Challenge '{challenge_id}' not found",
            )

        period_key = week_key if template.is_weekly else today_key
        # Atomically check progress >= target_count and mark claimed to prevent race conditions
        updated_record = await challenges_col.find_one_and_update(
            {
                "user_id": user_id,
                "challenge_id": challenge_id,
                "period_key": period_key,
                "current_count": {"$gte": template.target_count},
                "is_claimed": {"$ne": True},
            },
            {"$set": {"is_claimed": True, "claimed_at": now_utc}},
            return_document=True,
        )
        if not updated_record:
            existing = await challenges_col.find_one({
                "user_id": user_id,
                "challenge_id": challenge_id,
                "period_key": period_key,
            })
            if not existing or existing.get("current_count", 0) < template.target_count:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Challenge target count not yet reached",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reward already claimed for this period",
            )

        # Award XP
        idempotency_key = f"quest:{user_id}:{challenge_id}:{period_key}"
        return await cls.award_xp(
            user_id=user_id,
            action=XPAction.CHALLENGE_COMPLETED,
            idempotency_key=idempotency_key,
            amount=template.reward_xp,
            metadata={"challenge_id": challenge_id, "period_key": period_key},
        )

    @classmethod
    async def evaluate_badges(cls, user_id: str) -> list[UserBadge]:
        """
        Evaluate and unlock declarative achievement badges for user.
        Returns newly unlocked badges.
        """
        db = get_db()
        badges_col = db["user_badges"]
        ledger_col = db["xp_ledger"]

        existing_cursor = badges_col.find({"user_id": user_id})
        existing_badge_ids = {b["badge_id"] async for b in existing_cursor}

        newly_unlocked: list[UserBadge] = []

        # Fetch metrics needed for badge thresholds
        # 1. Total counts by action
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        ]
        action_counts = {item["_id"]: item["count"] async for item in ledger_col.aggregate(pipeline)}

        # 2. Longest streak
        streak_doc = await db["user_streaks"].find_one({
            "user_id": user_id,
            "scope": StreakScope.DAILY.value,
        })
        longest_streak = streak_doc.get("longest_streak", 0) if streak_doc else 0

        # 3. Current level
        level_doc = await db["user_levels"].find_one({"user_id": user_id})
        user_level = level_doc.get("level", 1) if level_doc else 1

        for badge in BADGE_CATALOG:
            if badge.badge_id in existing_badge_ids:
                continue

            qualified = False
            if badge.action_type == "watch_reel":
                qualified = action_counts.get(XPAction.WATCH_REEL.value, 0) >= badge.threshold
            elif badge.action_type == "create_reel":
                qualified = action_counts.get(XPAction.CREATE_REEL.value, 0) >= badge.threshold
            elif badge.action_type == "like_reel":
                qualified = action_counts.get(XPAction.LIKE_REEL.value, 0) >= badge.threshold
            elif badge.action_type == "comment_reel":
                qualified = action_counts.get(XPAction.COMMENT_REEL.value, 0) >= badge.threshold
            elif badge.action_type == "watch_party_host":
                qualified = action_counts.get(XPAction.WATCH_PARTY_HOST.value, 0) >= badge.threshold
            elif badge.action_type == "streak_days":
                qualified = longest_streak >= badge.threshold
            elif badge.action_type == "level_milestone":
                qualified = user_level >= badge.threshold

            if qualified:
                unlocked_badge = UserBadge(
                    badge_id=badge.badge_id,
                    user_id=user_id,
                    name=badge.name,
                    description=badge.description,
                    icon=badge.icon,
                    category=badge.category,
                )
                await badges_col.insert_one(unlocked_badge.model_dump())
                newly_unlocked.append(unlocked_badge)

        return newly_unlocked

    @classmethod
    async def get_user_badges(cls, user_id: str) -> list[UserBadge]:
        """Fetch all badges unlocked by user."""
        db = get_db()
        cursor = db["user_badges"].find({"user_id": user_id}).sort("unlocked_at", DESCENDING)
        items = await cursor.to_list(100)
        return [UserBadge(**b) for b in items]

    @classmethod
    async def get_leaderboard(
        cls,
        scope: LeaderboardScope = LeaderboardScope.ALL_TIME,
        limit: int = 50,
        current_user_id: str | None = None,
    ) -> LeaderboardResponse:
        """
        Query global leaderboards via Redis Sorted Sets (ZSET) with automatic in-memory
        and MongoDB fallbacks.
        """
        db = get_db()
        limit = max(1, min(100, limit))
        weekly_key = cls._get_weekly_key()
        redis_key = "leaderboard:all_time" if scope == LeaderboardScope.ALL_TIME else weekly_key

        scores_map: dict[str, int] = {}
        redis_client = get_redis()

        if redis_client is not None:
            try:
                raw_entries = await redis_client.zrevrange(redis_key, 0, limit - 1, withscores=True)
                for uid, score in raw_entries:
                    scores_map[str(uid)] = int(score)
            except Exception as e:
                logger.warning("Redis leaderboard query failed: %s", e)

        # Fallback if Redis had no entries or was offline
        if not scores_map:
            if scope == LeaderboardScope.ALL_TIME:
                # 1. Try memory
                if _in_memory_leaderboard_all_time:
                    sorted_mem = sorted(
                        _in_memory_leaderboard_all_time.items(),
                        key=lambda x: x[1],
                        reverse=True,
                    )[:limit]
                    scores_map = {uid: score for uid, score in sorted_mem}
                else:
                    # 2. Query MongoDB user_levels
                    cursor = db["user_levels"].find().sort("total_xp", DESCENDING).limit(limit)
                    records = await cursor.to_list(limit)
                    for r in records:
                        scores_map[r["user_id"]] = r.get("total_xp", 0)
            else:
                # Weekly memory fallback
                week_mem = _in_memory_leaderboard_weekly.get(weekly_key, {})
                sorted_mem = sorted(week_mem.items(), key=lambda x: x[1], reverse=True)[:limit]
                scores_map = {uid: score for uid, score in sorted_mem}

        # Enrich user details
        user_ids = list(scores_map.keys())
        users_col = db["users"]
        user_profiles = {}
        if user_ids:
            u_cursor = users_col.find({"user_id": {"$in": user_ids}})
            async for u in u_cursor:
                user_profiles[u["user_id"]] = u

        entries: list[LeaderboardEntry] = []
        user_entry: LeaderboardEntry | None = None

        for rank_idx, (uid, score) in enumerate(scores_map.items(), start=1):
            u_info = user_profiles.get(uid, {})
            u_name = u_info.get("name") or u_info.get("email", f"User {uid[:6]}").split("@")[0]
            lvl_obj = UserLevel.calculate(uid, score)

            entry = LeaderboardEntry(
                rank=rank_idx,
                user_id=uid,
                username=u_info.get("username") or u_name.lower().replace(" ", "_"),
                display_name=u_name,
                avatar_url=u_info.get("avatar_url"),
                score=score,
                level=lvl_obj.level,
                title=lvl_obj.title,
            )
            entries.append(entry)

            if current_user_id and uid == current_user_id:
                user_entry = entry

        # If current user is not in top limit, look them up
        if current_user_id and not user_entry:
            user_level_obj = await cls.get_user_level(current_user_id)
            user_score = user_level_obj.current_xp

            # Estimate rank
            rank = 1
            if redis_client is not None:
                try:
                    rank_res = await redis_client.zrevrank(redis_key, current_user_id)
                    if rank_res is not None:
                        rank = rank_res + 1
                except Exception:
                    pass

            u_info = await users_col.find_one({"user_id": current_user_id}) or {}
            u_name = u_info.get("name") or u_info.get("email", f"User {current_user_id[:6]}").split("@")[0]
            user_entry = LeaderboardEntry(
                rank=rank,
                user_id=current_user_id,
                username=u_info.get("username") or u_name.lower().replace(" ", "_"),
                display_name=u_name,
                avatar_url=u_info.get("avatar_url"),
                score=user_score,
                level=user_level_obj.level,
                title=user_level_obj.title,
            )

        return LeaderboardResponse(
            scope=scope,
            entries=entries,
            user_entry=user_entry,
            total_participants=max(len(entries), len(scores_map)),
        )

    @classmethod
    async def get_gamification_profile(cls, user_id: str) -> GamificationProfile:
        """Aggregate full gamification state for a user."""
        db = get_db()
        level = await cls.get_user_level(user_id)

        # Streaks
        streak_cursor = db["user_streaks"].find({"user_id": user_id})
        streak_records = await streak_cursor.to_list(10)
        streaks = [
            StreakState(
                scope=r.get("scope", StreakScope.DAILY),
                target_id=r.get("target_id"),
                current_streak=r.get("current_streak", 0),
                longest_streak=r.get("longest_streak", 0),
                last_active_date=r.get("last_active_date"),
                freeze_tokens=r.get("freeze_tokens", 2),
                is_frozen_today=r.get("is_frozen_today", False),
            )
            for r in streak_records
        ]
        if not streaks:
            streaks = [StreakState()]

        freeze_tokens = streaks[0].freeze_tokens if streaks else 2

        # Active challenges
        challenges = await cls.get_active_challenges(user_id)

        # Badges
        unlocked_badges = await cls.get_user_badges(user_id)

        # Recent ledger
        ledger_cursor = (
            db["xp_ledger"]
            .find({"user_id": user_id})
            .sort("created_at", DESCENDING)
            .limit(10)
        )
        ledger_docs = await ledger_cursor.to_list(10)
        recent_ledger = [XPLedgerEntry(**doc) for doc in ledger_docs]

        return GamificationProfile(
            user_id=user_id,
            level=level,
            streaks=streaks,
            active_challenges=challenges,
            badges_unlocked=unlocked_badges,
            badges_unlocked_count=len(unlocked_badges),
            badges_total_count=len(BADGE_CATALOG),
            freeze_tokens_available=freeze_tokens,
            recent_xp_ledger=recent_ledger,
        )
