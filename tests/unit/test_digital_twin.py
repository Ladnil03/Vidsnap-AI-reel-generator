"""
Unit tests for Digital Twin: profile management, mandatory AI labeling compliance, and persona interactions.
"""

from unittest.mock import patch

import pytest

from backend.app.ai_companion.models import (
    DigitalTwinInteractRequest,
    DigitalTwinProfile,
)
from backend.app.ai_companion.service import CompanionService
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_default_digital_twin_profile(mock_db):
    """Test retrieving default digital twin with mandatory AI disclosure."""
    creator_id = "creator_newbie"
    twin = await CompanionService.get_digital_twin(creator_id)

    assert twin.creator_id == creator_id
    assert twin.persona_name == "AI Twin"
    assert twin.is_ai_labeled is True  # Non-negotiable compliance requirement


@pytest.mark.asyncio
async def test_update_digital_twin_enforces_ai_labeling(mock_db):
    """Attempting to disable AI labeling must be overridden to enforce compliance."""
    creator_id = "creator_pro"
    creator_name = "Alex Director"

    # Malicious or accidental attempt to set is_ai_labeled=False
    profile = DigitalTwinProfile(
        creator_id=creator_id,
        creator_name=creator_name,
        persona_name="Alex AI",
        bio="Cinematography and editing breakdowns.",
        voice_tone="technical, inspiring",
        is_ai_labeled=False,  # Attempting to bypass
    )

    saved = await CompanionService.update_digital_twin(creator_id, creator_name, profile)
    assert saved.persona_name == "Alex AI"
    assert saved.is_ai_labeled is True  # Enforced by service layer

    # Verify persisted in database
    fetched = await CompanionService.get_digital_twin(creator_id)
    assert fetched.is_ai_labeled is True


@pytest.mark.asyncio
async def test_interact_with_digital_twin(mock_db):
    """Test persona prompt execution and response generation with AI disclosure."""
    creator_id = "creator_pro"
    await CompanionService.update_digital_twin(
        creator_id,
        "Alex Director",
        DigitalTwinProfile(
            creator_id=creator_id,
            creator_name="Alex Director",
            persona_name="Alex AI",
            bio="Cinematographer",
        ),
    )

    with patch.object(settings, "groq_api_key", None):
        with patch.object(settings, "gemini_api_key", None):
            with patch.object(settings, "openrouter_api_key", None):
                req = DigitalTwinInteractRequest(message="What camera do you shoot on?")
                res = await CompanionService.interact_with_digital_twin(creator_id, req)

                assert res.creator_id == creator_id
                assert res.persona_name == "Alex AI"
                assert res.is_ai_labeled is True
                assert len(res.reply) > 0
