"""
Rooms API & WebSocket Routes (/api/v1/rooms).
Provides endpoints for room discovery, lifecycle, Watch Together synchronization, and LiveKit tokens.
"""

from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    Query,
    WebSocket,
    status,
)

from backend.app.core.rate_limiter import rate_limit, rate_limit_per_user
from backend.app.identity.dependencies import get_current_user, get_optional_current_user
from backend.app.rooms.models import (
    ChatMessage,
    CreateRoomRequest,
    JoinRoomRequest,
    LiveKitTokenResponse,
    RoomResponse,
    RoomSummaryResponse,
    RoomType,
    SyncActionRequest,
    WatchState,
)
from backend.app.rooms.service import RoomService
from backend.app.rooms.ws_gateway import room_websocket_endpoint

router = APIRouter(prefix="/api/v1/rooms", tags=["Watch Together Rooms"])


@router.post(
    "",
    response_model=RoomResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_per_user(max_requests=10, window_seconds=60))],
)
async def create_room(
    request: CreateRoomRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> RoomResponse:
    """Create a new Watch Together party room."""
    return await RoomService.create_room(
        user_id=current_user["user_id"],
        user_name=current_user.get("name", "Host"),
        request=request,
    )


@router.get(
    "",
    response_model=list[RoomResponse],
    dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))],
)
async def list_rooms(
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    search: str | None = None,
    room_type: RoomType | None = None,
) -> list[RoomResponse]:
    """List active Watch Together rooms with search and visibility filters."""
    return await RoomService.list_rooms(
        skip=skip,
        limit=limit,
        search=search,
        room_type=room_type,
    )


@router.get(
    "/{room_id}",
    response_model=RoomResponse,
    dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))],
)
async def get_room_details(room_id: str) -> RoomResponse:
    """Get room details, current server-authoritative playback position, and participants."""
    return await RoomService.get_room(room_id)


@router.post(
    "/{room_id}/join",
    response_model=RoomResponse,
    dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))],
)
async def join_room(
    room_id: str,
    request: JoinRoomRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> RoomResponse:
    """Join room with optional passcode validation and mark participant presence."""
    return await RoomService.join_room(
        room_id=room_id,
        user_id=current_user["user_id"],
        user_name=current_user.get("name", "Viewer"),
        passcode=request.passcode,
    )


@router.post(
    "/{room_id}/leave",
    status_code=status.HTTP_200_OK,
)
async def leave_room(
    room_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, bool]:
    """Leave room and clean up active participant presence."""
    await RoomService.leave_room(room_id, current_user["user_id"])
    return {"left": True}


@router.post(
    "/{room_id}/sync",
    response_model=WatchState,
    dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))],
)
async def sync_playback_action(
    room_id: str,
    action: SyncActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> WatchState:
    """Update authoritative playback state (REST fallback for clients)."""
    return await RoomService.apply_sync_action(
        room_id=room_id,
        user_id=current_user["user_id"],
        action=action,
    )


@router.get(
    "/{room_id}/messages",
    response_model=list[ChatMessage],
    dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))],
)
async def get_room_messages(
    room_id: str,
    limit: int = Query(50, ge=1, le=100),
) -> list[ChatMessage]:
    """Fetch chronological chat history for a room."""
    return await RoomService.get_chat_history(room_id, limit=limit)


@router.post(
    "/{room_id}/rtc-token",
    response_model=LiveKitTokenResponse,
    dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))],
)
async def get_room_rtc_token(
    room_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> LiveKitTokenResponse:
    """Generate signed LiveKit WebRTC credentials for audio/video room participation."""
    return RoomService.get_rtc_credentials(
        room_id=room_id,
        user_id=current_user["user_id"],
        user_name=current_user.get("name", "Speaker"),
    )


@router.post(
    "/{room_id}/summary",
    response_model=RoomSummaryResponse,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)
async def get_room_ai_summary(
    room_id: str,
    current_user: dict[str, Any] = Depends(get_optional_current_user),
) -> RoomSummaryResponse:
    """Generate a 30-second AI Room Assistant catch-up summary."""
    return await RoomService.generate_room_recap(room_id)


# WebSocket Gateway Route
@router.websocket("/{room_id}/ws")
async def room_ws(websocket: WebSocket, room_id: str, token: str | None = None) -> None:
    """WebSocket bidirectional channel for Watch Together rooms."""
    await room_websocket_endpoint(websocket, room_id, token)
