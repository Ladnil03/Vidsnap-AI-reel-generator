"""
Business & Collab Marketplace API Routes (/api/v1/business).
Exposes endpoints for Business Profiles, Sponsored Campaigns, Creator Applications,
Brand Safety Evaluations, and Collab Reviews.
"""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from backend.app.business.models import (
    ApplyCollabRequest,
    BrandSafetyCheckRequest,
    BrandSafetyReport,
    BusinessProfile,
    Campaign,
    CampaignStatus,
    CollabApplication,
    CreateBusinessProfileRequest,
    CreateCampaignRequest,
    UpdateApplicationStatusRequest,
)
from backend.app.business.service import BusinessService
from backend.app.core.rate_limiter import rate_limit
from backend.app.identity.dependencies import (
    get_current_admin,
    get_current_user,
    get_optional_current_user,
)

router = APIRouter(prefix="/api/v1/business", tags=["Business & Collab Marketplace"])


@router.get(
    "/profile",
    response_model=BusinessProfile,
    summary="Get current user's business profile",
)
async def get_business_profile(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> BusinessProfile:
    """Retrieve brand advertiser profile for authenticated user."""
    return await BusinessService.get_or_create_profile(user_id=current_user["user_id"])


@router.post(
    "/profile",
    response_model=BusinessProfile,
    summary="Create or update business profile",
)
async def update_business_profile(
    request: CreateBusinessProfileRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> BusinessProfile:
    """Register or update an official brand advertiser profile."""
    return await BusinessService.create_or_update_profile(
        user_id=current_user["user_id"], request=request
    )


@router.post(
    "/profiles/{business_id}/review",
    response_model=BusinessProfile,
    summary="Review business profile (Admin only)",
)
async def review_business_profile(
    business_id: str,
    approve: bool = Query(..., description="True to approve, False to reject"),
    current_user: dict[str, Any] = Depends(get_current_admin),
) -> BusinessProfile:
    """Admin review endpoint to grant or reject verified business status."""
    return await BusinessService.review_business(business_id=business_id, approved=approve)


@router.get(
    "/campaigns",
    response_model=list[Campaign],
    summary="Browse campaigns in the Collab Marketplace",
)
async def list_campaigns(
    category: str | None = Query(None, description="Category filter"),
    status_filter: CampaignStatus = Query(CampaignStatus.ACTIVE, description="Campaign status"),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> list[Campaign]:
    """Browse open brand sponsorship and creator collaboration briefs."""
    return await BusinessService.list_campaigns(
        category=category, status_filter=status_filter, limit=limit
    )


@router.post(
    "/campaigns",
    response_model=Campaign,
    status_code=status.HTTP_201_CREATED,
    summary="Publish a new sponsored campaign brief",
)
async def create_campaign(
    request: CreateCampaignRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Campaign:
    """Create a new campaign brief seeking creator applications."""
    return await BusinessService.create_campaign(user_id=current_user["user_id"], request=request)


@router.get(
    "/campaigns/{campaign_id}",
    response_model=Campaign,
    summary="Get campaign brief details",
)
async def get_campaign_details(
    campaign_id: str,
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> Campaign:
    """Retrieve details, budget/perk, and requirements of a campaign."""
    return await BusinessService.get_campaign(campaign_id=campaign_id)


@router.post(
    "/campaigns/{campaign_id}/apply",
    response_model=CollabApplication,
    status_code=status.HTTP_201_CREATED,
    summary="Submit creator application to a brand campaign",
)
async def apply_to_campaign(
    campaign_id: str,
    request: ApplyCollabRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CollabApplication:
    """Submit a creator pitch with automated brand-safety screening."""
    return await BusinessService.apply_to_campaign(
        creator_id=current_user["user_id"],
        campaign_id=campaign_id,
        request=request,
    )


@router.get(
    "/campaigns/{campaign_id}/applications",
    response_model=list[CollabApplication],
    summary="Review applications for a campaign (Brand Owner)",
)
async def get_campaign_applications(
    campaign_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[CollabApplication]:
    """View creator pitches, portfolio links, and brand-safety scores (brand owner only)."""
    return await BusinessService.get_campaign_applications(
        business_user_id=current_user["user_id"],
        campaign_id=campaign_id,
    )


@router.patch(
    "/applications/{application_id}/status",
    response_model=CollabApplication,
    summary="Update application review status (Accept/Shortlist/Reject)",
)
async def update_application_status(
    application_id: str,
    request: UpdateApplicationStatusRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CollabApplication:
    """Update applicant review state in the collaboration funnel."""
    return await BusinessService.update_application_status(
        business_user_id=current_user["user_id"],
        application_id=application_id,
        new_status=request.status,
    )


@router.get(
    "/collabs/my",
    response_model=list[CollabApplication],
    summary="Get creator's applied and active collaborations",
)
async def get_my_collabs(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[CollabApplication]:
    """List brand partnerships and campaign applications for authenticated creator."""
    return await BusinessService.get_creator_collabs(creator_id=current_user["user_id"])


@router.post(
    "/brand-safety/evaluate",
    response_model=BrandSafetyReport,
    dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))],
    summary="Evaluate text and tags for brand safety",
)
async def check_brand_safety(
    request: BrandSafetyCheckRequest,
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> BrandSafetyReport:
    """Deterministic brand safety screening against sensitive and restricted categories."""
    return BusinessService.evaluate_brand_safety(
        content_text=request.content_text, tags=request.tags
    )
