"""
Rate Limiter using Redis sliding window with in-memory fallback.
Protects against brute force, signup abuse, and DoS attacks.
"""

import hashlib
import logging
import time
from collections import defaultdict
from collections.abc import Callable
from typing import Any

from fastapi import Depends, HTTPException, Request, status

from backend.app.core.config import settings
from backend.app.core.redis import get_redis

logger = logging.getLogger(__name__)

# In-memory sliding window fallback when Redis is offline
_in_memory_windows: dict[str, list[float]] = defaultdict(list)


def _get_client_ip(request: Request) -> str:
    """
    Extract the real client IP address from the request.

    When trusted_proxy_count > 0, use the Nth-from-right entry
    in X-Forwarded-For (the rightmost N entries are set by trusted proxies).
    When 0, use request.client.host directly (ignores XFF entirely).
    """
    proxy_count = settings.trusted_proxy_count

    if proxy_count > 0:
        xff = request.headers.get("X-Forwarded-For", "")
        if xff:
            parts = [p.strip() for p in xff.split(",") if p.strip()]
            # The Nth-from-right entry is the client IP
            # (proxies append to the right, so the last N are trusted)
            idx = max(0, len(parts) - proxy_count)
            return parts[idx]

    # No trusted proxies or no XFF header: use direct connection IP
    if request.client:
        return request.client.host
    return "unknown"


def _sha256_key(value: str) -> str:
    """SHA-256 hash for use as a rate limit key (e.g. email normalization)."""
    return hashlib.sha256(value.lower().strip().encode()).hexdigest()


async def is_rate_limited(
    key: str,
    max_requests: int,
    window_seconds: int = 60,
) -> bool:
    """
    Check if a key has exceeded max_requests within window_seconds.
    Uses Redis ZREMRANGEBYSCORE/ZADD/ZCARD sliding window if Redis is active;
    falls back to in-memory timestamp list otherwise.
    """
    redis_client = get_redis()
    now = time.time()

    if redis_client is not None:
        try:
            pipe = redis_client.pipeline()
            # 1. Clear timestamps older than window
            pipe.zremrangebyscore(key, 0, now - window_seconds)
            # 2. Add current timestamp
            pipe.zadd(key, {str(now): now})
            # 3. Count elements in window
            pipe.zcard(key)
            # 4. Set TTL
            pipe.expire(key, window_seconds + 5)
            results = await pipe.execute()

            request_count = results[2]
            return request_count > max_requests
        except Exception as e:
            logger.warning("Redis rate limit error, using in-memory fallback: %s", e)

    # In-memory fallback
    timestamps = _in_memory_windows[key]
    cutoff = now - window_seconds
    _in_memory_windows[key] = [t for t in timestamps if t > cutoff]
    _in_memory_windows[key].append(now)

    return len(_in_memory_windows[key]) > max_requests


def rate_limit(
    max_requests: int = 60,
    window_seconds: int = 60,
    key_func: Callable[[Request], str] | None = None,
):
    """
    FastAPI dependency factory for rate limiting.
    Defaults to client IP address as the identifier.
    """
    async def dependency(request: Request) -> None:
        if key_func is not None:
            identifier = key_func(request)
        else:
            identifier = _get_client_ip(request)

        route_key = f"ratelimit:{request.url.path}:{identifier}"
        limited = await is_rate_limited(route_key, max_requests, window_seconds)

        if limited:
            logger.warning("Rate limit exceeded for %s on %s", identifier, request.url.path)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(window_seconds)},
            )

    return dependency


def rate_limit_per_user(
    max_requests: int = 60,
    window_seconds: int = 60,
):
    """
    Rate limit keyed by the authenticated user ID.

    Used for authenticated flows (job creation, room creation, assistant prompts)
    where no single shared identifier (shared NAT IP, datacenter egress) should be
    able to throttle all users behind it.
    """
    from backend.app.identity.dependencies import get_current_user

    async def dependency(
        request: Request,
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> None:
        route_key = f"ratelimit:{request.url.path}:user:{current_user['user_id']}"
        limited = await is_rate_limited(route_key, max_requests, window_seconds)
        if limited:
            logger.warning(
                "Rate limit exceeded for user %s on %s",
                current_user["user_id"],
                request.url.path,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(window_seconds)},
            )

    return dependency


async def _extract_email_from_body(request: Request) -> str | None:
    """Best-effort extraction of a normalized email from a JSON request body."""
    try:
        data = await request.json()
        email = data.get("email", "") if isinstance(data, dict) else ""
        email = str(email).strip()
        return email or None
    except Exception:
        return None


def rate_limit_per_email(
    max_requests: int = 10,
    window_seconds: int = 3600,
):
    """
    Rate limit keyed by SHA-256 of the normalized email from the request body.

    Used for login, signup, OTP request and OTP verify so an attacker cannot
    bypass a per-account cap by rotating source IPs. Falls back to the client IP
    when the body has no readable email.
    """
    async def dependency(request: Request) -> None:
        email = await _extract_email_from_body(request)
        identifier = f"email:{_sha256_key(email)}" if email else f"ip:{_get_client_ip(request)}"
        route_key = f"ratelimit:{request.url.path}:{identifier}"
        limited = await is_rate_limited(route_key, max_requests, window_seconds)
        if limited:
            logger.warning("Rate limit exceeded on %s for identifier '%s'", request.url.path, identifier)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(window_seconds)},
            )

    return dependency
