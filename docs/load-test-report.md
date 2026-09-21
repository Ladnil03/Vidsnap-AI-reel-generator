# VidSnap.AI — Load Test Benchmark & Capacity Planning Report

**Status**: **Not Yet Executed** (Scripts provisioned and verified; awaiting execution against dedicated staging environment)  
**Test Engines Available**: k6 v0.54 (`deploy/tests/k6_load_test.js`) & Locust 2.31 (`deploy/tests/locustfile.py`)  
**Target Infrastructure (Planned)**: Linux Docker Host + MongoDB Atlas M0 (512MB shared) + Redis 7 + Cloudinary Multi-CDN  
**Date**: September 2026  

---

## 1. Execution Status & Honesty Disclaimer

> [!IMPORTANT]
> Previous revisions of this document contained simulated / theoretical latency and throughput estimates. To maintain engineering honesty and audit integrity, all simulated metrics have been marked as **Not Yet Executed**. Actual load benchmark numbers will be populated once executed against an isolated staging environment.

---

## 2. Service Level Objectives (SLOs) Targets

The following targets represent the design objectives for the ₹0/month free-tier architecture:

| Service / Endpoint | Free-Tier Target SLO | Staging Benchmark | Compliance Status |
|---|---|---|---|
| **Feed API (`GET /feed?tab=for_you`)** | p95 < 400ms (uncached) | Pending execution | PENDING |
| **Feed Cached (304 Not Modified)** | p95 < 100ms | Pending execution | PENDING |
| **Search API (`GET /discovery/search`)** | p95 < 500ms | Pending execution | PENDING |
| **WebSocket Latency / Sync Fanout** | Fan-out < 300ms | Pending execution | PENDING |
| **Prometheus Exporter (`GET /metrics`)** | p95 < 50ms | Pending execution | PENDING |
| **Overall API Error Rate** | < 1.0% | Pending execution | PENDING |

---

## 3. Reproduction & Execution Instructions

Two load test suites are committed to the repository and ready for automated or manual execution:

### Option A: k6 Multi-Stage Load Test (`deploy/tests/k6_load_test.js`)

#### Prerequisites
Install k6:
- macOS: `brew install k6`
- Windows: `winget install k6` or `choco install k6`
- Linux: `sudo apt-get install k6`

#### Test Stages
- **Stage 1 (0 to 30s)**: Ramp up to 25 concurrent virtual users (VUs).
- **Stage 2 (30s to 1m30s)**: Sustained load at 50 concurrent VUs.
- **Stage 3 (1m30s to 2m)**: Peak burst at 100 concurrent VUs.
- **Stage 4 (2m to 2m30s)**: Ramp down to 0 VUs.

#### Running the Test
```bash
# 1. Boot local stack or target staging host
export BASE_URL="http://localhost:8000"
export METRICS_TOKEN="your_metrics_token_if_set"

# 2. Run k6 benchmark with summary output
k6 run deploy/tests/k6_load_test.js
```

---

### Option B: Locust Python Load Test (`deploy/tests/locustfile.py`)

#### Prerequisites
```bash
pip install locust
```

#### Running Headless Locust Test
```bash
# Run headless test with 50 users, spawn rate 5, for 2 minutes
locust -f deploy/tests/locustfile.py \
       --host=http://localhost:8000 \
       --headless \
       -u 50 \
       -r 5 \
       --run-time 2m \
       --csv=load_test_results
```

#### Running with Locust Web UI
```bash
locust -f deploy/tests/locustfile.py --host=http://localhost:8000
# Open http://localhost:8089 in browser
```

---

## 4. Planned Capacity Guardrails

1. **FFmpeg Job Concurrency**: Cap ARQ worker concurrency at 2 simultaneous transcode jobs to prevent CPU starvation on shared host instances.
2. **Rate Limiting**: Sliding-window Redis rate limits enforced at:
   - General API: 60 req/min
   - Auth endpoints: 10 req/min
   - Signup: 3 req/hour
3. **Atlas M0 512MB Ceilings**:
   - 15-day TTL on `interaction_events`
   - 30-day TTL on `notifications` and `companion_messages`
   - 30-day TTL on video drafts and 24-hour retention on failed jobs.
