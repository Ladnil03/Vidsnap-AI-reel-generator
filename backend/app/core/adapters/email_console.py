"""
Console Email Adapter for local development and testing.
Prints formatted OTP and transactional emails to application logs.
"""

import logging

from backend.app.core.ports.email import EmailPort

logger = logging.getLogger("EMAIL_CONSOLE")


class ConsoleEmailAdapter(EmailPort):
    """Logs outgoing emails directly to stdout/logger."""

    async def send_otp_email(
        self,
        recipient_email: str,
        recipient_name: str,
        otp_code: str,
    ) -> bool:
        logger.info(
            "\n" + "=" * 60 + "\n"
            f"[EMAIL_CONSOLE] To: {recipient_name} <{recipient_email}>\n"
            f"[EMAIL_CONSOLE] Subject: Your VidSnap AI Verification Code\n"
            f"[EMAIL_CONSOLE] Body: Your one-time verification code is: {otp_code}\n"
            f"[EMAIL_CONSOLE] (Valid for 10 minutes. Do not share with anyone.)\n"
            + "=" * 60
        )
        return True

    async def send_email(
        self,
        recipient_email: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
    ) -> bool:
        logger.info(
            f"[EMAIL_CONSOLE] To: {recipient_email} | Subject: {subject} | Content: {text_body or html_body[:100]}"
        )
        return True
