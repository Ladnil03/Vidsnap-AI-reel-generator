# ADR-07: Realtime Gateway, Server-Authoritative Watch Together Rooms & AI Room Assistant

- **Status**: Accepted
- **Date**: 2026-09-20
- **Authors**: Principal Engineer / Solution Architect
- **Domain**: Realtime Gateway, WebSockets, WebRTC, Watch Together, AI Assistant

---

## 1. Context & Business Drivers

VidSnap.AI is transforming short-form video consumption from solitary viewing into synchronous social entertainment. Users want to watch reels and curated viral shorts together with friends, react in real time, chat, join audio lounges, and quickly catch up on conversations when joining mid-stream.

Operational constraints and goals:
1. **Zero Cost & Free-Tier Constraint (₹0/month)**:
   - Must not require paid WebSockets-as-a-service (e.g. Pusher, Ably).
   - Must avoid paid LLM consumption: use free-tier multi-provider routing (Groq, Gemini, OpenRouter, Workers AI) with strict caching and an offline heuristic fallback.
   - Must use standard RFC 7519 HMAC-SHA256 JWT tokens for LiveKit WebRTC lounges without paid infrastructure.
2. **Strict Time Synchronization**:
   - Playback must be synchronized across disparate browsers and network connections without noticeable lag or video stuttering.
3. **Capacity Protection for MongoDB Atlas M0 (512MB RAM)**:
   - Ephemeral chat and presence must not leak memory or exhaust MongoDB storage.

---

## 2. Architectural Decisions

### 2.1 WebSocket Gateway with Multi-Instance Fan-Out
- Implemented a dedicated FastAPI WebSocket channel (`/api/v1/rooms/{room_id}/ws`).
- **Connection Handshake**:
  - Authenticates connection via short-lived JWT token query parameter or initial `auth` message.
  - Heartbeat `ping`/`pong` protocol runs every 25 seconds, renewing participant presence in Redis.
- **Multi-Instance Pub/Sub**:
  - Each room automatically subscribes to a Redis channel (`room_channel:{room_id}`).
  - State changes and chat messages published on any worker node are fanned out to all connected participants, with an automatic in-memory fallback for local dev.

### 2.2 Server-Authoritative Watch Together State Machine & Drift Correction
- **Problem**: Peer-to-peer sync or client-authoritative timestamps result in clock drift, race conditions, and desynchronization when clients experience buffering.
- **Solution**: The server holds the canonical playback state:
  $$\text{WatchState} = \langle \text{media\_url}, \text{state}, \text{position\_seconds}, \text{playback\_rate}, \text{last\_updated\_at} \rangle$$
- When a client queries room status or receives a sync broadcast, the authoritative current position is derived:
  $$P_{\text{current}} = P_{\text{last}} + (t_{\text{now}} - t_{\text{last}}) \times \text{rate} \quad (\text{if playing})$$
- **Client Drift Correction Algorithm**:
  - The client media player inspects local video position against incoming or polled server position:
    $$\Delta = |t_{\text{client}} - P_{\text{current}}|$$
  - If $\Delta \le 1.5\text{s}$: No action (prevents micro-stuttering and audio clicks).
  - If $\Delta > 1.5\text{s}$: Smoothly seeks the local video element to $P_{\text{current}}$.

### 2.3 Zero-Dependency LiveKit WebRTC Token Generation
- Audio lounges are powered by LiveKit's open WebRTC architecture.
- Rather than importing heavy multi-megabyte C-extensions, tokens are generated as standard RFC 7519 HS256 JWTs using `python-jose`:
  - Signed with `LIVEKIT_API_SECRET` and `LIVEKIT_API_KEY`.
  - Claims contain standard `video` grants (`room`, `roomJoin`, `canPublish`, `canSubscribe`).
  - Directly consumable by any standard LiveKit Client SDK.

### 2.4 Multi-Provider Free-Tier LLM Router & "Catch Me Up" AI Assistant
- Implemented `LLMRouter` (`backend/app/core/llm_router.py`) with automatic graceful failover:
  1. **Groq Cloud** (`llama-3.1-8b-instant`) — ultra-fast sub-second responses.
  2. **Google Gemini** (`gemini-1.5-flash`) — high-quality context comprehension.
  3. **OpenRouter** — community free models.
  4. **Offline Heuristic NLP** — zero-network fallback that extracts key topics, member actions, and summary bullets.
- Results are cached by SHA-256 hash of `(system_prompt + prompt)` to eliminate redundant token consumption.

### 2.5 Storage & Presence Safety Guardrails
- Room presence is stored strictly in Redis using 60-second TTL keys (`presence:{room_id}:{user_id}`).
- Chat messages are persisted in MongoDB `room_messages` with a maximum 100-message capped history per room.

---

## 3. Consequences & Benefits

- **Scalability**: Can support dozens of concurrent watch parties on a single lightweight free-tier VM or serverless container.
- **User Engagement**: Increases session watch time by turning passive video consumption into shared social experiences.
- **Zero Cost**: Every layer (WebSockets, LiveKit tokens, LLM summaries, Redis pub/sub) operates 100% within free-tier limits.
