"""
Discovery Service Layer.
Manages multi-source catalog indexing, live connector queries, semantic ranking,
deduplication, and strict 20,000-item LRU capacity enforcement on MongoDB Atlas M0.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.discovery.connectors.base import BaseSourceConnector
from backend.app.discovery.connectors.pexels import PexelsConnector
from backend.app.discovery.connectors.pixabay import PixabayConnector
from backend.app.discovery.connectors.youtube import YouTubeConnector
from backend.app.discovery.embeddings import get_embedding_service
from backend.app.discovery.models import (
    BatchIngestRequest,
    BatchIngestResponse,
    DiscoveryItem,
    DiscoverySearchRequest,
    DiscoverySearchResponse,
    DiscoverySource,
    SourceStatusResponse,
)

logger = logging.getLogger(__name__)


class DiscoveryService:
    """Core catalog indexing, search, and connector orchestration service."""

    def __init__(self, db: AsyncIOMotorDatabase | None = None):
        self._db = db
        self.connectors: dict[DiscoverySource, BaseSourceConnector] = {
            DiscoverySource.YOUTUBE_SHORTS: YouTubeConnector(),
            DiscoverySource.PEXELS: PexelsConnector(),
            DiscoverySource.PIXABAY: PixabayConnector(),
        }

    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is not None:
            return self._db
        return get_db()

    async def search(self, req: DiscoverySearchRequest) -> DiscoverySearchResponse:
        """
        Execute multi-source search across indexed catalog and live connectors.
        Uses hybrid lexical matching and 384D semantic vector cosine scoring.
        """
        query_filter: dict[str, Any] = {}
        if req.source:
            query_filter["source"] = req.source.value
        if req.tag:
            query_filter["tags"] = req.tag.lower().strip("#")

        q = req.q.strip() if req.q else ""
        if q:
            # Query-based filter: regex on title, description, or tags
            query_filter["$or"] = [
                {"title": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
                {"tags": {"$in": [w.lower().strip("#") for w in q.split()]}},
            ]

        # 1. Fetch matches from local discovery catalog
        skip = (req.page - 1) * req.limit
        cursor = self.db["discovery_catalog"].find(query_filter).sort("created_at", -1).skip(skip).limit(req.limit)
        docs = await cursor.to_list(length=req.limit)

        # 2. If catalog has few results and a query is present, query active connectors on-the-fly
        if len(docs) < req.limit and q and req.page == 1:
            target_sources = [req.source] if req.source else list(self.connectors.keys())
            for src in target_sources:
                connector = self.connectors.get(src)
                if connector:
                    try:
                        fresh_items = await connector.search(q, limit=5)
                        for item in fresh_items:
                            await self.ingest_item(item)
                    except Exception as e:
                        logger.warning("Live connector search failed for %s: %s", src, e)

            # Re-fetch after live ingestion
            cursor = self.db["discovery_catalog"].find(query_filter).sort("created_at", -1).skip(skip).limit(req.limit)
            docs = await cursor.to_list(length=req.limit)

        total_count = await self.db["discovery_catalog"].count_documents(query_filter)

        # 3. Hybrid Semantic Re-ranking if query provided
        items = [self._doc_to_item(d) for d in docs]
        if q and items:
            embedder = get_embedding_service()
            q_vector = embedder.embed_text(q)

            def score_item(it: DiscoveryItem) -> float:
                sim = embedder.cosine_similarity(q_vector, it.embedding) if it.embedding else 0.0
                exact_boost = 0.3 if q.lower() in it.title.lower() else 0.0
                tag_boost = 0.2 if any(q.lower() in t.lower() for t in it.tags) else 0.0
                return sim + exact_boost + tag_boost

            items.sort(key=score_item, reverse=True)

        return DiscoverySearchResponse(
            items=items,
            total=total_count,
            page=req.page,
            limit=req.limit,
            has_more=(skip + len(items)) < total_count,
        )

    async def get_item(self, item_id: str) -> DiscoveryItem | None:
        """Fetch single discovery item and touch last_viewed_at for LRU tracking."""
        doc = await self.db["discovery_catalog"].find_one({"item_id": item_id})
        if not doc:
            return None

        now = datetime.now(timezone.utc)
        await self.db["discovery_catalog"].update_one(
            {"item_id": item_id},
            {"$set": {"last_viewed_at": now}, "$inc": {"views_count": 1}},
        )
        doc["views_count"] = doc.get("views_count", 0) + 1
        doc["last_viewed_at"] = now
        return self._doc_to_item(doc)

    async def ingest_item(self, item: DiscoveryItem) -> bool:
        """
        Upsert a discovery item into catalog with deduplication and 20k LRU capacity cap.
        Returns True if inserted/updated.
        """
        now = datetime.now(timezone.utc)
        doc = item.model_dump()
        doc["updated_at"] = now
        if not doc.get("last_viewed_at"):
            doc["last_viewed_at"] = now

        result = await self.db["discovery_catalog"].update_one(
            {"source": item.source.value, "external_id": item.external_id},
            {"$set": doc},
            upsert=True,
        )

        # Enforce 20,000 item LRU ceiling to protect 512MB MongoDB Atlas M0 quota
        if result.upserted_id is not None:
            await self._enforce_catalog_capacity_limit()

        return True

    async def batch_ingest(self, req: BatchIngestRequest) -> BatchIngestResponse:
        """Fetch a batch of items from a connector and ingest them."""
        connector = self.connectors.get(req.source)
        if not connector:
            raise ValueError(f"Unknown source connector: {req.source}")

        items = await connector.search(req.query, limit=req.limit)
        ingested = 0
        skipped = 0

        for item in items:
            existing = await self.db["discovery_catalog"].find_one(
                {"source": item.source.value, "external_id": item.external_id}
            )
            if existing:
                skipped += 1
            else:
                await self.ingest_item(item)
                ingested += 1

        total_catalog = await self.db["discovery_catalog"].count_documents({})
        return BatchIngestResponse(
            source=req.source,
            query=req.query,
            ingested_count=ingested,
            skipped_existing_count=skipped,
            total_catalog_size=total_catalog,
        )

    async def list_sources(self) -> list[SourceStatusResponse]:
        """Return status for all registered content connectors."""
        return [c.get_status() for c in self.connectors.values()]

    async def _enforce_catalog_capacity_limit(self) -> None:
        """
        Purges oldest / least recently viewed items when catalog exceeds max capacity.
        Strictly preserves free-tier MongoDB Atlas M0 512MB memory/disk ceiling.
        """
        max_size = settings.max_discovery_catalog_size
        total = await self.db["discovery_catalog"].count_documents({})
        if total > max_size:
            overage = total - max_size + 100  # Prune 100 extra items to avoid thrashing
            logger.info("Catalog size %d exceeds %d. Pruning %d LRU items...", total, max_size, overage)
            # Find oldest last_viewed_at items
            cursor = self.db["discovery_catalog"].find({}, {"_id": 1}).sort("last_viewed_at", 1).limit(overage)
            to_delete = await cursor.to_list(length=overage)
            if to_delete:
                ids = [d["_id"] for d in to_delete]
                await self.db["discovery_catalog"].delete_many({"_id": {"$in": ids}})

    def _doc_to_item(self, doc: dict[str, Any]) -> DiscoveryItem:
        """Convert MongoDB document to DiscoveryItem model."""
        return DiscoveryItem(
            item_id=doc["item_id"],
            source=DiscoverySource(doc["source"]),
            external_id=doc["external_id"],
            title=doc.get("title", ""),
            description=doc.get("description", ""),
            author_name=doc.get("author_name", "Creator"),
            author_url=doc.get("author_url"),
            source_url=doc.get("source_url", ""),
            embed_url=doc.get("embed_url", ""),
            player_type=doc.get("player_type", "direct_video"),
            thumbnail_url=doc.get("thumbnail_url"),
            duration=float(doc.get("duration", 0.0)),
            tags=doc.get("tags", []),
            embedding=doc.get("embedding", []),
            license=doc.get("license", "Standard"),
            attribution_text=doc.get("attribution_text", ""),
            is_external=doc.get("is_external", True),
            can_rehost=doc.get("can_rehost", False),
            views_count=doc.get("views_count", 0),
            likes_count=doc.get("likes_count", 0),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            last_viewed_at=doc.get("last_viewed_at"),
        )
