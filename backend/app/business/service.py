"""
Business & Collaboration Service Implementation.
Handles Business Profile lifecycle, Campaign creation and discovery,
Creator Collab applications, deterministic Brand Safety scoring, and review workflows.
"""

import logging
import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from pymongo import DESCENDING

from backend.app.business.models import (
    ApplyCollabRequest,
    BrandSafetyReport,
    BusinessProfile,
    BusinessVerificationStatus,
    Campaign,
    CampaignStatus,
    CollabApplication,
    CollabApplicationStatus,
    CreateBusinessProfileRequest,
    CreateCampaignRequest,
)
from backend.app.core.database import get_db

logger = logging.getLogger(__name__)

# Sensitive keywords catalog for deterministic brand safety assessment
SENSITIVE_KEYWORDS_MAP: dict[str, list[str]] = {
    "substances": ["illicit", "narcotics", "contraband", "vape", "tobacco"],
    "gambling": ["casino", "betting", "wager", "jackpot", "roulette", "lottery"],
    "toxic": ["hate", "slur", "attack", "harass", "scam", "fraud", "phishing"],
    "explicit": ["nsfw", "explicit", "lewd", "nudity"],
}


class BusinessService:
    """Core domain service for brand campaigns and creator collaborations."""

    @classmethod
    async def get_or_create_profile(
        cls, user_id: str, company_name: str | None = None
    ) -> BusinessProfile:
        """Retrieve business profile or auto-provision initial business representation."""
        db = get_db()
        profiles_col = db["business_profiles"]

        record = await profiles_col.find_one({"user_id": user_id})
        if record:
            return BusinessProfile(**record)

        user = await db["users"].find_one({"user_id": user_id}) or {}
        name = company_name or user.get("name", f"Business {user_id[:6]}")

        new_profile = BusinessProfile(
            business_id=f"biz_{uuid.uuid4().hex[:10]}",
            user_id=user_id,
            company_name=name,
            website="https://vidsnap.ai",
            industry="Media & Entertainment",
            description="Verified Brand Partner on VidSnap.AI",
            verification_status=BusinessVerificationStatus.NONE,
        )
        await profiles_col.insert_one(new_profile.model_dump())
        return new_profile

    @classmethod
    async def create_or_update_profile(
        cls, user_id: str, request: CreateBusinessProfileRequest
    ) -> BusinessProfile:
        """Register or update an official business profile."""
        db = get_db()
        profiles_col = db["business_profiles"]

        existing = await profiles_col.find_one({"user_id": user_id})
        now = datetime.now(timezone.utc)

        if existing:
            current_status = existing.get("verification_status", BusinessVerificationStatus.NONE.value)
            if current_status not in (BusinessVerificationStatus.VERIFIED.value, BusinessVerificationStatus.VERIFIED):
                new_status = BusinessVerificationStatus.PENDING
            else:
                new_status = BusinessVerificationStatus.VERIFIED

            status_val = new_status.value if hasattr(new_status, "value") else new_status
            await profiles_col.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "company_name": request.company_name,
                        "website": request.website,
                        "industry": request.industry,
                        "description": request.description,
                        "logo_url": request.logo_url,
                        "verification_status": status_val,
                        "updated_at": now,
                    }
                },
            )
            existing.update(request.model_dump())
            existing["verification_status"] = new_status
            existing["updated_at"] = now
            return BusinessProfile(**existing)

        business_id = f"biz_{uuid.uuid4().hex[:10]}"
        profile = BusinessProfile(
            business_id=business_id,
            user_id=user_id,
            company_name=request.company_name,
            website=request.website,
            industry=request.industry,
            description=request.description,
            logo_url=request.logo_url,
            verification_status=BusinessVerificationStatus.PENDING,
        )
        await profiles_col.insert_one(profile.model_dump())
        return profile

    @classmethod
    async def review_business(
        cls, business_id: str, approved: bool
    ) -> BusinessProfile:
        """Approve or reject a business profile (admin action)."""
        db = get_db()
        profiles_col = db["business_profiles"]
        profile_doc = await profiles_col.find_one({"business_id": business_id})
        if not profile_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Business profile not found",
            )

        new_status = (
            BusinessVerificationStatus.VERIFIED
            if approved
            else BusinessVerificationStatus.REJECTED
        )
        now = datetime.now(timezone.utc)

        await profiles_col.update_one(
            {"business_id": business_id},
            {"$set": {"verification_status": new_status.value, "updated_at": now}},
        )

        user_id = profile_doc["user_id"]
        if approved:
            await db["users"].update_one(
                {"user_id": user_id},
                {"$addToSet": {"roles": "business"}},
            )
        else:
            await db["users"].update_one(
                {"user_id": user_id},
                {"$pull": {"roles": "business"}},
            )

        profile_doc["verification_status"] = new_status
        profile_doc["updated_at"] = now
        return BusinessProfile(**profile_doc)

    @classmethod
    async def create_campaign(cls, user_id: str, request: CreateCampaignRequest) -> Campaign:
        """Publish a new sponsored campaign brief for creator collaboration."""
        db = get_db()
        profile = await cls.get_or_create_profile(user_id)

        # Content Moderation check for campaign brief
        c_status = CampaignStatus.ACTIVE
        try:
            from backend.app.moderation.service import ModerationService
            brief_text = f"{request.title} {request.description} {' '.join(request.requirements)}".strip()
            mod_result = ModerationService.scan_content_text(brief_text)
            if mod_result.recommendation == "block":
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Campaign brief contains prohibited content.",
                )
            elif mod_result.recommendation == "flag_for_review":
                c_status = CampaignStatus.IN_REVIEW
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Moderation check on campaign brief error: %s", e)
            c_status = CampaignStatus.IN_REVIEW

        if profile.verification_status != BusinessVerificationStatus.VERIFIED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only verified business profiles can create campaigns.",
            )

        campaign_id = f"cmp_{uuid.uuid4().hex[:10]}"
        campaign = Campaign(
            campaign_id=campaign_id,
            business_id=profile.business_id,
            company_name=profile.company_name,
            title=request.title,
            description=request.description,
            category=request.category,
            budget_perk=request.budget_perk,
            target_creators_count=request.target_creators_count,
            requirements=request.requirements,
            deadline=request.deadline,
            status=c_status,
        )

        await db["campaigns"].insert_one(campaign.model_dump())
        return campaign

    @classmethod
    async def list_campaigns(
        cls,
        category: str | None = None,
        status_filter: CampaignStatus = CampaignStatus.ACTIVE,
        limit: int = 50,
    ) -> list[Campaign]:
        """List active or filtered campaigns in the Collab Marketplace."""
        db = get_db()
        query: dict[str, str] = {"status": status_filter.value}
        if category:
            query["category"] = category

        cursor = db["campaigns"].find(query).sort("created_at", DESCENDING).limit(limit)
        docs = await cursor.to_list(limit)
        return [Campaign(**d) for d in docs]

    @classmethod
    async def get_campaign(cls, campaign_id: str) -> Campaign:
        """Fetch details of a specific campaign."""
        db = get_db()
        doc = await db["campaigns"].find_one({"campaign_id": campaign_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campaign '{campaign_id}' not found",
            )
        return Campaign(**doc)

    @classmethod
    def evaluate_brand_safety(
        cls, content_text: str, tags: list[str] | None = None
    ) -> BrandSafetyReport:
        """
        Evaluate text and hashtags against sensitive and controversial categories.
        Returns a 0-100 brand safety score and approval recommendation.
        """
        text = content_text.lower()
        all_tags = [t.lower().strip("#") for t in (tags or [])]
        combined = f"{text} {' '.join(all_tags)}"

        flagged: list[str] = []
        detected_categories: set[str] = set()

        for cat, keywords in SENSITIVE_KEYWORDS_MAP.items():
            for kw in keywords:
                if re.search(r"\b" + re.escape(kw) + r"\b", combined):
                    flagged.append(kw)
                    detected_categories.add(cat)

        if not flagged:
            score = 98
            is_safe = True
            rec = "Safe for all brand sponsorship campaigns ✅"
        elif len(flagged) == 1 and "toxic" not in detected_categories:
            score = 72
            is_safe = True
            rec = "Acceptable with creator brief clarification ⚠️"
        else:
            score = max(10, 50 - len(flagged) * 15)
            is_safe = False
            rec = "Flagged: Violates brand safety guidelines 🛑"

        return BrandSafetyReport(
            score=score,
            is_brand_safe=is_safe,
            flagged_keywords=flagged,
            sensitive_categories_detected=sorted(detected_categories),
            recommendation=rec,
        )

    @classmethod
    async def apply_to_campaign(
        cls, creator_id: str, campaign_id: str, request: ApplyCollabRequest
    ) -> CollabApplication:
        """Submit creator application to an active brand campaign."""
        db = get_db()
        campaign = await cls.get_campaign(campaign_id)

        if campaign.status != CampaignStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign is not accepting applications",
            )

        collab_col = db["collab_applications"]
        existing = await collab_col.find_one({"campaign_id": campaign_id, "creator_id": creator_id})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already applied to this campaign",
            )

        # Run automated brand safety analysis on pitch
        safety_report = cls.evaluate_brand_safety(request.pitch)

        # Fetch creator details
        creator_profile = await db["creator_profiles"].find_one({"user_id": creator_id})
        if creator_profile:
            c_name = creator_profile.get("display_name", "Creator")
            c_handle = creator_profile.get("handle", "creator")
        else:
            user = await db["users"].find_one({"user_id": creator_id}) or {}
            c_name = user.get("name", "Creator")
            c_handle = user.get("username", c_name.lower().replace(" ", "_"))

        app_id = f"app_{uuid.uuid4().hex[:10]}"
        application = CollabApplication(
            application_id=app_id,
            campaign_id=campaign_id,
            business_id=campaign.business_id,
            creator_id=creator_id,
            creator_name=c_name,
            creator_handle=c_handle,
            pitch=request.pitch,
            portfolio_reel_id=request.portfolio_reel_id,
            brand_safety=safety_report,
            status=CollabApplicationStatus.APPLIED,
        )

        await collab_col.insert_one(application.model_dump())
        await db["campaigns"].update_one(
            {"campaign_id": campaign_id},
            {"$inc": {"applications_count": 1}},
        )
        return application

    @classmethod
    async def update_application_status(
        cls,
        business_user_id: str,
        application_id: str,
        new_status: CollabApplicationStatus,
    ) -> CollabApplication:
        """Update applicant status (Shortlist, Accept, Reject). Only campaign owner can review."""
        db = get_db()
        collab_col = db["collab_applications"]

        app_doc = await collab_col.find_one({"application_id": application_id})
        if not app_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found",
            )

        # Check ownership and verification
        biz_profile = await db["business_profiles"].find_one({"user_id": business_user_id})
        if (
            not biz_profile
            or biz_profile.get("verification_status") != BusinessVerificationStatus.VERIFIED.value
            or biz_profile.get("business_id") != app_doc.get("business_id")
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to review this campaign's applications",
            )

        now = datetime.now(timezone.utc)
        await collab_col.update_one(
            {"application_id": application_id},
            {"$set": {"status": new_status.value, "reviewed_at": now}},
        )

        app_doc["status"] = new_status
        app_doc["reviewed_at"] = now
        return CollabApplication(**app_doc)

    @classmethod
    async def get_campaign_applications(
        cls, business_user_id: str, campaign_id: str
    ) -> list[CollabApplication]:
        """Fetch all applications for a specific campaign (owner view)."""
        db = get_db()
        biz_profile = await db["business_profiles"].find_one({"user_id": business_user_id})
        campaign = await cls.get_campaign(campaign_id)

        if (
            not biz_profile
            or biz_profile.get("verification_status") != BusinessVerificationStatus.VERIFIED.value
            or biz_profile.get("business_id") != campaign.business_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view these applications",
            )

        cursor = (
            db["collab_applications"]
            .find({"campaign_id": campaign_id})
            .sort("created_at", DESCENDING)
        )
        docs = await cursor.to_list(100)
        return [CollabApplication(**d) for d in docs]

    @classmethod
    async def get_creator_collabs(cls, creator_id: str) -> list[CollabApplication]:
        """Fetch all campaign applications submitted by a creator."""
        db = get_db()
        cursor = (
            db["collab_applications"]
            .find({"creator_id": creator_id})
            .sort("created_at", DESCENDING)
        )
        docs = await cursor.to_list(50)
        return [CollabApplication(**d) for d in docs]
