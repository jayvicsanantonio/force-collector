# Mobile Run + Test Guide

This guide is a detailed, practical runbook for:
1. Running the app locally
2. Running on iOS Simulator and Android Emulator
3. Running on physical iPhone and Android devices
4. Validating functionality with repeatable test checklists

Scope: `apps/mobile` (Expo React Native app) with Supabase backend from this repo.

---

## 1) One-Time Prerequisites

### 1.1 Required software

Install:
1. Node.js (recommended: LTS, Node 20+)
2. npm
3. Supabase CLI
4. Git

Install platform tools:
1. iOS:
   - macOS
   - Xcode (includes iOS Simulator)
2. Android:
   - Android Studio
   - Android SDK
   - At least one Android Virtual Device (AVD)

For physical device testing:
1. Expo Go on iPhone
2. Expo Go on Android

### 1.2 Verify installs

Run:

```bash
node -v
npm -v
supabase --version
```

If iOS tooling is newly installed, run once:

```bash
xcodebuild -runFirstLaunch
```

---

## 2) Project Setup

From repo root:

```bash
cd /Users/jayvicsanantonio/Developer/force-collector
```

Install app deps:

```bash
cd apps/mobile
npm install
cd ../..
```

Create env files:

```bash
cp apps/mobile/.env.example apps/mobile/.env
cp .env.example .env
```

`apps/mobile/.env` minimum:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
API_BASE_URL=
```

Root `.env` is for server-side edge function needs:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BARCODE_LOOKUP_API_KEY=
EBAY_APP_ID=
API_BASE_URL=
```

Notes:
1. Keep secrets out of git.
2. You can leave optional keys empty if the feature under test does not require them.

---

## 3) Choose Correct `API_BASE_URL` for Your Target

Set `apps/mobile/.env` `API_BASE_URL` to one of:

1. iOS Simulator:
   - `http://127.0.0.1:54321/functions/v1/api`
2. Android Emulator:
   - `http://10.0.2.2:54321/functions/v1/api`
3. Physical iPhone/Android on same Wi-Fi:
   - `http://<YOUR_MAC_LAN_IP>:54321/functions/v1/api`
4. Cloud backend:
   - `https://<PROJECT_REF>.supabase.co/functions/v1/api`

Important:
1. `127.0.0.1` works for iOS Simulator but not physical phones.
2. Android Emulator cannot use host `127.0.0.1`; use `10.0.2.2`.
3. Restart Expo after env changes.

---

## 4) Start Backend Locally

Open Terminal A at repo root:

```bash
supabase start
```

Optional full reset + seed (destructive to local DB):

```bash
supabase db reset
```

Open Terminal B at repo root and serve API function:

```bash
supabase functions serve api --env-file .env
```

Optional health function in Terminal C:

```bash
supabase functions serve health --env-file .env
```

Health check:

```bash
curl http://127.0.0.1:54321/functions/v1/health
```

Expected shape:

```json
{"ok":true,"service":"force-collector","time":"..."}
```

---

## 5) Run the App (Expo Dev Server)

Open Terminal D:

```bash
cd apps/mobile
npm run start
```

You now have options:
1. Press `i` for iOS Simulator
2. Press `a` for Android Emulator
3. Press `w` for web
4. Scan QR code from Expo Go for physical devices

Alternative direct commands:

```bash
npm run ios
npm run android
npm run web
```

---

## 6) iOS Simulator Flow (Detailed)

### 6.1 Initial simulator prep

1. Open Xcode once.
2. Ensure a simulator runtime is installed:
   - Xcode > Settings > Platforms
3. Launch simulator:
   - Xcode > Open Developer Tool > Simulator

### 6.2 Run app

From `apps/mobile`:

```bash
npm run ios
```

or run `npm run start` and press `i`.

### 6.3 Verify app connects to backend

1. Sign in/create account from auth screens.
2. Open profile screen.
3. Confirm you do not see `API_BASE_URL not configured`.
4. Perform data action (e.g., add/update figure) and verify no network error toast/message.

---

## 7) Android Emulator Flow (Detailed)

### 7.1 Initial emulator prep

1. Open Android Studio.
2. Go to Device Manager.
3. Create/start an emulator (API 34+ recommended).
4. Wait for Android home screen to fully load.

### 7.2 Run app

From `apps/mobile`:

```bash
npm run android
```

or run `npm run start` and press `a`.

### 7.3 Android-specific networking

Ensure `apps/mobile/.env` includes:

```env
API_BASE_URL=http://10.0.2.2:54321/functions/v1/api
```

Then restart Expo.

---

## 8) Physical iPhone Flow (Detailed)

### 8.1 Setup

1. Install Expo Go from App Store.
2. Connect iPhone and development machine to the same Wi-Fi.
3. Start backend and Expo dev server.

### 8.2 Launch app

1. In Terminal running Expo, leave QR visible.
2. On iPhone, either:
   - Open Camera and scan QR, or
   - Open Expo Go and use its scanner.

### 8.3 Backend URL for physical iPhone

