"""
Integration tests for Business REST API (/api/v1/business).
Tests profiles, campaigns, creator applications, brand-safety evaluation, and review flows.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from httpx import AsyncClient

from backend.app.business.service import BusinessService
from backend.app.identity.dependencies import get_current_user, get_optional_current_user
from backend.app.main import app


@pytest.fixture
def business_user():
    """Mock authenticated business advertiser user."""
    return {
        "user_id": "usr_biz_integ",
        "name": "Nova Audio Brand",
        "email": "contact@novaaudio.test",
        "roles": ["user", "business"],
    }


@pytest.fixture
def creator_applicant():
    """Mock authenticated creator applying to campaigns."""
    return {
        "user_id": "usr_creator_applicant",
        "name": "Audio Enthusiast",
        "email": "applicant@creator.test",
        "roles": ["user", "creator"],
    }


@pytest.mark.asyncio
async def test_business_profile_and_campaign_api(
    async_client: AsyncClient, mock_db, business_user: dict[str, Any]
):
    """Test business profile registration and campaign publication."""
    app.dependency_overrides[get_current_user] = lambda: business_user
    app.dependency_overrides[get_optional_current_user] = lambda: business_user

    try:
        # 1. Create business profile
        prof_res = await async_client.post(
            "/api/v1/business/profile",
            json={
                "company_name": "Nova Audio Gear",
                "website": "https://novaaudio.test",
                "industry": "Consumer Electronics",
                "description": "Studio monitors and wireless earbuds",
            },
        )
        assert prof_res.status_code == 200
        biz_data = prof_res.json()
        assert biz_data["company_name"] == "Nova Audio Gear"

        # 1b. Admin approves business profile
        await BusinessService.review_business(biz_data["business_id"], approved=True)

        # 2. Publish campaign
        deadline = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
        camp_res = await async_client.post(
            "/api/v1/business/campaigns",
            json={
                "title": "Hear The Future Earbuds Review",
                "description": "Showcase active noise cancellation in noisy city spots.",
                "category": "tech",
                "budget_perk": "$800 per Reel",
                "target_creators_count": 4,
                "requirements": ["30-45s vertical reel", "Showcase ANC toggle"],
                "deadline": deadline,
            },
        )
        assert camp_res.status_code == 201
        camp_data = camp_res.json()
        assert camp_data["title"] == "Hear The Future Earbuds Review"

        # 3. List campaigns
        list_res = await async_client.get("/api/v1/business/campaigns")
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_collab_application_and_review_api(
    async_client: AsyncClient,
    mock_db,
    business_user: dict[str, Any],
    creator_applicant: dict[str, Any],
):
    """Test creator applying to campaign, and business owner reviewing."""
    # Seed verified business profile for business owner
    await mock_db.business_profiles.insert_one({
        "business_id": "biz_nova_audio_collab",
        "user_id": business_user["user_id"],
        "company_name": "Nova Audio Brand",
        "website": "https://novaaudio.test",
        "industry": "lifestyle",
        "verification_status": "verified",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })

    # Step 1: Create campaign as business owner
    app.dependency_overrides[get_current_user] = lambda: business_user
    app.dependency_overrides[get_optional_current_user] = lambda: business_user

    deadline = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
    camp_res = await async_client.post(
        "/api/v1/business/campaigns",
        json={
            "title": "Summer Soundwaves Campaign",
            "description": "Looking for lifestyle creators enjoying music on the beach.",
            "category": "lifestyle",
            "budget_perk": "$500 Cash",
            "target_creators_count": 2,
            "deadline": deadline,
        },
    )
    camp_id = camp_res.json()["campaign_id"]

    # Step 2: Switch to creator and submit application
    app.dependency_overrides[get_current_user] = lambda: creator_applicant
    app.dependency_overrides[get_optional_current_user] = lambda: creator_applicant

    apply_res = await async_client.post(
        f"/api/v1/business/campaigns/{camp_id}/apply",
        json={"pitch": "I create aesthetic beach reels with 100k weekly impressions."},
    )
    assert apply_res.status_code == 201
    app_id = apply_res.json()["application_id"]

    # Step 3: Switch back to business owner and review applications
    app.dependency_overrides[get_current_user] = lambda: business_user
    app.dependency_overrides[get_optional_current_user] = lambda: business_user

    apps_res = await async_client.get(f"/api/v1/business/campaigns/{camp_id}/applications")
    assert apps_res.status_code == 200
    assert len(apps_res.json()) == 1

    # Step 4: Accept applicant
    patch_res = await async_client.patch(
        f"/api/v1/business/applications/{app_id}/status",
        json={"status": "accepted"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "accepted"

    # Step 5: Test Brand Safety Evaluation endpoint
    safety_res = await async_client.post(
        "/api/v1/business/brand-safety/evaluate",
        json={
            "content_text": "A wholesome video celebrating friendship and summer beats.",
            "tags": ["summer", "music"],
        },
    )
    assert safety_res.status_code == 200
    assert safety_res.json()["is_brand_safe"] is True

    app.dependency_overrides.clear()
