# VidSnap.AI — Free-Tier Resource Budget & Capacity Model (Zero Card Required)

> **Target Monthly Cost:** Rs 0 / $0  
> **Philosophy:** Strict zero-cost operation using verified free tiers that require **ZERO Credit Card Details** at signup. Architected with Ports & Adapters so any component can scale to paid infrastructure via configuration without code changes.  
> **Verification Date:** September 20, 2026 (Live limits re-verified from official provider documentation)

---

## 1. Provider Free-Tier Limits & Quota Matrix (100% No Card Required)

| Infrastructure Component | Selected Provider | Free Tier Allowance | Hard Constraints & Nuances | Credit Card Required? |
|---|---|---|---|---|
| **Object Storage & Media Delivery** | **Cloudinary** | • **25 Monthly Credits**<br>• **25 GB Net Storage** or **25 GB Bandwidth**<br>• 25,000 monthly transformations<br>• Multi-CDN (Akamai/Fastly/CloudFront) with `f_auto,q_auto` | Standard media storage. Generous video/image quotas with automatic perceptual compression. Direct client signed uploads via multipart POST. | **NO (Card-free signup)** |
| **Database** | **MongoDB Atlas M0** | • **512 MB Storage** (data + indexes)<br>• **500 Concurrent Connections**<br>• 100 CRUD ops/sec<br>• 10 GB In / 10 GB Out per 7 days | Hard cap at 512 MB (writes fail when exceeded). Shared CPU. Optimized schema design. | **NO (Card-free signup)** |
| **Vector Search** | **Atlas Vector Search (M0)** | • Max **3 indexes** on M0<br>• 384-dimensional dense projection | Shares 512 MB total space with documents. Index size constrained with 384-dim semantic hashes. | **NO (Card-free signup)** |
| **Frontend CDN / Hosting** | **Vercel Hobby** / **Netlify** | • **Vercel Hobby:** 100 GB bandwidth, unlimited edge requests<br>• Instant preview builds with GitHub login | Non-commercial hobby terms; unlimited edge CDN caching for static pages. | **NO (Card-free signup)** |
| **In-Memory Cache & Queue** | **Redis 7 (Local / Upstash)** | • Upstash: 10,000 commands/day free<br>• Local / Self-Hosted: Unlimited commands | `maxmemory 256mb` and `volatile-lru` eviction. Periodic RDB snapshots saved to local backup directory. | **NO (Card-free signup)** |
| **Email Delivery** | **Resend HTTP API**<br>*(Fallback: Brevo HTTP API)* | • **Resend:** 3,000 emails/mo, **100 emails/day cap**<br>• **Brevo:** **300 emails/day** (9,000/mo) | Resend requires domain DNS verification. Brevo provides higher daily volume. `EmailPort` rotates between both. | **NO (Card-free signup)** |
| **Text-to-Speech (TTS)** | **edge-tts** | • Unlimited free neural voices across 100+ languages | Zero API cost. Microsoft Edge neural endpoints via Python package. | **NO (Zero signup)** |
| **Speech-to-Text (STT)** | **faster-whisper (CPU int8)** | • Unlimited offline execution | `base` or `small` int8 model on CPU takes ~2-4s for 60s audio. Zero API cost. | **NO (Zero signup)** |
| **Embeddings** | **Dense Semantic Projection** | • Model: 384-dim normalized projection<br>• Unlimited inferences on CPU | Inference latency <1ms in pure Python. Zero token cost. | **NO (Zero signup)** |
| **LLM Router (Chain)** | **Groq / Gemini 1.5 Flash / OpenRouter** | • **Groq:** Llama 3.3 70B (30 RPM, 1,000 RPD, 100k TPD); Llama 3.1 8B (14,400 RPD)<br>• **Gemini:** Free tier Google AI Studio<br>• **OpenRouter:** Free model access | Strict token budget per prompt (<1,000 tokens). Aggressive semantic cache in Redis. Graceful degradation to rule-based fallback. | **NO (Card-free signup)** |
| **Third-Party Discovery APIs** | **YouTube Data API v3**, Pexels, Pixabay | • **YouTube:** 10,000 units/day default<br>• **Pexels:** 20,000 calls/mo<br>• **Pixabay:** 5,000 calls/hr | Pexels and Pixabay require free API keys. YouTube oEmbed requires no key at all. | **NO (Card-free signup)** |

---

## 2. Media Storage & Data Lifecycle Budget

### 2.1 Cloudinary (25 GB Free Storage Envelope)