Use `apps/mobile/.env` with:

```env
API_BASE_URL=http://<YOUR_MAC_LAN_IP>:54321/functions/v1/api
```

Example:

```env
API_BASE_URL=http://192.168.1.44:54321/functions/v1/api
```

If local networking is blocked/unreliable, use cloud Supabase API URL instead.

---

## 9) Physical Android Flow (Detailed)

### 9.1 Setup

1. Install Expo Go from Play Store.
2. Connect Android phone and development machine to the same Wi-Fi.
3. Start backend and Expo dev server.

### 9.2 Launch app

1. Open Expo Go.
2. Use Scan QR Code and scan Expo terminal QR.

### 9.3 Backend URL for physical Android

Use LAN IP (same format as iPhone):

```env
API_BASE_URL=http://<YOUR_MAC_LAN_IP>:54321/functions/v1/api
```

Do not use `10.0.2.2` on physical devices; that is emulator-only.

---

## 10) Optional Native Dev Build Path (Advanced)

Use this if you need native-level debugging or behavior not suitable for Expo Go.

From `apps/mobile`:

```bash
npx expo run:ios
npx expo run:android
```

This generates native projects and runs directly via Xcode/Gradle toolchains.

Notes:
1. First run can take longer due CocoaPods/Gradle setup.
2. Re-run with clean builds when native dependency changes.

---

## 11) Testing Strategy for Current Repository

There is no committed `npm test` script or test suite currently. Use this layered workflow.

### 11.1 Static checks

```bash
cd apps/mobile
npx tsc --noEmit
npx expo-doctor
```

### 11.2 Backend smoke checks

From repo root:

```bash
supabase start
supabase functions serve api --env-file .env
supabase functions serve health --env-file .env
curl http://127.0.0.1:54321/functions/v1/health
```

### 11.3 Manual app smoke checklist (minimum)

Run this on:
1. iOS Simulator
2. Android Emulator
3. At least one physical device (iPhone or Android)

Checklist:

1. Authentication
   - Create account
   - Sign in
   - Sign out
   - Password reset screen opens and submits
2. Home/Search/Scan
   - Search opens and returns results
   - Scan flow opens camera permission prompt
   - Add figure flow completes without crash
3. Collection/Wishlist
   - Add to collection or wishlist
   - Edit status/details in edit modal
   - Verify changes persist after app restart
4. Profile
   - Profile loads
   - Theme/allegiance toggle updates UI
   - Privacy policy opens
5. Offline behavior
   - Disable network
   - Make at least one editable change
   - Re-enable network
   - Confirm queued update syncs
6. Notifications (best tested on physical device)
   - Open notifications settings screen
   - Allow notification permission
   - Confirm registration path does not error in UI logs

### 11.4 Expanded regression checklist (recommended before PR/merge)

1. iOS Simulator full pass
2. Android Emulator full pass
3. Physical iPhone or Android pass
4. Validate no `Missing API_BASE_URL` errors
5. Validate no auth 401 regressions in normal signed-in flow
6. Validate import/export path from Profile > Data Export & Import
7. Validate app relaunch preserves auth session

---

## 12) Common Issues and Fixes

### 12.1 `API_BASE_URL not configured`

Fix:
1. Set `apps/mobile/.env` `API_BASE_URL`.
2. Stop and restart Expo.

### 12.2 App reaches bundle but API fails on phone

Likely root cause:
1. Using localhost URL on physical device

Fix:
1. Use Mac LAN IP or cloud URL in `API_BASE_URL`.
2. Ensure `supabase functions serve api` is running.

### 12.3 iOS build toolchain issues

Fix:
1. Open Xcode and install components.
2. Run:
   ```bash
   xcodebuild -runFirstLaunch
   ```
3. Retry `npm run ios`.

### 12.4 Android app does not open on emulator

Fix:
1. Start AVD manually first.
2. Re-run `npm run android`.
3. If Metro cache issues appear:
   ```bash
   npx expo start --clear
   ```

### 12.5 Supabase local stack unhealthy

Fix:
1. Stop stack:
   ```bash
   supabase stop
   ```
2. Restart:
   ```bash
   supabase start
   ```
3. Re-serve function:
   ```bash
   supabase functions serve api --env-file .env
   ```

---

## 13) Suggested Daily Developer Flow

Use this short sequence each day:

1. Terminal A:
   ```bash
   cd /Users/jayvicsanantonio/Developer/force-collector
   supabase start
   ```
2. Terminal B:
   ```bash
   cd /Users/jayvicsanantonio/Developer/force-collector
   supabase functions serve api --env-file .env
   ```
3. Terminal C:
   ```bash
   cd /Users/jayvicsanantonio/Developer/force-collector/apps/mobile
   npm run start
   ```
4. Launch target (`i`, `a`, or QR scan).
5. Before commit, run:
   ```bash
   cd /Users/jayvicsanantonio/Developer/force-collector/apps/mobile
   npx tsc --noEmit
   npx expo-doctor
   ```
