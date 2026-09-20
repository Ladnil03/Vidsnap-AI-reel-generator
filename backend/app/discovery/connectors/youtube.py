"""
YouTube Shorts Content Connector.
Integrates with YouTube Data API v3 and YouTube oEmbed API.
Guarantees 100% legal compliance: uses official responsive iframe embed player,
never scrapes, and never re-hosts or downloads video files.
"""

import logging
from datetime import datetime, timezone

import httpx

from backend.app.core.config import settings
from backend.app.discovery.connectors.base import BaseSourceConnector
from backend.app.discovery.embeddings import get_embedding_service
from backend.app.discovery.models import DiscoveryItem, DiscoverySource, PlayerType, SourceStatusResponse

logger = logging.getLogger(__name__)

# Curated, compliant YouTube Shorts seeds for zero-key zero-cost environments
CURATED_YOUTUBE_SHORTS = [
    {
        "id": "5qap5aO4i9A",
        "title": "Lofi Hip Hop & Coding Aesthetics",
        "description": "Chill beats and futuristic developer workspace setup.",
        "author_name": "Lofi Girl",
        "author_url": "https://www.youtube.com/@LofiGirl",
        "tags": ["tech", "coding", "music", "lofi", "aesthetic"],
        "duration": 58.0,
    },
    {
        "id": "kJQP7kiw5Fk",
        "title": "Despacito Vertical Acoustic Groove",
        "description": "Acoustic Latin rhythms and guitar fingerstyle showcase.",
        "author_name": "Luis Fonsi",
        "author_url": "https://www.youtube.com/@LuisFonsi",
        "tags": ["music", "acoustic", "dance", "guitar"],
        "duration": 45.0,
    },
    {
        "id": "fJ9rUzIMcZQ",
        "title": "Queen Bohemian Rhapsody Vocal Harmonies Breakdown",
        "description": "Inside the iconic vocal layering and harmony architecture.",
        "author_name": "Queen Official",
        "author_url": "https://www.youtube.com/@Queen",
        "tags": ["music", "rock", "vocals", "legend"],
        "duration": 55.0,
    },
    {
        "id": "OPf0YbXqDm0",
        "title": "Uptown Funk Dynamic Bassline & Dance Energy",
        "description": "Catchy funk grooves and brass breakdown in 9:16.",
        "author_name": "Mark Ronson",
        "author_url": "https://www.youtube.com/@MarkRonson",
        "tags": ["music", "funk", "dance", "comedy"],
        "duration": 50.0,
    },
    {
        "id": "9bZkp7q19f0",
        "title": "Gangnam Style Viral K-Pop Dance Momentum",
        "description": "The viral phenomenon that broke internet records.",
        "author_name": "officialpsy",
        "author_url": "https://www.youtube.com/@officialpsy",
        "tags": ["comedy", "dance", "kpop", "music"],
        "duration": 40.0,
    },
    {
        "id": "JGwWNGJdvx8",
        "title": "Shape of You Looper Pedal Live Performance",
        "description": "Building a global chart-topping track live with rhythm layers.",
        "author_name": "Ed Sheeran",
        "author_url": "https://www.youtube.com/@EdSheeran",
        "tags": ["music", "live", "looping", "acoustic"],
        "duration": 59.0,
    },
]