- **Video Format Specification:**
  - Resolution: **720 x 1280 (Vertical 9:16)** at 30 fps
  - Video Codec: **H.264 (libx264)**, CRF 24, `-preset veryfast` (~1.2 Mbps bitrate)
  - Edge Delivery: Delivered with `f_auto,q_auto` which dynamically transcodes to AV1/VP9 on supporting browsers, cutting delivery size by 30-50%.
  - Audio Codec: **AAC**, 96 kbps, stereo
  - Container: MP4 with `-movflags +faststart`
  - Average File Size (60s Reel): **~9.5 MB**
  - Thumbnail (WebP 720x1280, q=75): **~65 KB**
  - Subtitle track (VTT): **~4 KB**

- **Total Capacity Calculation:**
  $$\text{Storage per Completed Reel} \approx 9.5\text{ MB} + 0.065\text{ MB} + 0.004\text{ MB} \approx 9.6\text{ MB}$$
  $$\text{Maximum Concurrent Reels Stored} = \frac{25,000\text{ MB}}{9.6\text{ MB}} \approx 2,600\text{ Reels}$$

- **Retention & Quota Enforcement Rules:**
  1. **Quota Ceiling:** 500 MB maximum active storage per regular user (~50 reels).
  2. **Soft Alarm Threshold (80% / 20 GB):** When total bucket storage exceeds 20 GB (~2,000 reels), the system initiates automated pruning of unreferenced media and alerts the admin.
  3. **Draft Auto-Purge:** Unfinalized drafts older than 30 days are automatically deleted.
  4. **Failed Job Artifacts:** Temporary inputs and logs for failed jobs are purged after 24 hours.
  5. **Direct Client Uploads:** Clients upload directly to Cloudinary using signed POST multipart requests, bypassing API server memory and bandwidth entirely.

### 2.2 MongoDB Atlas M0 (512 MB Database Envelope)

- **Compact Document Design:**
  - Field names kept concise; UUIDs stored as binary/hex (32 bytes instead of 36-char strings).
  - Average document sizes:
    - User document: ~450 bytes
    - Reel/Video metadata doc: ~800 bytes
    - Social interaction (like/follow/save): ~120 bytes
    - XP ledger entry: ~180 bytes
- **Offloading Heavy Data:**
  - **Zero video or image blobs** inside MongoDB.
  - Raw analytics and audit streams reside in Redis and are flushed to local compressed daily JSONL archives.
  - Realtime room presence and active room states live exclusively in Redis with TTL keys (zero MongoDB writes).
- **TTL Indexes:**
  - `otp`: TTL 10 minutes (`expireAfterSeconds: 600`)
  - `notifications`: TTL 30 days (`expireAfterSeconds: 2592000`)
  - `audit_logs`: TTL 14 days
  - `job_execution_logs`: TTL 7 days
- **Vector Search Constraints on M0:**
  - Embeddings dimension: **384**
  - Maximum indexed catalog items: **20,000 items**
  - Vector storage footprint: $20,000 \times 384 \times 4\text{ bytes} \approx 30.7\text{ MB}$ (safe for 512 MB DB).

---

## 3. Operational Guardrails & Failure Modes

```
                               ┌─────────────────────────┐
                               │     Incoming Request    │
                               └────────────┬────────────┘
                                            │
                                            ▼
                             ┌─────────────────────────────┐
                             │  Rate Limit Check (Redis)   │
                             └──────┬───────────────┬──────┘
                       [Allowed]    │               │  [Exceeded]
                                    │               └─────────────────────────► 429 Too Many Requests
                                    ▼
                             ┌─────────────────────────────┐
                             │   Feature Quota Evaluator   │
                             └──────┬───────────────┬──────┘
                                    │
               ┌────────────────────┼────────────────────┐
               │                    │                    │
               ▼                    ▼                    ▼
     [Video Upload Request]  [AI Feature Request] [Search Request]
               │                    │                    │
               ▼                    ▼                    ▼
     Check User Quota        LLM Router Chain     Vector Search Query
     (Must be < 500MB)       1. Groq (Llama 3.3)  (Fallback: Atlas Text)
     If exceeded:            2. Google Gemini             │
     Return 400 with         3. OpenRouter Free           ▼
     quota notice            4. Offline Heuristic 200 OK Response
```

1. **LLM Provider Fallback Chain (100% Free & No Card):**
   - Primary: **Groq Llama 3.3 70B** (ultra-fast, generous free quota, no card needed).
   - Secondary: **Google Gemini 1.5 Flash** (via Google AI Studio, no card needed).
   - Tertiary: **OpenRouter Free Tier** (no card needed).
   - Final Degraded Fallback: **Deterministic offline heuristic** (rule-based hashtags, mood playlists, companion replies). No feature crashes when AI quotas expire.
2. **Email Provider Failover:**
   - Resend provides pristine deliverability with a custom domain (up to 100/day).
   - If Resend hits its 100/day limit, the `EmailProvider` adapter automatically routes to Brevo (300/day).
3. **Anti-Crash Queue & Worker Backpressure:**
   - ARQ queue worker concurrency set to `max_jobs = 2`.
   - Redis enforces job concurrency via distributed locks.
