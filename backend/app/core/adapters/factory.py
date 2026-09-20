"""
Adapters Factory Module.
Returns configured implementations of ports according to application settings.
"""

from functools import lru_cache

from backend.app.core.config import settings
from backend.app.core.ports.cdn import CDNPort
from backend.app.core.ports.email import EmailPort
from backend.app.core.ports.queue import QueuePort
from backend.app.core.ports.rtc import RTCPort
from backend.app.core.ports.storage import StoragePort


@lru_cache
def get_storage_adapter() -> StoragePort:
    """Return configured StoragePort adapter (Cloudinary or Local)."""
    provider = settings.storage_provider.lower()
    if provider == "cloudinary":
        from backend.app.core.adapters.storage_cloudinary import CloudinaryStorageAdapter
        return CloudinaryStorageAdapter()
    from backend.app.core.adapters.storage_local import LocalStorageAdapter
    return LocalStorageAdapter()


@lru_cache
def get_email_adapter() -> EmailPort:
    """Return configured EmailPort adapter."""
    provider = settings.email_provider.lower()
    if provider == "resend" and settings.resend_api_key:
        from backend.app.core.adapters.email_resend import ResendEmailAdapter
        return ResendEmailAdapter()
    if provider == "brevo" and settings.brevo_api_key:
        from backend.app.core.adapters.email_brevo import BrevoEmailAdapter
        return BrevoEmailAdapter()
    from backend.app.core.adapters.email_console import ConsoleEmailAdapter
    return ConsoleEmailAdapter()


@lru_cache
def get_queue_adapter() -> QueuePort:
    """Return configured QueuePort adapter."""
    from backend.app.core.adapters.queue_arq import ARQQueueAdapter
    return ARQQueueAdapter()


@lru_cache
def get_cdn_adapter() -> CDNPort:
    """Return configured CDNPort adapter (Cloudinary or Passthrough)."""
    provider = settings.cdn_provider.lower()
    if provider == "cloudinary":
        from backend.app.core.adapters.cdn_cloudinary import CloudinaryCDNAdapter
        return CloudinaryCDNAdapter()
    from backend.app.core.adapters.cdn_passthrough import PassthroughCDNAdapter
    return PassthroughCDNAdapter()


@lru_cache
def get_rtc_adapter() -> RTCPort:
    """Return configured RTCPort adapter (LiveKit WebRTC token generator)."""
    from backend.app.core.adapters.rtc_livekit import LiveKitRTCAdapter
    return LiveKitRTCAdapter()

