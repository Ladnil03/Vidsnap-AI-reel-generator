# VidSnap.AI Mobile Progress (Flutter)

## Status: M2 Completed -> Awaiting M3 Go

| Slice | Name | Status | Notes |
|---|---|---|---|
| M0 | Setup & Audit | DONE | Cleaned Expo, flutter create, strict analysis_options, feature-first structure, EnvConfig, CI workflow, mobile README. analyze+test green. |
| M1 | Core Infrastructure | DONE | Theme (Paper/Forest), GoRouter with auth guard, Dio + queued refresh on 401, TokenStorage, AppFailure & base UI primitives (Button, Card, TextField, Skeleton, EmptyState, ErrorView), i18n (en/hi/gu). 23 unit/widget tests passing. |
| M2 | Auth | DONE | Login, register with role selection & promo banner, OTP verification, forgot password modal, server-side logout, session restore. 37 tests passing. |
| M3 | Feed & Discovery | NEXT | Snap-scroll 9:16 vertical video feed, autoplay/preload, watch metrics batching, explore. |
| M4 | Create | PENDING | Camera & gallery picker, trim/caps, upload to backend media endpoints, drafts. |
| M5 | Social & Realtime | PENDING | Rooms lobby, passcode join, LiveKit WebRTC, WebSocket chat & sync. |
| M6 | AI & Engagement | PENDING | AI Companion streaming chat, gamification XP/streak/badges display. |
| M7 | Profile & Dashboards | PENDING | User & creator profile, creator dashboard, business campaigns (RBAC gated). |
| M8 | Polish & Store Readiness | PENDING | Icons/splash, deep links, permissions, Crashlytics, release configs. |

## Slice M2 Handoff
- **Done**:
  - Domain models: `UserModel`, `AuthResponseModel`, `LoginRequest`, `RegisterRequest`, `VerifyEmailRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`.
  - Auth repository (`AuthRepository`) supporting login, register, verify email, resend code, forgot/reset password, logout (with server-side token revocation), and current user fetch.
  - Riverpod `AuthStateNotifier` integrating with `GoRouter` redirect guards for seamless unauthenticated vs authenticated navigation and session restore.
  - Presentation screens:
    - `LoginScreen` with email/password validation, password reveal toggle, loading state, error alerts, forgot password sheet modal, and registration navigation.
    - `RegisterScreen` with role selector (Creator vs Viewer), 50 bonus credits promo banner, password length validation, and loading indicators.
    - `VerifyEmailScreen` with 6-digit OTP code entry, countdown timer for resend button, and automatic redirect upon successful verification.
    - `ForgotPasswordSheet` bottom sheet modal with step 1 (request OTP) and step 2 (submit OTP + new password).
  - Backend integration: Updated `POST /api/v1/auth/logout` in `backend/app/identity/routes.py` to optionally accept `body: TokenRefreshRequest | None = None` so mobile sessions can be revoked server-side without cookies.
  - Comprehensive unit and widget tests: 37/37 passing (14 auth unit/widget tests + 23 core tests).
- **Quality**: `flutter analyze` clean (0 issues), `flutter test` green (37/37 tests passing).
- **Next**: Slice M3: Feed & Discovery (9:16 vertical feed, video player controller, preloading, engagement overlays, metrics batching, explore screen).
- **Blockers / Backend Dependencies**: None.

