"""
Recommendation System Bounded Context Package.
Exports RecSysService, RecommendationItem, and API Router.
"""

from backend.app.recsys.models import InteractionEventRequest, InteractionType, RecommendationItem
from backend.app.recsys.routes import router as recsys_router
from backend.app.recsys.service import RecSysService

__all__ = [
    "InteractionEventRequest",
    "InteractionType",
    "RecSysService",
    "RecommendationItem",
    "recsys_router",
]
