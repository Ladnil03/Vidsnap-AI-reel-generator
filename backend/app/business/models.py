"""
Business Domain Models & Schemas.
Defines schemas for Business Profiles, Sponsored Campaigns, Creator Collabs,
Brand Safety Evaluations, and Sponsored Content Disclosures.
"""

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class BusinessVerificationStatus(str, Enum):
    """Business verification approval states."""

    NONE = "none"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class BusinessProfile(BaseModel):
    """Verified business profile representing an advertiser or brand."""

    business_id: str
    user_id: str
    company_name: str
    website: str
    industry: str
    logo_url: str | None = None
    description: str = ""
    verification_status: BusinessVerificationStatus = BusinessVerificationStatus.NONE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CreateBusinessProfileRequest(BaseModel):
    """Payload to register or update a business profile."""

    company_name: str = Field(..., min_length=2, max_length=100)
    website: str = Field(..., min_length=4, max_length=200)
    industry: str = Field(..., min_length=2, max_length=50)
    description: str = Field("", max_length=500)
    logo_url: str | None = None


class CampaignStatus(str, Enum):
    """Lifecycle status of brand campaigns."""

    DRAFT = "draft"
    ACTIVE = "active"
    IN_REVIEW = "in_review"
    PAUSED = "paused"
    COMPLETED = "completed"


class Campaign(BaseModel):
    """Sponsored campaign brief open for creator collaboration pitches."""

    campaign_id: str
    business_id: str
    company_name: str
    title: str
    description: str
    category: str
    budget_perk: str
    target_creators_count: int
    requirements: list[str] = Field(default_factory=list)
    deadline: datetime
    status: CampaignStatus = CampaignStatus.ACTIVE
    applications_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CreateCampaignRequest(BaseModel):
    """Payload to create a new sponsored campaign brief."""

    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10, max_length=1000)
    category: str = Field("lifestyle", max_length=50)
    budget_perk: str = Field(..., min_length=2, max_length=100)
    target_creators_count: int = Field(5, ge=1, le=100)
    requirements: list[str] = Field(default_factory=list)
    deadline: datetime


class CollabApplicationStatus(str, Enum):
    """Review status for creator collaboration applications."""

    APPLIED = "applied"
    SHORTLISTED = "shortlisted"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    REJECTED = "rejected"


class BrandSafetyReport(BaseModel):
    """Automated brand safety assessment of creator submission and text."""

    score: int = Field(..., ge=0, le=100)
    is_brand_safe: bool = True
    flagged_keywords: list[str] = Field(default_factory=list)
    sensitive_categories_detected: list[str] = Field(default_factory=list)
    recommendation: str


class CollabApplication(BaseModel):
    """Creator pitch and application record for a brand campaign."""

    application_id: str
    campaign_id: str
    business_id: str
    creator_id: str
    creator_name: str
    creator_handle: str
    pitch: str
    portfolio_reel_id: str | None = None
    brand_safety: BrandSafetyReport
    status: CollabApplicationStatus = CollabApplicationStatus.APPLIED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: datetime | None = None


class ApplyCollabRequest(BaseModel):
    """Payload for a creator applying to a brand campaign."""

    pitch: str = Field(..., min_length=10, max_length=500)
    portfolio_reel_id: str | None = None


class UpdateApplicationStatusRequest(BaseModel):
    """Review decision payload for campaign applicants."""

    status: CollabApplicationStatus


class BrandSafetyCheckRequest(BaseModel):
    """Payload to evaluate text content for brand safety."""

    content_text: str = Field(..., min_length=1, max_length=2000)
    tags: list[str] = Field(default_factory=list)
