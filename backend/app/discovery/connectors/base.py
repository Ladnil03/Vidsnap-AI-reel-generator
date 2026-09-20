"""
Base Source Connector Interface (Ports & Adapters).
Defines abstract contracts for external content providers (YouTube, Pexels, Pixabay, etc.).
"""

from abc import ABC, abstractmethod

from backend.app.discovery.models import DiscoveryItem, DiscoverySource, SourceStatusResponse


class BaseSourceConnector(ABC):
    """Abstract Port for external media search and ingestion."""

    @property
    @abstractmethod
    def source(self) -> DiscoverySource:
        """Content source platform enum."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""
        pass

    @abstractmethod
    async def search(self, query: str, limit: int = 10) -> list[DiscoveryItem]:
        """Search external platform for vertical short videos matching query."""
        pass

    @abstractmethod
    async def get_by_id(self, external_id: str) -> DiscoveryItem | None:
        """Fetch single item details by platform ID."""
        pass

    @abstractmethod
    def get_status(self) -> SourceStatusResponse:
        """Return connectivity and API key configuration status."""
        pass
