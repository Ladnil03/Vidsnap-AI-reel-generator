"""
WebSocket Gateway for Real-Time Watch Together Rooms.
Handles live bidirectional sync, presence heartbeats, chat broadcasting, emoji bursts, and pub/sub fan-out.
"""

import asyncio
import json
import logging
import re
import uuid
from typing import Any

from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from backend.app.core.llm_router import LLMRouter
from backend.app.core.redis import get_redis
from backend.app.core.security import decode_access_token
from backend.app.rooms.models import SyncActionRequest
from backend.app.rooms.service import RoomService

logger = logging.getLogger(__name__)

# Unique ID for this worker process — used to de-duplicate Redis pubsub messages.
_INSTANCE_ID = uuid.uuid4().hex

# Frame & message limits
_MAX_FRAME_BYTES = 4096  # 4 KB
_MAX_CHAT_TEXT_LENGTH = 500
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

# Known message types the gateway accepts
_KNOWN_MSG_TYPES = frozenset({"ping", "chat", "reaction", "sync_action", "assistant_prompt", "auth"})


class RoomConnectionManager:
    """Manages active WebSockets for a room with multi-instance broadcast support."""

    def __init__(self):
        # room_id -> set of WebSocket connections
        self._rooms: dict[str, set[WebSocket]] = {}
        # ws -> user metadata dict
        self._users: dict[WebSocket, dict[str, Any]] = {}
        # Single global pubsub listener task (if Redis is available)
        self._global_pubsub_task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket, room_id: str, user_data: dict[str, Any]) -> None:
        """Register a new authenticated WebSocket connection."""
        if websocket.client_state == WebSocketState.CONNECTING:
            await websocket.accept()
        if room_id not in self._rooms:
            self._rooms[room_id] = set()

        self._rooms[room_id].add(websocket)
        self._users[websocket] = user_data

        # Start global Redis subscriber if not already running
        self._ensure_global_subscriber()

        # Update presence in Redis
        await RoomService.update_presence(
            room_id=room_id,
            user_id=user_data["user_id"],
            user_name=user_data.get("name", "Viewer"),
        )

        # Notify other room members
        await self.broadcast(
            room_id,
            {
                "type": "user_joined",
                "user_id": user_data["user_id"],
                "user_name": user_data.get("name", "Viewer"),
            },
        )

    async def disconnect(self, websocket: WebSocket, room_id: str) -> None:
        """Unregister a disconnected WebSocket connection."""
        user_data = self._users.pop(websocket, None)
        if room_id in self._rooms:
            self._rooms[room_id].discard(websocket)
            if not self._rooms[room_id]:
                self._rooms.pop(room_id, None)

        if user_data:
            await RoomService.leave_room(room_id, user_data["user_id"])
            await self.broadcast(
                room_id,
                {
                    "type": "user_left",
                    "user_id": user_data["user_id"],
                    "user_name": user_data.get("name", "Viewer"),
                },
            )

    async def broadcast(self, room_id: str, message: dict[str, Any]) -> None:
        """Broadcast event to all local connections and publish to Redis for other worker nodes."""
        payload_str = json.dumps(message, default=str)

        # 1. Local broadcast
        connections = self._rooms.get(room_id, set()).copy()
        dead_connections = set()
        for ws in connections:
            try:
                await ws.send_text(payload_str)
            except Exception:
                dead_connections.add(ws)

        for dead_ws in dead_connections:
            await self.disconnect(dead_ws, room_id)

        # 2. Redis pub/sub publish for multi-worker scaling
        #    Envelope includes origin instance ID so the subscriber can skip
        #    messages that originated from this process (prevents double delivery).
        redis = get_redis()
        if redis:
            try:
                envelope = json.dumps({
                    "origin": _INSTANCE_ID,
                    "room_id": room_id,
                    "payload": payload_str,
                })
                await redis.publish(f"room_channel:{room_id}", envelope)
            except Exception as e:
                logger.debug("Redis publish failed (running single-instance): %s", e)

    def _ensure_global_subscriber(self) -> None:
        """Start a single global Redis psubscribe(room_channel:*) task if not already running."""
        if self._global_pubsub_task is not None and not self._global_pubsub_task.done():
            return
        redis = get_redis()
        if not redis:
            return

        async def _global_subscriber_loop():
            try:
                pubsub = redis.pubsub()
                await pubsub.psubscribe("room_channel:*")
                async for item in pubsub.listen():
                    if item and item.get("type") == "pmessage":
                        data_str = item.get("data")
                        if not data_str:
                            continue
                        try:
                            envelope = json.loads(data_str)
                        except (json.JSONDecodeError, TypeError):
                            continue
                        # Skip messages that originated from this instance
                        if envelope.get("origin") == _INSTANCE_ID:
                            continue
                        room_id = envelope.get("room_id")
                        payload = envelope.get("payload")
                        if not room_id or not payload:
                            continue
                        connections = self._rooms.get(room_id, set()).copy()
                        for ws in connections:
                            try:
                                await ws.send_text(payload)
                            except Exception:
                                pass
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.debug("Global Redis subscriber closed: %s", e)

        self._global_pubsub_task = asyncio.create_task(_global_subscriber_loop())

    async def shutdown(self) -> None:
        """Clean up global subscriber on application shutdown."""
        if self._global_pubsub_task and not self._global_pubsub_task.done():
            self._global_pubsub_task.cancel()
            self._global_pubsub_task = None


manager = RoomConnectionManager()


