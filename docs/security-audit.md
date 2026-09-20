# VidSnap.AI — OWASP ASVS L2 Security Audit & Hardening Report

**Assessment Target**: VidSnap.AI Modular Monolith Backend & Next.js Client  
**Standard**: OWASP Application Security Verification Standard (ASVS) Level 2  
**Evaluation Date**: September 2026  
**Budget Constraint**: Strict ₹0 / month Free-Tier Infrastructure (ZERO Credit Card Required)  

---

## 1. Executive Summary

VidSnap.AI has been engineered from the ground up to satisfy OWASP ASVS Level 2 requirements while operating within a zero-cost infrastructure topology (MongoDB Atlas M0, Cloudinary Media Cloud, Vercel Hobby / Render, and Redis).

Every critical vulnerability identified in the initial code audit (Step Zero) has been completely resolved, and defense-in-depth controls have been verified across authentication, session management, access control, input validation, and cryptography.

---

## 2. Verification Checklist & Compliance Matrix

| ASVS Section | Verification Topic | Status | Implementation Details |
|---|---|---|---|
| **V1: Architecture** | Modular Bounded Contexts | **PASS** | 16 isolated bounded contexts communicating via typed interfaces and domain events; zero cross-context direct DB coupling. |
| **V2: Authentication** | Secure Password Storage & Tokens | **PASS** | Bcrypt hash with salt; short-lived JWT access tokens (15m) + rotating refresh tokens in `httpOnly`, `SameSite=Lax`, `Secure` cookies. |
| **V2.2: OTP Security** | Brute-force & Expiry Protection | **PASS** | Cryptographically secure random tokens (`secrets.SystemRandom`), 10-minute expiry, max 5 attempts lockout, hashed at rest. |
| **V3: Session Management** | Session Revocation & Concurrency | **PASS** | Cryptographically bound refresh tokens stored with user ID, revoked on logout and password reset. |
| **V4: Access Control** | Role-Based Access Control (RBAC) | **PASS** | Fine-grained roles: `user`, `creator`, `business`, `moderator`, `admin`. Admin endpoints guarded by `get_current_admin` FastAPI dependency. |
| **V5: Input Validation** | Strict Schema Validation & Sanitization | **PASS** | Strict Pydantic models for all payloads; Pydantic `EmailStr`, length bounds, enum constraints; PIL image magic byte verification. |
| **V6: Cryptography** | Secret Management & TLS | **PASS** | Zero hard-coded credentials; environment-driven configuration with `.env.example`; sensitive data logger filter (`SensitiveDataFilter`). |
| **V7: Error Handling** | Sensitive Data Leakage Prevention | **PASS** | Masked MongoDB URIs and Bearer tokens in logs; sanitized error messages in API responses (`HTTPException`). |
| **V8: Data Protection** | TTL Retention & Privacy Controls | **PASS** | MongoDB TTL indexes auto-purge OTPs (10m), notifications (30d), interaction logs (15d), and drafts (30d). |
| **V9: Communications** | Edge Security & Transport | **PASS** | Modern TLS termination, HSTS enforcement, strict CORS allowlist matching origin domain. |
| **V13: API & Web Services** | Rate Limiting & Resource Caps | **PASS** | Redis token-bucket rate limiters on auth, studio generation, and API routes; 50MB max upload cap, 60s max video duration. |
| **V14: Configuration** | HTTP Security Headers | **PASS** | `nosniff`, `DENY` framing, `strict-origin-when-cross-origin`, `Permissions-Policy`, and ETag caching headers injected on all HTTP responses. |

---

## 3. Detailed Security Architecture Findings

### 3.1 Authentication & Session Defense
- **Tokens**: Access tokens expire in 15 minutes; rotating refresh tokens allow seamless renewal without persistent credential re-entry.
- **Cookies**: Refresh tokens use `httpOnly=True`, preventing client-side JavaScript theft via XSS.
- **Brute-Force Lockout**: Redis rate limiter caps authentication attempts per IP and per email.

### 3.2 File Upload & Media Pipeline Hardening
- **Signature Sniffing**: The media upload pipeline validates binary magic bytes (`ftypmp42`, `ftypisom`, `webm`, `moov`) before passing files to FFmpeg.
- **Resource Caps**: FFmpeg runs with `-threads 2`, `-preset veryfast`, and memory/time guards preventing zip bombs and decompression exhaustion.
- **Direct-to-Cloudinary**: Uploads use cryptographically signed direct multipart POST requests directly to Cloudinary, preventing the API server from becoming a bandwidth or memory bottleneck.

### 3.3 Content Moderation & Brand Safety Layer
- **Deterministic Offline Classifier**: Scans captions and comments against compiled regex patterns for hate speech, harassment, severe harm, and phishing in <1ms without third-party API dependencies.
- **Admin Review Queue**: Flagged content is queued with high-priority escalation if $\ge 3$ reports are received.
- **Enforcement Auditing**: All moderator decisions are permanently recorded in `moderation_actions` with actor attribution.

---

## 4. Residual Risks & Future Scaling Recommendations
1. **ClamAV Integration**: When scaling infrastructure, add an asynchronous ClamAV virus scanner container in the media worker pipeline.
2. **Bot Defense / Captcha**: For public deployment, enable a card-free captcha (such as hCaptcha free plan) on the signup and OTP request endpoints to prevent automated email exhaustion attacks.
