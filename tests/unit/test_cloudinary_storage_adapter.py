"""
Unit tests for CloudinaryStorageAdapter and factory storage resolution.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from backend.app.core.adapters.factory import get_storage_adapter
from backend.app.core.adapters.storage_cloudinary import CloudinaryStorageAdapter
from backend.app.core.config import settings


@pytest.fixture
def cloudinary_adapter():
    """Create a CloudinaryStorageAdapter with deterministic test settings."""
    with patch.object(settings, "cloudinary_cloud_name", "test-cloud"), \
         patch.object(settings, "cloudinary_api_key", "test-key-123"), \
         patch.object(settings, "cloudinary_api_secret", "test-secret-456"), \
         patch.object(settings, "cloudinary_folder", "vidsnap-test"):
        adapter = CloudinaryStorageAdapter()
        return adapter


def test_cloudinary_adapter_initialization(cloudinary_adapter):
    """Test initialization and properties derivation."""
    assert cloudinary_adapter.cloud_name == "test-cloud"
    assert cloudinary_adapter.api_key == "test-key-123"
    assert cloudinary_adapter.folder == "vidsnap-test"


def test_resource_type_detection(cloudinary_adapter):
    """Test resource_type derivation from mime types and file extensions."""
    assert cloudinary_adapter._get_resource_type("test.mp4", "video/mp4") == "video"
    assert cloudinary_adapter._get_resource_type("clip.webm") == "video"
    assert cloudinary_adapter._get_resource_type("movie.mov") == "video"
    assert cloudinary_adapter._get_resource_type("image.jpg", "image/jpeg") == "image"
    assert cloudinary_adapter._get_resource_type("thumb.png") == "image"
    assert cloudinary_adapter._get_resource_type("photo.webp") == "image"
    assert cloudinary_adapter._get_resource_type("file.xyz") == "auto"


def test_key_to_public_id(cloudinary_adapter):
    """Test key translation to Cloudinary public_id."""
    # Should strip extension and prepend folder
    pid = cloudinary_adapter._key_to_public_id("videos/user1/test_video.mp4")
    assert pid == "vidsnap-test/videos/user1/test_video"

    # If folder already present, do not duplicate
    pid2 = cloudinary_adapter._key_to_public_id("vidsnap-test/images/thumb.jpg")
    assert pid2 == "vidsnap-test/images/thumb"


def test_get_public_url(cloudinary_adapter):
    """Test public delivery URL construction."""
    url = cloudinary_adapter.get_public_url("videos/user1/test.mp4")
    assert "https://res.cloudinary.com/test-cloud/video/upload/" in url
    assert "vidsnap-test/videos/user1/test.mp4" in url


@pytest.mark.asyncio
async def test_generate_presigned_upload_url(cloudinary_adapter):
    """Test generating direct client upload signed payload for Cloudinary."""
    target = await cloudinary_adapter.generate_presigned_upload_url(
        key="videos/u100/reel.mp4",
        content_type="video/mp4",
        expires_in=3600,
    )

    assert target["method"] == "POST"
    assert "upload_url" in target
    assert "https://api.cloudinary.com/v1_1/test-cloud/video/upload" in target["upload_url"]
    assert target["key"] == "videos/u100/reel.mp4"

    fields = target["fields"]
    assert fields["api_key"] == "test-key-123"
    assert fields["public_id"] == "vidsnap-test/videos/u100/reel"
    assert "signature" in fields
    assert len(fields["signature"]) > 0
    assert "timestamp" in fields


@pytest.mark.asyncio
async def test_generate_presigned_download_url(cloudinary_adapter):
    """Test generating signed time-limited download URL."""
    url = await cloudinary_adapter.generate_presigned_download_url(
        key="videos/u100/reel.mp4",
        expires_in=1800,
    )

    assert "https://api.cloudinary.com/v1_1/test-cloud/video/download" in url
    assert "api_key=test-key-123" in url
    assert "signature=" in url
    assert "expires_at=" in url


@pytest.mark.asyncio
async def test_upload_file(cloudinary_adapter, tmp_path):
    """Test uploading a file to Cloudinary."""
    test_file = tmp_path / "sample.mp4"
    test_file.write_bytes(b"dummy video bytes")

    mock_res = {
        "secure_url": "https://res.cloudinary.com/test-cloud/video/upload/v1/vidsnap-test/videos/sample.mp4",
        "public_id": "vidsnap-test/videos/sample",
    }

    with patch("cloudinary.uploader.upload", return_value=mock_res) as mock_upload:
        url = await cloudinary_adapter.upload_file(
            test_file,
            key="videos/sample.mp4",
            content_type="video/mp4",
        )
        assert url == mock_res["secure_url"]
        mock_upload.assert_called_once()
        kwargs = mock_upload.call_args[1]
        assert kwargs["public_id"] == "vidsnap-test/videos/sample"
        assert kwargs["resource_type"] == "video"
        assert kwargs["overwrite"] is True


@pytest.mark.asyncio
async def test_upload_bytes(cloudinary_adapter):
    """Test uploading raw bytes to Cloudinary."""
    mock_res = {
        "secure_url": "https://res.cloudinary.com/test-cloud/image/upload/v1/vidsnap-test/thumbs/banner.jpg",
        "public_id": "vidsnap-test/thumbs/banner",
    }

    with patch("cloudinary.uploader.upload", return_value=mock_res) as mock_upload:
        url = await cloudinary_adapter.upload_bytes(
            b"fake jpeg data",
            key="thumbs/banner.jpg",
            content_type="image/jpeg",
        )
        assert url == mock_res["secure_url"]
        mock_upload.assert_called_once()
        kwargs = mock_upload.call_args[1]
        assert kwargs["resource_type"] == "image"


@pytest.mark.asyncio
async def test_download_file(cloudinary_adapter, tmp_path):
    """Test downloading an asset from Cloudinary CDN to local disk."""
    dest = tmp_path / "downloaded.mp4"

    # Mock httpx streaming response
    mock_stream_ctx = MagicMock()
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()

    async def async_chunks(chunk_size=65536):
        yield b"chunk1"
        yield b"chunk2"

    mock_response.aiter_bytes = async_chunks
    mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_response)
    mock_stream_ctx.__aexit__ = AsyncMock(return_value=None)

    with patch("httpx.AsyncClient.stream", return_value=mock_stream_ctx):
        res = await cloudinary_adapter.download_file("videos/test.mp4", dest)
        assert res == dest
        assert dest.exists()
        assert dest.read_bytes() == b"chunk1chunk2"


@pytest.mark.asyncio
async def test_delete_file(cloudinary_adapter):
    """Test deleting an asset from Cloudinary."""
    with patch("cloudinary.uploader.destroy", return_value={"result": "ok"}) as mock_destroy:
        success = await cloudinary_adapter.delete_file("videos/u1/clip.mp4")
        assert success is True
        mock_destroy.assert_called_once()
        kwargs = mock_destroy.call_args[1]
        assert kwargs["resource_type"] == "video"
        assert kwargs["invalidate"] is True

    # When destroy throws an exception
    with patch("cloudinary.uploader.destroy", side_effect=Exception("API Error")):
        failed = await cloudinary_adapter.delete_file("videos/u1/clip.mp4")
        assert failed is False


@pytest.mark.asyncio
async def test_head_object_and_cache_metadata(cloudinary_adapter):
    """Test head_object and get_cache_metadata via HTTP HEAD and Admin API fallback."""
    # 1. Successful HTTP HEAD
    mock_head_resp = MagicMock()
    mock_head_resp.status_code = 200
    mock_head_resp.headers = {
        "etag": '"etag_abc123"',
        "content-type": "video/mp4",
        "content-length": "1048576",
    }

    with patch("httpx.AsyncClient.head", new_callable=AsyncMock) as mock_head:
        mock_head.return_value = mock_head_resp

        exists = await cloudinary_adapter.head_object("videos/demo.mp4")
        assert exists is True

        meta = await cloudinary_adapter.get_cache_metadata("videos/demo.mp4")
        assert meta is not None
        assert meta["etag"] == "etag_abc123"
        assert meta["content_type"] == "video/mp4"
        assert meta["content_length"] == "1048576"

    # 2. Fallback to Cloudinary Admin API when HTTP HEAD fails
    with patch("httpx.AsyncClient.head", side_effect=httpx.ConnectError("No internet")):
        with patch("cloudinary.api.resource", return_value={"version": 999, "format": "mp4", "bytes": 2048}):
            exists = await cloudinary_adapter.head_object("videos/demo.mp4")
            assert exists is True

            meta = await cloudinary_adapter.get_cache_metadata("videos/demo.mp4")
            assert meta is not None
            assert meta["etag"] == "999"
            assert meta["content_length"] == "2048"


def test_factory_resolves_cloudinary_storage():
    """Test that adapter factory instantiates CloudinaryStorageAdapter when configured."""
    get_storage_adapter.cache_clear()

    with patch.object(settings, "storage_provider", "cloudinary"):
        adapter = get_storage_adapter()
        assert isinstance(adapter, CloudinaryStorageAdapter)

    get_storage_adapter.cache_clear()
