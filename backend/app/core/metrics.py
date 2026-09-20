"""
Lightweight zero-dependency Prometheus Metrics Registry for VidSnap AI.
Emits standard Prometheus text format (version 0.0.4) for scraper ingestion.
"""

import time
from collections import defaultdict
from threading import Lock

START_TIME = time.time()
_METRICS_LOCK = Lock()

# In-memory metric stores
_HTTP_REQUESTS: dict[tuple[str, str, int], int] = defaultdict(int)
_HTTP_DURATION_BUCKETS = [0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
_HTTP_DURATION_HIST: dict[tuple[str, str, float], int] = defaultdict(int)
_HTTP_DURATION_SUM: dict[tuple[str, str], float] = defaultdict(float)
_HTTP_DURATION_COUNT: dict[tuple[str, str], int] = defaultdict(int)

_ACTIVE_WS_CONNECTIONS = 0
_VIDEO_TRANSCODES: dict[str, int] = defaultdict(int)
_CONTENT_REPORTS: dict[str, int] = defaultdict(int)


def record_http_request(method: str, path: str, status_code: int, duration_seconds: float) -> None:
    """Record an HTTP request count and latency observation."""
    # Normalize path to avoid high cardinality (e.g. collapse UUIDs or query strings)
    clean_path = path.split("?")[0]
    # Simple normalization for dynamic IDs: replace hex/numeric segments with :id
    parts = clean_path.strip("/").split("/")
    norm_parts = [":id" if (len(p) > 16 or p.isdigit()) else p for p in parts]
    normalized_path = "/" + "/".join(norm_parts) if parts and parts[0] else "/"

    with _METRICS_LOCK:
        _HTTP_REQUESTS[(method, normalized_path, status_code)] += 1
        _HTTP_DURATION_SUM[(method, normalized_path)] += duration_seconds
        _HTTP_DURATION_COUNT[(method, normalized_path)] += 1

        for b in _HTTP_DURATION_BUCKETS:
            if duration_seconds <= b:
                _HTTP_DURATION_HIST[(method, normalized_path, b)] += 1


def record_transcode_job(job_status: str) -> None:
    """Record video transcode outcome (done, failed, retried)."""
    with _METRICS_LOCK:
        _VIDEO_TRANSCODES[job_status] += 1


def record_content_report(reason: str) -> None:
    """Record user content report category count."""
    with _METRICS_LOCK:
        _CONTENT_REPORTS[reason] += 1


def inc_active_ws() -> None:
    """Increment active WebSocket gauge."""
    global _ACTIVE_WS_CONNECTIONS
    with _METRICS_LOCK:
        _ACTIVE_WS_CONNECTIONS += 1


def dec_active_ws() -> None:
    """Decrement active WebSocket gauge."""
    global _ACTIVE_WS_CONNECTIONS
    with _METRICS_LOCK:
        _ACTIVE_WS_CONNECTIONS = max(0, _ACTIVE_WS_CONNECTIONS - 1)


def get_active_ws() -> int:
    """Get count of current active WebSockets."""
    return _ACTIVE_WS_CONNECTIONS


def generate_prometheus_output() -> str:
    """
    Format all registered metrics into Prometheus exposition text format (version 0.0.4).
    """
    lines: list[str] = []

    with _METRICS_LOCK:
        # 1. System Uptime
        uptime = time.time() - START_TIME
        lines.append("# HELP vidsnap_system_uptime_seconds Total seconds since application boot.")
        lines.append("# TYPE vidsnap_system_uptime_seconds gauge")
        lines.append(f"vidsnap_system_uptime_seconds {uptime:.2f}")
        lines.append("")

        # 2. Active WebSockets
        lines.append("# HELP vidsnap_active_websocket_connections Current active real-time WebSocket sessions.")
        lines.append("# TYPE vidsnap_active_websocket_connections gauge")
        lines.append(f"vidsnap_active_websocket_connections {_ACTIVE_WS_CONNECTIONS}")
        lines.append("")

        # 3. HTTP Request Total
        lines.append("# HELP vidsnap_http_requests_total Total completed HTTP requests.")
        lines.append("# TYPE vidsnap_http_requests_total counter")
        for (m, p, s), count in sorted(_HTTP_REQUESTS.items()):
            lines.append(f'vidsnap_http_requests_total{{method="{m}",path="{p}",status="{s}"}} {count}')
        lines.append("")

        # 4. HTTP Request Duration Histogram
        lines.append("# HELP vidsnap_http_request_duration_seconds HTTP request latency distribution in seconds.")
        lines.append("# TYPE vidsnap_http_request_duration_seconds histogram")
        endpoints = sorted(_HTTP_DURATION_COUNT.keys())
        for (m, p) in endpoints:
            cum_count = 0
            for b in _HTTP_DURATION_BUCKETS:
                cum_count += _HTTP_DURATION_HIST.get((m, p, b), 0)
                lines.append(
                    f'vidsnap_http_request_duration_seconds_bucket{{le="{b}",method="{m}",path="{p}"}} {cum_count}'
                )
            # +Inf bucket equals total count
            total_count = _HTTP_DURATION_COUNT.get((m, p), 0)
            total_sum = _HTTP_DURATION_SUM.get((m, p), 0.0)
            lines.append(
                f'vidsnap_http_request_duration_seconds_bucket{{le="+Inf",method="{m}",path="{p}"}} {total_count}'
            )
            lines.append(f'vidsnap_http_request_duration_seconds_sum{{method="{m}",path="{p}"}} {total_sum:.6f}')
            lines.append(f'vidsnap_http_request_duration_seconds_count{{method="{m}",path="{p}"}} {total_count}')
        lines.append("")

        # 5. Video Transcodes
        lines.append("# HELP vidsnap_video_transcodes_total Video processing job execution count by status.")
        lines.append("# TYPE vidsnap_video_transcodes_total counter")
        for s, count in sorted(_VIDEO_TRANSCODES.items()):
            lines.append(f'vidsnap_video_transcodes_total{{status="{s}"}} {count}')
        lines.append("")

        # 6. Content Reports
        lines.append("# HELP vidsnap_content_reports_total Inbound user reports categorized by reason.")
        lines.append("# TYPE vidsnap_content_reports_total counter")
        for r, count in sorted(_CONTENT_REPORTS.items()):
            lines.append(f'vidsnap_content_reports_total{{reason="{r}"}} {count}')
        lines.append("")

    return "\n".join(lines) + "\n"
