"""
Email service using Resend (free tier).
Used for sending OTP emails for forgot password flow.
No FastAPI imports — pure service logic.
"""

import logging

import resend

from backend.config import settings

logger = logging.getLogger(__name__)

# Configure Resend API key
resend.api_key = settings.resend_api_key

# Email constants
OTP_EMAIL_SUBJECT: str = "VidSnap AI — Your Password Reset OTP"
OTP_EXPIRY_MINUTES: int = 10


async def send_otp_email(to_email: str, otp: str, name: str) -> None:
    """
    Send a password reset OTP to the user's email via Resend.

    Args:
        to_email: Recipient email address.
        otp: 6-digit OTP string to include in the email.
        name: User's name for personalizing the email.

    Raises:
        RuntimeError: If the email fails to send.
    """
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">VidSnap AI — Password Reset</h2>
      <p>Hi {name},</p>
      <p>You requested a password reset. Use the OTP below:</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center;
                  border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold;
                     letter-spacing: 8px; color: #7c3aed;">{otp}</span>
      </div>
      <p>This OTP is valid for {OTP_EXPIRY_MINUTES} minutes.</p>
      <p>If you did not request this, ignore this email.</p>
      <p style="color: #94a3b8; font-size: 12px;">— VidSnap AI Team</p>
    </div>
    """
    try:
        resend.Emails.send(
            {
                "from": settings.email_from,
                "to": to_email,
                "subject": OTP_EMAIL_SUBJECT,
                "html": html_body,
            }
        )
        logger.info("[Email] OTP sent to %s", to_email)
    except Exception as error:
        logger.error("[Email] Failed to send OTP: %s", error)
        raise RuntimeError(f"Failed to send OTP email: {error}")
