"""
Regression tests for W1-10: AI Companion leaks non-public reels.
Ensures tool_search_reels and companion chat do not leak unlisted, private,
or unmoderated reels of other users, while allowing users to access their own reels.
"""

import pytest

from backend.app.ai_companion.service import CompanionService
from backend.app.ai_companion.tools import tool_create_playlist, tool_search_reels
from backend.app.content.models import ContentStatus, ContentVisibility


@pytest.mark.asyncio
async def test_companion_search_reels_excludes_other_user_private_and_unlisted(mock_db):
    """tool_search_reels must not return other users' private or unlisted reels."""
    # Other user creates:
    # 1. Public published reel
    await mock_db.videos.insert_one({
        "video_id": "vid_public_other",
        "user_id": "other_user_1",
        "title": "Public Awesome Reel",
        "description": "Everyone can see this",
        "status": ContentStatus.PUBLISHED.value,
        "visibility": ContentVisibility.PUBLIC.value,
        "moderation_status": "approved",
        "views_count": 100,
        "deleted": False,
    })
    # 2. Private reel
    await mock_db.videos.insert_one({
        "video_id": "vid_private_other",
        "user_id": "other_user_1",
        "title": "Secret Private Reel",
        "description": "Nobody else should see this",
        "status": ContentStatus.PUBLISHED.value,
        "visibility": ContentVisibility.PRIVATE.value,
        "moderation_status": "approved",
        "views_count": 100,
        "deleted": False,
    })
    # 3. Unlisted reel
    await mock_db.videos.insert_one({
        "video_id": "vid_unlisted_other",
        "user_id": "other_user_1",
        "title": "Unlisted Video Link Only",
        "description": "Do not recommend in discovery",
        "status": ContentStatus.PUBLISHED.value,
        "visibility": ContentVisibility.UNLISTED.value,
        "moderation_status": "approved",
        "views_count": 100,
        "deleted": False,
    })

    # User A searches reels
    results = await tool_search_reels(
        query="Reel",
        limit=10,
        current_user_id="user_a",
    )
    returned_ids = [r["reel_id"] for r in results]

    assert "vid_public_other" in returned_ids
    assert "vid_private_other" not in returned_ids
    assert "vid_unlisted_other" not in returned_ids


@pytest.mark.asyncio
async def test_companion_search_reels_allows_own_private_reels(mock_db):
    """Users talking to their companion can discover their own private reels."""
    await mock_db.videos.insert_one({
        "video_id": "vid_private_own",
        "user_id": "user_a",
        "title": "My Private Memory Reel",
        "description": "My own personal reel",
        "status": ContentStatus.PUBLISHED.value,
        "visibility": ContentVisibility.PRIVATE.value,
        "moderation_status": "approved",
        "views_count": 10,
        "deleted": False,
    })

    results = await tool_search_reels(
        query="Memory",
        limit=10,
        current_user_id="user_a",
    )
    returned_ids = [r["reel_id"] for r in results]
    assert "vid_private_own" in returned_ids


@pytest.mark.asyncio
async def test_companion_search_reels_excludes_unapproved_moderation(mock_db):
    """Flagged or unapproved reels must not be returned by AI companion."""
    await mock_db.videos.insert_one({
        "video_id": "vid_flagged_mod",
        "user_id": "other_user_2",
        "title": "Flagged Toxic Content",
        "description": "Pending or flagged",
        "status": ContentStatus.PUBLISHED.value,
        "visibility": ContentVisibility.PUBLIC.value,
        "moderation_status": "flagged",
        "views_count": 50,
        "deleted": False,
    })

    results = await tool_search_reels(
        query="Content",
        limit=10,
        current_user_id="user_a",
    )
    returned_ids = [r["reel_id"] for r in results]
    assert "vid_flagged_mod" not in returned_ids


@pytest.mark.asyncio
async def test_companion_chat_does_not_leak_other_user_private_reels(mock_db):
    """AI companion chat session must not search or return other users' private reels."""
    await mock_db.videos.insert_one({
        "video_id": "vid_secret_diary_77",
        "user_id": "victim_user_99",
        "title": "Secret Personal Diary Notes",
        "description": "Highly private confidential thoughts",
        "status": ContentStatus.PUBLISHED.value,
        "visibility": ContentVisibility.PRIVATE.value,
        "moderation_status": "approved",
        "views_count": 1,
        "deleted": False,
    })

    # User attacker asks companion to search for matching terms from victim's private video description
    from backend.app.ai_companion.models import CompanionChatRequest
    resp = await CompanionService.chat_with_companion(
        user_id="attacker_user_1",
        request=CompanionChatRequest(message="find confidential thoughts"),
    )
    # response must not contain or reference the private video
    assert "Secret Personal Diary" not in resp.message.content
    reels = resp.message.reels or []
    assert not any(r.get("reel_id") == "vid_secret_diary_77" for r in reels)


@pytest.mark.asyncio
async def test_companion_create_playlist_excludes_other_users_private_reels(mock_db):
    """tool_create_playlist must not include other users' private or unapproved reels."""
    await mock_db.videos.insert_one({
        "video_id": "vid_private_locked",
        "user_id": "victim_user_88",
        "title": "Locked Vault Reel",
        "description": "Private content",
        "status": ContentStatus.PUBLISHED.value,
        "visibility": ContentVisibility.PRIVATE.value,
        "moderation_status": "approved",
        "deleted": False,
    })

    playlist = await tool_create_playlist(
        user_id="attacker_user_2",
        title="Sneak Peek Playlist",
        reel_ids=["vid_private_locked"],
    )
    included_ids = [r["reel_id"] for r in playlist["reels"]]
    assert "vid_private_locked" not in included_ids
