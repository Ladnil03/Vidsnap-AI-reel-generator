"""
Integration tests for application health check probes.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_liveness_probe(async_client: AsyncClient):
    """Liveness probe must return 200 OK when process is running."""
    response = await async_client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"


@pytest.mark.asyncio
async def test_readiness_probe(async_client: AsyncClient, mock_db):
    """Readiness probe verifies database and dependency availability."""
    response = await async_client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "mongodb" in data["dependencies"]


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    """Root endpoint returns 200 with app info."""
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
