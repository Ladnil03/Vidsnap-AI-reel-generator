"""
Regression tests for W2-6: /metrics endpoint authentication and production disabling.
- Unauthenticated requests must receive 401.
- Incorrect token must receive 401.
- Valid Bearer token matching settings.metrics_token must receive 200.
- When metrics_token is not configured in production, endpoint must return 404.
"""

from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.core.config import settings
from backend.app.main import app


@pytest.mark.asyncio
async def test_metrics_requires_bearer_token():
    """Unauthenticated request to /metrics must return 401."""
    with patch.object(settings, "metrics_token", "secret-token-123"):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/metrics")
            assert resp.status_code == 401


@pytest.mark.asyncio
async def test_metrics_rejects_invalid_token():
    """Request with incorrect Bearer token must return 401."""
    with patch.object(settings, "metrics_token", "secret-token-123"):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/metrics",
                headers={"Authorization": "Bearer wrong-token"},
            )
            assert resp.status_code == 401


@pytest.mark.asyncio
async def test_metrics_allows_valid_token():
    """Request with valid Bearer token must return 200 and metrics content."""
    with patch.object(settings, "metrics_token", "secret-token-123"):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/metrics",
                headers={"Authorization": "Bearer secret-token-123"},
            )
            assert resp.status_code == 200
            assert "text/plain" in resp.headers["content-type"]
            assert "vidsnap" in resp.text


@pytest.mark.asyncio
async def test_metrics_disabled_in_prod_when_no_token_configured():
    """When no token is configured in production, /metrics must return 404."""
    with patch.object(settings, "environment", "production"), \
         patch.object(settings, "metrics_token", None):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/metrics")
            assert resp.status_code == 404
