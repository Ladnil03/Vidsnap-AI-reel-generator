import type { NextConfig } from "next";

const API_TARGET = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_TARGET}/api/:path*`,
      },
    ];
  },
  async headers() {
    /**
     * VidSnap.AI Content Security Policy (CSP) & External Origin Mapping
     * -----------------------------------------------------------------------------
     * Directive Breakdown & Origin Allow-List:
     * - default-src: Restricts fallback loading to first-party origins ('self').
     * - script-src / style-src: App scripts and inline styling.
     * - img-src:
     *     - 'self', blob:, data: First-party assets, canvas blobs, inline SVGs.
     *     - https://res.cloudinary.com: User uploads, generated reels, posters, avatars.
     *     - https://images.unsplash.com: Curated creator avatars and seed profile media.
     *     - https://i.ytimg.com: YouTube Shorts video thumbnails (YouTubeConnector).
     *     - https://images.pexels.com: Pexels stock video poster/thumbnails (PexelsConnector).
     *     - https://cdn.pixabay.com: Pixabay photo/video thumbnails & curated seeds (PixabayConnector).
     *     - https://i.vimeocdn.com: Pixabay API video preview thumbnails (PixabayConnector).
     * - media-src:
     *     - 'self', blob:, data: First-party audio/video streams and local recording previews.
     *     - https://res.cloudinary.com: Rendered reel MP4 video playback.
     *     - https://videos.pexels.com: Pexels direct vertical MP4 video streams (PexelsConnector).
     *     - https://commondatastorage.googleapis.com: Curated fallback video samples (sample MP4s).
     *     - https://cdn.pixabay.com: Pixabay direct vertical MP4 video streams (PixabayConnector).
     * - frame-src:
     *     - 'self': Internal frame contexts.
     *     - https://www.youtube.com: YouTube Shorts official responsive iframe player (YouTubeConnector).
     *     - https://www.youtube-nocookie.com: Privacy-enhanced YouTube iframe embeds.
     * - connect-src:
     *     - 'self', http://localhost:*, ws://localhost:*, wss://*, https://*, http://127.0.0.1:*:
     *       Next.js API proxying, LiveKit WebRTC signaling, WebSocket notifications, backend endpoints.
     * - font-src: Next.js locally bundled Google Fonts and data URIs.
     * - frame-ancestors 'none': Protects VidSnap.AI from clickjacking by forbidding external framing.
     * - object-src 'none': Prevents Flash and plugin execution vulnerabilities.
     */
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://res.cloudinary.com https://images.unsplash.com https://i.ytimg.com https://images.pexels.com https://cdn.pixabay.com https://i.vimeocdn.com",
      "media-src 'self' blob: data: https://res.cloudinary.com https://videos.pexels.com https://commondatastorage.googleapis.com https://cdn.pixabay.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "connect-src 'self' http://localhost:* ws://localhost:* wss://* https://* http://127.0.0.1:*",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
