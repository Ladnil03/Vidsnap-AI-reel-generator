"""
Regression tests for W2-4: Business/Creator role self-grant prevention.
- Creating a business profile must NOT grant the 'business' role immediately.
- Unverified business profiles cannot create campaigns.
- Admin review endpoint is required to verify business and grant role.
- Creator verification application requires at least 1 published video.
- Non-admin/non-moderator cannot approve creator verifications.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from backend.app.business.models import (
    BusinessVerificationStatus,
    CreateBusinessProfileRequest,
    CreateCampaignRequest,
)
from backend.app.business.service import BusinessService
from backend.app.core.security import create_access_token
from backend.app.creator.models import VerificationApplyRequest
from backend.app.creator.service import CreatorService
from backend.app.main import app


@pytest.mark.asyncio
async def test_business_profile_creation_does_not_grant_role(mock_db):
    """Registering a business profile must not grant 'business' role immediately."""
    user_id = "user_biz_applicant"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Applicant",
        "email": "applicant@brand.test",
        "roles": ["user"],
    })

    req = CreateBusinessProfileRequest(
        company_name="Pending Brand Inc",
        website="https://pendingbrand.test",
        industry="Retail",
        description="A brand waiting for verification",
    )
    profile = await BusinessService.create_or_update_profile(user_id, req)
    assert profile.verification_status == BusinessVerificationStatus.PENDING

    # User doc MUST NOT have 'business' role yet
    user_doc = await mock_db.users.find_one({"user_id": user_id})
    assert "business" not in user_doc.get("roles", [])


@pytest.mark.asyncio
async def test_unverified_business_cannot_create_campaign(mock_db):
    """A business profile with PENDING status cannot create campaigns."""
    user_id = "user_biz_pending"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Pending Owner",
        "email": "pending@brand.test",
        "roles": ["user"],
    })

    req = CreateBusinessProfileRequest(
        company_name="Pending Brand Inc",
        website="https://pendingbrand.test",
        industry="Retail",
        description="A brand waiting for verification",
    )
    await BusinessService.create_or_update_profile(user_id, req)

    camp_req = CreateCampaignRequest(
        title="Unboxing Campaign",
        description="Great product launch brief",
        category="Tech",
        budget_perk="$500",
        target_creators_count=2,
        deadline=datetime.now(timezone.utc) + timedelta(days=7),
    )

    with pytest.raises(HTTPException) as exc_info:
        await BusinessService.create_campaign(user_id, camp_req)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_admin_business_approval_flow(mock_db):
    """Admin review endpoint approves business and grants the 'business' role."""
    user_id = "user_biz_to_approve"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Legit Brand",
        "email": "legit@brand.test",
        "roles": ["user"],
    })

    req = CreateBusinessProfileRequest(
        company_name="Legit Brand Inc",
        website="https://legitbrand.test",
        industry="Electronics",
        description="Legitimate registered business",
    )
    profile = await BusinessService.create_or_update_profile(user_id, req)

    # Admin approves
    reviewed = await BusinessService.review_business(profile.business_id, approved=True)
    assert reviewed.verification_status == BusinessVerificationStatus.VERIFIED

    # Check role granted
    user_doc = await mock_db.users.find_one({"user_id": user_id})
    assert "business" in user_doc.get("roles", [])

    # Now verified business can create campaigns
    camp_req = CreateCampaignRequest(
        title="Verified Campaign",
        description="Campaign for verified brand",
        category="Tech",
        budget_perk="$1000",
        target_creators_count=2,
        deadline=datetime.now(timezone.utc) + timedelta(days=7),
    )
    campaign = await BusinessService.create_campaign(user_id, camp_req)
    assert campaign.title == "Verified Campaign"


@pytest.mark.asyncio
async def test_creator_verification_requires_published_video(mock_db):
    """Creator application must be rejected if user has zero published videos."""
    user_id = "user_creator_novideo"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "No Video Creator",
        "email": "novideo@creator.test",
        "roles": ["user"],
    })

    req = VerificationApplyRequest(
        niche="comedy",
        portfolio_links=["https://vidsnap.ai/profile/novideo"],
        statement="I want a badge please",
    )

    with pytest.raises(HTTPException) as exc_info:
        await CreatorService.apply_verification(user_id, req)
    assert exc_info.value.status_code == 400
    assert "published video" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_creator_verification_allowed_with_published_video(mock_db):
    """Creator application succeeds once user has at least 1 published video."""
    user_id = "user_creator_withvideo"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Active Creator",
        "email": "active@creator.test",
        "roles": ["user"],
    })
    await mock_db.videos.insert_one({
        "video_id": "vid_active_1",
        "user_id": user_id,
        "status": "published",
        "title": "My first awesome reel",
    })

    req = VerificationApplyRequest(
        niche="tech",
        portfolio_links=["https://vidsnap.ai/profile/active"],
        statement="Active creator with real videos",
    )
    app_doc = await CreatorService.apply_verification(user_id, req)
    assert app_doc.status.value == "pending"


@pytest.mark.asyncio
async def test_creator_review_endpoint_rbac(mock_db):
    """Non-admin and non-moderator cannot review creator verification applications."""
    normal_user_id = "user_regular_joe"
    admin_user_id = "user_admin_boss"

    await mock_db.users.insert_many([
        {
            "user_id": normal_user_id,
            "name": "Joe",
            "email": "joe@test.com",
            "roles": ["user"],
        },
        {
            "user_id": admin_user_id,
            "name": "Boss",
            "email": "boss@test.com",
            "roles": ["admin"],
        },
    ])

    normal_token = create_access_token(user_id=normal_user_id, email="joe@test.com")
    admin_token = create_access_token(user_id=admin_user_id, email="boss@test.com")

    # Create dummy application
    await mock_db.creator_verifications.insert_one({
        "application_id": "vapp_dummy_123",
        "user_id": "some_creator",
        "status": "pending",
        "niche": "gaming",
        "portfolio_links": [],
        "statement": "test",
        "created_at": datetime.now(timezone.utc),
    })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Regular user attempt -> 403
        resp_user = await client.post(
            "/api/v1/creator/verify/vapp_dummy_123/review?approve=true",
            headers={"Authorization": f"Bearer {normal_token}"},
        )
        assert resp_user.status_code == 403

        # Admin attempt -> 200
        resp_admin = await client.post(
            "/api/v1/creator/verify/vapp_dummy_123/review?approve=true",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_admin.status_code == 200
