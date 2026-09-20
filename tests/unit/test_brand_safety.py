"""
Unit tests for deterministic Brand Safety assessment.
"""

from backend.app.business.service import BusinessService


def test_brand_safety_clean_content():
    """Test clean, family-safe content receives high brand safety score."""
    text = "Join me on an inspiring journey across the mountains exploring nature and sustainable tech!"
    tags = ["nature", "travel", "technology", "chill"]

    report = BusinessService.evaluate_brand_safety(text, tags)
    assert report.is_brand_safe is True
    assert report.score >= 95
    assert len(report.flagged_keywords) == 0
    assert "Safe for all" in report.recommendation


def test_brand_safety_flagged_content():
    """Test controversial or toxic content is appropriately flagged."""
    text = "Exclusive illegal narcotics contraband unboxing and gambling casino betting review!"
    tags = ["casino", "betting"]

    report = BusinessService.evaluate_brand_safety(text, tags)
    assert report.is_brand_safe is False
    assert report.score < 50
    assert len(report.flagged_keywords) >= 2
    assert "gambling" in report.sensitive_categories_detected
    assert "Violates" in report.recommendation
