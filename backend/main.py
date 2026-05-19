"""
FastAPI application factory for VidSnap AI backend.

Initializes the FastAPI app with lifespan management, CORS middleware,
route registration, and logging configuration. Handles MongoDB connection
lifecycle and provides a health check endpoint.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import connect_db, disconnect_db
from backend.routes import jobs, reels

# ============================================================================
# LOGGING SETUP
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger(__name__)

# ============================================================================
# LIFESPAN CONTEXT MANAGER
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application startup and shutdown.

    Startup: connect to MongoDB, create indexes.
    Shutdown: disconnect from MongoDB cleanly.
    Note: Background worker is added in Day 3.
    """
    # STARTUP
    await connect_db()
    logger.info("VidSnap AI is ready")
    yield
    # SHUTDOWN
    await disconnect_db()
    logger.info("VidSnap AI shut down cleanly")


# ============================================================================
# APP CREATION
# ============================================================================

app = FastAPI(
    title="VidSnap AI",
    description="AI-powered video reel generator. Upload images, add narration text, get a 1080x1920 MP4 reel.",
    version="2.0.0",
    lifespan=lifespan,
)

# ============================================================================
# CORS MIDDLEWARE
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# ROUTER REGISTRATION
# ============================================================================

app.include_router(jobs.router)
app.include_router(reels.router)

# ============================================================================
# HEALTH CHECK
# ============================================================================


@app.get("/")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint.

    Returns app name and version. Used to verify the server is running.

    Returns:
        dict: Status object with app name and version.
    """
    return {"status": "ok", "app": "VidSnap AI", "version": "2.0.0"}
