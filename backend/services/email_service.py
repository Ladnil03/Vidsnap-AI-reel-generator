"""
Email service using Brevo HTTP API.
Used for sending OTP emails for forgot password flow.
"""

import asyncio
import logging
import urllib.request
import json
from backend.config import settings

logger = logging.getLogger(__name__)

# Module-level constants
OTP_EMAIL_SUBJECT: str = "VidSnap AI — Your Password Reset OTP"
OTP_EXPIRY_MINUTES: int = 10


async def send_otp_email(to_email: str, otp: str, name: str) -> None:
    """
    Send a password reset OTP to the user's email via Brevo email API.

    Args:
        to_email: Recipient email address.
        otp: 6-digit OTP string to include in the email.
        name: User's name for personalizing the email.

    Raises:
        RuntimeError: If the email fails to send.
    """
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #7c3aed; text-align: center; margin-bottom: 20px;">VidSnap AI</h2>
      <p style="font-size: 16px; color: #1e293b;">Hi {name},</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">You requested a password reset. Use the OTP below to complete the process:</p>
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #7c3aed;">{otp}</span>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">This OTP is valid for <strong>{OTP_EXPIRY_MINUTES} minutes</strong>.</p>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        If you did not request this, you can safely ignore this email.<br>
        — VidSnap AI Team
      </p>
    </div>
    """

    # Check for placeholder API keys in development
    is_placeholder = (
        not settings.brevo_api_key
        or "placeholder" in settings.brevo_api_key.lower()
        or "your_brevo_api_key" in settings.brevo_api_key.lower()
    )

    try:
        if is_placeholder:
            logger.info("\n" + "=" * 80 + f"\n[DEVELOPMENT] Password Reset OTP for {name} ({to_email}) is: {otp}\n" + "=" * 80)
            return

        payload = {
            "sender": {
                "email": settings.email_from,
                "name": "VidSnap AI"
            },
            "to": [
                {
                    "email": to_email,
                    "name": name
                }
            ],
            "subject": OTP_EMAIL_SUBJECT,
            "htmlContent": html_body
        }

        def _send():
            req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "accept": "application/json",
                    "api-key": settings.brevo_api_key,
                    "content-type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.read().decode("utf-8")

        await asyncio.to_thread(_send)
        logger.info("[Email] OTP sent to %s via Brevo", to_email)

    except Exception as error:
        # Log to console so developer can see the OTP even if API fails
        logger.warning("\n" + "=" * 80 + f"\n[FALLBACK] Email delivery failed. OTP for {name} ({to_email}) is: {otp}\n" + "=" * 80)
        logger.error("[Email] Failed to send OTP via Brevo: %s", error)
        raise RuntimeError(f"Failed to send OTP email: {error}") from error
