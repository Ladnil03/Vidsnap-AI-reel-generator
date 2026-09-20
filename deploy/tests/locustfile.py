"""
VidSnap.AI Locust Performance & Load Test Suite.
Validates concurrent user sessions and feed latencies against free-tier SLOs.

Usage:
    pip install locust
    locust -f deploy/tests/locustfile.py --headless -u 50 -r 5 --run-time 1m --host http://localhost:8000
"""

from locust import HttpUser, between, task


class VidSnapPlatformUser(HttpUser):
    """Simulates a mobile/web user browsing reels, searching, and viewing metrics."""

    wait_time = between(1, 2.5)

    @task(5)
    def view_feed_for_you(self):
        """Simulate primary feed snap-scrolling."""
        with self.client.get(
            "/api/v1/feed?tab=for_you&limit=10",
            headers={"Accept": "application/json"},
            name="GET /feed?tab=for_you",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                # Test conditional ETag caching
                etag = response.headers.get("ETag")
                if etag:
                    self.client.get(
                        "/api/v1/feed?tab=for_you&limit=10",
                        headers={"If-None-Match": etag},
                        name="GET /feed (Cached ETag 304)",
                    )
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(2)
    def search_discovery(self):
        """Simulate explore search query."""
        self.client.get(
            "/api/v1/discovery/search?q=technology&limit=10",
            name="GET /discovery/search",
        )

    @task(1)
    def check_health(self):
        """Simulate keepalive health probe."""
        self.client.get("/health/live", name="GET /health/live")

    @task(1)
    def scrape_metrics(self):
        """Simulate Prometheus scraper."""
        self.client.get("/metrics", name="GET /metrics")
