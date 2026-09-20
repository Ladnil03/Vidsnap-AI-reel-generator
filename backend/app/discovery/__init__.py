"""
Discovery Bounded Context Package.
Exports DiscoveryService, DiscoveryItem, and API Router.
"""

from backend.app.discovery.models import DiscoveryItem, DiscoverySource, PlayerType
from backend.app.discovery.routes import router as discovery_router
from backend.app.discovery.service import DiscoveryService

__all__ = [
    "DiscoveryItem",
    "DiscoveryService",
    "DiscoverySource",
    "PlayerType",
    "discovery_router",
]