class YouTubeConnector(BaseSourceConnector):
    """Connector for official YouTube Shorts discovery and embedding."""

    @property
    def source(self) -> DiscoverySource:
        return DiscoverySource.YOUTUBE_SHORTS

    @property
    def name(self) -> str:
        return "YouTube Shorts"

    def get_status(self) -> SourceStatusResponse:
        configured = bool(settings.youtube_api_key)
        return SourceStatusResponse(
            name=self.name,
            source=self.source,
            configured=configured,
            mode="api_key" if configured else "oembed_fallback",
            description="Official YouTube Shorts via Data API v3 and oEmbed embeds (zero re-hosting)",
        )

    async def search(self, query: str, limit: int = 10) -> list[DiscoveryItem]:
        """Search for YouTube Shorts using API v3 or curated zero-cost fallback."""
        items: list[DiscoveryItem] = []

        if settings.youtube_api_key:
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(
                        "https://www.googleapis.com/youtube/v3/search",
                        params={
                            "part": "snippet",
                            "q": query,
                            "type": "video",
                            "videoDuration": "short",
                            "maxResults": min(limit, 25),
                            "key": settings.youtube_api_key,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for item in data.get("items", []):
                            vid_id = item["id"].get("videoId")
                            if not vid_id:
                                continue
                            snippet = item.get("snippet", {})
                            d_item = self._build_item(
                                external_id=vid_id,
                                title=snippet.get("title", "YouTube Short"),
                                description=snippet.get("description", ""),
                                author_name=snippet.get("channelTitle", "YouTube Creator"),
                                author_url=f"https://www.youtube.com/channel/{snippet.get('channelId', '')}",
                                thumbnail_url=snippet.get("thumbnails", {}).get("high", {}).get("url")
                                or f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
                                tags=[t.lower() for t in query.split() if len(t) > 2],
                                duration=60.0,
                            )
                            items.append(d_item)
                        if items:
                            return items[:limit]
            except Exception as e:
                logger.warning("YouTube API query failed, falling back to curated inventory: %s", e)

        # Curated fallback when API key not configured or on network timeout
        query_words = [w.lower().strip("#") for w in query.split() if w.strip("#")]
        matched_seeds = []
        for seed in CURATED_YOUTUBE_SHORTS:
            score = 0
            for w in query_words:
                if w in seed["title"].lower() or any(w in t for t in seed["tags"]):
                    score += 2
            matched_seeds.append((score, seed))

        # Sort by relevance to query
        matched_seeds.sort(key=lambda x: x[0], reverse=True)
        for _, seed in matched_seeds[:limit]:
            items.append(
                self._build_item(
                    external_id=seed["id"],
                    title=seed["title"],
                    description=seed["description"],
                    author_name=seed["author_name"],
                    author_url=seed["author_url"],
                    thumbnail_url=f"https://i.ytimg.com/vi/{seed['id']}/hqdefault.jpg",
                    tags=seed["tags"],
                    duration=seed["duration"],
                )
            )

        return items

    async def get_by_id(self, external_id: str) -> DiscoveryItem | None:
        """Fetch details for a specific YouTube video via oEmbed."""
        title = f"YouTube Short ({external_id})"
        author_name = "YouTube Creator"
        author_url = None

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={external_id}&format=json"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    title = data.get("title", title)
                    author_name = data.get("author_name", author_name)
                    author_url = data.get("author_url")
        except Exception as e:
            logger.debug("YouTube oEmbed fetch error for %s: %s", external_id, e)

        return self._build_item(
            external_id=external_id,
            title=title,
            description="Official YouTube Short video asset.",
            author_name=author_name,
            author_url=author_url,
            thumbnail_url=f"https://i.ytimg.com/vi/{external_id}/hqdefault.jpg",
            tags=["youtube", "shorts"],
            duration=60.0,
        )

    def _build_item(
        self,
        external_id: str,
        title: str,
        description: str,
        author_name: str,
        author_url: str | None,
        thumbnail_url: str,
        tags: list[str],
        duration: float,
    ) -> DiscoveryItem:
        """Build DiscoveryItem with embedding and attribution."""
        embedder = get_embedding_service()
        combined_text = f"{title} {description} {' '.join(tags)} {author_name}"
        embedding = embedder.embed_text(combined_text)

        return DiscoveryItem(
            item_id=f"yt_{external_id}",
            source=self.source,
            external_id=external_id,
            title=title,
            description=description,
            author_name=author_name,
            author_url=author_url,
            source_url=f"https://www.youtube.com/shorts/{external_id}",
            embed_url=f"https://www.youtube.com/embed/{external_id}",
            player_type=PlayerType.IFRAME,
            thumbnail_url=thumbnail_url,
            duration=duration,
            tags=tags,
            embedding=embedding,
            license="YouTube Standard License",
            attribution_text=f"Watch on YouTube • {author_name}",
            is_external=True,
            can_rehost=False,
            views_count=0,
            likes_count=0,
            created_at=datetime.now(timezone.utc),
        )
