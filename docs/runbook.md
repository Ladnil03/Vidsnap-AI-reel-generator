# VidSnap.AI — Production Operational Runbook & Incident Management

**Platform**: VidSnap.AI Modular Monolith  
**Topology**: Linux/Docker Host + MongoDB Atlas M0 + Cloudinary Media Cloud + Redis ARQ  
**Cost Model**: ₹0 / month Free-Tier (Zero Credit Card Required)  
**Date**: September 2026  

---

## 1. Daily Health & Monitoring Routines

### 1.1 Health Endpoints
- **Liveness Probe**: `GET /health/live`
  - Expected: `200 OK` with `{"status": "alive"}`.
  - Action if failed: Container crashed; restart via `docker compose restart api`.
- **Readiness Probe**: `GET /health/ready`
  - Expected: `200 OK` with `{"status": "ready", "dependencies": {"mongodb": "healthy", "redis": "healthy"}}`.
  - Action if failed: Inspect MongoDB Atlas IP access list or local Redis daemon.
- **Prometheus Metrics**: `GET /metrics`
  - Emits real-time HTTP rates, request duration histograms, transcode counts, and active WebSockets.

### 1.2 MongoDB Atlas M0 512MB Disk Capacity Guard
Atlas M0 has a strict 512MB shared storage ceiling. Exceeding this threshold blocks write operations.
- **Automated Retention**:
  - `interaction_events`: Expire after 15 days via index `idx_interactions_ttl_15d`.
  - `companion_messages`: Expire after 30 days via index `idx_companion_ttl_30d`.
  - `notifications`: Expire after 30 days via TTL index.
  - `retention_reaper_task`: Background ARQ worker task automatically purges video drafts older than 30 days and failed jobs older than 24 hours.
- **Manual Emergency Purge**:
  ```bash
  python -c "import asyncio; from backend.app.core.database import get_db; # run reaper manually"
  ```

---

## 2. Backup & Disaster Recovery (DR) Drills

### 2.1 Automated Nightly Backup
The backup utility exports all 18 core collections, compresses them into an archive, and saves directly to the `backups/` directory:
```bash
python deploy/scripts/backup_database.py
```
*Schedule: Run daily at 03:00 UTC via crontab.*

### 2.2 Disaster Recovery Restoration Drill
In the event of database corruption or data loss:
1. Provision clean MongoDB instance / Atlas M0 cluster.
2. Verify backup archive integrity:
   ```bash
   python deploy/scripts/restore_database.py backups/vidsnap_backup_LATEST.tar.gz --dry-run
   ```
3. Execute real restoration:
   ```bash
   python deploy/scripts/restore_database.py backups/vidsnap_backup_LATEST.tar.gz
   ```
4. Run index recreation:
   ```bash
   python -c "import asyncio; from backend.app.core.database import connect_db; asyncio.run(connect_db())"
   ```

---

## 3. Incident Response Playbooks

### Incident A: Abusive / Toxic Content Outbreak
- **Trigger**: Multiple user reports received; alert in admin queue.
- **Procedure**:
  1. Navigate to Admin Moderation Portal: `https://vidsnap.ai/admin/moderation`.
  2. Filter by status `pending`. Items with $\ge 3$ reports are automatically prioritized as `high`.
  3. Inspect automated toxicity score. Click **Hide Content 👁️** to immediately withdraw the item from all public feeds.
  4. If user is an automated bot or persistent offender, click **Ban User 🚫**. This sets `is_banned: true`, revokes active tokens, and drains credit balance to 0.

### Incident B: Cloudinary Media Storage Threshold Alert (>20GB / 80%)
- **Trigger**: Cloudinary storage consumption reaches 20GB of the 25GB free tier envelope.
- **Procedure**:
  1. Trigger retention reaper task to purge orphaned draft uploads:
     ```bash
     python -m backend.workers.media.tasks purge_orphaned_media
     ```
  2. If space remains tight, adjust retention window for unlisted drafts from 30 days to 14 days in `backend/app/core/config.py`.

### Incident C: Redis Worker Failure or Process Crash
- **Trigger**: Background video processing queue stalls.
- **Procedure**:
  1. Check Redis container health: `docker compose ps redis`.
  2. Verify queue backlog in Redis:
     ```bash
     redis-cli -h localhost -p 6379 LLEN "arq:queue"
     ```
  3. Restart worker:
     ```bash
     docker compose restart media-worker
     ```
  4. Pending transcode jobs with idempotency keys will automatically retry up to 3 times with exponential backoff.

### Incident D: Free LLM API Rate Limit Exhaustion
- **Trigger**: `429 Too Many Requests` from Groq or Gemini free tier.
- **Procedure**:
  - The built-in `LLMRouter` (`backend/app/core/llm_router.py`) handles this autonomously:
    1. Catches provider 429 error.
    2. Seamlessly fails over to secondary provider (Groq -> Gemini -> OpenRouter -> Offline Heuristic).
    3. If all remote providers are exhausted, features degrade gracefully to deterministic heuristic templates (e.g. Creator Copilot and Companion return rule-based hooks without user error).
