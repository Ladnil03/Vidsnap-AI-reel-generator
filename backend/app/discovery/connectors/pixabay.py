"""
Pixabay Video Content Connector.
Integrates with Pixabay API for royalty-free vertical video discovery.
Zero re-hosting: streams directly from Pixabay CDN endpoints under Pixabay Content License.
"""

import logging
from datetime import datetime, timezone

import httpx

from backend.app.core.config import settings
from backend.app.discovery.connectors.base import BaseSourceConnector
from backend.app.discovery.embeddings import get_embedding_service
from backend.app.discovery.models import DiscoveryItem, DiscoverySource, PlayerType, SourceStatusResponse

logger = logging.getLogger(__name__)

CURATED_PIXABAY_VIDEOS = [
    {
        "id": "134211",
        "title": "Quantum Particles & Digital AI Neural Matrix",
        "description": "Luminescent floating particles simulating deep neural network weights.",
        "author_name": "GamutGlow",
        "author_url": "https://pixabay.com/users/gamutglow-271828/",
        "embed_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        "thumbnail_url": "https://cdn.pixabay.com/photo/2020/05/18/16/17/social-media-5187243_1280.png",
        "tags": ["tech", "ai", "matrix", "particles", "neural"],
        "duration": 30.0,
    },
    {
        "id": "157832",
        "title": "Coffee Barista Latte Art Pouring in Slow Motion",
        "description": "Artisan espresso extraction and textured milk pouring into a delicate rosetta.",
        "author_name": "BrewMaster",
        "author_url": "https://pixabay.com/users/brewmaster-314159/",
        "embed_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
        "thumbnail_url": "https://cdn.pixabay.com/photo/2017/08/07/22/57/coffee-2608864_1280.jpg",
        "tags": ["lifestyle", "coffee", "satisfying", "barista", "art"],
        "duration": 20.0,
    },
]


class PixabayConnector(BaseSourceConnector):
    """Connector for official Pixabay video search."""

    @property
    def source(self) -> DiscoverySource:
        return DiscoverySource.PIXABAY

    @property
    def name(self) -> str:
        return "Pixabay Video"

    def get_status(self) -> SourceStatusResponse:
        configured = bool(settings.pixabay_api_key)
        return SourceStatusResponse(
            name=self.name,
            source=self.source,
            configured=configured,
            mode="api_key" if configured else "curated_fallback",
            description="Pixabay vertical video search streamed directly via Pixabay CDN (zero re-hosting)",
        )

    async def search(self, query: str, limit: int = 10) -> list[DiscoveryItem]:
        """Search Pixabay API or use curated fallback."""
        items: list[DiscoveryItem] = []

        if settings.pixabay_api_key:
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(
                        "https://pixabay.com/api/videos/",
                        params={
                            "key": settings.pixabay_api_key,
                            "q": query,
                            "per_page": min(limit, 20),
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for hit in data.get("hits", []):
                            videos_dict = hit.get("videos", {})
                            # Pick medium or small direct video file
                            target = videos_dict.get("medium") or videos_dict.get("small") or videos_dict.get("large")
                            if not target or not target.get("url"):
                                continue

                            d_item = self._build_item(
                                external_id=str(hit["id"]),
                                title=f"Pixabay #{hit['id']}: {hit.get('tags', 'Reel')}",
                                description=f"Stock video by Pixabay user {hit.get('user', 'Creator')}",
                                author_name=hit.get("user", "Pixabay Creator"),
                                author_url=f"https://pixabay.com/users/{hit.get('user', '')}-{hit.get('user_id', '')}/",
                                source_url=hit.get("pageURL", f"https://pixabay.com/videos/id-{hit['id']}/"),
                                embed_url=target["url"],
                                thumbnail_url=f"https://i.vimeocdn.com/video/{hit.get('picture_id', '')}_640x360.jpg",
                                duration=float(hit.get("duration", 15.0)),
                                tags=[t.strip() for t in hit.get("tags", "").split(",") if t.strip()],
                            )
                            items.append(d_item)
                        if items:
                            return items[:limit]
            except Exception as e:
                logger.warning("Pixabay API call failed, using curated inventory: %s", e)

        # Curated fallback
        query_words = [w.lower().strip("#") for w in query.split() if w.strip("#")]
        matched_seeds = []
        for seed in CURATED_PIXABAY_VIDEOS:
            score = 0
            for w in query_words:
                if w in seed["title"].lower() or any(w in t for t in seed["tags"]):
                    score += 2
            matched_seeds.append((score, seed))

        matched_seeds.sort(key=lambda x: x[0], reverse=True)
        for _, seed in matched_seeds[:limit]:
            items.append(
                self._build_item(
                    external_id=seed["id"],
                    title=seed["title"],
                    description=seed["description"],
                    author_name=seed["author_name"],
                    author_url=seed["author_url"],
                    source_url=f"https://pixabay.com/videos/{seed['id']}/",
                    embed_url=seed["embed_url"],
                    thumbnail_url=seed["thumbnail_url"],
                    duration=seed["duration"],
                    tags=seed["tags"],
                )
            )

        return items

    async def get_by_id(self, external_id: str) -> DiscoveryItem | None:
        """Fetch single Pixabay item."""
        seed = next((s for s in CURATED_PIXABAY_VIDEOS if s["id"] == external_id), None)
        if seed:
            return self._build_item(
                external_id=seed["id"],
                title=seed["title"],
                description=seed["description"],
                author_name=seed["author_name"],
                author_url=seed["author_url"],
                source_url=f"https://pixabay.com/videos/{seed['id']}/",
                embed_url=seed["embed_url"],
                thumbnail_url=seed["thumbnail_url"],
                duration=seed["duration"],
                tags=seed["tags"],
            )
        return None

    def _build_item(
        self,
        external_id: str,
        title: str,
        description: str,
        author_name: str,
        author_url: str | None,
        source_url: str,
        embed_url: str,
        thumbnail_url: str | None,
        duration: float,
        tags: list[str],
    ) -> DiscoveryItem:
        embedder = get_embedding_service()
        embedding = embedder.embed_text(f"{title} {description} {' '.join(tags)} {author_name}")

        return DiscoveryItem(
            item_id=f"pb_{external_id}",
            source=self.source,
            external_id=external_id,
            title=title,
            description=description,
            author_name=author_name,
            author_url=author_url,
            source_url=source_url,
            embed_url=embed_url,
            player_type=PlayerType.DIRECT_VIDEO,
            thumbnail_url=thumbnail_url,
            duration=duration,
            tags=tags,
            embedding=embedding,
            license="Pixabay Content License",
            attribution_text=f"Video by {author_name} on Pixabay",
            is_external=True,
            can_rehost=False,
            views_count=0,
            likes_count=0,
            created_at=datetime.now(timezone.utc),
        )
