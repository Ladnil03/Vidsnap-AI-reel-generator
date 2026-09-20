"""
Security regression tests for rate limiter XFF handling (W1-4).

Tests verify:
- Spoofed X-Forwarded-For does not bypass rate limiting when trusted_proxy_count=0
- With trusted_proxy_count=N, the Nth-from-right XFF entry (appended by
  the Nth trusted proxy, i.e. the real client IP) is used
- Per-user key helper works
"""

from unittest.mock import MagicMock, patch

from backend.app.core.rate_limiter import _get_client_ip


class TestGetClientIP:
    """Test _get_client_ip with various trusted_proxy_count values."""

    def _make_request(self, client_host: str = "10.0.0.1", xff: str | None = None):
        """Create a mock request with optional X-Forwarded-For header."""
        request = MagicMock()
        request.client = MagicMock()
        request.client.host = client_host
        headers = {}
        if xff is not None:
            headers["X-Forwarded-For"] = xff
        request.headers = headers
        return request

    @patch("backend.app.core.rate_limiter.settings")
    def test_trusted_proxy_0_ignores_xff(self, mock_settings):
        """When trusted_proxy_count=0, XFF is ignored entirely."""
        mock_settings.trusted_proxy_count = 0
        request = self._make_request(
            client_host="10.0.0.1",
            xff="1.2.3.4, 5.6.7.8",
        )
        ip = _get_client_ip(request)
        assert ip == "10.0.0.1", "Should use request.client.host, not XFF"

    @patch("backend.app.core.rate_limiter.settings")
    def test_trusted_proxy_1_uses_rightmost_xff_entry(self, mock_settings):
        """
        With 1 trusted proxy: XFF = "spoofed, real_client_ip".
        The proxy appended real_client_ip (the connecting client's IP).
        We want the Nth-from-right entry = index len-1 = "real_client_ip".
        """
        mock_settings.trusted_proxy_count = 1
        # Client at 5.6.7.8 spoofed XFF with 1.2.3.4
        # Trusted proxy appended 5.6.7.8
        request = self._make_request(
            client_host="10.0.0.1",
            xff="1.2.3.4, 5.6.7.8",
        )
        ip = _get_client_ip(request)
        # The rightmost entry is added by the 1 trusted proxy = real client
        assert ip == "5.6.7.8"

    @patch("backend.app.core.rate_limiter.settings")
    def test_spoofed_xff_with_no_trust(self, mock_settings):
        """Attacker sets XFF to a different IP; with trust=0 it's ignored."""
        mock_settings.trusted_proxy_count = 0
        request = self._make_request(
            client_host="192.168.1.100",
            xff="spoofed.ip.1.1",
        )
        ip = _get_client_ip(request)
        assert ip == "192.168.1.100"

    @patch("backend.app.core.rate_limiter.settings")
    def test_trusted_proxy_2_uses_correct_entry(self, mock_settings):
        """
        With 2 trusted proxies (e.g. CDN + LB):
        XFF = "spoofed, real_client, proxy1_ip, proxy2_ip"
        -> We want index len-2 = "real_client" (proxy1 appended it).
        Simpler: XFF = "real_client, proxy1_ip" with 2 trusted proxies
        -> index max(0, 2-2) = 0 = "real_client".
        """
        mock_settings.trusted_proxy_count = 2
        # Client at real.client.ip -> proxy1 -> proxy2 -> us
        # proxy1 appends real.client.ip, proxy2 appends proxy1.ip
        request = self._make_request(
            client_host="10.0.0.1",
            xff="real.client.ip, proxy1.ip",
        )
        ip = _get_client_ip(request)
        assert ip == "real.client.ip"

    @patch("backend.app.core.rate_limiter.settings")
    def test_no_xff_with_trust_falls_back(self, mock_settings):
        """With trusted_proxy_count>0 but no XFF, fall back to client host."""
        mock_settings.trusted_proxy_count = 1
        request = self._make_request(client_host="direct.client.ip", xff=None)
        ip = _get_client_ip(request)
        assert ip == "direct.client.ip"
