# ADR-05: Discovery Architecture, Zero-Cost Embeddings & Two-Stage Recommendation Engine

- **Status**: Accepted
- **Date**: 2026-09-20
- **Authors**: Principal Engineer / Solution Architect
- **Domain**: Discovery, Media Connectors, Semantic Embeddings, Recommendation Engine

---

## 1. Context & Business Drivers

VidSnap.AI is expanding beyond locally uploaded reels into an intelligent discovery platform that indexes high-quality short-form content across multiple platforms (YouTube Shorts, Pexels, Pixabay). 

Key constraints and operational goals:
1. **Target Cost: ₹0/month**: We cannot use paid embedding APIs (OpenAI `text-embedding-3`, Cohere) or paid managed vector databases (Pinecone, Weaviate Cloud).
2. **MongoDB Atlas M0 Free Tier (512MB RAM/Disk)**: All catalog collections and vectors must stay well within storage quotas.
3. **Legal Compliance**: Zero scraping and zero re-hosting of third-party video media. All playback must be official embeds or official developer API CDNs with full attribution.
4. **Transparent, Mindful User Experience**: Recommendations must be explainable (e.g. *"Because you like #tech"*), diverse (no author spam), and encourage healthy usage (anti-doomscroll wellbeing chapter breaks).

---

## 2. Architectural Decisions

### 2.1 Pluggable Multi-Source Connectors (Ports & Adapters)
- Defined an abstract `BaseSourceConnector` interface with `search()` and `get_by_id()`.
- Implemented:
  - `YouTubeShortsConnector`: Integrates with YouTube Data API v3 when a key is present, and gracefully falls back to YouTube oEmbed API (`https://www.youtube.com/oembed`) which requires no API key and zero cost.
  - `PexelsConnector`: Integrates with Pexels Video Search API (`orientation=portrait`), with curated portrait inventory fallback.
  - `PixabayConnector`: Integrates with Pixabay Video API with curated fallback.
- **Enforcement**: External video items have `can_rehost = False`. Video bytes are never downloaded or stored on VidSnap's R2 storage.

### 2.2 CPU-Friendly 384-Dimensional Semantic Feature Hashing Projection
- **Problem**: Running heavy deep learning models (e.g., PyTorch sentence-transformers) on 512MB RAM free VMs causes out-of-memory crashes.
- **Solution**: Implemented `DeterministicSemanticEmbeddingService` using signed feature hashing (Murmur/SipHash) over subword character n-grams (3-4 grams) and token n-grams, coupled with IDF weights and L2 unit-norm normalization:
  $$\vec{v} = \frac{\sum_{t \in \text{tokens}} w_t \cdot \text{sign}(h_1(t)) \cdot \vec{e}_{h_2(t)}}{\|\dots\|_2}$$
- **Characteristics**:
  - Exact 384 dimensions.
  - Zero external Python dependencies (pure standard library math).
  - <0.05ms execution time per item.
  - Generates stable, semantically meaningful cosine similarities for topic overlap and keyword affinity.
  - Swappable via `BaseEmbeddingService` port if `fastembed` or ONNX models are enabled later.

### 2.3 MongoDB Atlas M0 Capacity Management
- `discovery_catalog` collection enforces a **20,000 item capacity ceiling**. When new items are ingested beyond this threshold, an LRU (Least Recently Used) and engagement decay policy evicts stale, low-view items.
- `interaction_events` collection enforces an automatic **15-day TTL index** (`expireAfterSeconds=1296000`) on `created_at`.
- Active user taste vectors (`user_vectors`) are stored as single compact 384-dimensional float arrays (~1.5 KB per user).

### 2.4 Two-Stage Recommendation Engine with Online Learning
1. **Stage 1 — Multi-Channel Candidate Generation**:
   - **Vector ANN**: Cosine similarity against the user's online preference vector $\vec{u}$.
   - **Social Graph**: Items engaged by creators followed or mutual friends.
   - **Category Affinity**: Items matching explicit or frequent tags.
   - **Global Trending**: Time-decayed popularity items.
   - Merged and deduplicated candidate set of 60–90 items.
2. **Stage 2 — Multi-Objective Ranking Heuristic**:
   $$Score = 0.40 \cdot S_{\text{cosine}} + 0.25 \cdot S_{\text{social}} + 0.20 \cdot S_{\text{category}} + 0.15 \cdot S_{\text{trending}}$$
3. **Stage 3 — Diversity & Anti-Fatigue Reranking**:
   - Greedy reranking prevents more than 2 consecutive reels from the same source or creator.
4. **Stage 4 — Anti-Doomscroll Digital Wellbeing**:
   - Injects a `WellbeingCard` every 15 continuous reels viewed in a session, offering mindful breathing breaks and session time awareness.
5. **Online User Vector Updates**:
   - As users watch (>= 50%), like, or save reels, their preference vector is updated via Exponential Moving Average (EMA):
     $$\vec{u}_{t} = \text{normalize}\left((1 - \alpha)\vec{u}_{t-1} + \alpha \vec{v}_{\text{item}}\right) \quad (\alpha = 0.20)$$

---

## 3. Consequences & Trade-offs

- **Positive**:
  - Completely ₹0/month operational footprint with zero external API fees.
  - High performance: candidate generation and scoring complete in <15ms on standard CPU.
  - 100% legal compliance with YouTube, Pexels, and Pixabay developer policies.
  - Protection of MongoDB M0 512MB quota through LRU catalog caps and TTL indexes.
  - Transparent UX with explainability pills on each reel.
- **Negative / Mitigations**:
  - Hash-based embeddings lack deep syntactic nuance compared to 1GB transformer models.
  - *Mitigation*: The Ports & Adapters abstraction permits swapping in `FastEmbed` or `SentenceTransformers` via a simple environment flag without altering the domain or recommendation logic.
