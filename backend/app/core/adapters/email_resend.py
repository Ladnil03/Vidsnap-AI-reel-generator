"""
Resend HTTP Email Adapter.
Delivers transactional emails using the official Resend API.
"""

import logging

import httpx

from backend.app.core.config import settings
from backend.app.core.ports.email import EmailPort

logger = logging.getLogger(__name__)


class ResendEmailAdapter(EmailPort):
    """Email adapter communicating with Resend via HTTP."""

    def __init__(self):
        self.api_key = settings.resend_api_key
        self.from_email = settings.email_from
        self.api_url = "https://api.resend.com/emails"

    async def send_otp_email(
        self,
        recipient_email: str,
        recipient_name: str,
        otp_code: str,
    ) -> bool:
        subject = f"{otp_code} is your VidSnap AI verification code"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f1117; color: #ffffff; border-radius: 8px;">
            <h2 style="color: #ff5c5c; margin-top: 0;">VidSnap.AI</h2>
            <p>Hello {recipient_name},</p>
            <p>Your one-time verification code is:</p>
            <div style="background: #1a1d26; padding: 16px; border-radius: 6px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #ff5c5c;">
                {otp_code}
            </div>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 20px;">
                This code expires in 10 minutes. If you did not request this code, you can safely ignore this email.
            </p>
        </div>
        """
        text_body = f"Hello {recipient_name},\n\nYour VidSnap AI verification code is: {otp_code}\nThis code expires in 10 minutes."
        return await self.send_email(recipient_email, subject, html_body, text_body)

    async def send_email(
        self,
        recipient_email: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
    ) -> bool:
        if not self.api_key:
            logger.warning("Resend API key missing, cannot send email to %s", recipient_email)
            return False

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": self.from_email,
            "to": [recipient_email],
            "subject": subject,
            "html": html_body,
            "text": text_body or "",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.api_url, headers=headers, json=payload)
                if response.is_success:
                    logger.info("Email sent successfully via Resend to %s", recipient_email)
                    return True
                logger.error("Resend API failed: %s - %s", response.status_code, response.text)
                return False
        except Exception as e:
            logger.error("Exception occurred while sending email via Resend: %s", e)
            return False
