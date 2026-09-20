"""
Storage Port: Abstract interface for object storage operations.
Enables pluggable backends: Cloudflare R2, AWS S3, Local filesystem, MinIO.
"""

from abc import ABC, abstractmethod
from pathlib import Path


class StoragePort(ABC):
    """Abstract interface defining required object storage capabilities."""

    @abstractmethod
    async def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600,
    ) -> dict[str, str]:
        """
        Generate a pre-signed URL allowing the client to upload directly to storage.
        Returns dict containing 'upload_url', 'key', and any required form fields/headers.
        """

    @abstractmethod
    async def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 3600,
    ) -> str:
        """
        Generate a time-limited pre-signed URL for reading/downloading a private object.
        Used for unlisted or private assets that should not have permanent public URLs.
        """

    @abstractmethod
    async def upload_file(
        self,
        file_path: Path,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload a file from local disk to storage and return its public URL."""

    @abstractmethod
    async def upload_bytes(
        self,
        data: bytes,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload raw bytes to storage and return its public URL."""

    @abstractmethod
    async def download_file(
        self,
        key: str,
        destination_path: Path,
    ) -> Path:
        """Download an object from storage to a local disk destination."""

    @abstractmethod
    async def delete_file(
        self,
        key: str,
    ) -> bool:
        """Delete an object from storage. Returns True if deleted or already absent."""

    @abstractmethod
    def get_public_url(
        self,
        key: str,
    ) -> str:
        """Derive the publicly accessible URL for a storage key."""

    @abstractmethod
    async def get_cache_metadata(
        self,
        key: str,
    ) -> dict[str, str] | None:
        """
        Return cache-relevant metadata for a stored object.
        Returns dict with 'etag', 'content_type', 'content_length', or None if not found.
        Used by edge caching middleware for ETag validation and Cache-Control headers.
        """

    @abstractmethod
    async def head_object(
        self,
        key: str,
    ) -> bool:
        """Check if an object exists in storage without downloading it."""
