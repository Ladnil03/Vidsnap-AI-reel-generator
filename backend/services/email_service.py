"""
Email service using Gmail SMTP.
Used for sending OTP emails for forgot password flow.
Uses Python built-in libraries (smtplib, ssl, email) to send secure emails.
"""

import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.config import settings

logger = logging.getLogger(__name__)

# Module-level constants
OTP_EMAIL_SUBJECT: str = "VidSnap AI — Your Password Reset OTP"
OTP_EXPIRY_MINUTES: int = 10


def _send_email_sync(to_email: str, subject: str, html_body: str) -> None:
    """
    Synchronous helper to send email via Gmail SMTP_SSL.
    Runs in a background thread to prevent blocking the async loop.
    """
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"VidSnap AI <{settings.email_from}>"
        msg["To"] = to_email

        # Attach HTML body
        msg.attach(MIMEText(html_body, "html"))

        # Create secure SSL context
        context = ssl.create_default_context()

        # Connect and send
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(settings.email_from, settings.gmail_app_password)
            server.sendmail(settings.email_from, to_email, msg.as_string())

    except Exception as error:
        raise RuntimeError(f"SMTP send failed: {error}") from error


async def send_otp_email(to_email: str, otp: str, name: str) -> None:
    """
    Send a password reset OTP to the user's email via Gmail SMTP.

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

    try:
        # Offload the blocking smtplib execution to a separate thread
        await asyncio.to_thread(_send_email_sync, to_email, OTP_EMAIL_SUBJECT, html_body)
        logger.info("[Email] OTP sent to %s", to_email)
    except Exception as error:
        logger.error("[Email] Failed to send OTP: %s", error, exc_info=True)
        raise RuntimeError(f"Failed to send OTP email: {error}") from error
