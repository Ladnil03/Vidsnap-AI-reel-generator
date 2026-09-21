"""
Unit tests for BusinessService: profile management, campaigns, and collab application workflows.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from backend.app.business.models import (
    ApplyCollabRequest,
    CampaignStatus,
    CollabApplicationStatus,
    CreateBusinessProfileRequest,
    CreateCampaignRequest,
)
from backend.app.business.service import BusinessService


@pytest.mark.asyncio
async def test_business_profile_lifecycle(mock_db):
    """Test business profile creation and updates."""
    user_id = "biz_user_1"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Acme Brand Rep",
        "email": "sponsor@acme.corp",
    })

    req = CreateBusinessProfileRequest(
        company_name="Acme Corporation",
        website="https://acme.corp",
        industry="Technology & Hardware",
        description="Global leader in cutting-edge tech gadgets",
        logo_url="https://acme.corp/logo.png",
    )
    profile = await BusinessService.create_or_update_profile(user_id, req)
    assert profile.company_name == "Acme Corporation"
    assert profile.industry == "Technology & Hardware"
    assert profile.website == "https://acme.corp"

    # User role not yet business (pending verification)
    user_doc = await mock_db.users.find_one({"user_id": user_id})
    assert "business" not in user_doc.get("roles", [])

    # Review and approve business profile
    reviewed = await BusinessService.review_business(profile.business_id, approved=True)
    assert reviewed.verification_status.value == "verified"
    user_doc = await mock_db.users.find_one({"user_id": user_id})
    assert "business" in user_doc.get("roles", [])


@pytest.mark.asyncio
async def test_campaign_creation_and_application_flow(mock_db):
    """Test creating a campaign, applying as a creator, and brand review."""
    biz_user_id = "biz_owner_2"
    creator_user_id = "creator_user_2"

    await mock_db.users.insert_many([
        {"user_id": biz_user_id, "name": "Brand Manager", "email": "bm@brand.test"},
        {"user_id": creator_user_id, "name": "Tech Reviewer", "username": "tech_rev", "email": "rev@creator.test"},
    ])

    # Provision verified profile for business owner
    biz_prof = await BusinessService.create_or_update_profile(
        biz_user_id,
        CreateBusinessProfileRequest(
            company_name="CyberTech Brands",
            website="https://cybertech.test",
            industry="tech",
        ),
    )
    await BusinessService.review_business(biz_prof.business_id, approved=True)

    # 1. Create campaign
    future_deadline = datetime.now(timezone.utc) + timedelta(days=14)
    camp_req = CreateCampaignRequest(
        title="Unboxing the CyberPhone 12",
        description="Looking for tech creators to do a 45-second creative vertical unboxing.",
        category="tech",
        budget_perk="$1,000 + Free Device",
        target_creators_count=3,
        requirements=["4K vertical reel", "Highlight battery life", "Tag #CyberPhone12"],
        deadline=future_deadline,
    )
    campaign = await BusinessService.create_campaign(biz_user_id, camp_req)
    assert campaign.title == "Unboxing the CyberPhone 12"
    assert campaign.status == CampaignStatus.ACTIVE

    # 2. Creator applies
    apply_req = ApplyCollabRequest(
        pitch="I have an audience of 50k tech lovers and have reviewed 20+ flagship phones.",
        portfolio_reel_id="vid_sample_review",
    )
    application = await BusinessService.apply_to_campaign(creator_user_id, campaign.campaign_id, apply_req)
    assert application.status == CollabApplicationStatus.APPLIED
    assert application.brand_safety.is_brand_safe is True
    assert application.brand_safety.score >= 90

    # 3. Prevent duplicate application
    with pytest.raises(HTTPException) as exc:
        await BusinessService.apply_to_campaign(creator_user_id, campaign.campaign_id, apply_req)
    assert exc.value.status_code == 400

    # 4. Brand owner reviews and accepts application
    updated_app = await BusinessService.update_application_status(
        business_user_id=biz_user_id,
        application_id=application.application_id,
        new_status=CollabApplicationStatus.ACCEPTED,
    )
    assert updated_app.status == CollabApplicationStatus.ACCEPTED

    # 5. List applications for campaign
    all_apps = await BusinessService.get_campaign_applications(biz_user_id, campaign.campaign_id)
    assert len(all_apps) == 1
    assert all_apps[0].status == CollabApplicationStatus.ACCEPTED

    # 6. Creator views their collabs
    creator_collabs = await BusinessService.get_creator_collabs(creator_user_id)
    assert len(creator_collabs) == 1
    assert creator_collabs[0].application_id == application.application_id
