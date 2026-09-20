"""
Email Port: Abstract interface for transactional email delivery.
Enables swapping between Resend, Brevo, and Console delivery.
"""

from abc import ABC, abstractmethod


class EmailPort(ABC):
    """Abstract interface for sending transactional emails."""

    @abstractmethod
    async def send_otp_email(
        self,
        recipient_email: str,
        recipient_name: str,
        otp_code: str,
    ) -> bool:
        """Send a one-time password verification email."""

    @abstractmethod
    async def send_email(
        self,
        recipient_email: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
    ) -> bool:
        """Send a general HTML/text email."""
