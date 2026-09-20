"""
VidSnap.AI Database & State Disaster Recovery Restoration Script.
Extracts a tar.gz archive and restores JSONL documents into MongoDB collections.

Usage:
    python deploy/scripts/restore_database.py [archive_path] [--dry-run]
"""

import asyncio
import json
import logging
import os
import sys
import tarfile
import tempfile

from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("restore_database")

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "vidsnap")


async def restore_archive(archive_path: str, dry_run: bool = False) -> None:
    """Decompress archive and restore collections into MongoDB."""
    if not os.path.exists(archive_path):
        logger.error("Archive not found at %s", archive_path)
        sys.exit(1)

    logger.info("Connecting to MongoDB for restoration: %s (DB: %s)", MONGO_URI.split("@")[-1], DB_NAME)
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    with tempfile.TemporaryDirectory() as tmp_dir:
        logger.info("Extracting %s...", archive_path)
        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(path=tmp_dir)  # noqa: S202

        data_dir = os.path.join(tmp_dir, "data")
        if not os.path.exists(data_dir):
            logger.error("Invalid archive: 'data/' directory not found inside archive.")
            sys.exit(1)

        for filename in os.listdir(data_dir):
            if not filename.endswith(".jsonl"):
                continue

            collection_name = filename[:-6]
            file_path = os.path.join(data_dir, filename)
            collection = db[collection_name]

            docs_to_insert = []
            with open(file_path, encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        doc = json.loads(line)
                        if "_id" in doc:
                            try:
                                from bson import ObjectId
                                if len(doc["_id"]) == 24:
                                    doc["_id"] = ObjectId(doc["_id"])
                            except Exception:
                                pass
                        docs_to_insert.append(doc)

            if docs_to_insert:
                if dry_run:
                    logger.info("[DRY RUN] Would restore %d documents to %s", len(docs_to_insert), collection_name)
                else:
                    await collection.delete_many({})
                    result = await collection.insert_many(docs_to_insert)
                    logger.info("Restored %d documents to %s", len(result.inserted_ids), collection_name)

    client.close()
    logger.info("Restoration drill completed successfully.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python deploy/scripts/restore_database.py <archive_path> [--dry-run]")
        sys.exit(1)

    path = sys.argv[1]
    is_dry = "--dry-run" in sys.argv
    asyncio.run(restore_archive(path, dry_run=is_dry))
