"""
VidSnap.AI Automated Database & State Backup Utility.
Extracts MongoDB collections, creates a compressed JSONL archive, and archives it.
Zero-cost, zero card required.

Usage:
    python deploy/scripts/backup_database.py
"""

import asyncio
import json
import logging
import os
import shutil
import tarfile
import tempfile
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backup_database")

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "vidsnap")

BACKUP_COLLECTIONS = [
    "users",
    "jobs",
    "videos",
    "comments",
    "likes",
    "saves",
    "follows",
    "creator_profiles",
    "business_profiles",
    "campaigns",
    "collab_applications",
    "content_reports",
    "moderation_actions",
    "xp_ledger",
    "user_levels",
    "user_streaks",
    "user_badges",
    "feedback",
]


async def export_collection(db, collection_name: str, export_dir: str) -> int:
    """Export a single collection to JSON Lines format."""
    collection = db[collection_name]
    file_path = os.path.join(export_dir, f"{collection_name}.jsonl")
    count = 0
    with open(file_path, "w", encoding="utf-8") as f:
        async for doc in collection.find({}):
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
            for k, v in doc.items():
                if isinstance(v, datetime):
                    doc[k] = v.isoformat()
            f.write(json.dumps(doc) + "\n")
            count += 1
    return count


async def run_backup() -> str:
    """Execute complete database backup drill."""
    logger.info("Connecting to MongoDB for backup export: %s (DB: %s)", MONGO_URI.split("@")[-1], DB_NAME)
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    archive_name = f"vidsnap_backup_{timestamp}.tar.gz"

    with tempfile.TemporaryDirectory() as tmp_dir:
        json_dir = os.path.join(tmp_dir, "data")
        os.makedirs(json_dir, exist_ok=True)

        logger.info("Exporting collections to JSONL...")
        total_records = 0
        for col in BACKUP_COLLECTIONS:
            count = await export_collection(db, col, json_dir)
            total_records += count
            logger.info("  - %s: %d documents exported", col, count)

        # Create compressed tar.gz
        archive_path = os.path.join(tmp_dir, archive_name)
        logger.info("Compressing exported collections into %s...", archive_name)
        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(json_dir, arcname="data")

        file_size_kb = os.path.getsize(archive_path) / 1024.0
        logger.info("Archive created successfully (Size: %.2f KB, Records: %d)", file_size_kb, total_records)

        # Preserve in local backups directory
        local_backup_dir = "backups"
        os.makedirs(local_backup_dir, exist_ok=True)
        dest = os.path.join(local_backup_dir, archive_name)
        shutil.copy2(archive_path, dest)
        logger.info("Backup successfully preserved in local directory: %s", dest)

    client.close()
    return archive_name


if __name__ == "__main__":
    asyncio.run(run_backup())
