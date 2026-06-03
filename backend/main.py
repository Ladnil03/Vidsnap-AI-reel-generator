"""
FastAPI application factory for VidSnap AI backend.

Initializes the FastAPI app with lifespan management, CORS middleware,
route registration, and logging configuration. Handles MongoDB connection
lifecycle and provides a health check endpoint.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import connect_db, disconnect_db
from backend.routes.admin import router as admin_router
from backend.routes.auth import router as auth_router
from backend.routes.feedback import router as feedback_router
from backend.routes.jobs import router as jobs_router
from backend.routes.reels import router as reels_router
from backend.routes.users import router as users_router
from backend.worker import run_worker

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

    Startup:
      1. Connect to MongoDB and create indexes
      2. Start the background worker as an asyncio task
    Shutdown:
      1. Cancel the worker task gracefully
      2. Disconnect from MongoDB
    """
    # STARTUP
    await connect_db()

    # Log CORS configuration
    logger.info(f"CORS allowed origins: {settings.allowed_origins_list}")

    # Start worker as a background asyncio task
    # daemon=True equivalent — task is cancelled on shutdown
    worker_task = asyncio.create_task(
        run_worker(),
        name="reel-worker",
    )
    logger.info("Background worker started")
    logger.info("VidSnap AI is ready")

    yield

    # SHUTDOWN
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        logger.info("Background worker stopped")

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


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ============================================================================
# ROUTER REGISTRATION
# ============================================================================

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(jobs_router)
app.include_router(reels_router)
app.include_router(feedback_router)
app.include_router(admin_router)

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
