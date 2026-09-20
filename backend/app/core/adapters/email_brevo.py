"""
Brevo HTTP Email Adapter.
Fallback transactional email provider (300 emails/day free tier).
"""

import logging

import httpx

from backend.app.core.config import settings
from backend.app.core.ports.email import EmailPort

logger = logging.getLogger(__name__)


class BrevoEmailAdapter(EmailPort):
    """Email adapter communicating with Brevo v3 HTTP API."""

    def __init__(self):
        self.api_key = settings.brevo_api_key
        self.from_email = settings.email_from
        self.api_url = "https://api.brevo.com/v3/smtp/email"

    async def send_otp_email(
        self,
        recipient_email: str,
        recipient_name: str,
        otp_code: str,
    ) -> bool:
        subject = f"{otp_code} is your VidSnap AI verification code"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f1117; color: #ffffff; border-radius: 8px;">
            <h2 style="color: #ff5c5c;">VidSnap.AI</h2>
            <p>Hello {recipient_name},</p>
            <p>Your one-time verification code is:</p>
            <div style="background: #1a1d26; padding: 16px; border-radius: 6px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #ff5c5c;">
                {otp_code}
            </div>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 20px;">
                Valid for 10 minutes.
            </p>
        </div>
        """
        return await self.send_email(recipient_email, subject, html_body)

    async def send_email(
        self,
        recipient_email: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
    ) -> bool:
        if not self.api_key:
            logger.warning("Brevo API key missing, cannot send email to %s", recipient_email)
            return False

        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {
            "sender": {"email": self.from_email, "name": settings.app_name},
            "to": [{"email": recipient_email}],
            "subject": subject,
            "htmlContent": html_body,
        }
        if text_body:
            payload["textContent"] = text_body

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.api_url, headers=headers, json=payload)
                if response.is_success:
                    logger.info("Email sent successfully via Brevo to %s", recipient_email)
                    return True
                logger.error("Brevo API failed: %s - %s", response.status_code, response.text)
                return False
        except Exception as e:
            logger.error("Exception occurred while sending email via Brevo: %s", e)
            return False
