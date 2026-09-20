"""
ARQ Queue Adapter for Redis background task dispatch.
"""

import logging
from typing import Any

from arq.connections import ArqRedis, create_pool

from backend.app.core.config import settings
from backend.app.core.ports.queue import QueuePort

logger = logging.getLogger(__name__)

_arq_pool: ArqRedis | None = None


async def get_arq_pool() -> ArqRedis | None:
    """Get or create singleton ARQ Redis connection pool."""
    global _arq_pool
    if _arq_pool is not None:
        return _arq_pool

    try:
        from arq.connections import RedisSettings
        # Parse host and port from redis_url
        redis_settings = RedisSettings.from_dsn(settings.redis_url)
        _arq_pool = await create_pool(redis_settings)
        return _arq_pool
    except Exception as e:
        logger.warning("Could not connect ARQ to Redis: %s", e)
        return None


class ARQQueueAdapter(QueuePort):
    """Queue adapter backed by ARQ on Redis."""

    async def enqueue(
        self,
        task_name: str,
        *args: Any,
        job_id: str | None = None,
        **kwargs: Any,
    ) -> str:
        pool = await get_arq_pool()
        if pool is None:
            raise RuntimeError(
                "Cannot enqueue task: Redis ARQ pool is unavailable. Ensure Redis is running."
            )

        job = await pool.enqueue_job(
            task_name,
            *args,
            _job_id=job_id,
            **kwargs,
        )
        if job is None:
            # Job with this _job_id already queued (idempotency)
            return job_id or "duplicate"
        return job.job_id

    async def get_status(
        self,
        job_id: str,
    ) -> str:
        pool = await get_arq_pool()
        if pool is None:
            return "unknown"
        job = pool.job(job_id)
        status = await job.status()
        return status.value if hasattr(status, "value") else str(status)
