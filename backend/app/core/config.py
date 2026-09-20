"""
Application Configuration Module.

Loads validated configuration from environment variables with sensible defaults.
Guarantees that importing this module will never crash if optional secrets are missing in local dev.
"""

import re
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global application settings."""

    # Application Info
    app_name: str = "VidSnap AI"
    app_version: str = "2.0.0"
    environment: Literal["development", "test", "staging", "production"] = "development"
    debug: bool = False

    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000
    api_v1_prefix: str = "/api/v1"

    # Security & JWT Auth
    jwt_secret_key: str = Field(
        default="development_insecure_jwt_secret_key_min_32_characters_long_12345",
        description="HMAC secret key used to sign JWT tokens",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15  # Short-lived access token
    refresh_token_expire_days: int = 7    # Rotating refresh token

    # CORS Configuration
    allowed_origins: str = (
        "http://localhost:3000,http://localhost:5000,http://localhost:5173,"
        "http://127.0.0.1:3000,http://127.0.0.1:5000,http://127.0.0.1:5173"
    )

    # MongoDB Atlas / Local
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "vidsnap"

    # Redis Cache & Queue
    redis_url: str = "redis://localhost:6379/0"

    # Object Storage: "cloudinary" (Zero Card Required Free Tier) or "local"
    storage_provider: Literal["cloudinary", "local"] = "cloudinary"
    local_storage_path: Path = Path("./media_storage")

    # Cloudinary Storage & Media Cloud (Free Tier: 25 monthly credits - Zero Card Required)
    cloudinary_cloud_name: str | None = "vidsnap"
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_folder: str = "vidsnap-reels"

    # Email Delivery: "console", "resend", "brevo"
    email_provider: Literal["console", "resend", "brevo"] = "console"
    email_from: str = "onboarding@resend.dev"
    resend_api_key: str | None = None
    brevo_api_key: str | None = None

    # LLM Providers (Free Tier Chain - No Credit Card Required)
    groq_api_key: str | None = None
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None

    # Quotas & Limits
    free_tokens_on_signup: int = 5
    max_image_size_mb: int = 10
    max_images_per_job: int = 10
    max_voiceover_chars: int = 900
    max_video_size_mb: int = 50
    max_video_duration_seconds: int = 60
    user_storage_quota_mb: int = 500
    draft_retention_days: int = 30
    failed_job_retention_hours: int = 24
    hls_abr_enabled: bool = False
    rate_limit_per_minute: int = 60
    auth_rate_limit_per_minute: int = 10

    # Worker & FFmpeg Pipeline Settings
    worker_concurrency: int = 2
    worker_poll_seconds: int = 3
    ffmpeg_preset: str = "veryfast"
    ffmpeg_threads: int = 2
    target_video_width: int = 720
    target_video_height: int = 1280
    ffmpeg_timeout_seconds: int = 180

    # Phase 4: Social Graph, Universal Feed & Web Push (VAPID)
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_claims_email: str = "mailto:notifications@vidsnap.ai"
    view_cooldown_seconds: int = 3600  # 1-hour anti-spam view cooldown per user per video

    # Phase 5: Discovery Connectors & Recommendation System
    youtube_api_key: str | None = None
    pexels_api_key: str | None = None
    pixabay_api_key: str | None = None
    max_discovery_catalog_size: int = 20000  # 512MB MongoDB M0 safety ceiling
    wellbeing_card_interval: int = 15       # Anti-doomscroll mindful pause interval

    # CDN & Edge Caching: "cloudinary" (Multi-CDN delivery) or "passthrough" (local dev)
    cdn_provider: Literal["cloudinary", "passthrough"] = "cloudinary"
    cache_max_age_media: int = 86400    # 1 day for static media
    cache_max_age_api: int = 60         # 1 minute for API responses

    # Phase 7: Realtime, Watch Together Rooms & LiveKit RTC
    livekit_api_key: str | None = None
    livekit_api_secret: str | None = None
    livekit_url: str = "wss://vidsnap-rtc.livekit.cloud"
    room_ws_heartbeat_seconds: int = 30
    room_presence_ttl_seconds: int = 60
    room_chat_history_limit: int = 100


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        """Return list of allowed CORS origins."""
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def max_image_size_bytes(self) -> int:
        """Convert max_image_size_mb to bytes."""
        return self.max_image_size_mb * 1024 * 1024

    @property
    def max_video_size_bytes(self) -> int:
        """Convert max_video_size_mb to bytes."""
        return self.max_video_size_mb * 1024 * 1024

    @property
    def user_storage_quota_bytes(self) -> int:
        """Convert user_storage_quota_mb to bytes."""
        return self.user_storage_quota_mb * 1024 * 1024

    @property
    def sanitized_mongodb_uri(self) -> str:
        """
        Return MongoDB URI with password masked.
        Never print or log the raw URI!
        """
        # Mask password in mongodb:// or mongodb+srv://
        return re.sub(r":([^@]+)@", ":****@", self.mongodb_uri)


settings = Settings()
