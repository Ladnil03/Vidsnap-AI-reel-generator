"""
FastAPI Application Factory for VidSnap AI.
Initializes lifespan, routes, CORS middleware, security headers, and health endpoints.
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.admin.routes import router as admin_router
from backend.app.content.routes import router as content_router
from backend.app.core.config import settings
from backend.app.core.database import connect_db, disconnect_db, ping_db
from backend.app.core.logging_config import setup_logging
from backend.app.core.redis import connect_redis, disconnect_redis, ping_redis
from backend.app.discovery.routes import router as discovery_router
from backend.app.feed.routes import router as feed_router
from backend.app.feedback.routes import router as feedback_router
from backend.app.identity.routes import router as identity_router
from backend.app.media.routes import router as media_router
from backend.app.notifications.routes import router as notifications_router
from backend.app.recsys.routes import router as recsys_router
from backend.app.reel_studio.routes import router as reel_studio_router
from backend.app.social.routes import router as social_router

# Configure application logging
setup_logging(debug=settings.debug)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown lifecycles."""
    logger.info("Initializing %s v%s in %s mode...", settings.app_name, settings.app_version, settings.environment)

    # 1. Connect MongoDB and verify indexes
    await connect_db()

    # 2. Connect Redis
    await connect_redis()

    logger.info("Application startup complete. Ready to receive requests.")
    yield

    # Shutdown
    logger.info("Initiating graceful shutdown...")
    await disconnect_redis()
    await disconnect_db()
    logger.info("Application shutdown complete.")


# App initialization
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Next-Generation AI Short-Video Social Entertainment Platform",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug or settings.environment != "production" else None,
    redoc_url="/redoc" if settings.debug or settings.environment != "production" else None,
)

# Tightened CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


@app.middleware("http")
async def security_headers_middleware(request, call_next):
    """Inject OWASP recommended security headers on all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ==============================================================================
# ROUTE REGISTRATION (/api/v1)
# ==============================================================================

app.include_router(identity_router)
app.include_router(media_router)
app.include_router(reel_studio_router)
app.include_router(content_router)
app.include_router(social_router)
app.include_router(feed_router)
app.include_router(discovery_router)
app.include_router(recsys_router)
app.include_router(notifications_router)
app.include_router(feedback_router)
app.include_router(admin_router)

# ==============================================================================
# BACKWARD COMPATIBILITY ALIASES (For existing Flask frontend compatibility)
# ==============================================================================
legacy_identity_router = identity_router
legacy_jobs_router = reel_studio_router

# ==============================================================================
# HEALTH CHECK ENDPOINTS
# ==============================================================================


@app.get("/health/live", tags=["Health"])
async def liveness_probe() -> dict[str, str]:
    """Liveness probe: verifies process is alive."""
    return {"status": "alive", "app": settings.app_name, "version": settings.app_version}


@app.get("/health/ready", tags=["Health"])
async def readiness_probe() -> JSONResponse:
    """Readiness probe: verifies MongoDB and Redis connections."""
    db_ok = await ping_db()
    redis_ok = await ping_redis()

    is_ready = db_ok  # Database is essential; Redis can run in-memory fallback if needed
    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if is_ready else "unready",
            "dependencies": {
                "mongodb": "healthy" if db_ok else "unhealthy",
                "redis": "healthy" if redis_ok else "unhealthy/offline",
            },
        },
    )


@app.get("/", tags=["Health"])
async def root_status() -> dict[str, str]:
    """Root status summary."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "status": "online",
    }
