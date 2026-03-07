# Force Collector

Force Collector is a mobile app for tracking collectible figures, collection status, wishlist items, pricing, and related analytics.

This repository currently contains:
- An Expo + React Native mobile app in `apps/mobile`
- Shared TypeScript schemas/types in `packages/shared`
- Supabase database schema + edge functions in `supabase`

## Table of Contents

1. [Repository Layout](#repository-layout)
2. [Prerequisites](#prerequisites)
3. [Quick Start (Local Development)](#quick-start-local-development)
4. [Environment Variables](#environment-variables)
5. [Run Commands](#run-commands)
6. [Testing](#testing)
7. [Simulator, Emulator, and Physical Device](#simulator-emulator-and-physical-device)
8. [Troubleshooting](#troubleshooting)
9. [Additional Docs](#additional-docs)

## Repository Layout

```text
force-collector/
├─ apps/
│  └─ mobile/                 # Expo React Native app
├─ packages/
│  └─ shared/                 # Shared TS types/schemas
├─ supabase/                  # DB migrations, seeds, edge functions
├─ docs/
│  ├─ backend.md              # Backend setup details
│  └─ mobile-run-test-guide.md
└─ README.md
```

## Prerequisites

Install these before running the app:

1. Node.js (recommended: current LTS, e.g. Node 20+)
2. npm (comes with Node)
3. Expo CLI via `npx` (no global install required)
4. Supabase CLI (for local backend)
5. For iOS Simulator:
   - macOS
   - Xcode + iOS Simulator
6. For Android Emulator:
   - Android Studio
   - Android SDK + an AVD emulator image
7. For physical device testing:
   - Expo Go app on iPhone and/or Android phone

## Quick Start (Local Development)

### 1) Install mobile dependencies

```bash
cd apps/mobile
npm install
```

### 2) Configure mobile environment

Create an app env file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `API_BASE_URL`

Example values are in [Environment Variables](#environment-variables) below.

### 3) (Optional but recommended) Configure root server env for edge functions

```bash
cp .env.example .env
```

Populate secrets only if needed by the features you are testing:
- `SUPABASE_SERVICE_ROLE_KEY`
- `BARCODE_LOOKUP_API_KEY`
- `EBAY_APP_ID`

### 4) Start local Supabase

From repo root:

```bash
supabase start
```

Optional fresh reset + seed:

```bash
supabase db reset
```

### 5) Serve the local API edge function

In another terminal from repo root:

```bash
supabase functions serve api --env-file .env
```

Optional health function:

```bash
supabase functions serve health --env-file .env
```

### 6) Start the mobile app

```bash
cd apps/mobile
npm run start
```

Then launch your target from the Expo terminal:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Press `w` for web
- Or scan the QR code from Expo Go on a phone

## Environment Variables

The app reads environment variables from `apps/mobile/.env` through `app.config.ts`.

### Required mobile keys (`apps/mobile/.env`)

| Key | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL (local or cloud) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key (local or cloud) |
| `API_BASE_URL` | Yes for API features | Base URL for edge API function |

### Optional mobile keys (`apps/mobile/.env`)

| Key | Description |
|---|---|
| `SENTRY_DSN` | Sentry error reporting |
| `POSTHOG_KEY` | Product analytics key |
| `POSTHOG_HOST` | Analytics host |
| `OBSERVABILITY_OPT_IN` | Telemetry opt-in toggle |
| `PRIVACY_POLICY_URL` | Privacy policy link shown in app |

### `API_BASE_URL` by target

Use the value that matches where the app runs:

| Target | `API_BASE_URL` example |
|---|---|
| iOS Simulator | `http://127.0.0.1:54321/functions/v1/api` |
| Android Emulator | `http://10.0.2.2:54321/functions/v1/api` |
| Physical phone (same Wi-Fi as dev machine) | `http://<YOUR_MAC_LAN_IP>:54321/functions/v1/api` |
| Any device using cloud backend | `https://<PROJECT_REF>.supabase.co/functions/v1/api` |

Important notes:
1. `127.0.0.1` points to the device itself, not your laptop, on physical phones.
2. After changing `.env`, fully restart Expo (`npm run start`) so values reload.

## Run Commands

From `apps/mobile`:

```bash
npm run start    # Start Expo dev server
npm run ios      # Start + open iOS Simulator
npm run android  # Start + open Android Emulator
npm run web      # Start in browser
```

## Testing

Current practical testing workflow:

1. Type check:
   ```bash
   cd apps/mobile
   npx tsc --noEmit
   ```
2. Expo project health checks:
   ```bash
   cd apps/mobile
   npx expo-doctor
   ```
3. Contract checks:
   ```bash
   node --experimental-specifier-resolution=node --test tests/contracts/api-contracts.test.mjs
   ```
4. Backend health smoke check:
   ```bash
   supabase functions serve health --env-file .env
   curl http://127.0.0.1:54321/functions/v1/health
   ```
5. Manual feature validation on at least one simulator/emulator and one real phone.

For full, step-by-step QA instructions, use:
- [`docs/mobile-run-test-guide.md`](docs/mobile-run-test-guide.md)
- [`docs/mobile-data-flow.md`](docs/mobile-data-flow.md)

## Simulator, Emulator, and Physical Device

Detailed device-specific instructions are in:
- [`docs/mobile-run-test-guide.md`](docs/mobile-run-test-guide.md)

That guide includes:
1. iOS Simulator setup and launch
2. Android Emulator setup and launch
3. iPhone run flow (Expo Go)
4. Android phone run flow (Expo Go)
5. Target-specific API URL setup
6. Detailed manual QA/regression checklist

## Troubleshooting

### App says `API_BASE_URL not configured`

1. Confirm `apps/mobile/.env` exists.
2. Confirm `API_BASE_URL=` is not blank.
3. Restart Expo dev server after any `.env` change.

### Expo cannot open iOS Simulator

1. Install Xcode from App Store.
2. Open Xcode once and accept license/components.
3. Run:
   ```bash
   xcodebuild -runFirstLaunch
   ```
4. Retry `npm run ios`.

### Android emulator not detected

1. Open Android Studio > Device Manager.
2. Start an emulator manually.
3. Retry `npm run android`.

### Phone can load bundle, but API requests fail

1. Do not use `127.0.0.1` on physical devices.
2. Use Mac LAN IP or a cloud Supabase endpoint.
3. Ensure phone and dev machine are on the same network.
4. Ensure `supabase functions serve api` is running if using local API.

## Additional Docs

- Backend setup and Supabase details:
  - [`docs/backend.md`](docs/backend.md)
- Detailed mobile run + test guide:
  - [`docs/mobile-run-test-guide.md`](docs/mobile-run-test-guide.md)
