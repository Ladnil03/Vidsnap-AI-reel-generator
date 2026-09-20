"""
Edge Caching Middleware.
Injects Cache-Control, ETag, and Vary headers on responses based on route patterns.
Supports If-None-Match conditional requests (304 Not Modified) for bandwidth savings.
"""

import hashlib
import logging
import re
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


# Route-based cache policy rules (checked in order, first match wins)
CacheRule = tuple[str, str, bool]  # (pattern, cache_control, enable_etag)

DEFAULT_CACHE_RULES: list[CacheRule] = [
    # Health endpoints: never cache
    (r"^/health/", "no-store", False),
    # Static media files: aggressive caching (1 day + stale-while-revalidate)
    (
        r"^/api/v1/media/files/",
        f"public, max-age={settings.cache_max_age_media}, stale-while-revalidate=3600",
        True,
    ),
    # Auth endpoints: never cache
    (r"^/api/v1/auth/", "no-store", False),
    # Discovery/Feed/RecSys (personalized): short cache
    (
        r"^/api/v1/(discovery|feed|recsys)/",
        f"private, max-age={settings.cache_max_age_api}, stale-while-revalidate=30",
        False,
    ),
    # Content GET endpoints: short private cache
    (
        r"^/api/v1/content/videos($|\?)",
        f"private, max-age={settings.cache_max_age_api}, stale-while-revalidate=30",
        False,
    ),
    # Notifications: never cache
    (r"^/api/v1/notifications", "no-store", False),
    # Real-time rooms & watch parties: never cache
    (r"^/api/v1/rooms", "no-store", False),
]


def _compute_etag(body: bytes) -> str:
    """Generate a weak ETag from response body hash."""
    return f'W/"{hashlib.md5(body).hexdigest()}"'  # noqa: S324


def _match_cache_rule(path: str, method: str) -> CacheRule | None:
    """Find the first matching cache rule for a request path."""
    # Only apply cache headers to GET/HEAD requests
    if method not in ("GET", "HEAD"):
        return None

    for pattern, cache_control, enable_etag in DEFAULT_CACHE_RULES:
        if re.search(pattern, path):
            return (pattern, cache_control, enable_etag)
    return None


class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    Middleware that injects cache-related headers on HTTP responses.

    Features:
    - Route-based Cache-Control policies (aggressive for media, short for API, none for auth).
    - Weak ETag generation for media responses.
    - If-None-Match → 304 Not Modified support for bandwidth optimization.
    - Vary: Accept-Encoding, Authorization header for proper CDN cache keying.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and inject cache headers on response."""
        path = request.url.path
        method = request.method

        # Find matching cache rule
        rule = _match_cache_rule(path, method)

        # Process the request
        response = await call_next(request)

        if rule is None:
            return response

        _, cache_control, enable_etag = rule

        # Inject Cache-Control header (never override if already set by the endpoint)
        if "Cache-Control" not in response.headers:
            response.headers["Cache-Control"] = cache_control

        # Inject Vary header for proper CDN cache keying
        if "Vary" not in response.headers:
            response.headers["Vary"] = "Accept-Encoding, Authorization"

        # ETag support for media files
        if enable_etag and method == "GET":
            # Read body for ETag computation
            body = b""
            async for chunk in response.body_iterator:
                if isinstance(chunk, str):
                    body += chunk.encode("utf-8")
                else:
                    body += chunk

            etag = _compute_etag(body)
            response.headers["ETag"] = etag

            # Check If-None-Match for conditional request
            if_none_match = request.headers.get("If-None-Match", "").strip()
            if if_none_match and if_none_match == etag:
                return Response(
                    status_code=304,
                    headers={
                        "ETag": etag,
                        "Cache-Control": cache_control,
                        "Vary": "Accept-Encoding, Authorization",
                    },
                )

            # Return response with body since we consumed the iterator
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        return response
