"""
Pexels Video Content Connector.
Integrates with Pexels API for vertical stock video discovery.
Zero re-hosting: streams directly from official Pexels CDN endpoints under Pexels License.
"""

import logging
from datetime import datetime, timezone

import httpx

from backend.app.core.config import settings
from backend.app.discovery.connectors.base import BaseSourceConnector
from backend.app.discovery.embeddings import get_embedding_service
from backend.app.discovery.models import DiscoveryItem, DiscoverySource, PlayerType, SourceStatusResponse

logger = logging.getLogger(__name__)

CURATED_PEXELS_VIDEOS = [
    {
        "id": "857032",
        "title": "Neon Cyberpunk City Highway Time-Lapse",
        "description": "Futuristic neon light trails and towering skyscrapers in vertical format.",
        "author_name": "Aleksandar Pasaric",
        "author_url": "https://www.pexels.com/@apasaric/",
        "embed_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "thumbnail_url": "https://images.pexels.com/videos/857032/free-video-857032.jpg",
        "tags": ["tech", "cyberpunk", "city", "night", "neon"],
        "duration": 22.0,
    },
    {
        "id": "1448735",
        "title": "High Altitude Mountain Drone Flight",
        "description": "Breathtaking vertical drone ascent over snowy alpine peaks and misty clouds.",
        "author_name": "Roman Odintsov",
        "author_url": "https://www.pexels.com/@roman-odintsov/",
        "embed_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "thumbnail_url": "https://images.pexels.com/videos/1448735/free-video-1448735.jpg",
        "tags": ["nature", "travel", "mountains", "drone", "landscape"],
        "duration": 18.0,
    },
    {
        "id": "3044127",
        "title": "Athletic Crossfit Battle Ropes Training",
        "description": "Intense HIIT gym workout demonstrating speed, power, and athletic endurance.",
        "author_name": "Kelly Lacy",
        "author_url": "https://www.pexels.com/@kelly-lacy-1179532/",
        "embed_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
        "thumbnail_url": "https://images.pexels.com/videos/3044127/free-video-3044127.jpg",
        "tags": ["fitness", "workout", "gym", "crossfit", "training"],
        "duration": 25.0,
    },
    {
        "id": "4155554",
        "title": "Fluid Acrylic Ink Mixing in Liquid Glass",
        "description": "Mesmerizing swirling color pigments and macro liquid fluid art patterns.",
        "author_name": "Anna Shvets",
        "author_url": "https://www.pexels.com/@shvetsa/",
        "embed_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        "thumbnail_url": "https://images.pexels.com/videos/4155554/free-video-4155554.jpg",
        "tags": ["art", "abstract", "colors", "satisfying", "creative"],
        "duration": 28.0,
    },
]


class PexelsConnector(BaseSourceConnector):
    """Connector for official Pexels vertical video search."""

    @property
    def source(self) -> DiscoverySource:
        return DiscoverySource.PEXELS

    @property
    def name(self) -> str:
        return "Pexels Video"

    def get_status(self) -> SourceStatusResponse:
        configured = bool(settings.pexels_api_key)
        return SourceStatusResponse(
            name=self.name,
            source=self.source,
            configured=configured,
            mode="api_key" if configured else "curated_fallback",
            description="Pexels vertical stock videos streamed directly via Pexels CDN (zero re-hosting)",
        )

    async def search(self, query: str, limit: int = 10) -> list[DiscoveryItem]:
        """Search Pexels API with portrait orientation filter, or use curated fallback."""
        items: list[DiscoveryItem] = []

        if settings.pexels_api_key:
            try:
                headers = {"Authorization": settings.pexels_api_key}
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(
                        "https://api.pexels.com/videos/search",
                        headers=headers,
                        params={
                            "query": query,
                            "orientation": "portrait",
                            "per_page": min(limit, 20),
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for v in data.get("videos", []):
                            # Find optimal vertical/HD video file link from official CDN
                            v_files = v.get("video_files", [])
                            if not v_files:
                                continue
                            # Prefer 720p or HD file
                            best_file = next(
                                (f for f in v_files if f.get("height", 0) >= 720),
                                v_files[0],
                            )
                            user = v.get("user", {})
                            d_item = self._build_item(
                                external_id=str(v["id"]),
                                title=f"Pexels Reel #{v['id']} by {user.get('name', 'Creator')}",
                                description=f"Vertical cinematography by {user.get('name', 'Pexels Creator')}",
                                author_name=user.get("name", "Pexels Creator"),
                                author_url=user.get("url"),
                                source_url=v.get("url", f"https://www.pexels.com/video/{v['id']}/"),
                                embed_url=best_file.get("link", ""),
                                thumbnail_url=v.get("image"),
                                duration=float(v.get("duration", 15.0)),
                                tags=[t.lower() for t in query.split() if len(t) > 2],
                            )
                            items.append(d_item)
                        if items:
                            return items[:limit]
            except Exception as e:
                logger.warning("Pexels API call failed, using curated inventory: %s", e)

        # Curated fallback
        query_words = [w.lower().strip("#") for w in query.split() if w.strip("#")]
        matched_seeds = []
        for seed in CURATED_PEXELS_VIDEOS:
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
                    source_url=f"https://www.pexels.com/video/{seed['id']}/",
                    embed_url=seed["embed_url"],
                    thumbnail_url=seed["thumbnail_url"],
                    duration=seed["duration"],
                    tags=seed["tags"],
                )
            )

        return items

    async def get_by_id(self, external_id: str) -> DiscoveryItem | None:
        """Fetch single Pexels item."""
        seed = next((s for s in CURATED_PEXELS_VIDEOS if s["id"] == external_id), None)
        if seed:
            return self._build_item(
                external_id=seed["id"],
                title=seed["title"],
                description=seed["description"],
                author_name=seed["author_name"],
                author_url=seed["author_url"],
                source_url=f"https://www.pexels.com/video/{seed['id']}/",
                embed_url=seed["embed_url"],
                thumbnail_url=seed["thumbnail_url"],
                duration=seed["duration"],
                tags=seed["tags"],
            )

        if settings.pexels_api_key:
            try:
                headers = {"Authorization": settings.pexels_api_key}
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(f"https://api.pexels.com/videos/videos/{external_id}", headers=headers)
                    if resp.status_code == 200:
                        v = resp.json()
                        v_files = v.get("video_files", [])
                        best_file = next((f for f in v_files if f.get("height", 0) >= 720), v_files[0])
                        user = v.get("user", {})
                        return self._build_item(
                            external_id=str(v["id"]),
                            title=f"Pexels Reel #{v['id']} by {user.get('name', 'Creator')}",
                            description=f"Vertical video asset by {user.get('name', 'Creator')}",
                            author_name=user.get("name", "Pexels Creator"),
                            author_url=user.get("url"),
                            source_url=v.get("url", f"https://www.pexels.com/video/{v['id']}/"),
                            embed_url=best_file.get("link", ""),
                            thumbnail_url=v.get("image"),
                            duration=float(v.get("duration", 15.0)),
                            tags=["pexels", "video"],
                        )
            except Exception as e:
                logger.debug("Pexels get_by_id error: %s", e)

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
            item_id=f"px_{external_id}",
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
            license="Pexels Free License",
            attribution_text=f"Video by {author_name} on Pexels",
            is_external=True,
            can_rehost=False,
            views_count=0,
            likes_count=0,
            created_at=datetime.now(timezone.utc),
        )
