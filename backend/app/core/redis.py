"""
Redis connection management and health verification.
Provides async Redis client for caching, rate limiting, and queues.
"""

import logging

import redis.asyncio as redis

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None


async def connect_redis() -> redis.Redis | None:
    """Initialize async Redis client connection."""
    global _redis_client

    if _redis_client is not None:
        return _redis_client

    try:
        _redis_client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=3,
        )
        await _redis_client.ping()
        logger.info("Connected to Redis at %s", settings.redis_url)
        return _redis_client
    except Exception as e:
        logger.warning(
            "Could not connect to Redis at %s: %s (in-memory fallbacks will be used where applicable)",
            settings.redis_url,
            e,
        )
        _redis_client = None
        return None


async def disconnect_redis() -> None:
    """Close Redis connection."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis connection closed.")


def get_redis() -> redis.Redis | None:
    """Return active Redis client or None if offline."""
    return _redis_client


async def ping_redis() -> bool:
    """Check Redis health for /health/ready check."""
    if _redis_client is None:
        return False
    try:
        return await _redis_client.ping() is True
    except Exception:
        return False
