# VidSnap.AI Mobile Progress (Flutter)

## Status: M4 Completed -> Awaiting M5 Go

| Slice | Name | Status | Notes |
|---|---|---|---|
| M0 | Setup & Audit | DONE | Cleaned Expo, flutter create, strict analysis_options, feature-first structure, EnvConfig, CI workflow, mobile README. analyze+test green. |
| M1 | Core Infrastructure | DONE | Theme (Paper/Forest), GoRouter with auth guard, Dio + queued refresh on 401, TokenStorage, AppFailure & base UI primitives (Button, Card, TextField, Skeleton, EmptyState, ErrorView), i18n (en/hi/gu). 23 unit/widget tests passing. |
| M2 | Auth | DONE | Login, register with role selection & promo banner, OTP verification, forgot password modal, server-side logout, session restore. 37 tests passing. |
| M3 | Feed & Discovery | DONE | Snap-scroll 9:16 vertical video feed, top tabs (Trending, Following, Saved, For You), engagement rail (likes, comments sheet, bookmarks, share), watch progress telemetry buffer, Explore search grid, and MainScaffold navigation. 52 tests passing. |
| M4 | Create | DONE | Camera & gallery video picker, headline & description metadata, AI viral hook & hashtag generator, visibility selector, offline drafts persistence, multipart upload with progress bar. 56 tests passing. |
| M5 | Social & Realtime | NEXT | Rooms lobby, passcode join, LiveKit WebRTC, WebSocket chat & sync. |
| M6 | AI & Engagement | PENDING | AI Companion streaming chat, gamification XP/streak/badges display. |
| M7 | Profile & Dashboards | PENDING | User & creator profile, creator dashboard, business campaigns (RBAC gated). |
| M8 | Polish & Store Readiness | PENDING | Icons/splash, deep links, permissions, Crashlytics, release configs. |

## Slice M4 Handoff
- **Done**:
  - Added `image_picker: ^1.1.2` for native camera recording and gallery video selection.
  - Domain models: `CreateVideoDraft`, `HashtagSuggestionResponseModel`, `UploadProgressModel`.
  - Data repository:
    - `CreateRepository` supporting multipart upload (`POST /api/v1/content/videos/upload`) with live progress callbacks, AI hashtag & hook suggestion (`POST /api/v1/content/ai/suggest-tags`), and offline draft storage/retrieval via `SharedPreferences`.
  - State management:
    - `CreateNotifier` managing picked video file path, title, description, tag chips, AI hook generator, upload progress, and draft loading/deletion.
  - UI Presentation:
    - `CreateScreen`:
      - Camera capture or gallery video selection with 9:16 aspect ratio preview container.
      - Saved drafts card list allowing instant resumption or deletion.
      - Video details form with live preview card, headline title, and description inputs.
      - AI Assistant card with "Generate" action to fetch viral tags and catchy hooks from the backend.
      - Custom hashtag chip inputs with easy delete actions.
      - Visibility dropdown (Public, Followers Only, Unlisted, Private).
      - Live upload progress indicator bar.
      - "Save Draft" and "Publish Reel" action buttons.
    - Updated GoRouter `/create` route to embed `CreateScreen`.
  - Test suite: **56/56 tests passing** (including unit tests for tag suggestions and draft persistence, and widget tests for camera buttons, AI tag generation, and draft saving).
- **Quality**: `flutter analyze` clean (0 issues), `flutter test` green (56/56 tests passing).
- **Next**: Slice M5: Social & Realtime (Watch Together Rooms lobby, passcode joining, LiveKit WebRTC video integration, WebSocket live chat & video synchronization).
- **Blockers / Backend Dependencies**: None.



