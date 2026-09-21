"""
Utility to reconcile legacy MongoDB indexes to canonical names.
Drops old legacy index names so MongoDB Atlas matches the modern schema cleanly.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from motor.motor_asyncio import AsyncIOMotorClient

from backend.app.core.config import settings
from backend.app.core.database import ensure_indexes

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sync_indexes")

LEGACY_INDEXES = [
    ("users", "email_unique_idx"),
    ("jobs", "status_created_idx"),
    ("feedback", "feedback_created_idx"),
]


async def reconcile():
    logger.info("Connecting to MongoDB Atlas at %s...", settings.sanitized_mongodb_uri)
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]

    logger.info("Reconciling legacy conflicting indexes...")
    for collection_name, index_name in LEGACY_INDEXES:
        try:
            await db[collection_name].drop_index(index_name)
            logger.info("✅ Dropped legacy index '%s' from collection '%s'", index_name, collection_name)
        except Exception as err:
            logger.info("ℹ️ Index '%s' on '%s': %s", index_name, collection_name, err)

    logger.info("Building all canonical indexes...")
    await ensure_indexes(db)
    logger.info("🎉 All MongoDB indexes are now 100% clean and reconciled!")
    client.close()


if __name__ == "__main__":
    asyncio.run(reconcile())
