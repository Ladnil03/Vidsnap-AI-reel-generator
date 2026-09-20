"""
Queue Port: Abstract interface for asynchronous background task dispatch.
Supports ARQ on Redis, in-memory queue for testing, and Celery/Dramatiq later.
"""

from abc import ABC, abstractmethod
from typing import Any


class QueuePort(ABC):
    """Abstract interface defining required background queue operations."""

    @abstractmethod
    async def enqueue(
        self,
        task_name: str,
        *args: Any,
        job_id: str | None = None,
        **kwargs: Any,
    ) -> str:
        """Enqueue a background task and return the task identifier."""

    @abstractmethod
    async def get_status(
        self,
        job_id: str,
    ) -> str:
        """Check status of a queued task."""
