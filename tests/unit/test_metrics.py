"""
Unit Tests for In-Memory Prometheus Metrics Registry.
"""

from backend.app.core.metrics import (
    dec_active_ws,
    generate_prometheus_output,
    get_active_ws,
    inc_active_ws,
    record_content_report,
    record_http_request,
    record_transcode_job,
)


def test_metrics_http_recording():
    """Verify HTTP request metrics recording and histogram accumulation."""
    record_http_request("GET", "/api/v1/feed", 200, 0.045)
    record_http_request("POST", "/api/v1/reel_studio/generate", 201, 1.25)

    output = generate_prometheus_output()
    assert "vidsnap_http_requests_total" in output
    assert 'method="GET"' in output
    assert 'status="200"' in output
    assert "vidsnap_http_request_duration_seconds" in output
    assert "vidsnap_system_uptime_seconds" in output


def test_metrics_websocket_gauge():
    """Verify active WebSocket gauge increments and decrements correctly."""
    initial = get_active_ws()
    inc_active_ws()
    assert get_active_ws() == initial + 1
    dec_active_ws()
    assert get_active_ws() == initial


def test_metrics_transcodes_and_reports():
    """Verify video transcode counters and content report counters."""
    record_transcode_job("done")
    record_content_report("spam")

    output = generate_prometheus_output()
    assert 'vidsnap_video_transcodes_total{status="done"}' in output
    assert 'vidsnap_content_reports_total{reason="spam"}' in output
