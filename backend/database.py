"""
Database module for VidSnap AI backend.

Manages async MongoDB connections using Motor. Handles connection initialization,
verification, index creation, and graceful shutdown. Provides database access
through the get_db() function for use in route handlers.
"""

import logging
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from backend.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """
    Opens the MongoDB connection, verifies it with a ping, and creates required indexes.

    Called once on app startup. Initializes the global _client and _db variables,
    establishes connection to MongoDB Atlas, and sets up compound index on jobs collection.

    Raises:
        Exception: If connection fails or index creation fails.
    """
    global _client, _db

    logger.info("Connecting to MongoDB at %s...", settings.mongodb_uri)
    _client = AsyncIOMotorClient(settings.mongodb_uri)

    _db = _client[settings.mongodb_db]
    logger.info("Database '%s' selected", settings.mongodb_db)

    # Verify connection
    await _client.admin.command("ping")
    logger.info("MongoDB connection verified with ping")

    # Create compound index on jobs collection
    jobs_collection = _db["jobs"]
    await jobs_collection.create_index(
        [("status", 1), ("created_at", 1)],
        name="status_created_idx",
    )
    logger.info("Compound index 'status_created_idx' created on jobs collection")


async def disconnect_db() -> None:
    """
    Closes the MongoDB client connection.

    Called once on app shutdown. Safely closes the connection if it was
    previously established.
    """
    global _client

    if _client is not None:
        _client.close()
        logger.info("MongoDB connection closed")
    else:
        logger.warning("disconnect_db() called but _client was not initialized")


def get_db() -> AsyncIOMotorDatabase:
    """
    Returns the active database handle.

    Used as a dependency in route handlers to access the MongoDB database.

    Returns:
        AsyncIOMotorDatabase: The connected MongoDB database instance.

    Raises:
        RuntimeError: If called before connect_db() was executed on app startup.
    """
    if _db is None:
        raise RuntimeError(
            "Database not initialised. Ensure connect_db() was called on app startup."
        )
    return _db
