"""
Security regression tests for rate limiter XFF handling (W1-4).

Tests verify:
- Spoofed X-Forwarded-For does not bypass rate limiting when trusted_proxy_count=0
- With trusted_proxy_count=N, the Nth-from-right XFF entry (appended by
  the Nth trusted proxy, i.e. the real client IP) is used
- Per-user key helper works
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from backend.app.core.rate_limiter import _get_client_ip


class _FakeRoute:
    def __init__(self, path="/api/v1/auth/login"):
        self.path = path


class _FakeRequest:
    """Minimal Request stand-in exposing what the rate-limit dependencies use."""

    def __init__(self, email=None, client_host="10.0.0.1", path="/api/v1/auth/login"):
        self.url = _FakeRoute(path)
        self.client = MagicMock()
        self.client.host = client_host
        self.headers = {}
        self._email = email

    async def json(self):
        if self._email is None:
            raise ValueError("no body")
        return {"email": self._email, "password": "x"}


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


class TestPerEmailLimiter:
    """Per-identifier email limiting must bind to the email, not the IP."""

    @patch("backend.app.core.rate_limiter.settings")
    async def test_per_email_limit_triggers_across_different_ips(self, mock_settings):
        """Same email from different IPs must share one bucket and hit 429."""
        from backend.app.core.rate_limiter import rate_limit_per_email

        mock_settings.trusted_proxy_count = 0
        dep = rate_limit_per_email(max_requests=2, window_seconds=60)

        for client_host in ("1.1.1.1", "2.2.2.2", "3.3.3.3"):
            req = _FakeRequest(email="victim@test.com", client_host=client_host)
            try:
                await dep(req)
            except HTTPException as exc:
                assert exc.status_code == 429, f"Expected 429 got {exc.status_code}"
                break
        else:
            pytest.fail("Third attempt from a different IP was NOT rate limited")

    @patch("backend.app.core.rate_limiter.settings")
    async def test_per_email_limit_isolation_between_emails(self, mock_settings):
        """Different emails (even from the same IP) must not share a bucket."""
        from backend.app.core.rate_limiter import rate_limit_per_email

        mock_settings.trusted_proxy_count = 0
        dep = rate_limit_per_email(max_requests=2, window_seconds=60)
        for _ in range(2):
            await dep(_FakeRequest(email="a@test.com"))
        # Second email must still be allowed
        await dep(_FakeRequest(email="b@test.com"))


class TestPerUserLimiter:
    """Per-user limiting must key on the authenticated user, not the shared IP."""

    @patch("backend.app.core.rate_limiter.settings")
    async def test_per_user_limits_are_independent_between_users(self, mock_settings):
        """User A hitting the cap must not block user B (same IP, different account)."""
        from backend.app.core.rate_limiter import rate_limit_per_user

        mock_settings.trusted_proxy_count = 0
        dep = rate_limit_per_user(max_requests=2, window_seconds=60)

        req = _FakeRequest(path="/api/v1/reel-studio/jobs")

        with pytest.raises(HTTPException) as exc_info:
            for _ in range(3):
                await dep(req, {"user_id": "user_a", "roles": ["user"]})
        assert exc_info.value.status_code == 429

        # User B (same IP, own bucket) must NOT be blocked
        await dep(req, {"user_id": "user_b", "roles": ["user"]})


class TestRedisDownFallback:
    """is_rate_limited must keep working when Redis is down, logging a warning."""

    async def test_fallback_logs_warning_and_does_not_raise(self, caplog):
        import logging

        from backend.app.core.rate_limiter import is_rate_limited

        with patch("backend.app.core.rate_limiter.get_redis") as mock_get_redis:
            bad_redis = MagicMock()
            bad_redis.pipeline.return_value.execute = MagicMock(side_effect=RuntimeError("Redis down"))
            mock_get_redis.return_value = bad_redis

            with caplog.at_level(logging.WARNING, logger="backend.app.core.rate_limiter"):
                limited = await is_rate_limited("ratelimit:test:fallback", 2, 60)

            assert limited is False  # no exception, not (yet) limited
            assert any("Redis" in r.message for r in caplog.records), "warning not logged"
