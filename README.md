# 🎬 VidSnap.AI — AI-Powered Video Reel Generator & Social Platform

VidSnap.AI is a high-performance web platform for generating, discovering, and sharing vertical short-form video reels. It combines automated video synthesis (using Edge-TTS neural voiceover, FFmpeg assembly, and Cloudinary multi-CDN delivery) with real-time watch rooms, creator-brand collaboration, and gamified engagement.

---

## 🏗️ Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │          Next.js 16 Frontend            │
                      │   (React 19, TypeScript, App Router)    │
                      └────────────────────┬────────────────────┘
                                           │  REST / WebSocket
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │        FastAPI Modular Monolith         │
                      │  (Security, Auth, Rooms, Feeds, APIs)   │
                      └──────────────┬───────────────────┬──────┘
                                     │                   │
                     Enqueues jobs   │                   │ State & Cache
                                     ▼                   ▼
                      ┌───────────────────────┐ ┌───────────────┐
                      │   ARQ Media Worker    │ │ Redis 7 &     │
                      │ (FFmpeg, Edge-TTS,    │ │ MongoDB Atlas │
                      │  Cloudinary Uploads)  │ │               │
                      └───────────────────────┘ └───────────────┘
```

### Core Components
* **Backend API (`backend/app/`)**: FastAPI modular monolith structured into domain modules:
  * `identity/`: Authentication, refresh token rotation & reuse detection, OTP password recovery, CAPTCHA validation.
  * `reels/`: Reel creation jobs, idempotent submissions, draft management, streaming uploads.
  * `social/`: Feed curation, follow graph, comments, likes, and engagement tracking.
  * `rooms/`: Real-time watch-together rooms with LiveKit RTC and hardened WebSocket protocols.
  * `gamification/`: User streaks, badges, token balance, and daily challenges.
  * `creators/` & `business/`: Creator marketplace, campaign briefs, and verified applications.
  * `observability/`: Prometheus `/metrics` protected by bearer tokens, health probes (`/health/live`, `/health/ready`).
  * `core/`: Central settings (`config.py`), security middleware, database connections, and storage adapters.
* **ARQ Media Worker (`backend/workers/`)**: Asynchronous worker pipeline that executes text-to-speech synthesis via `edge-tts`, stitches video tracks with `ffmpeg`, generates video thumbnails, performs Cloudinary multi-CDN uploads, and ensures atomic token refunds on failure.
* **Frontend (`frontend/`)**: Modern Next.js 16 application with React 19, Tailwind CSS, authenticated API client with in-memory access tokens, and responsive mobile-first UI.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | Python 3.11+, FastAPI, Pydantic v2, Motor (Async MongoDB), Redis (Asyncio), Uvicorn |
| **Media Worker** | ARQ, Redis 7, FFmpeg 6+, Edge-TTS, Cloudinary Python SDK |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Databases** | MongoDB Atlas 7.0+ (M0 free tier compatible), Redis 7+ |
| **Realtime RTC** | LiveKit Cloud RTC + WebSockets |
| **Email Gateway** | Resend API / Brevo API / Console fallback |

---

## ⚙️ Quickstart & Local Setup

### Prerequisites
* **Python 3.11+**
* **Node.js 20+** and **npm**
* **FFmpeg** installed and added to your system `PATH`
* **Docker & Docker Compose** (optional, recommended for local DBs)

---

### Option A: Run via Docker Compose (Fastest)

Boot the entire stack (FastAPI API, ARQ Worker, MongoDB 7, and Redis 7):

```bash
docker compose up --build
```

* API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
* Health Probe: [http://localhost:8000/health/live](http://localhost:8000/health/live)

---

### Option B: Local Native Setup

#### 1. Setup Python Virtual Environment & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/Ladnil03/Vidsnap-AI-reel-generator.git
cd vidsnap-ai

# Create and activate virtualenv
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
```

#### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MongoDB, Redis, and secret keys
```

#### 3. Run Services

**Terminal 1 — API Server:**
```bash
python run.py
# Server runs on http://localhost:8000
```

**Terminal 2 — ARQ Background Worker:**
```bash
python -m arq backend.workers.media_worker.WorkerSettings
```

**Terminal 3 — Next.js Frontend:**
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

---

## 🧪 Testing & Quality Assurance

The codebase enforces strict test-driven development and code quality standards:

```bash
# Run complete test suite with 80%+ coverage enforcement
python -m pytest tests/ -v --cov=backend/app --cov-fail-under=80

# Run security regression tests
python -m pytest tests/security/ -v

# Run linter (Ruff)
python -m ruff check backend tests

# Run static type checker (Mypy)
python -m mypy backend/app/identity backend/app/core/config.py backend/app/core/security.py

# Frontend validation
cd frontend
npx tsc --noEmit
npm run build
```

---

## 🔒 Security Architecture

* **Authentication**: Short-lived JWT access tokens (15m) paired with rotating refresh tokens (7d) stored in HTTP-only, SameSite cookies.
* **Token Family Reuse Detection**: Refresh tokens are grouped into cryptographic token families (`family_id`). Any replay of a revoked or rotated token immediately revokes all tokens in that family.
* **Idempotent Job Creation**: Video creation accepts `Idempotency-Key` headers, preventing duplicate token deductions and double-queuing during network retries.
* **Rate Limiting**: Sliding-window Redis rate limits on login (`10/min`), registration (`3/hour`), and general APIs (`60/min`) with anti-enumeration constant-time responses.
* **Security Headers**: Production-enforced HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`), Content-Security-Policy (CSP), `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
* **Private Watch Rooms**: Zero-trust room authorization on both REST endpoints and real-time WebSocket handshakes.
