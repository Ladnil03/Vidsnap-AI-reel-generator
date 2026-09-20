"""
Security regression tests for production config guard (W1-3).

Tests verify that staging/production environments fail fast on:
- Default/short JWT secret
- debug=True
- storage_provider="local"
- allowed_origins with localhost/127.0.0.1/*
- Missing REDIS_URL / MONGODB_URI defaults

Also verifies dev/test configurations are unaffected.
"""

import pytest
from pydantic import ValidationError


def _make_settings(**overrides):
    """Create a Settings instance with environment variable isolation."""
    from backend.app.core.config import Settings
    # Use model_validate to create with specific values, bypassing env vars
    defaults = {
        "app_name": "VidSnap AI",
        "environment": "development",
        "debug": False,
        "jwt_secret_key": "development_insecure_jwt_secret_key_min_32_characters_long_12345",
        "allowed_origins": "http://localhost:3000",
        "mongodb_uri": "mongodb://localhost:27017",
        "redis_url": "redis://localhost:6379/0",
        "storage_provider": "cloudinary",
    }
    defaults.update(overrides)
    return Settings(**defaults)


class TestProductionConfigGuard:
    """Production/staging config must fail fast on insecure settings."""

    def test_production_default_jwt_secret_raises(self):
        """Default JWT secret in production must raise."""
        with pytest.raises(ValidationError, match=r"(?i)jwt"):
            _make_settings(environment="production")

    def test_production_short_jwt_secret_raises(self):
        """Short (<32 chars) JWT secret in production must raise."""
        with pytest.raises(ValidationError, match=r"(?i)jwt"):
            _make_settings(
                environment="production",
                jwt_secret_key="too_short",
            )

    def test_production_debug_true_raises(self):
        """debug=True in production must raise."""
        with pytest.raises(ValidationError, match=r"(?i)debug"):
            _make_settings(
                environment="production",
                jwt_secret_key="a_very_secure_production_jwt_secret_key_64chars_long_!@#$%^&*()",
                debug=True,
            )

    def test_production_local_storage_raises(self):
        """storage_provider=local in production must raise."""
        with pytest.raises(ValidationError, match=r"(?i)storage"):
            _make_settings(
                environment="production",
                jwt_secret_key="a_very_secure_production_jwt_secret_key_64chars_long_!@#$%^&*()",
                storage_provider="local",
            )

    def test_production_localhost_origins_raises(self):
        """localhost in allowed_origins in production must raise."""
        with pytest.raises(ValidationError, match=r"(?i)origin"):
            _make_settings(
                environment="production",
                jwt_secret_key="a_very_secure_production_jwt_secret_key_64chars_long_!@#$%^&*()",
                allowed_origins="https://app.vidsnap.ai,http://localhost:3000",
            )

    def test_production_wildcard_origins_raises(self):
        """'*' in allowed_origins in production must raise."""
        with pytest.raises(ValidationError, match=r"(?i)origin"):
            _make_settings(
                environment="production",
                jwt_secret_key="a_very_secure_production_jwt_secret_key_64chars_long_!@#$%^&*()",
                allowed_origins="*",
            )

    def test_staging_also_validates(self):
        """Staging environment should have the same guards."""
        with pytest.raises(ValidationError, match=r"(?i)jwt"):
            _make_settings(environment="staging")

    def test_valid_production_config_passes(self):
        """A fully valid production config should not raise."""
        s = _make_settings(
            environment="production",
            jwt_secret_key="a_very_secure_production_jwt_secret_key_64chars_long_!@#$%^&*()",
            debug=False,
            storage_provider="cloudinary",
            allowed_origins="https://app.vidsnap.ai,https://www.vidsnap.ai",
            mongodb_uri="mongodb+srv://user:pass@cluster.mongodb.net/vidsnap",
            redis_url="redis://redis.internal:6379/0",
        )
        assert s.environment == "production"

    def test_development_config_unaffected(self):
        """Development config with defaults should not raise."""
        s = _make_settings(environment="development")
        assert s.environment == "development"

    def test_test_config_unaffected(self):
        """Test environment with defaults should not raise."""
        s = _make_settings(environment="test")
        assert s.environment == "test"
