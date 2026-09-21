"""
Rooms Domain Service.
Orchestrates Watch Together rooms, server-authoritative playback sync, presence tracking, and AI recaps.
"""

import logging
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from backend.app.core.adapters.factory import get_rtc_adapter
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.llm_router import LLMRouter
from backend.app.core.redis import get_redis
from backend.app.core.security import hash_token
from backend.app.rooms.models import (
    ChatMessage,
    ControlMode,
    CreateRoomRequest,
    LiveKitTokenResponse,
    MediaType,
    PlaybackState,
    RoomParticipant,
    RoomResponse,
    RoomSummaryResponse,
    RoomType,
    SyncActionRequest,
    WatchState,
)

logger = logging.getLogger(__name__)

# In-memory presence fallback when Redis is offline: room_id -> {user_id -> dict}
_MEM_PRESENCE: dict[str, dict[str, dict[str, Any]]] = {}


def _as_utc(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware in UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class RoomService:
    """Service handling Watch Together rooms, drift calculation, presence, and chat."""

    @classmethod
    async def _get_room_doc(cls, room_id: str) -> dict[str, Any]:
        """Fetch an active room or raise 404."""
        doc = await get_db().rooms.find_one({"room_id": room_id, "is_active": True})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
        return doc

    @classmethod
    async def assert_room_access(cls, room_id: str, user_id: str | None) -> dict[str, Any]:
        """
        Validate room existence, active state, and user membership/permissions.
        Returns the room document if access is granted.
        Raises 404 if room not found or inactive.
        Raises 403 if room is private and user is not authenticated or not a member/host.
        """
        doc = await cls._get_room_doc(room_id)
        if doc.get("room_type") == RoomType.PRIVATE.value:
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Authentication required to access this private room.",
                )
            if doc.get("host_id") == user_id:
                return doc
            member = await get_db().room_members.find_one({"room_id": room_id, "user_id": user_id})
            if not member:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not a member of this private room.",
                )
        return doc

    require_room_access = assert_room_access

    @classmethod
    async def create_room(
        cls,
        user_id: str,
        user_name: str,
        request: CreateRoomRequest,
    ) -> RoomResponse:
        """Create a new Watch Together party room."""
        db = get_db()
        room_id = f"room_{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc)

        initial_watch = WatchState(
            media_url=request.initial_media_url or "",
            media_title=request.initial_media_title or "Welcome to Watch Party",
            media_type=request.initial_media_type,
            state=PlaybackState.PAUSED,
            position_seconds=0.0,
            playback_rate=1.0,
            last_updated_at=now,
            updated_by_user_id=user_id,
        )

        doc: dict[str, Any] = {
            "room_id": room_id,
            "name": request.name.strip(),
            "description": request.description.strip(),
            "room_type": request.room_type.value,
            "passcode_hash": hash_token(request.passcode) if request.passcode else None,
            "control_mode": request.control_mode.value,
            "host_id": user_id,
            "host_name": user_name,
            "watch_state": initial_watch.model_dump(),
            "created_at": now,
            "is_active": True,
        }

        await db.rooms.insert_one(doc)

        # Persist admission: host is auto-added as member with role="host"
        await db.room_members.update_one(
            {"room_id": room_id, "user_id": user_id},
            {"$set": {"room_id": room_id, "user_id": user_id, "joined_at": now, "role": "host"}},
            upsert=True,
        )

        # Register host presence
        await cls.update_presence(room_id, user_id, user_name, is_host=True)

        # Award XP for hosting watch party room
        try:
            from backend.app.gamification.models import XPAction
            from backend.app.gamification.service import GamificationService
            await GamificationService.award_xp(
                user_id=user_id,
                action=XPAction.WATCH_PARTY_HOST,
                idempotency_key=f"watch_party_host:{user_id}:{room_id}",
            )
        except Exception as e:
            logger.debug("Gamification XP award on host room skipped: %s", e)

        return await cls.get_room(room_id, requester_user_id=user_id)

    @classmethod
    async def get_room(cls, room_id: str, requester_user_id: str | None = None) -> RoomResponse:
        """Retrieve room details and compute current server-authoritative playback position."""
        doc = await cls.assert_room_access(room_id, requester_user_id)

        watch_dict = doc.get("watch_state", {})
        watch_state = WatchState(**watch_dict)

        # Server-authoritative elapsed position computation
        now = datetime.now(timezone.utc)
        if watch_state.state == PlaybackState.PLAYING and watch_state.last_updated_at:
            delta_seconds = (now - _as_utc(watch_state.last_updated_at)).total_seconds()
            if delta_seconds > 0:
                watch_state.position_seconds += delta_seconds * watch_state.playback_rate

        participants = await cls.get_active_participants(room_id)

        return RoomResponse(
            room_id=doc["room_id"],
            name=doc["name"],
            description=doc.get("description", ""),
            room_type=RoomType(doc["room_type"]),
            control_mode=ControlMode(doc["control_mode"]),
            host_id=doc["host_id"],
            host_name=doc["host_name"],
            watch_state=watch_state,
            participant_count=len(participants),
            participants=participants,
            created_at=doc["created_at"],
        )

    @classmethod
    async def list_rooms(
        cls,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        room_type: RoomType | None = None,
    ) -> list[RoomResponse]:
        """List active rooms with optional search and type filters."""
        db = get_db()
        query: dict[str, Any] = {"is_active": True}

        if room_type:
            query["room_type"] = room_type.value
        else:
            # Default to public rooms only if not specified
            query["room_type"] = RoomType.PUBLIC.value

        if search:
            query["name"] = {"$regex": search, "$options": "i"}

        cursor = db.rooms.find(query).sort("created_at", -1).skip(skip).limit(limit)
        rooms: list[RoomResponse] = []
        async for doc in cursor:
            participants = await cls.get_active_participants(doc["room_id"])
            watch_state = WatchState(**doc.get("watch_state", {}))
            rooms.append(
                RoomResponse(
                    room_id=doc["room_id"],
                    name=doc["name"],
                    description=doc.get("description", ""),
                    room_type=RoomType(doc["room_type"]),
                    control_mode=ControlMode(doc["control_mode"]),
                    host_id=doc["host_id"],
                    host_name=doc["host_name"],
                    watch_state=watch_state,
                    participant_count=len(participants),
                    participants=participants[:5],  # Top 5 avatars for directory
                    created_at=doc["created_at"],
                )
            )
        return rooms

    @classmethod
    async def join_room(
        cls,
        room_id: str,
        user_id: str,
        user_name: str,
        passcode: str | None = None,
    ) -> RoomResponse:
        """Validate room access, record membership for private rooms, and set presence."""
        db = get_db()
        doc = await cls._get_room_doc(room_id)

        is_private = doc["room_type"] == RoomType.PRIVATE.value
        if is_private:
            expected_hash = doc.get("passcode_hash")
            provided = passcode or ""
            # Lazy migration for existing plaintext passcode
            if not expected_hash and doc.get("passcode"):
                old_passcode = doc.get("passcode")
                if secrets.compare_digest(provided, old_passcode):
                    expected_hash = hash_token(old_passcode)
                    await db.rooms.update_one(
                        {"room_id": room_id},
                        {"$set": {"passcode_hash": expected_hash}, "$unset": {"passcode": ""}},
                    )
            if not expected_hash or not secrets.compare_digest(hash_token(provided), expected_hash):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid room passcode. Please check credentials and try again.",
                )

        role = "host" if doc["host_id"] == user_id else "member"
        await db.room_members.update_one(
            {"room_id": room_id, "user_id": user_id},
            {
                "$setOnInsert": {
                    "room_id": room_id,
                    "user_id": user_id,
                    "joined_at": datetime.now(timezone.utc),
                    "role": role,
                }
            },
            upsert=True,
        )

        is_host = (doc["host_id"] == user_id)
        await cls.update_presence(room_id, user_id, user_name, is_host=is_host)
        return await cls.get_room(room_id, requester_user_id=user_id)

    @classmethod
    async def update_presence(
        cls,
        room_id: str,
        user_id: str,
        user_name: str,
        is_host: bool = False,
    ) -> None:
        """Store/refresh participant presence in Redis with TTL expiration, falling back to memory."""
        redis = get_redis()
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        presence_key = f"presence:{room_id}:{user_id}"
        val = f"{user_name}|{int(is_host)}|{now_iso}"

        if redis:
            await redis.set(presence_key, val, ex=settings.room_presence_ttl_seconds)
        else:
            if room_id not in _MEM_PRESENCE:
                _MEM_PRESENCE[room_id] = {}
            _MEM_PRESENCE[room_id][user_id] = {
                "name": user_name,
                "is_host": is_host,
                "last_seen_at": now,
            }

    @classmethod
    async def leave_room(cls, room_id: str, user_id: str) -> None:
        """Remove participant presence upon room departure and clean up private memberships."""
        redis = get_redis()
        if redis:
            await redis.delete(f"presence:{room_id}:{user_id}")
        else:
            if room_id in _MEM_PRESENCE:
                _MEM_PRESENCE[room_id].pop(user_id, None)

        db = get_db()
        doc = await db.rooms.find_one({"room_id": room_id, "is_active": True})
        if not doc or doc["room_type"] != RoomType.PRIVATE.value:
            return

        await db.room_members.delete_one({"room_id": room_id, "user_id": user_id})

        # A private room with no remaining members is cleaned up entirely
        member_count = await db.room_members.count_documents({"room_id": room_id})
        if member_count == 0:
            await db.room_members.delete_many({"room_id": room_id})
            await db.rooms.update_one({"room_id": room_id}, {"$set": {"is_active": False}})

    @classmethod
    async def get_active_participants(cls, room_id: str) -> list[RoomParticipant]:
        """Fetch list of currently online participants using Redis or memory fallback."""
        redis = get_redis()
        if redis:
            try:
                keys = await redis.keys(f"presence:{room_id}:*")
                if not keys:
                    return []

                participants: list[RoomParticipant] = []
                for key in keys:
                    val = await redis.get(key)
                    if val:
                        parts = val.split("|")
                        user_id = key.split(":")[-1]
                        name = parts[0] if len(parts) > 0 else "Viewer"
                        is_host = bool(int(parts[1])) if len(parts) > 1 else False
                        last_seen = datetime.fromisoformat(parts[2]) if len(parts) > 2 else datetime.now(timezone.utc)
                        participants.append(
                            RoomParticipant(
                                user_id=user_id,
                                name=name,
                                is_host=is_host,
                                last_seen_at=last_seen,
                            )
                        )
                return participants
            except Exception as e:
                logger.warning("Failed to query Redis presence for room %s: %s", room_id, e)
                return []
        else:
            now = datetime.now(timezone.utc)
            room_presence = _MEM_PRESENCE.get(room_id, {})
            participants: list[RoomParticipant] = []
            expired_users: list[str] = []
            for uid, info in room_presence.items():
                if (now - _as_utc(info["last_seen_at"])).total_seconds() > settings.room_presence_ttl_seconds:
                    expired_users.append(uid)
                else:
                    participants.append(
                        RoomParticipant(
                            user_id=uid,
                            name=info["name"],
                            is_host=info["is_host"],
                            last_seen_at=info["last_seen_at"],
                        )
                    )
            for uid in expired_users:
                room_presence.pop(uid, None)
            return participants

    @classmethod
    async def apply_sync_action(
        cls,
        room_id: str,
        user_id: str,
        action: SyncActionRequest,
    ) -> WatchState:
        """
        Apply a playback action to the room's server-authoritative state.
        Enforces room access and host permission in HOST_ONLY control mode.
        """
        await cls.require_room_access(room_id, user_id)
        db = get_db()
        doc = await cls._get_room_doc(room_id)

        # Permission check: host-only control mode guard
        is_host = (doc["host_id"] == user_id)
        if doc["control_mode"] == ControlMode.HOST_ONLY.value and not is_host:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the room host can control video playback in this room.",
            )

        current_watch = WatchState(**doc.get("watch_state", {}))
        now = datetime.now(timezone.utc)

        # Update fields based on action
        if action.action == "play":
            current_watch.state = PlaybackState.PLAYING
            if action.position_seconds is not None:
                current_watch.position_seconds = max(0.0, action.position_seconds)
            current_watch.last_updated_at = now
            current_watch.updated_by_user_id = user_id

        elif action.action == "pause":
            # Compute current position prior to pausing
            if current_watch.state == PlaybackState.PLAYING and current_watch.last_updated_at:
                elapsed = (now - _as_utc(current_watch.last_updated_at)).total_seconds()
                current_watch.position_seconds += max(0.0, elapsed * current_watch.playback_rate)

            current_watch.state = PlaybackState.PAUSED
            if action.position_seconds is not None:
                current_watch.position_seconds = max(0.0, action.position_seconds)
            current_watch.last_updated_at = now
            current_watch.updated_by_user_id = user_id

        elif action.action == "seek":
            if action.position_seconds is not None:
                current_watch.position_seconds = max(0.0, action.position_seconds)
            current_watch.last_updated_at = now
            current_watch.updated_by_user_id = user_id

        elif action.action == "change_media":
            if action.media_url:
                current_watch.media_url = action.media_url
                current_watch.media_title = action.media_title or "Selected Video"
                current_watch.media_type = action.media_type or MediaType.NATIVE
                current_watch.position_seconds = 0.0
                current_watch.state = PlaybackState.PAUSED
                current_watch.last_updated_at = now
                current_watch.updated_by_user_id = user_id

        elif action.action == "set_rate":
            if action.playback_rate is not None:
                current_watch.playback_rate = max(0.25, min(2.0, action.playback_rate))
                current_watch.last_updated_at = now
                current_watch.updated_by_user_id = user_id

        # Persist updated watch state in database
        await db.rooms.update_one(
            {"room_id": room_id},
            {"$set": {"watch_state": current_watch.model_dump()}},
        )

        return current_watch

    @classmethod
    async def add_chat_message(
        cls,
        room_id: str,
        user_id: str,
        user_name: str,
        text: str,
        is_system: bool = False,
        is_assistant: bool = False,
        avatar_url: str | None = None,
    ) -> ChatMessage:
        """Persist a chat message with capped history and 7-day TTL."""
        db = get_db()
        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        # Content Moderation check for user-generated chat messages
        if not is_system and not is_assistant:
            try:
                from backend.app.moderation.service import ModerationService
                mod_result = ModerationService.scan_content_text(text)
                if mod_result.recommendation == "block":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Message violates community safety guidelines.",
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.debug("Moderation check on chat message error: %s", e)

        msg = ChatMessage(
            message_id=msg_id,
            room_id=room_id,
            user_id=user_id,
            user_name=user_name,
            avatar_url=avatar_url,
            text=text.strip(),
            created_at=now,
            is_system=is_system,
            is_assistant=is_assistant,
        )

        await db.room_messages.insert_one(msg.model_dump())
        return msg

    @classmethod
    async def get_chat_history(
        cls, room_id: str, limit: int = 50, requester_user_id: str | None = None
    ) -> list[ChatMessage]:
        """Fetch recent chat messages ordered chronologically."""
        if requester_user_id is not None:
            await cls.assert_room_access(room_id, requester_user_id)
        db = get_db()
        cursor = db.room_messages.find({"room_id": room_id}).sort([("created_at", -1), ("_id", -1)]).limit(limit)
        messages: list[ChatMessage] = []
        async for doc in cursor:
            messages.append(ChatMessage(**doc))
        messages.reverse()
        return messages

    @classmethod
    async def get_rtc_credentials(cls, room_id: str, user_id: str, user_name: str) -> LiveKitTokenResponse:
        """Issue signed LiveKit WebRTC credentials for room voice/video participation."""
        await cls.assert_room_access(room_id, user_id)
        adapter = get_rtc_adapter()
        token = adapter.generate_token(
            room_name=room_id,
            participant_identity=user_id,
            participant_name=user_name,
            can_publish=True,
            can_subscribe=True,
        )
        return LiveKitTokenResponse(
            token=token,
            server_url=adapter.get_server_url(),
            room_name=room_id,
        )

    @classmethod
    async def generate_room_recap(cls, room_id: str, requester_user_id: str | None = None) -> RoomSummaryResponse:
        """Generate a 30-second AI catch-up recap of recent room discussions and reactions."""
        room = await cls.get_room(room_id, requester_user_id=requester_user_id)
        history = await cls.get_chat_history(room_id, limit=30, requester_user_id=requester_user_id)
        messages_dicts = [m.model_dump() for m in history]

        recap = await LLMRouter.generate_room_summary(
            messages=messages_dicts,
            room_name=room.name,
            current_media_title=room.watch_state.media_title,
        )

        return RoomSummaryResponse(
            room_id=room_id,
            summary=recap["summary"],
            highlights=recap["highlights"],
            generated_at=datetime.now(timezone.utc),
        )
