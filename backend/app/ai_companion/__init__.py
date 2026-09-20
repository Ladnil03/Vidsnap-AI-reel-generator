"""
AI Companion & Personalization Bounded Context.
Orchestrates AI Entertainment Companion, Mood State, Smart Dynamic Playlists,
Entertainment Journeys, and Consented Digital Twins.
"""

from backend.app.ai_companion.routes import router as companion_router

__all__ = ["companion_router"]
