"""
Unit tests for CacheControlMiddleware (Edge Caching, ETags, and 304 Not Modified).
"""

import pytest
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from starlette.testclient import TestClient

from backend.app.core.cache_middleware import CacheControlMiddleware


@pytest.fixture
def cache_test_app():
    """Create a minimal test FastAPI app with CacheControlMiddleware attached."""
    app = FastAPI()
    app.add_middleware(CacheControlMiddleware)

    @app.get("/api/v1/media/files/test.jpg")
    async def get_media():
        return PlainTextResponse("fake-image-binary-bytes")

    @app.get("/api/v1/auth/me")
    async def get_auth():
        return {"user": "authenticated"}

    @app.get("/health/live")
    async def get_health():
        return {"status": "ok"}

    @app.get("/api/v1/feed/trending")
    async def get_feed():
        return {"items": [1, 2, 3]}

    @app.post("/api/v1/media/files/test.jpg")
    async def post_media():
        return {"uploaded": True}

    return app


def test_media_route_caching_and_etag(cache_test_app):
    """Media routes should receive public Cache-Control, Vary, and ETag headers."""
    client = TestClient(cache_test_app)
    response = client.get("/api/v1/media/files/test.jpg")

    assert response.status_code == 200
    assert "Cache-Control" in response.headers
    assert "public" in response.headers["Cache-Control"]
    assert "max-age=" in response.headers["Cache-Control"]
    assert "Vary" in response.headers
    assert "Accept-Encoding" in response.headers["Vary"]
    assert "ETag" in response.headers
    assert response.headers["ETag"].startswith('W/"')


def test_conditional_if_none_match_returns_304(cache_test_app):
    """When client sends If-None-Match with matching ETag, return 304 Not Modified."""
    client = TestClient(cache_test_app)

    # First request: get ETag
    res1 = client.get("/api/v1/media/files/test.jpg")
    assert res1.status_code == 200
    etag = res1.headers["ETag"]

    # Second request: send If-None-Match with exact ETag
    res2 = client.get("/api/v1/media/files/test.jpg", headers={"If-None-Match": etag})
    assert res2.status_code == 304
    assert res2.text == ""
    assert res2.headers.get("ETag") == etag


def test_auth_route_has_no_store(cache_test_app):
    """Auth routes must never be cached (no-store)."""
    client = TestClient(cache_test_app)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.headers.get("Cache-Control") == "no-store"
    assert "ETag" not in response.headers


def test_health_route_has_no_store(cache_test_app):
    """Health endpoints must have no-store to prevent stale health checks."""
    client = TestClient(cache_test_app)
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.headers.get("Cache-Control") == "no-store"


def test_feed_route_has_short_cache(cache_test_app):
    """Feed routes should have private short cache with stale-while-revalidate."""
    client = TestClient(cache_test_app)
    response = client.get("/api/v1/feed/trending")
    assert response.status_code == 200
    assert "private" in response.headers.get("Cache-Control", "")
    assert "stale-while-revalidate" in response.headers.get("Cache-Control", "")


def test_post_requests_not_cached(cache_test_app):
    """POST/mutation requests should not have cache headers injected."""
    client = TestClient(cache_test_app)
    response = client.post("/api/v1/media/files/test.jpg")
    assert response.status_code == 200
    assert "Cache-Control" not in response.headers
