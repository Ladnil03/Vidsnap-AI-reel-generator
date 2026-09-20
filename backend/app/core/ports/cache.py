"""
Cache Port: Abstract interface for key-value caching and counters.
"""

from abc import ABC, abstractmethod


class CachePort(ABC):
    """Abstract interface defining required caching operations."""

    @abstractmethod
    async def get(self, key: str) -> str | None:
        """Retrieve cached string value or None."""

    @abstractmethod
    async def set(self, key: str, value: str, expire_seconds: int | None = None) -> bool:
        """Store string value in cache with optional TTL."""

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Remove key from cache."""

    @abstractmethod
    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment integer counter."""
