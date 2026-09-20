# ADR-06: Media Storage & Edge CDN Architecture — Cloudinary Primary (Zero Card Required)

- **Status**: Accepted & Finalized (Purged Cloudflare & R2; Cloudinary Primary)
- **Date**: 2026-09-20
- **Authors**: Principal Engineer / Solution Architect
- **Domain**: Media Pipeline, Cloudinary Media Cloud, Edge Caching, CDN & Storage Port Abstraction

---

## 1. Context & Business Drivers

VidSnap.AI delivers vertical short-form video reels (720x1280, 9:16). Serving and uploading video content at scale requires reliable object storage, high-throughput direct client uploads, and low-latency edge CDN caching.

Key operational challenges and constraints:
1. **Zero Card Required Constraint**: Cloud providers like Cloudflare (R2/Workers AI) and AWS demand credit card details during registration or free-tier activation. To keep VidSnap.AI truly accessible and 100% cost-free with **zero financial risk**, all cloud services requiring credit card details prior to free-tier usage are strictly excluded.
2. **Server CPU & Memory Saturation**: Streaming large video payloads (up to 50MB each) through the Python application server consumes server worker threads and socket buffers. Direct client-to-storage uploads are mandatory.
3. **Bandwidth Optimization & Perceptual Compression**: Short video delivery requires intelligent modern video codecs (AV1, VP9, WebM, H.264) and automatic quality compression to minimize mobile egress and eliminate buffering.
4. **Zero-Cost Constraint (₹0/month)**:
   - Operates within **Cloudinary Free Tier**: 25 monthly credits (~25GB storage, or 25GB net bandwidth, or 25,000 transformations) with **ZERO credit card required at signup**.
   - Fully supported by local disk storage (`STORAGE_PROVIDER=local`) for local offline development.

---

## 2. Architectural Decisions

### 2.1 Pluggable Storage Port (`StoragePort`)
- Storage operations are fully decoupled from domain logic via `StoragePort`:
  - `CloudinaryStorageAdapter`: Primary cloud media backend. Handles signed client direct uploads, server-side asset operations, and delivery URL derivation without asking for a credit card.
  - `LocalStorageAdapter`: Zero-dependency local filesystem storage for unit/integration tests and local development.
- Storage backend selection is 100% config-driven via `STORAGE_PROVIDER=cloudinary|local`.

### 2.2 Client-Side Direct Signed Uploads
- Rather than proxying large video files through FastAPI, client applications request a cryptographically signed direct upload ticket:
  `POST /api/v1/media/upload-url/video`
- **Validation Before Issuance**:
  - Container extension validation (`.mp4`, `.webm`, `.mov`).
  - Size validation against the 50MB per-video ceiling.
  - User quota enforcement (500MB free-tier allocation) *before* ticket generation.
- **Client Multipart POST Execution**:
  - Issues signed POST parameters (`timestamp`, `public_id`, `signature`, `api_key`) and the direct upload endpoint (`https://api.cloudinary.com/v1_1/<cloud_name>/video/upload`).
  - The browser dispatches a multipart `FormData` POST via `XMLHttpRequest` with real-time upload progress tracking (`xhr.upload.onprogress`).
- **Post-Upload Registration**:
  - Upon upload completion, the client submits the verified storage key to `POST /api/v1/content/videos/from-key`.
  - Backend verifies asset presence (`head_object`), captures cache metadata, creates the post entity, and dispatches background FFmpeg transcoding to ARQ workers.

### 2.3 Cloudinary Edge CDN & Multi-CDN Optimization (`CDNPort`)
- Pluggable CDN abstraction through `CDNPort`:
  - `CloudinaryCDNAdapter`: Leverages Cloudinary's multi-CDN global edge (Akamai, Fastly, CloudFront) with automatic format (`f_auto`) and perceptual quality (`q_auto`) delivery. Delivers AV1/VP9 to modern browsers and H.264 fallback transparently. Supports cache purge via `cloudinary.uploader.explicit(..., invalidate=True)`.
  - `PassthroughCDNAdapter`: Zero-op adapter for offline and local development.

### 2.4 Application-Layer Edge Caching Middleware
- `CacheControlMiddleware` enforces HTTP edge caching directives:
  - **Media & Transcoded Assets** (`/api/v1/media/files/*`):
    `Cache-Control: public, max-age=86400, stale-while-revalidate=3600`
  - **Personalized Streams** (`/api/v1/feed/*`, `/api/v1/recsys/*`, `/api/v1/discovery/*`):
    `Cache-Control: private, max-age=60, stale-while-revalidate=30`
  - **Conditional Requests (ETags & 304 Not Modified)**:
    - Generates weak ETags for dynamic file endpoints and respects `If-None-Match`, returning `304 Not Modified` with zero egress body.

---

## 3. Capacity & Compliance Matrix

| Resource | Free-Tier Allowance | VidSnap.AI Usage Pattern | Credit Card Required? |
|---|---|---|---|
| **Cloudinary Credits** | 25 Credits / month | 1 credit = 1GB storage or 1GB bandwidth | **NO** (Card-free signup) |
| **Media Storage** | ~25 GB (Cloudinary) | ~50MB per creator quota; ~500 reels | **NO** |
| **Edge Optimization** | Unlimited f_auto,q_auto | Automatic AV1/VP9 encoding cuts bandwidth 30-50% | **NO** |
| **Multi-CDN Delivery** | Akamai + Fastly + CloudFront | Global edge PoPs with automated edge caching | **NO** |
| **Local / Test Fallback**| Unlimited local disk | Pytest suite and local development | **NO** |

---

## 4. Consequences & Benefits

- **Positive**:
  - **100% Free & No Card**: Creators and developers can run and deploy without providing credit card details or risking surprise invoices.
  - Zero application server saturation: 100% of large video uploads bypass backend workers directly to Cloudinary.
  - Real-time client progress bars during video uploads.
  - Automated video codec conversion (AV1, VP9) delivers smaller video sizes without manual FFmpeg multi-codec transcoding.
  - Complete architectural decoupling: domain services remain 100% agnostic of cloud provider.
- **Negative / Trade-offs**:
  - Cloudinary Free Tier credit ceiling (25 credits/month) requires active retention reaping (handled by ARQ `retention_reaper_task`).
