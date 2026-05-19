"""
Configuration module for VidSnap AI backend.

Loads all application settings from environment variables using Pydantic BaseSettings.
Provides validated configuration for MongoDB, Cloudinary, Groq TTS, and app behavior.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # MongoDB
    mongodb_uri: str  # Full Atlas connection string
    mongodb_db: str = "vidsnap"  # Database name

    # Cloudinary
    cloudinary_cloud_name: str  # Cloud name from Cloudinary dashboard
    cloudinary_api_key: str  # API key from Cloudinary dashboard
    cloudinary_api_secret: str  # API secret from Cloudinary dashboard
    cloudinary_folder: str = "vidsnap-reels"  # Folder inside Cloudinary to store reels

    # Groq TTS
    groq_api_key: str  # API key from Groq console
    groq_tts_model: str = "playai-tts"  # TTS model name
    groq_tts_voice: str = "Fritz-PlayAI"  # Voice to use for narration

    # App behaviour
    allowed_origins: str = "http://localhost:5173"  # Comma-separated frontend URLs
    max_image_size_mb: int = 10  # Max size per uploaded image
    worker_poll_seconds: int = 3  # How often worker checks for new jobs

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        """
        Splits allowed_origins by comma and strips whitespace from each.

        Returns:
            list[str]: List of allowed frontend URLs for CORS middleware.
        """
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def max_image_size_bytes(self) -> int:
        """
        Converts max_image_size_mb to bytes.

        Returns:
            int: Maximum image size in bytes, used for per-file size validation.
        """
        return self.max_image_size_mb * 1024 * 1024


settings = Settings()
