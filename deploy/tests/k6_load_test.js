/**
 * VidSnap.AI k6 Performance & Load Test Suite
 * Validates Free-Tier SLOs:
 * - Feed API p95 < 400ms (cached)
 * - API Error rate < 1%
 * - Concurrent user capacity on single-node VM (100 VUs)
 *
 * Usage:
 *   k6 run deploy/tests/k6_load_test.js
 *   k6 run --env BASE_URL=https://vidsnap.ai deploy/tests/k6_load_test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom SLO Metrics
const feedDuration = new Trend('feed_response_time');
const errorRate = new Rate('api_error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 25 },  // Ramp-up to 25 users
    { duration: '1m', target: 50 },   // Sustained load: 50 users
    { duration: '30s', target: 100 }, // Peak burst: 100 users
    { duration: '15s', target: 0 },   // Graceful cool-down
  ],
  thresholds: {
    'http_req_duration{endpoint:feed}': ['p(95)<400'], // Feed API p95 < 400ms SLO
    'api_error_rate': ['rate<0.01'],                  // Error rate < 1% SLO
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  const params = {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'k6-load-tester/1.0',
    },
  };

  // 1. Health Liveness & Readiness Probe
  const healthRes = http.get(`${BASE_URL}/health/live`, params);
  check(healthRes, {
    'health live status is 200': (r) => r.status === 200,
  });

  // 2. Feed Stream Request (For You Tab with Cache Headers)
  const feedRes = http.get(`${BASE_URL}/api/v1/feed?tab=for_you&limit=10`, {
    ...params,
    tags: { endpoint: 'feed' },
  });

  const feedSuccess = check(feedRes, {
    'feed status is 200': (r) => r.status === 200,
    'feed response has reels': (r) => r.body && r.body.length > 0,
  });

  feedDuration.add(feedRes.timings.duration);
  errorRate.add(!feedSuccess);

  // ETag conditional check (simulate browser edge caching 304)
  const etag = feedRes.headers['ETag'] || feedRes.headers['etag'];
  if (etag) {
    const cachedRes = http.get(`${BASE_URL}/api/v1/feed?tab=for_you&limit=10`, {
      headers: {
        ...params.headers,
        'If-None-Match': etag,
      },
      tags: { endpoint: 'feed_cached' },
    });
    check(cachedRes, {
      'cached feed returns 304 or 200': (r) => r.status === 304 || r.status === 200,
    });
  }

  // 3. Discovery Search
  const searchRes = http.get(`${BASE_URL}/api/v1/discovery/search?q=technology&limit=10`, params);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  });

  // 4. Prometheus Metrics Scrape (Verify exporter latency)
  const metricsRes = http.get(`${BASE_URL}/metrics`, params);
  check(metricsRes, {
    'metrics status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
