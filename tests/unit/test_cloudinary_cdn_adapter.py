"""
Unit tests for CloudinaryCDNAdapter and factory CDN resolution.
"""

from unittest.mock import patch

import pytest

from backend.app.core.adapters.cdn_cloudinary import CloudinaryCDNAdapter
from backend.app.core.adapters.factory import get_cdn_adapter
from backend.app.core.config import settings


@pytest.fixture
def cloudinary_cdn():
    """Fixture providing a configured CloudinaryCDNAdapter."""
    with patch.object(settings, "cloudinary_cloud_name", "test-cloud"), \
         patch.object(settings, "cloudinary_api_key", "key-cdn-123"), \
         patch.object(settings, "cloudinary_api_secret", "sec-cdn-456"), \
         patch.object(settings, "cloudinary_folder", "vidsnap-reels"):
        adapter = CloudinaryCDNAdapter()
        return adapter


def test_cloudinary_cdn_initialization(cloudinary_cdn):
    """Test CloudinaryCDNAdapter config values."""
    assert cloudinary_cdn.cloud_name == "test-cloud"
    assert cloudinary_cdn.api_key == "key-cdn-123"
    assert cloudinary_cdn.folder == "vidsnap-reels"


def test_extract_public_id_from_url(cloudinary_cdn):
    """Test extracting public_id and resource_type from Cloudinary URLs and storage keys."""
    # From full Cloudinary video URL with version
    url = "https://res.cloudinary.com/test-cloud/video/upload/v167890/vidsnap-reels/videos/reel_1.mp4"
    pid, res_type = cloudinary_cdn._extract_public_id_from_url(url)
    assert pid == "vidsnap-reels/videos/reel_1"
    assert res_type == "video"

    # From full Cloudinary image URL with transformations
    img_url = "https://res.cloudinary.com/test-cloud/image/upload/f_auto,q_auto/v1/vidsnap-reels/thumbs/t1.jpg"
    pid_img, res_type_img = cloudinary_cdn._extract_public_id_from_url(img_url)
    assert pid_img == "vidsnap-reels/thumbs/t1"
    assert res_type_img == "image"

    # From relative storage key
    key = "videos/user1/test.mp4"
    pid_key, res_type_key = cloudinary_cdn._extract_public_id_from_url(key)
    assert pid_key == "vidsnap-reels/videos/user1/test"
    assert res_type_key == "video"


def test_cloudinary_cdn_edge_url(cloudinary_cdn):
    """Test that get_edge_url generates Cloudinary multi-CDN URL with f_auto,q_auto optimizations."""
    url = cloudinary_cdn.get_edge_url("videos/u1/cool_reel.mp4")
    assert "https://res.cloudinary.com/test-cloud/video/upload/" in url
    assert "f_auto,q_auto" in url
    assert "vidsnap-reels/videos/u1/cool_reel.mp4" in url

    # Image asset edge URL
    img_url = cloudinary_cdn.get_edge_url("thumbnails/u1/thumb.jpg")
    assert "https://res.cloudinary.com/test-cloud/image/upload/" in img_url
    assert "f_auto,q_auto" in img_url
    assert "vidsnap-reels/thumbnails/u1/thumb.jpg" in img_url


@pytest.mark.asyncio
async def test_cloudinary_cdn_purge_url_success(cloudinary_cdn):
    """Test cache invalidation using Cloudinary explicit API."""
    with patch("cloudinary.uploader.explicit", return_value={"status": "ok"}) as mock_explicit:
        success = await cloudinary_cdn.purge_url("https://res.cloudinary.com/test-cloud/video/upload/v1/vidsnap-reels/videos/clip.mp4")
        assert success is True
        mock_explicit.assert_called_once()
        kwargs = mock_explicit.call_args[1]
        assert kwargs["invalidate"] is True
        assert kwargs["type"] == "upload"


@pytest.mark.asyncio
async def test_cloudinary_cdn_purge_without_credentials():
    """When credentials are not set, purge should safely return True without crashing."""
    with patch.object(settings, "cloudinary_api_key", None), \
         patch.object(settings, "cloudinary_api_secret", None):
        adapter = CloudinaryCDNAdapter()
        success = await adapter.purge_url("https://res.cloudinary.com/demo/video/upload/v1/sample.mp4")
        assert success is True


def test_cloudinary_cdn_cache_headers(cloudinary_cdn):
    """Test cache headers for media, static, and api asset types."""
    media_headers = cloudinary_cdn.get_cache_headers("media")
    assert "public" in media_headers["Cache-Control"]
    assert "max-age=" in media_headers["Cache-Control"]
    assert "CDN-Cache-Control" in media_headers

    static_headers = cloudinary_cdn.get_cache_headers("static")
    assert "immutable" in static_headers["Cache-Control"]

    api_headers = cloudinary_cdn.get_cache_headers("api")
    assert "private" in api_headers["Cache-Control"]


def test_factory_resolves_cloudinary_cdn():
    """Test that adapter factory instantiates CloudinaryCDNAdapter when configured."""
    get_cdn_adapter.cache_clear()

    with patch.object(settings, "cdn_provider", "cloudinary"):
        adapter = get_cdn_adapter()
        assert isinstance(adapter, CloudinaryCDNAdapter)

    get_cdn_adapter.cache_clear()
