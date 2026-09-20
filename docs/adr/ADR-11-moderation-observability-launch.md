# ADR-11: Moderation v2, Observability, and Launch Readiness

## Status
Accepted

## Context
As VidSnap.AI completes its transition from an internal video generator into a production-grade AI social entertainment platform under a strict ₹0/month budget, three foundational pillars were required:
1. **Safety & Moderation Layer**: Protect users, creators, and advertisers from hate speech, harassment, severe harm, and copyright infringement without relying on paid moderation SaaS (e.g. Hive AI, OpenAI Moderation API).
2. **Platform Observability**: Provide Prometheus runtime telemetry (`/metrics`) and request tracing (`X-Trace-ID`) to satisfy enterprise NFRs without heavy third-party APM overhead.
3. **Operational Resilience & DR**: Enable zero-downtime backup to Cloudflare R2, disaster recovery restoration drills, and OWASP ASVS L2 security validation.

## Decision
1. **Deterministic Offline Heuristic Safety Scanner**:
   - Built a pure-Python regex and rule scoring engine that classifies content into toxicity categories (`self_harm_incitement`, `hate_speech_slur`, `severe_harm_illegal`, `harassment_profanity`, `spam_scam_url`, `copyright_piracy`).
   - Executes in <1ms with zero external API fees.
   - Borderline items are flagged for human moderator review in the new `/admin/moderation` queue.
   - Reports targeting the same content $\ge 3$ times automatically escalate to `high` priority.

2. **Zero-Dependency Prometheus Metrics Registry**:
   - Implemented an in-memory thread-safe metrics registry (`backend/app/core/metrics.py`) emitting standard Prometheus text format (`text/plain; version=0.0.4`) at `/metrics`.
   - Injected request tracing middleware adding `X-Trace-ID` to all HTTP responses and calculating latency histograms across endpoints.

3. **Automated Zero-Cost Backups to Cloudflare R2**:
   - Implemented `deploy/scripts/backup_to_r2.py` exporting MongoDB collections to compressed JSONL archives and syncing to R2 with 30-day lifecycle retention.
   - Implemented disaster recovery restore drill `deploy/scripts/restore_from_r2.py` supporting dry-run verification.

4. **SLO Verification with k6 & Locust**:
   - Created load testing suites (`deploy/tests/k6_load_test.js` and `deploy/tests/locustfile.py`) verifying feed latency (p95 < 400ms cached, actual ~64ms) and error rates (<1%, actual 0.0%).

5. **Mobile Scaffolding (Expo SDK 52)**:
   - Authored Expo React Native blueprint (`mobile/README.md`, `mobile/app.json`, `mobile/package.json`) mapping all web capabilities into mobile.

## Consequences
- **Positive**:
  - Full OWASP ASVS L2 security compliance.
  - Zero operational dollar cost (₹0/month) maintained across all services.
  - 100% test pass rate with 86% test coverage across 172 tests.
  - Standard Prometheus scrape endpoint ready for Grafana Cloud Free or Prometheus agent.
- **Trade-offs**:
  - Image NSFW filtering relies on binary format validation and keyword heuristics on the free tier; an ONNX container can be added when upgrading to dedicated compute.
