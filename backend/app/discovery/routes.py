"""
Discovery API Router.
Provides public and authenticated endpoints for multi-source search,
batch ingestion, source connector diagnostics, and legal attribution.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.discovery.models import (
    BatchIngestRequest,
    BatchIngestResponse,
    DiscoveryItem,
    DiscoverySearchRequest,
    DiscoverySearchResponse,
    DiscoverySource,
    SourceStatusResponse,
)
from backend.app.discovery.service import DiscoveryService
from backend.app.identity.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/discovery", tags=["Discovery & Search"])


def get_discovery_service() -> DiscoveryService:
    return DiscoveryService()


@router.get("/search", response_model=DiscoverySearchResponse)
async def search_discovery(
    q: str | None = Query(None, description="Search query string"),
    source: DiscoverySource | None = Query(None, description="Filter by source platform"),
    tag: str | None = Query(None, description="Filter by hashtag"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    service: DiscoveryService = Depends(get_discovery_service),
) -> DiscoverySearchResponse:
    """Multi-source search across indexed YouTube Shorts, Pexels, Pixabay, and Community reels."""
    req = DiscoverySearchRequest(q=q, source=source, tag=tag, page=page, limit=limit)
    return await service.search(req)


@router.get("/items/{item_id}", response_model=DiscoveryItem)
async def get_discovery_item(
    item_id: str,
    service: DiscoveryService = Depends(get_discovery_service),
) -> DiscoveryItem:
    """Fetch single discovery item with player embed parameters and legal attribution."""
    item = await service.get_item(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Discovery item '{item_id}' not found",
        )
    return item


@router.post("/ingest", response_model=BatchIngestResponse)
async def trigger_ingestion(
    req: BatchIngestRequest,
    _current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    service: DiscoveryService = Depends(get_discovery_service),
) -> BatchIngestResponse:
    """Trigger on-demand ingestion from a content connector for a specific search topic."""
    try:
        return await service.batch_ingest(req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get("/sources", response_model=list[SourceStatusResponse])
async def list_sources(
    service: DiscoveryService = Depends(get_discovery_service),
) -> list[SourceStatusResponse]:
    """Inspect active third-party source connectors, legal mode, and configuration state."""
    return await service.list_sources()