async def room_websocket_endpoint(websocket: WebSocket, room_id: str, token: str | None = None) -> None:
    """FastAPI WebSocket route handling room sync events, chat, and presence."""
    # 1. Authenticate connection
    user_payload = None
    if token:
        try:
            claims = decode_access_token(token)
            user_payload = {
                "user_id": claims.get("user_id") or claims.get("sub"),
                "name": claims.get("name") or claims.get("email", "Viewer"),
                "email": claims.get("email"),
                "token_exp": claims.get("exp"),
            }
        except Exception:
            user_payload = None

    if not user_payload:
        # Check first message for auth
        await websocket.accept()
        try:
            raw_init = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
            data = json.loads(raw_init)
            if data.get("type") == "auth" and data.get("token"):
                claims = decode_access_token(data["token"])
                user_payload = {
                    "user_id": claims.get("user_id") or claims.get("sub"),
                    "name": claims.get("name") or claims.get("email", "Viewer"),
                    "email": claims.get("email"),
                    "token_exp": claims.get("exp"),
                }
        except Exception:
            user_payload = None

        if not user_payload or not user_payload.get("user_id"):
            await websocket.close(code=4001, reason="Authentication failed")
            return

    # 2. Enforce room access before manager.connect
    try:
        await RoomService.assert_room_access(room_id, user_payload["user_id"])
    except HTTPException as e:
        code = 4004 if e.status_code == 404 else 4003
        if websocket.client_state == WebSocketState.CONNECTING:
            await websocket.accept()
        await websocket.close(code=code, reason=str(e.detail))
        return

    await manager.connect(websocket, room_id, user_payload)

    # 3. Main message dispatch loop
    try:
        while True:
            raw_msg = await websocket.receive_text()

            # --- W2-2: Frame size guard ---
            if len(raw_msg.encode("utf-8", errors="replace")) > _MAX_FRAME_BYTES:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "detail": f"Message too large (max {_MAX_FRAME_BYTES} bytes)",
                }))
                continue

            try:
                msg = json.loads(raw_msg)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")
            user_id = user_payload["user_id"]
            user_name = user_payload.get("name", "Viewer")

            # --- W2-2: Reject unknown message types ---
            if msg_type not in _KNOWN_MSG_TYPES:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "detail": f"Unknown message type: {msg_type}",
                }))
                continue

            # Heartbeat ping
            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                await RoomService.update_presence(room_id, user_id, user_name)

            # Chat message
            elif msg_type == "chat":
                text = msg.get("text", "").strip()
                # Strip control characters
                text = _CONTROL_CHAR_RE.sub("", text)

                # --- W2-2: Chat text length guard ---
                if len(text) > _MAX_CHAT_TEXT_LENGTH:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "detail": f"Chat message too long (max {_MAX_CHAT_TEXT_LENGTH} chars)",
                    }))
                    continue

                if text:
                    try:
                        saved_msg = await RoomService.add_chat_message(
                            room_id=room_id,
                            user_id=user_id,
                            user_name=user_name,
                            text=text,
                        )
                        await manager.broadcast(
                            room_id,
                            {
                                "type": "chat",
                                "message": saved_msg.model_dump(),
                            },
                        )
                    except HTTPException as e:
                        await websocket.send_json({"type": "error", "message": e.detail})

            # Floating emoji reaction burst
            elif msg_type == "reaction":
                emoji = msg.get("emoji", "🔥")
                await manager.broadcast(
                    room_id,
                    {
                        "type": "reaction",
                        "user_id": user_id,
                        "user_name": user_name,
                        "emoji": emoji,
                    },
                )

            # Watch Together playback synchronization action
            elif msg_type == "sync_action":
                action_data = SyncActionRequest(
                    action=msg.get("action", "pause"),
                    position_seconds=msg.get("position_seconds"),
                    playback_rate=msg.get("playback_rate"),
                    media_url=msg.get("media_url"),
                    media_title=msg.get("media_title"),
                    media_type=msg.get("media_type"),
                )
                try:
                    updated_watch = await RoomService.apply_sync_action(room_id, user_id, action_data)
                    await manager.broadcast(
                        room_id,
                        {
                            "type": "sync_state",
                            "watch_state": updated_watch.model_dump(),
                            "triggered_by": user_name,
                        },
                    )
                except Exception as e:
                    await websocket.send_text(
                        json.dumps({"type": "error", "detail": str(getattr(e, "detail", e))})
                    )

            # AI Room Assistant invocation
            elif msg_type == "assistant_prompt":
                prompt = msg.get("prompt", "").strip()
                if prompt:
                    # Echo query into chat
                    q_msg = await RoomService.add_chat_message(
                        room_id=room_id,
                        user_id=user_id,
                        user_name=user_name,
                        text=f"@{user_name}: {prompt}",
                    )
                    await manager.broadcast(room_id, {"type": "chat", "message": q_msg.model_dump()})

                    # Generate AI response
                    system = (
                        "You are VidSnap AI Assistant active in a Watch Party room. "
                        "Respond concisely in 1-2 friendly sentences to help or entertain the viewers."
                    )
                    ai_reply = await LLMRouter.generate_completion(prompt, system_prompt=system, max_tokens=150)
                    ai_msg = await RoomService.add_chat_message(
                        room_id=room_id,
                        user_id="vidsnap_ai",
                        user_name="VidSnap AI ✨",
                        text=ai_reply,
                        is_assistant=True,
                    )
                    await manager.broadcast(room_id, {"type": "chat", "message": ai_msg.model_dump()})

    except WebSocketDisconnect:
        await manager.disconnect(websocket, room_id)
    except Exception as e:
        logger.warning("Room WebSocket error for user %s: %s", user_payload.get("user_id"), e)
        await manager.disconnect(websocket, room_id)
