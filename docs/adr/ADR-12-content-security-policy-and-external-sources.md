# ADR-12: Content Security Policy (CSP) Directives and External Source Allow-List

## Status
Accepted

## Date
2026-09-23

## Context
VidSnap.AI aggregates vertical short-form video discovery across multiple external content providers (YouTube Shorts, Pexels, Pixabay) while supporting user-uploaded media (Cloudinary) and curated stock assets. To prevent Cross-Site Scripting (XSS), data exfiltration, clickjacking, and unauthorized resource embedding, modern browsers enforce Content Security Policy (CSP).

Misconfigurations in CSP directives cause legitimate assets to be blocked in client browsers:
1. Discovery thumbnails (e.g., Pixabay photos `https://cdn.pixabay.com/photo/...` and Vimeo CDN preview thumbnails `https://i.vimeocdn.com/video/...`) are blocked if missing from `img-src`.
2. YouTube embeds load as `<iframe src="https://www.youtube.com/embed/...">`. Browsers govern `<iframe>` embedding under `frame-src` (falling back to `default-src`), not `media-src`. Adding YouTube to `media-src` does not authorize iframes and triggers CSP console violations if an embed URL is erroneously passed to a `<video>` element.
3. Next.js image optimization (`<Image />`) requires explicit domain registration under `images.remotePatterns` in `next.config.ts`.

## Decision

### 1. Single Source of Truth
- **Frontend Web Application**: Configured exclusively in `frontend/next.config.ts` under `headers()` for path `/:path*`.
- **Backend API**: Configured in `backend/app/main.py` middleware with strict API defaults: `default-src 'self'; frame-ancestors 'none'; object-src 'none';`.

### 2. External Origin Allow-List to Directive Mapping
Every external domain must be mapped strictly to its functional CSP directive without using permissive wildcards:

| Domain / Host | CSP Directive | Next.js `remotePatterns` | Purpose & Originating Module |
|---|---|---|---|
| `https://res.cloudinary.com` | `img-src`, `media-src` | Yes | Cloudinary user media, avatars, rendered reel MP4 playback (`backend/app/media`) |
| `https://images.unsplash.com` | `img-src` | Yes | Creator avatars and seed graphic assets (`backend/app/creator`) |
| `https://i.ytimg.com` | `img-src` | Yes | YouTube video thumbnails (`backend/app/discovery/connectors/youtube.py`) |
| `https://images.pexels.com` | `img-src` | Yes | Pexels video poster/thumbnail images (`backend/app/discovery/connectors/pexels.py`) |
| `https://cdn.pixabay.com` | `img-src`, `media-src` | Yes | Pixabay curated thumbnails, photo assets, and direct MP4 video streams (`backend/app/discovery/connectors/pixabay.py`) |
| `https://i.vimeocdn.com` | `img-src` | Yes | Pixabay API video preview thumbnails (`backend/app/discovery/connectors/pixabay.py`) |
| `https://videos.pexels.com` | `media-src` | No | Pexels direct vertical MP4 video streams (`backend/app/discovery/connectors/pexels.py`) |
| `https://commondatastorage.googleapis.com` | `media-src` | No | Google sample video bucket for curated inventory fallbacks |
| `https://www.youtube.com` | `frame-src` | No | Official responsive YouTube Shorts iframe embeds (`frontend/src/app/feed`, `explore`, `rooms`) |
| `https://www.youtube-nocookie.com` | `frame-src` | No | Privacy-enhanced YouTube iframe embeds |

### 3. Rendering Rule for Discovery Players
- Any discovery item with `player_type === 'iframe'` or YouTube URL (`youtube.com/embed` or `youtube-nocookie.com/embed`) MUST be rendered in an `<iframe />` element with proper sandboxing/allow attributes (`accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture`), NOT a `<video />` element.
- Only direct MP4 streams (`player_type === 'direct_video'`, e.g., Pexels, Pixabay, Cloudinary) are passed to HTML5 `<video src="..." />`.

### 4. Clickjacking Prevention
- `frame-ancestors 'none'` and `X-Frame-Options: DENY` are strictly maintained to ensure VidSnap.AI cannot be framed externally.

## Consequences
- **Positive**:
  - Zero CSP violations on `/feed` and `/explore`.
  - Pixabay and Vimeo CDN thumbnails render properly in grids and video poster attributes.
  - YouTube embeds render and play through compliant `<iframe>` elements without triggering `media-src` blocks.
  - Adding future discovery connectors requires only a one-line addition to `next.config.ts` following this matrix.
- **Negative / Constraints**:
  - Any new third-party image, video, or iframe provider must be explicitly added to `next.config.ts` (both CSP and `remotePatterns` if using `next/image`).
