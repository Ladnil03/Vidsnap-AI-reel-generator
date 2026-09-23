"""
Security regression tests for W3-3: Security headers.
- HSTS (Strict-Transport-Security) enforced strictly in production.
- CSP (Content-Security-Policy) header present on backend responses.
- Deprecated X-XSS-Protection header removed.
"""

from unittest.mock import patch

import pytest
from httpx import AsyncClient

from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_backend_security_headers_present(async_client: AsyncClient):
    """Verify modern security headers and absence of deprecated X-XSS-Protection."""
    resp = await async_client.get("/health/live")
    assert resp.status_code == 200

    headers = resp.headers
    # Required headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "Content-Security-Policy" in headers

    # Deprecated header must be removed
    assert "X-XSS-Protection" not in headers


@pytest.mark.asyncio
async def test_hsts_header_in_production_only(async_client: AsyncClient):
    """HSTS must only be present when ENVIRONMENT is production."""
    # In test/dev environment:
    resp_dev = await async_client.get("/health/live")
    assert resp_dev.status_code == 200
    assert "Strict-Transport-Security" not in resp_dev.headers

    # In production environment:
    with patch.object(settings, "environment", "production"):
        resp_prod = await async_client.get("/health/live")
        assert resp_prod.status_code == 200
        assert "Strict-Transport-Security" in resp_prod.headers
        assert "max-age=31536000" in resp_prod.headers["Strict-Transport-Security"]


def test_frontend_next_config_csp_directives():
    """Verify Next.js frontend CSP declares all external sources in the correct directives."""
    from pathlib import Path

    next_config_path = Path(__file__).resolve().parents[2] / "frontend" / "next.config.ts"
    assert next_config_path.exists(), f"next.config.ts not found at {next_config_path}"

    content = next_config_path.read_text(encoding="utf-8")

    # Assert directive presence
    assert "frame-src" in content
    assert "img-src" in content
    assert "media-src" in content
    assert "frame-ancestors 'none'" in content

    # Assert Pixabay CDN coverage
    assert "https://cdn.pixabay.com" in content
    assert "https://i.vimeocdn.com" in content

    # Assert YouTube placement: must be in frame-src, NOT media-src
    assert "https://www.youtube.com" in content
    assert "https://www.youtube-nocookie.com" in content
    # media-src must not contain youtube.com
    lines = content.splitlines()
    media_src_line = next((line for line in lines if "media-src" in line), "")
    assert "youtube.com" not in media_src_line

