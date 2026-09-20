"""
Rate Limiter using Redis sliding window with in-memory fallback.
Protects against brute force, signup abuse, and DoS attacks.
"""

import logging
import time
from collections import defaultdict
from collections.abc import Callable

from fastapi import HTTPException, Request, status

from backend.app.core.redis import get_redis

logger = logging.getLogger(__name__)

# In-memory sliding window fallback when Redis is offline
_in_memory_windows: dict[str, list[float]] = defaultdict(list)


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
            # Prefer forwarded header for reverse proxy setups
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                identifier = forwarded.split(",")[0].strip()
            elif request.client:
                identifier = request.client.host
            else:
                identifier = "unknown"

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
