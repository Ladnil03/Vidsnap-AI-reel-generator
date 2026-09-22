# VidSnap.AI Mobile (Flutter)

Modern, high-performance Flutter mobile application for **VidSnap.AI** (AI-personalized vertical short video platform).

---

## 1. Prerequisites

- **Flutter SDK**: `>= 3.47.0` (Dart `>= 3.13.0`)
- **Android Studio** / **Xcode** (for physical/simulator targets)
- **FastAPI Backend**: Running at `http://localhost:8000` (or local network IP / staging URL)

---

## 2. Environment Configuration (`--dart-define`)

All API endpoints and environment settings are dynamically injected at compile/run time via `--dart-define`. **Never hardcode secrets or backend URLs.**

| Variable | Default (Local) | Description | Example Values |
|---|---|---|---|
| `API_BASE_URL` | `http://10.0.2.2:8000` | Backend API root (`10.0.2.2` for Android Emulator, `http://localhost:8000` for iOS simulator) | `https://api.staging.vidsnap.ai`, `https://api.vidsnap.ai` |
| `ENVIRONMENT` | `local` | Environment name | `local`, `staging`, `production` |

---

## 3. Running the App

### Android Emulator (Local)
```bash
flutter run -d android --dart-define=API_BASE_URL=http://10.0.2.2:8000 --dart-define=ENVIRONMENT=local
```

### iOS Simulator (Local)
```bash
flutter run -d ios --dart-define=API_BASE_URL=http://localhost:8000 --dart-define=ENVIRONMENT=local
```

### Staging Environment
```bash
flutter run --dart-define=API_BASE_URL=https://api.staging.vidsnap.ai --dart-define=ENVIRONMENT=staging
```

### Production Release Build
```bash
# Android App Bundle (.aab)
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.vidsnap.ai --dart-define=ENVIRONMENT=production

# iOS Archive (.ipa)
flutter build ipa --release --dart-define=API_BASE_URL=https://api.vidsnap.ai --dart-define=ENVIRONMENT=production
```

---

## 4. Code Quality & Testing

All PRs and commits must pass static analysis and unit/widget tests:

```bash
# Format check
dart format --output=none --set-exit-if-changed .

# Strict static analysis
flutter analyze --fatal-infos --fatal-warnings

# Test suite with coverage
flutter test --coverage
```

---

## 5. Architecture & Project Layout

Feature-first structure aligning with backend domain modules:

```text
mobile/
├── .github/workflows/mobile-ci.yml   # CI automation pipeline
├── analysis_options.yaml             # Strict static linting configuration
├── pubspec.yaml                      # Dependencies & asset declarations
├── test/                             # Unit, widget, and integration tests
└── lib/
    ├── main.dart                     # App entrypoint (ProviderScope)
    ├── core/
    │   ├── config/                   # EnvConfig (--dart-define loader)
    │   ├── l10n/                     # Localization & ARB files
    │   ├── network/                  # Dio client, auth interceptor, refresh queue
    │   ├── router/                   # GoRouter with auth redirect guards
    │   ├── storage/                  # FlutterSecureStorage & SharedPreferences
    │   ├── theme/                    # Paper (Light) & Forest (Dark) ThemeData from tokens
    │   ├── utils/                    # Common formatters, validators
    │   └── widgets/                  # Design system primitives (buttons, cards, empty state)
    └── features/
        ├── auth/                     # Login, register, OTP verification, password reset
        ├── feed/                     # Snap vertical PageView, video player, watch metrics
        ├── create/                   # Camera capture, gallery picker, trim, direct upload
        ├── rooms/                    # Watch Together rooms, WebSocket sync, LiveKit WebRTC
        ├── companion/                # AI Companion streaming chat
        ├── gamification/             # XP/streak/badges display & levels
        ├── profile/                  # User/creator profiles & reel grid
        ├── creator/                  # Creator studio & fl_chart analytics
        ├── business/                 # Collab marketplace & brand campaigns (RBAC-gated)
        ├── discovery/                # Explore search, tags, multi-source attribution
        └── notifications/            # In-app notifications & FCM listener
```
