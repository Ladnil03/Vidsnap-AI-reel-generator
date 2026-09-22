# VidSnap.AI Mobile Progress (Flutter)

## Status: M1 Completed -> Awaiting M2 Go

| Slice | Name | Status | Notes |
|---|---|---|---|
| M0 | Setup & Audit | DONE | Cleaned Expo, flutter create, strict analysis_options, feature-first structure, EnvConfig, CI workflow, mobile README. analyze+test green. |
| M1 | Core Infrastructure | DONE | Theme (Paper/Forest), GoRouter with auth guard, Dio + queued refresh on 401, TokenStorage, AppFailure & base UI primitives (Button, Card, TextField, Skeleton, EmptyState, ErrorView), i18n (en/hi/gu). 23 unit/widget tests passing. |
| M2 | Auth | NEXT | Login, register, OTP verification, forgot/reset password, token refresh, server-side logout. |
| M3 | Feed & Discovery | PENDING | Snap-scroll 9:16 vertical video feed, autoplay/preload, watch metrics batching, explore. |
| M4 | Create | PENDING | Camera & gallery picker, trim/caps, upload to backend media endpoints, drafts. |
| M5 | Social & Realtime | PENDING | Rooms lobby, passcode join, LiveKit WebRTC, WebSocket chat & sync. |
| M6 | AI & Engagement | PENDING | AI Companion streaming chat, gamification XP/streak/badges display. |
| M7 | Profile & Dashboards | PENDING | User & creator profile, creator dashboard, business campaigns (RBAC gated). |
| M8 | Polish & Store Readiness | PENDING | Icons/splash, deep links, permissions, Crashlytics, release configs. |

## Slice M1 Handoff
- **Done**: Created `AppColors`, `AppTypography`, `AppTheme` (Paper Light + Forest Dark), `ThemeModeNotifier` with persistence; built `TokenStorage` (FlutterSecureStorage with in-memory caching); created `AppFailure` typed error model; implemented `AuthInterceptor` with single in-flight refresh mutex and subscriber queuing on 401; created `AppButton`, `AppCard`, `AppTextField`, `AppSkeleton`, `AppEmptyState`, `AppErrorView`; configured `GoRouter` with auth redirect guard; added i18n support for English, Hindi, and Gujarati; wired `main.dart` with `ProviderScope`.
- **Quality**: `flutter analyze` clean (0 issues), `flutter test` green (23/23 tests passing).
- **Next**: Slice M2 Auth (Login, Register, Email OTP verification, Forgot/Reset Password, session restore, logout).
- **Blockers / Backend Dependencies**: `POST /api/v1/auth/logout` currently expects a cookie; propose adding `body: TokenRefreshRequest | None = None` in M2 for server-side token revocation.
