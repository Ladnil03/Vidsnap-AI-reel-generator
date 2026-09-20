"""
Unit tests for SocialService: follows, mutual friends, community groups, and profiles.
"""

import pytest
from fastapi import HTTPException

from backend.app.social.models import CommunityCategory, CommunityCreateRequest
from backend.app.social.service import SocialService


@pytest.mark.asyncio
async def test_follow_and_unfollow_user(mock_db):
    service = SocialService(mock_db)

    # Seed users with unique emails
    await mock_db.users.insert_one({
        "user_id": "u1",
        "name": "Alice",
        "email": "alice@test.io",
        "following_count": 0,
        "followers_count": 0,
    })
    await mock_db.users.insert_one({
        "user_id": "u2",
        "name": "Bob",
        "email": "bob@test.io",
        "following_count": 0,
        "followers_count": 0,
    })

    # Follow Bob
    res = await service.follow_user(follower_id="u1", target_user_id="u2")
    assert res.is_following is True
    assert res.is_friend is False

    u1 = await mock_db.users.find_one({"user_id": "u1"})
    u2 = await mock_db.users.find_one({"user_id": "u2"})
    assert u1["following_count"] == 1
    assert u2["followers_count"] == 1

    # Unfollow Bob
    unfollow_res = await service.unfollow_user(follower_id="u1", target_user_id="u2")
    assert unfollow_res.is_following is False

    u1 = await mock_db.users.find_one({"user_id": "u1"})
    u2 = await mock_db.users.find_one({"user_id": "u2"})
    assert u1["following_count"] == 0
    assert u2["followers_count"] == 0


@pytest.mark.asyncio
async def test_mutual_friendship_detection(mock_db):
    service = SocialService(mock_db)

    await mock_db.users.insert_one({"user_id": "u1", "name": "Alice", "email": "alice2@test.io"})
    await mock_db.users.insert_one({"user_id": "u2", "name": "Bob", "email": "bob2@test.io"})

    # Alice follows Bob
    await service.follow_user(follower_id="u1", target_user_id="u2")

    # Bob follows Alice -> Mutual friends!
    bob_res = await service.follow_user(follower_id="u2", target_user_id="u1")
    assert bob_res.is_following is True
    assert bob_res.is_friend is True

    # Check Alice's friends list
    friends = await service.get_friends(user_id="u1")
    assert friends.total == 1
    assert friends.items[0].user_id == "u2"
    assert friends.items[0].is_friend is True


@pytest.mark.asyncio
async def test_self_follow_prohibited(mock_db):
    service = SocialService(mock_db)
    await mock_db.users.insert_one({"user_id": "u1", "name": "Alice", "email": "alice_self@test.io"})

    with pytest.raises(HTTPException) as exc_info:
        await service.follow_user(follower_id="u1", target_user_id="u1")
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_community_lifecycle_and_memberships(mock_db):
    service = SocialService(mock_db)

    # Create community
    req = CommunityCreateRequest(
        name="AI Innovators",
        description="Hub for next-gen machine learning creators",
        category=CommunityCategory.TECH,
    )
    comm = await service.create_community(creator_id="creator_1", req=req)
    assert comm.name == "AI Innovators"
    assert comm.members_count == 1
    assert comm.is_member is True
    assert comm.role == "admin"

    # User 2 joins community
    join_res = await service.join_community(user_id="user_2", community_id=comm.community_id)
    assert join_res.members_count == 2
    assert join_res.is_member is True

    # User 2 leaves community
    leave_res = await service.leave_community(user_id="user_2", community_id=comm.community_id)
    assert leave_res.members_count == 1
    assert leave_res.is_member is False


@pytest.mark.asyncio
async def test_user_profile_social_metrics(mock_db):
    service = SocialService(mock_db)

    await mock_db.users.insert_one({
        "user_id": "creator_99",
        "name": "Sarah Connor",
        "email": "sarah@future.io",
        "bio": "Protecting the timeline",
        "followers_count": 42,
        "following_count": 10,
    })
    await mock_db.videos.insert_one({
        "video_id": "v1",
        "user_id": "creator_99",
        "status": "published",
        "title": "Resistance Reel",
    })

    profile = await service.get_user_profile(target_user_id="creator_99", current_user_id=None)
    assert profile.name == "Sarah Connor"
    assert profile.followers_count == 42
    assert profile.reels_count == 1
    assert profile.is_following is False
