# VidSnap.AI — Mobile Client Architecture (Expo React Native)

**Target Runtime**: iOS 16+, Android 12+, Tablet (iPadOS & Android Tablets)  
**Framework**: Expo SDK 52 / React Native 0.76+ (TypeScript)  
**Status**: Mobile Blueprint & Scaffolding  

---

## 1. Architecture Overview

The VidSnap.AI mobile client is designed to deliver 100% feature parity with the Next.js web application while leveraging native device capabilities:
- Hardware-accelerated H.264 vertical video rendering with low-latency pre-buffering.
- Native LiveKit WebRTC audio/video watch party integration.
- Offline reel caching for low-bandwidth / intermittent connectivity (India-first data saver).
- Push notifications via Firebase Cloud Messaging (FCM) and Apple Push Notification service (APNs).

```
mobile/
├── app.json                  # Expo project manifest & scheme routing
├── package.json              # Typed mobile dependencies
├── src/
│   ├── components/           # ReelPlayer, WatchPartyRoom, MoodSelector, QuestsWidget
│   ├── navigation/           # Expo Router tab layout matching web navigation
│   ├── screens/
│   │   ├── FeedScreen.tsx    # Snap-scroll 9:16 vertical player with gesture responder
│   │   ├── ExploreScreen.tsx # Multi-source discovery search
│   │   ├── StudioScreen.tsx  # Camera capture, local trim, direct-to-R2 upload
│   │   ├── RoomsScreen.tsx   # LiveKit WebRTC watch together & voice lounge
│   │   ├── CompanionScreen.tsx # Floating AI co-pilot and mood selector
│   │   └── RewardsScreen.tsx # Streak flame tracker, XP level card, quests
│   └── services/             # API client sharing schemas with Next.js web app
```

---

## 2. Core Mobile Subsystems

### 2.1 Snap-Scrolling Reels Engine
- Built using `expo-video` or `react-native-pager-view` with virtualized `FlatList` (`windowSize=3`, `maxToRenderPerBatch=2`).
- **Pre-buffering**: Pre-fetches the next 2 reels in background storage via `expo-file-system` to achieve <500ms video playback transition on 4G connections.
- **Debounced View Tracking**: Automatically emits `POST /api/v1/feed/watch-progress` after a 3-second continuous viewing window.

### 2.2 Watch Together Rooms (LiveKit WebRTC)
- Implements `@livekit/react-native` and `@livekit/react-native-webrtc`.
- Room state synchronization using the existing FastAPI WebSocket gateway (`/api/v1/rooms/ws/{room_id}`).
- Spatial audio and low-latency group chat.

### 2.3 Direct-to-Cloudinary Mobile Video Upload
- Client-side pre-compression via `ffmpeg-kit-react-native` (720x1280 H.264, max 50MB).
- Direct signed upload to Cloudinary; zero server proxy bottleneck.

### 2.4 Deep Linking Schema
Registered URL scheme: `vidsnap://`
- `vidsnap://feed/:id` -> Opens specific reel in modal.
- `vidsnap://room/:id` -> 1-tap join for watch parties.
- `vidsnap://collabs/:id` -> Creator collaboration brief.
