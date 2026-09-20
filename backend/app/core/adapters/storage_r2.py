"""
Cloudflare R2 / S3 Storage Adapter.
Provides zero-egress, scalable S3-compatible object storage via aioboto3.
"""

import logging
from pathlib import Path

import aioboto3
from botocore.config import Config

from backend.app.core.config import settings
from backend.app.core.ports.storage import StoragePort

logger = logging.getLogger(__name__)


class R2StorageAdapter(StoragePort):
    """Storage adapter backed by Cloudflare R2 (or AWS S3)."""

    def __init__(self):
        self.session = aioboto3.Session()
        self.bucket_name = settings.r2_bucket_name
        self.public_url_base = settings.r2_public_url or f"https://{self.bucket_name}.r2.cloudflarestorage.com"

        # Endpoint format for Cloudflare R2: https://<account_id>.r2.cloudflarestorage.com
        if settings.r2_account_id:
            self.endpoint_url = f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"
        else:
            self.endpoint_url = None

        self.client_kwargs = {
            "service_name": "s3",
            "endpoint_url": self.endpoint_url,
            "aws_access_key_id": settings.r2_access_key_id,
            "aws_secret_access_key": settings.r2_secret_access_key,
            "region_name": "auto",
            "config": Config(signature_version="s3v4"),
        }
        logger.info("R2StorageAdapter initialized for bucket: %s", self.bucket_name)

    async def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600,
    ) -> dict[str, str]:
        async with self.session.client(**self.client_kwargs) as s3:
            url = await s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
            return {
                "upload_url": url,
                "key": key,
                "method": "PUT",
                "content_type": content_type,
            }

    async def upload_file(
        self,
        file_path: Path,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        async with self.session.client(**self.client_kwargs) as s3:
            with open(file_path, "rb") as f:
                await s3.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=f,
                    ContentType=content_type,
                )
        return self.get_public_url(key)

    async def upload_bytes(
        self,
        data: bytes,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        async with self.session.client(**self.client_kwargs) as s3:
            await s3.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        return self.get_public_url(key)

    async def download_file(
        self,
        key: str,
        destination_path: Path,
    ) -> Path:
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        async with self.session.client(**self.client_kwargs) as s3:
            response = await s3.get_object(Bucket=self.bucket_name, Key=key)
            async with response["Body"] as stream:
                content = await stream.read()
                with open(destination_path, "wb") as f:
                    f.write(content)
        return destination_path

    async def delete_file(
        self,
        key: str,
    ) -> bool:
        try:
            async with self.session.client(**self.client_kwargs) as s3:
                await s3.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except Exception as e:
            logger.error("R2 delete failed for key '%s': %s", key, e)
            return False

    def get_public_url(
        self,
        key: str,
    ) -> str:
        base = self.public_url_base.rstrip("/")
        clean_key = key.lstrip("/")
        return f"{base}/{clean_key}"

    async def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 3600,
    ) -> str:
        """Generate a time-limited presigned GET URL for private/unlisted assets."""
        async with self.session.client(**self.client_kwargs) as s3:
            url = await s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expires_in,
            )
            return url

    async def get_cache_metadata(
        self,
        key: str,
    ) -> dict[str, str] | None:
        """Return ETag, content-type, and size from R2 object metadata."""
        try:
            async with self.session.client(**self.client_kwargs) as s3:
                response = await s3.head_object(Bucket=self.bucket_name, Key=key)
                return {
                    "etag": response.get("ETag", "").strip('"'),
                    "content_type": response.get("ContentType", "application/octet-stream"),
                    "content_length": str(response.get("ContentLength", 0)),
                }
        except Exception as e:
            logger.warning("R2 head_object failed for key '%s': %s", key, e)
            return None

    async def head_object(
        self,
        key: str,
    ) -> bool:
        """Check if an object exists in R2 without downloading it."""
        try:
            async with self.session.client(**self.client_kwargs) as s3:
                await s3.head_object(Bucket=self.bucket_name, Key=key)
                return True
        except Exception:
            return False
