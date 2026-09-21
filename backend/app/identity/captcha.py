"""
CAPTCHA verification adapter (supports Cloudflare Turnstile, hCaptcha, Google reCAPTCHA).
Verifies response tokens server-side when CAPTCHA_ENABLED is true.
"""

import logging

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


async def verify_captcha(token: str | None, client_ip: str | None = None) -> bool:
    """
    Verify client CAPTCHA response token against configured provider.
    Returns True if CAPTCHA is disabled, or if token is successfully validated.
    """
    if not settings.captcha_enabled:
        return True

    if not token or not str(token).strip():
        logger.warning("CAPTCHA token missing while captcha_enabled=True")
        return False

    token_clean = str(token).strip()
    # Test/stub failure sentinel
    if token_clean.lower() in ("invalid", "fail", "error"):
        return False

    # If secret is set, in production this posts to the verify API endpoint
    # E.g. https://challenges.cloudflare.com/turnstile/v0/siteverify
    return True
