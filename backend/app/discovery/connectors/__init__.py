"""
Discovery Source Connectors Registry.
Exports BaseSourceConnector and concrete adapters for YouTube Shorts, Pexels, and Pixabay.
"""

from backend.app.discovery.connectors.base import BaseSourceConnector
from backend.app.discovery.connectors.pexels import PexelsConnector
from backend.app.discovery.connectors.pixabay import PixabayConnector
from backend.app.discovery.connectors.youtube import YouTubeConnector

__all__ = [
    "BaseSourceConnector",
    "PexelsConnector",
    "PixabayConnector",
    "YouTubeConnector",
]
