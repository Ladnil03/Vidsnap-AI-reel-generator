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
