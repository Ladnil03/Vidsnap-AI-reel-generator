# ADR-08: AI Personalization, Entertainment Companion, Consent-Gated Mood Detection & Digital Twins

- **Status**: Accepted
- **Date**: 2026-09-20
- **Authors**: Principal Engineer / Solution Architect
- **Domain**: AI Companion, Mood Detection, Dynamic Playlists, Entertainment Journeys, Digital Twins

---

## 1. Context & Business Drivers

Modern short-video platforms often rely on unexplainable, addictive algorithmic loops that lead to passive doomscrolling. VidSnap.AI's core mission is **intentional, personalized, and interactive social entertainment**. 

Per Section 2 (Module 4), Section 4.6 (Security/Privacy), and Section 8 (Extra USPs) of the specification:
1. **AI Entertainment Companion**: A personal media co-pilot capable of conversing, executing search tools, curating playlists, and tailoring video discovery to active user intent.
2. **Privacy-First Mood Detection**: Allows users to dynamically set and tune their active emotional vibe (7 moods: Energized, Chill, Focused, Curious, Melancholic, Inspired, Humorous). In accordance with Section 4.6, **biometric and camera inference is strictly forbidden**; mood tracking is 100% consent-gated via explicit user action with full deletion rights.
3. **Structured Entertainment Journeys & Daily Planner**: Curated multi-step viewing sessions with healthy time boundaries (e.g. 5m, 10m, 15m) to replace endless scrolling with mindful micro-sessions.
4. **Creator Digital Twins with Mandatory Provenance**: Creators can configure interactive AI avatars. In accordance with Section 4.6 and Section 8, all generated messages are permanently affixed with an **AI Digital Twin provenance badge**.
5. **Free-Tier Constraint (₹0/month)**: Must not introduce expensive agentic framework bloat (e.g., LangChain, AutoGen). Must leverage the existing `LLMRouter` with free-tier providers (Groq/Gemini) and an offline deterministic heuristic fallback. Capped MongoDB storage with 30-day TTL indexes.

---

## 2. Architectural Decisions

### 2.1 Bounded Context & Modular Architecture (`backend/app/ai_companion/`)
Created a dedicated bounded context following Domain-Driven Design:
- `models.py`: Pydantic domain models for MoodState, CompanionMessage, AIPlaylist, EntertainmentJourney, DailyPlan, and DigitalTwinProfile.
- `tools.py`: Local deterministic tool-calling engine for reel search, playlist assembly, and journey curation.
- `service.py`: `CompanionService` orchestrating intent classification, tool invocation, LLMRouter synthesis, and GDPR-compliant history purging.
- `routes.py`: Clean REST endpoints mounted under `/api/v1/companion`.

### 2.2 Deterministic Local Tool Calling (Zero-Cost & Dependency-Free)
Instead of pulling heavy agent orchestration libraries:
- User prompt tokens are scanned for search triggers (`find`, `search`, `show`, `watch`, `reel`, `relax`, `funny`).
- Keyword tokens and active mood affinities (`MOOD_TAG_MAP`) query `videos` and `discovery_catalog` via regex word tokenization.
- Results are injected directly into the system prompt context for `LLMRouter.generate_completion()`.
- If remote LLM providers are rate-limited or offline, the deterministic heuristic summarizer extracts key sentences and formats the response with zero degradation.

### 2.3 Consent-Gated Mood Detection & RecSys Biasing
- **Privacy Standard**: Zero facial expression or camera surveillance. Users select their vibe via one-touch glowing mood chips (`MoodSelector.tsx`) or natural conversation.
- **Consent Gating**: If a user withdraws consent (`consent_given=False`), all stored mood records for that user are immediately deleted from MongoDB Atlas M0.
- **RecSys Integration**: `RecSysService.get_recommendations()` accepts an optional `mood` parameter. Candidate scoring applies a +15% mood affinity boost and emits a transparent explainability tag (e.g. `✨ Tuned to your Energized vibe`).

### 2.4 Entertainment Journeys & Daily Watch Planner
- Designed structured journey blueprints (`morning_spark`, `focus_flow`, `laugh_break`, `evening_unwind`) with sequential steps and reel assignments.
- Built a Daily Watch Planner with healthy time slots (Morning, Midday, Evening) that anchor video viewing to intentional micro-breaks.

### 2.5 Creator Digital Twins & Mandatory AI Disclosure
- In strict adherence to OWASP ASVS and Section 4.6 trust standards:
  - Digital twin models enforce `is_ai_labeled=True` at the schema and service layers. Any attempt by a client to submit `is_ai_labeled=False` is automatically overridden.
  - Interactive replies returned to viewers explicitly identify as `[AI Digital Twin]`.

### 2.6 Frontend AI Personalization Studio & Floating Co-Pilot
- Full-page studio at `frontend/src/app/companion/page.tsx` offering dedicated tabs for Companion Chat, Entertainment Journeys, Daily Watch Planner, and Digital Twin Simulation.
- Universal floating `<CompanionWidget />` mounted in `RootLayout`, making the AI companion accessible on any page in the platform.
- Global navigation links added to `Navbar.tsx` (desktop and mobile).

---

## 3. Free-Tier Capacity & Resource Audit

| Component | Free-Tier Allowance | Implementation | Cost |
|---|---|---|---|
| **Companion Chat Storage** | MongoDB Atlas M0 (512MB) | 30-day TTL index (`expireAfterSeconds=2592000`) | ₹0/month |
| **LLM Inference** | Groq (14,400 RPD) / Gemini (15 RPM) | Multi-provider router with SHA-256 prompt cache | ₹0/month |
| **Offline Fallback** | Local CPU | Deterministic NLP regex extractor | ₹0/month |
| **Mood Data Storage** | MongoDB Atlas M0 | Single upserted doc per user, purgable upon consent withdrawal | ₹0/month |
| **Digital Twin Storage** | MongoDB Atlas M0 | Single document per creator | ₹0/month |

---

## 4. Consequences & Benefits

- **Intentional Viewing**: Users transition from passive scrolling to active, mood-aligned sessions.
- **High Performance**: Tool calls execute directly on MongoDB indexes without network latency.
- **Strict Privacy**: Zero invasive tracking or biometric collection guarantees GDPR and child-safety compliance.
- **Robustness**: 100% operational uptime guaranteed by the offline heuristic fallback even during LLM provider outages.
