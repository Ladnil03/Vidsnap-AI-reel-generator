# VidSnap.AI — Third-Party Media Sources & Legal Compliance Policy

## 1. Executive Summary & Zero-Liability Principles

VidSnap.AI is designed with **Strict Legal-by-Design Compliance**. To guarantee zero copyright infringement, zero bandwidth theft, and total alignment with international intellectual property laws:

1. **Zero Scraping**: VidSnap NEVER scrapes unauthorized websites, parses unauthorized HTML, or bypasses anti-bot mechanisms. All third-party content is acquired strictly through official public developer APIs, oEmbed endpoints, or official partnership feeds.
2. **Zero Re-Hosting / Zero Video Proxying**: VidSnap **NEVER downloads, re-encodes, or re-hosts third-party video media files** on our Cloudinary, cloud storage, or local storage. Third-party content remains hosted exclusively on the original platform's servers.
3. **Official Players & Direct CDNs**:
   - **YouTube Shorts**: Rendered exclusively via the official YouTube responsive `iframe` embed player or oEmbed specification.
   - **Pexels & Pixabay**: Streamed directly from official, authenticated CDN endpoints provided by their public APIs under their respective developer agreements.
4. **Unconditional Attribution & Direct Links**: Every discovered item prominently displays:
   - Platform badge (e.g., "YouTube Shorts", "Pexels Video").
   - Author / creator name with a clickable link to their original profile.
   - A direct, canonical "Watch on Original Source" link.

---

## 2. Platform-Specific Compliance Details

### 2.1 YouTube Shorts (Google / Alphabet)
- **Integration Mechanism**:
  - **Metadata**: Retrieved via the YouTube Data API v3 (`videoDuration=short`) or public YouTube oEmbed endpoint (`https://www.youtube.com/oembed?url=...`).
  - **Playback**: Standard YouTube Embed API (`https://www.youtube.com/embed/{video_id}?autoplay=1&modestbranding=1&rel=0`).
- **Terms of Service Compliance**:
  - In accordance with **YouTube API Services Terms of Service (Section III.E & III.F)**:
    - We do not separate audio from video.
    - We do not allow downloading or offline saving of YouTube videos.
    - We do not obscure YouTube player controls, logos, or attribution overlays.
    - Player metrics (view counts, likes) are refreshed from YouTube APIs and not artificially manipulated.

### 2.2 Pexels Video (Canva)
- **Integration Mechanism**:
  - Queried via official Pexels API (`https://api.pexels.com/videos/search?orientation=portrait`).
- **License Compliance**:
  - All videos are sourced under the **Pexels License**:
    - Free for commercial and non-commercial use.
    - Attribution is not legally required by Pexels, but VidSnap.AI **always attributes** the creator as a best-practice standard: *"Video by {author} on Pexels"*.
    - Videos are not sold or re-distributed as standalone stock assets.
    - Media streams directly from Pexels CDNs (`video_files[].link`).

### 2.3 Pixabay Video
- **Integration Mechanism**:
  - Queried via official Pixabay API (`https://pixabay.com/api/videos/`).
- **License Compliance**:
  - Sourced under the **Pixabay Content License**:
    - Free to use for digital media without copyright infringement.
    - Direct streaming from Pixabay CDNs.
    - Creator attribution provided on all video cards.

---

## 3. Storage & Free-Tier Capacity Safeguards

To prevent external content from overwhelming our free-tier MongoDB Atlas M0 (512MB limit):

| Entity | Storage Strategy | Retention / Capacity Rule |
| :--- | :--- | :--- |
| **Video Streams** | **0 Bytes (External URL only)** | No video bytes stored on VidSnap |
| **Catalog Metadata** | MongoDB `discovery_catalog` | Strictly capped at **20,000 items** with LRU eviction |
| **User Interactions** | MongoDB `interaction_events` | Auto-deleted via **15-Day TTL Index** (`expireAfterSeconds=1296000`) |
| **User Embeddings** | MongoDB `user_vectors` | 1 compact 384-dimensional vector per active user (~1.5 KB) |

---

## 4. DMCA & Takedown Policy

Any copyright owner or authorized representative can request immediate de-indexing of content by contacting `copyright@vidsnap.ai` or flagging a video through our in-app reporting mechanism. Upon verification, the catalog item is immediately removed from the discovery collection and filtered from recommendation candidate generation.
