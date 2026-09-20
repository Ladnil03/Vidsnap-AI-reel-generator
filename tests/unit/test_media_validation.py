"""
Unit tests for Pillow media integrity validation.
"""

import io

import pytest
from fastapi import HTTPException
from PIL import Image

from backend.app.media.service import MediaService


def create_test_image_bytes(format: str = "JPEG", size: tuple[int, int] = (100, 100)) -> bytes:
    """Helper to generate genuine in-memory image bytes."""
    img = Image.new("RGB", size, color=(255, 92, 92))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def test_valid_jpeg_validation():
    """Valid JPEG passes Pillow verification without raising exception."""
    data = create_test_image_bytes(format="JPEG")
    # Should execute cleanly
    MediaService.validate_image_bytes(data, "photo.jpg")


def test_valid_png_validation():
    """Valid PNG passes Pillow verification."""
    data = create_test_image_bytes(format="PNG")
    MediaService.validate_image_bytes(data, "graphic.png")


def test_corrupted_image_rejection():
    """Corrupted / spoofed bytes raise 400 Bad Request."""
    fake_data = b"GIF89a this is not a real image content, but spoofed header"
    with pytest.raises(HTTPException) as exc_info:
        MediaService.validate_image_bytes(fake_data, "bad.jpg")
    assert exc_info.value.status_code == 400


def test_unsupported_format_rejection():
    """GIF or TIFF formats are rejected."""
    gif_data = create_test_image_bytes(format="GIF")
    with pytest.raises(HTTPException) as exc_info:
        MediaService.validate_image_bytes(gif_data, "animation.gif")
    assert exc_info.value.status_code == 400
    assert "unsupported format" in exc_info.value.detail.lower()
