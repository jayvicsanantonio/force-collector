# Force Collector — React Native (Expo) App Requirements

**Stitch Project:** Force Collector  
**Project ID:** `7049111668529286378`  
**Design reference:** `DESIGN.md`  
**Last updated:** 2026-02-05

This document defines the product and technical requirements for building the **Force Collector** mobile app using **React Native (Expo)**. It is intentionally implementation-oriented so engineering can estimate, design APIs, and ship iteratively.

---

## Table of Contents

- [1. Product Summary](#1-product-summary)
- [2. Goals, Non‑Goals, and Success Metrics](#2-goals-nongoals-and-success-metrics)
- [3. Target Users & Personas](#3-target-users--personas)
- [4. Supported Platforms](#4-supported-platforms)
- [5. Information Architecture & Navigation](#5-information-architecture--navigation)
- [6. App‑Wide Functional Requirements](#6-app-wide-functional-requirements)
- [7. Non‑Functional Requirements](#7-non-functional-requirements)
- [8. Data Model (Canonical)](#8-data-model-canonical)
- [9. Backend APIs (Recommended Contracts)](#9-backend-apis-recommended-contracts)
- [10. Technologies & Services (Needed to Implement)](#10-technologies--services-needed-to-implement)
- [11. Screen‑by‑Screen Requirements (Force Collector - \*)](#11-screen-by-screen-requirements-force-collector---)
- [12. Out‑of‑Scope / Future Screens](#12-out-of-scope--future-screens)

---

## 1. Product Summary

Force Collector is a mobile app for collectors to:

- **Track** their Star Wars Black Series collection (owned, pre‑order, wishlist).
- **Scan** barcodes to identify figures quickly.
- **Monitor** wishlist prices and inventory, and receive alerts.
- **Visualize** collection progress and value via analytics dashboards.
- **Personalize** the experience (profile, achievements, theme allegiance).

The design language is a dark, sci‑fi HUD with neon cyan/blue highlights (see `DESIGN.md`).

---

## 2. Goals, Non‑Goals, and Success Metrics

### 2.1 Goals

**G1 — Fast capture:** Users can add a figure to their collection in under **10 seconds** (scan → confirm → add).

**G2 — Trustworthy tracking:** Collection and wishlist data is consistent across devices and resilient to offline usage.

**G3 — Useful alerts:** Users receive timely, relevant push notifications for price drops, restocks, and releases.

**G4 — At‑a‑glance mastery:** Dashboards and analytics answer “How complete am I?”, “What’s my collection worth?”, and “What should I hunt next?”.

### 2.2 Non‑Goals (MVP)

- Building a full marketplace inside the app (checkout, payments).
- Continuous camera background scanning (battery-heavy) outside explicit scan sessions.
- Storing or sharing copyrighted official product images without rights (use user-uploaded images or permitted sources).

### 2.3 Success Metrics

**Activation**

- ≥ 60% of new users add ≥ 1 figure during first session.

**Retention**

- ≥ 25% weekly retention after 4 weeks (W4).

**Utility**

- ≥ 30% of wishlist items have price alerts configured.

**Performance**

- Median time to open app to “Dashboard usable” < 1.5s on mid-tier devices.

---

## 3. Target Users & Personas

### 3.1 Primary Persona: “The Tracker”

- Collects actively, wants accurate ownership status.
- Uses scanning frequently.
- Needs fast search/filter and bulk management.

### 3.2 Secondary Persona: “The Hunter”

- Focused on deals and availability.
- Wants price history, retailer links, alerts, and drop announcements.

### 3.3 Tertiary Persona: “The Completionist”

- Has set goals (wave/phase completion).
- Wants analytics, progress bars, and achievements.

---

## 4. Supported Platforms

### 4.1 Platforms

- iOS and Android via **Expo**.
- Tablets: supported (responsive layout), not required for MVP.

### 4.2 Device Capabilities

- Camera required for scanner flow.
- Network connectivity required for price checks and catalog lookup, with offline fallback for already-cached data.

### 4.3 Permissions

- Camera (required for scanning).
- Notifications (optional but strongly recommended; needed for price alerts/restock/drop notifications).
- Photos/media library (optional; for user-provided figure photos).

---

## 5. Information Architecture & Navigation

### 5.1 Primary Navigation (Bottom Tabs)

Bottom navigation contains 5 destinations:

1. **Home** (Dashboard)
2. **Collection** (Grid + Details)
3. **Wishlist** (Wishlist + Price Tracker)
4. **Search** (Scanner + Results + Manual lookup)
5. **Profile** (Profile + Settings)

### 5.2 Stacks & Modal Flows

**Recommended navigation model**

- Tabs + nested stacks (e.g., `CollectionStack`, `SearchStack`).
- Modal stack for “Add Figure” actions (FAB, scan actions) and quick edit panels.

**Key flows**

- Splash → Auth/Onboarding → Dashboard
- Collection Grid → Figure Details
- Scanner → Scan Results → (Add to Collection | Add to Wishlist) → Figure Details
- Dashboard “View Wishlist” → Wishlist

### 5.3 Screen Inventory (Designed Screens)

Only screens whose name starts with `Force Collector -` are treated as designed and must be implemented to match the designs:

- Force Collector - Splash Screen
- Force Collector - Dashboard Screen
- Force Collector - Collection Grid Screen
- Force Collector - Figure Details & Lore Screen
- Force Collector - Wishlist & Price Tracker Screen
- Force Collector - Collection Analytics & Stats Screen
- Force Collector - Barcode Scanner Interface Screen
- Force Collector - Scan Results Screen
- Force Collector - User Profile & Settings Screen

---

## 6. App‑Wide Functional Requirements

### 6.1 Authentication & Accounts

**FR‑AUTH‑001** The app must support account creation and sign‑in.

- Options (pick at least one for MVP):
  - Email + password
  - Magic link
  - Sign in with Apple / Google

**FR‑AUTH‑002** The user can use the app offline after first sign-in (read-only for uncached data; queued writes supported).

**FR‑AUTH‑003** “Access Existing Data” from the Splash screen must route to sign‑in (or account selection if already signed in).

**FR‑AUTH‑004** The app must support sign out, including secure token removal and cache re-keying per user.

### 6.2 Catalog & Collection

**FR‑COLL‑001** Users can add a figure to their collection by:

- Scanning a barcode (preferred)
- Searching by name (manual)
- Entering a barcode manually
- (Optional) Creating a custom figure entry when no catalog match exists

**FR‑COLL‑002** Users can view their collection in a grid with:

- Search field
- Filter chips (e.g., era, wave, faction, status)
- Sort controls (e.g., A–Z, year, value)

**FR‑COLL‑003** Each figure in the collection must support a **status** (at minimum):

- `OWNED`
- `WISHLIST`
- (Recommended) `PREORDER`, `SOLD`, `DUPLICATE`

**FR‑COLL‑004** Users can edit figure-specific details:

- Acquisition price, currency
- Acquisition date
- Condition (Mint/Opened/Loose)
- Notes
- Photos (optional)

**FR‑COLL‑005** The app must support “Related Figures / Other Versions” discovery from scan results and details pages.

### 6.3 Wishlist & Price Tracking

**FR‑WISH‑001** Users can add/remove items to wishlist from:

- Collection Grid
- Figure Details
- Scan Results

**FR‑WISH‑002** Wishlist items must display:

- Current best price (if known)
- Price trend indicator (e.g., stable/up/down)
- Stock status (in stock / restocking / unknown)
- Retailer link(s)

**FR‑WISH‑003** Users can configure a **price alert** per wishlist item:

- Target price threshold
- Retailer(s) to monitor
- Notification preferences

**FR‑WISH‑004** The system must run periodic price checks server-side and send push notifications for:

- Price drops crossing threshold
- Restocks
- Major trend changes (optional)

### 6.4 Scanning & Search

**FR‑SCAN‑001** The scanner must support barcode detection and return a primary match plus ranked related matches.

**FR‑SCAN‑002** The scanner must provide:

- Flash toggle (where supported)
- Close/cancel
- Manual barcode entry fallback
- Clear feedback states (scanning, detected, processing, no match)

**FR‑SCAN‑003** Scan Results must allow a one-tap action to:

- Add to Collection
- Add to Wishlist

### 6.5 Analytics & Progress

**FR‑AN‑001** The analytics screen must display:

- Distribution (e.g., era/series) donut chart
- Collection value estimate over time
- Total figures, completion percentage
- Rarest item highlight

**FR‑AN‑002** The dashboard must show “Hunt Progress” toward an active goal (e.g., Phase 4 wave completion).

**FR‑AN‑003** The system must support configurable “goals”:

- Goal name (e.g., “Phase 4 Collection”)
- Target set (list of figures or wave definition)
- Progress computation rules

### 6.6 Profile, Achievements, and Settings

**FR‑PRO‑001** The profile screen must show:

- Display name, avatar
- Level / XP progress
- Achievements list (scrollable)

**FR‑PRO‑002** The user can select an “Allegiance Theme” (Light Side / Dark Side) that modifies accent styling.

**FR‑PRO‑003** Settings must include:

- Notifications preferences
- Account details
- Privacy policy
- App version display
- Sign out

### 6.7 Notifications

**FR‑NOTIF‑001** The app must register the device push token to the backend under the authenticated user.

**FR‑NOTIF‑002** Notifications must deep-link to the relevant screen and item:

- Price drop → Wishlist item details (or details page)
- Restock → Wishlist
- New drop / pre-order → Dashboard card or relevant item

### 6.8 Data Import/Export (Recommended)

**FR‑DATA‑001** Users can export their collection data (CSV/JSON) for backup.

**FR‑DATA‑002** Users can import a CSV/JSON to bootstrap collection (with matching).

---

## 7. Non‑Functional Requirements

### 7.1 Performance

**NFR‑PERF‑001** App cold start must render the first usable screen quickly:

- Splash screen < 500ms render
- Dashboard skeleton < 1s

**NFR‑PERF‑002** Collection grid must support 1,000+ items with virtualization.

**NFR‑PERF‑003** Images must be cached and optimized (thumbnails vs full).

### 7.2 Reliability & Offline

**NFR‑OFF‑001** The app must provide offline viewing for:

- Cached collection list and details
- Cached wishlist list
- Most recent analytics summary (optional)

**NFR‑OFF‑002** Offline edits must queue and sync when online with conflict resolution rules.

### 7.3 Security & Privacy

**NFR‑SEC‑001** Auth tokens and secrets must be stored via secure storage.

**NFR‑SEC‑002** Backend must enforce user-level access control (no cross-user data leakage).

**NFR‑SEC‑003** PII and user content (photos/notes) must be protected at rest and in transit.

**NFR‑SEC‑004** If integrating retailer APIs, comply with each provider’s ToS and avoid prohibited scraping from the mobile client.

### 7.4 Accessibility

**NFR‑A11Y‑001** All interactive elements must be reachable with screen readers and include accessible labels.

**NFR‑A11Y‑002** Color is not the only signal for status (e.g., include icons/text for Owned/Wishlist).

### 7.5 Observability

**NFR‑OBS‑001** The app must capture crash reports and non-fatal errors (with user opt-in as required).

**NFR‑OBS‑002** Key business events (scan success, add to collection, alerts configured) must be tracked.

---

## 8. Data Model (Canonical)

This is a recommended normalized model. Implementations can vary (Supabase tables, Firebase collections, custom DB), but the semantics must be preserved.

### 8.1 Core Entities

#### `User`

- `id` (uuid)
- `email` (string, optional depending on auth method)
- `created_at` (timestamp)

#### `UserProfile`

- `user_id` (uuid, PK/FK)
- `display_name` (string)
- `avatar_url` (string, optional)
- `level` (int)
- `xp` (int)
- `allegiance_theme` (`LIGHT` | `DARK`)
- `preferences` (json: currency, units, notification flags)

#### `Figure` (catalog entry)

- `id` (uuid)
- `name` (string)
- `subtitle` / `edition` (string, optional)
- `series` (string, e.g. “Galaxy”)
- `wave` (string/int)
- `release_year` (int)
- `era` (enum/string: Prequel/Original/Sequel/TV/Gaming/Other)
- `faction` (string: Empire/Republic/Rebels/etc)
- `exclusivity` (string: General/Target/Walmart/SDCC/etc)
- `upc` (string, optional)
- `primary_image_url` (string, optional)
- `lore` (text, optional)
- `specs` (json: accessories, height, packaging, sku, etc)
- `created_at` / `updated_at` (timestamps)

#### `UserFigure` (user’s relationship to a figure)

- `id` (uuid)
- `user_id` (uuid)
- `figure_id` (uuid, nullable if custom figure)
- `custom_figure_payload` (json, optional)
- `status` (`OWNED` | `WISHLIST` | `PREORDER` | `SOLD`)
- `condition` (`MINT` | `OPENED` | `LOOSE` | `UNKNOWN`)
- `purchase_price` (decimal, optional)
- `purchase_currency` (string, e.g. USD)
- `purchase_date` (date, optional)
- `notes` (text, optional)
- `created_at` / `updated_at`

#### `RetailerListing`

- `id` (uuid)
- `figure_id` (uuid)
- `retailer` (enum/string: EBAY, AMAZON, TARGET, WALMART, OTHER)
- `product_url` (string)
- `external_id` (string, optional: ASIN, itemId, etc)
- `last_checked_at` (timestamp)
- `in_stock` (bool, nullable)
- `current_price` (decimal, nullable)
- `currency` (string)

#### `PriceHistoryPoint`

- `id` (uuid)
- `retailer_listing_id` (uuid)
- `price` (decimal)
- `currency` (string)
- `in_stock` (bool, nullable)
- `captured_at` (timestamp)

#### `PriceAlert`

- `id` (uuid)
- `user_id` (uuid)
- `user_figure_id` (uuid)
- `target_price` (decimal)
- `currency` (string)
- `enabled` (bool)
- `retailers` (array of retailer enums)
- `notify_on_restock` (bool)
- `cooldown_hours` (int, default 24)

#### `Achievement`

- `id` (uuid)
- `key` (string unique)
- `title` (string)
- `description` (string)
- `icon` (string)

#### `UserAchievement`

- `user_id` (uuid)
- `achievement_id` (uuid)
- `unlocked_at` (timestamp)

### 8.2 Derived Data (Computed)

#### `CollectionSummary`

- `total_figures_owned` (int)
- `completion_percent` (decimal)
- `estimated_value` (decimal)
- `value_change_percent` (decimal)
- `rarest_item_user_figure_id` (uuid)

#### `DistributionBreakdown`

- Keyed counts by `era`, `series`, or `faction`.

---

## 9. Backend APIs (Recommended Contracts)

### 9.1 Architecture Recommendation

Use a backend that can:

- Provide a **catalog** lookup by barcode and by text search.
- Maintain secure per-user data (collection, wishlist, alerts).
- Perform **server-side scheduled jobs** for price monitoring.
- Send push notifications via Expo Push API.

**Recommended approach (primary):** Supabase (Postgres + Auth + Storage + Edge Functions)  
**Alternative:** Firebase (Auth + Firestore + Cloud Functions + Cloud Scheduler)

### 9.2 API Surface (Example)

The mobile app should treat these as the minimum set of “capability endpoints”. They can be implemented as REST, GraphQL, or direct SDK calls (e.g., Supabase client), but contracts must remain stable.

#### Auth/Profile

- `GET /v1/me` → profile + preferences
- `PATCH /v1/me` → update profile/preferences
- `POST /v1/push/register` → store Expo push token for user/device

#### Catalog/Search

- `GET /v1/figures?query=...&filters=...`
- `GET /v1/figures/{id}`
- `POST /v1/scan/lookup` body: `{ barcode, symbology?, locale? }`
  - response: `{ match, confidence, related: [], listings: [] }`

#### Collection/Wishlist

- `GET /v1/user-figures?status=OWNED|WISHLIST|PREORDER&query=...`
- `POST /v1/user-figures` → add to collection/wishlist
- `PATCH /v1/user-figures/{id}` → update status, purchase data, condition, notes
- `DELETE /v1/user-figures/{id}`

#### Price Tracking

- `GET /v1/user-figures/{id}/price` → current listings + history summary
- `POST /v1/price-alerts`
- `PATCH /v1/price-alerts/{id}`
- `DELETE /v1/price-alerts/{id}`

#### Analytics

- `GET /v1/analytics/summary?range=all_time|year|30d`
- `GET /v1/analytics/value-series?range=...`
- `GET /v1/analytics/distribution?by=era|series|faction&range=...`

### 9.3 Scheduled Jobs (Server-side)

Minimum jobs required:

- **JOB‑PRICE‑CHECK:** runs every N hours; updates `RetailerListing` and `PriceHistoryPoint`.
- **JOB‑ALERT‑DISPATCH:** evaluates `PriceAlert` rules; sends push notifications; enforces cooldown.
- **JOB‑DROP‑ANNOUNCE (optional):** tracks new releases/pre-orders and pushes “Recent Drops”.

---

## 10. Technologies & Services (Needed to Implement)

### 10.1 Mobile App (Expo)

**Core**

- Expo SDK (managed workflow)
- React Native + React 18+
- TypeScript

**Navigation**

- Expo Router (recommended) _or_ React Navigation

**UI & Styling**

- NativeWind (Tailwind-style utilities for RN) to match Stitch/Tailwind outputs
- `expo-linear-gradient` for neon gradients
- `expo-blur` for glass/backdrop blur
- `react-native-reanimated` + `react-native-gesture-handler` for fluid interactions
- `react-native-svg` for charts and HUD graphics
- A chart lib built on SVG (e.g., `victory-native` or `react-native-svg-charts`)
- `expo-image` for performant image rendering + caching
- Material Symbols support:
  - Use a compatible icon pack (`@expo/vector-icons`) **or**
  - Bundle the Material Symbols font and map glyphs (recommended if strict fidelity needed)

**State & Data**

- `@tanstack/react-query` for server state, caching, retries
- Lightweight client state (Zustand) for UI state (filters, selection, transient modals)
- Validation: `zod` schemas for API payload validation

**Local Persistence**

- `expo-sqlite` for offline-first structured storage (recommended) _or_ AsyncStorage for minimal caching
- Secure storage: `expo-secure-store`

**Device APIs**

- Camera + barcode scanning: `expo-camera` (barcode scanning enabled)
- Haptics: `expo-haptics` (scan success feedback)
- Notifications: `expo-notifications`
- Deep links: `expo-linking`

**Quality**

- Lint/format: ESLint + Prettier
- Tests: Jest + React Native Testing Library
- E2E (recommended): Detox (or Maestro)
- Error reporting: Sentry for React Native (or equivalent)

**Build/Deploy**

- EAS Build (iOS/Android)
- EAS Update (OTA updates, where appropriate)

### 10.2 Backend & Data

**Recommended**

- Supabase:
  - Auth
  - Postgres database with Row Level Security
  - Storage (user photos)
  - Edge Functions for scan lookup, lore fetch, price checks
  - Scheduled triggers (via Supabase cron or external scheduler)

**Alternative**

- Firebase:
  - Auth
  - Firestore
  - Cloud Functions + Cloud Scheduler
  - Storage

### 10.3 Third‑Party APIs (Integrations)

The following categories are required. Specific vendors are flexible, but the app must integrate with at least one per category for MVP completeness.

**Barcode → Product/Catalog**

- Barcode Lookup API / UPCItemDB / similar
- Requirement: lookup by UPC/EAN; return product title, brand, image, and identifiers

**Retailer Pricing & Stock**

- eBay APIs (Browse/Finding) for market pricing
- (Optional) Amazon PA‑API (requires eligibility)
- (Optional) Target/Walmart affiliate or partner APIs
- Recommended: perform these calls server-side only (keys + ToS compliance)

**Lore / Metadata**

- Wookieepedia (MediaWiki API) or curated lore dataset
- Requirement: fetch and cache short lore snippet per figure

**Analytics/Telemetry**

- PostHog / Amplitude / Firebase Analytics (pick one)

---

## 11. Screen‑by‑Screen Requirements (Force Collector - \*)

> Each screen below includes: screenshot, intended behavior, functional requirements, data needs, and acceptance criteria.

---

### 11.1 Force Collector - Splash Screen

![Force Collector - Splash Screen](https://lh3.googleusercontent.com/aida/AOfcidU6A6QqwpAnX_rzOAuEEg7OuMHs1Lj2tXsoJNMjK8ncDbXEbyTBlHn9LmHA5ymvnaI-rR4G_SrtxICnNVa3OQAzIh6NaN74u2xnFCY96bCROhKsWuaeEASvJXQ1FImzHPghw4y9WbvE-K5lplUQYTqa3m2cEnO7vRfteUHNJXrecshnl8p2Y3wwR1fyUVD7hlqi5b_y7wpTiNv_ygeqH_4kHDHwLbbzJpiguswrzNRZiX5vgEMhpf2FGQ)

#### Purpose

- Establish brand identity and mood.
- Provide the two entry paths:
  - New user onboarding (“Get Started”)
  - Returning user sign‑in (“Access Existing Data”)

#### Primary UI Elements

- Branding: “Force Collector” title with neon accent styling.
- Primary CTA button: **Get Started**
- Secondary action: **Access Existing Data**

#### Functional Requirements

- **SCR‑SPL‑001** Tapping **Get Started** navigates to Onboarding/Auth start.
- **SCR‑SPL‑002** Tapping **Access Existing Data** navigates to Sign‑in.
- **SCR‑SPL‑003** If user already has a valid session, the app may bypass Splash and route to Dashboard (configurable).

#### Data & APIs

- None required to render.
- Optional: feature flag fetch / remote config (cached).

#### States

- Cold start (first launch) vs returning session.
- Offline mode: still usable (shows Splash and can enter limited offline view if prior session exists).

#### Analytics Events

- `splash_viewed`
- `splash_get_started_tapped`
- `splash_access_existing_tapped`

#### Acceptance Criteria

- Splash renders without network access.
- CTA taps always produce a deterministic navigation outcome.

---

### 11.2 Force Collector - Dashboard Screen

![Force Collector - Dashboard Screen](https://lh3.googleusercontent.com/aida/AOfcidXdi3fIVvAZt1_jS1SlgO4-r11L-dWgHJLGo1rezjPw6FbWXZ5lmeN3bQc9xZxeBELyPx0ncIk-mibZudfvRq76U1Wen5Wf58tCdvcJi5uBwUv3ZEdEvHguk8x2SDHNDheor1KrGNY8mEoRirK4LPFWHrQgLTp6sOna-9n7kky5SNFmFSCbMO3lYybIx6OpBfsiMWpkzMtEZCW714_fwwK3Y_awMzSD-zPXzqeHf67ylbUYwWgGo2XSOg)

#### Purpose

- Provide a high-level snapshot of:
  - Collection size and value
  - Completion progress
  - Recent drops / noteworthy items
  - Active “hunt” goal progress
- Provide quick routes to core actions (wishlist, add figure, profile/settings).

#### Primary UI Sections (as designed)

- Header: avatar + “Welcome back” + Settings icon
- Stats cards: Total Figs, Value, Completion
- “Recent Drops” horizontal carousel
- “Hunt Progress” card with progress bar + **View Wishlist** button
- Promotional pre-order tile (e.g., “New Archive Wave”)
- Floating action button (FAB) for add flow
- Bottom nav (Home active)

#### Functional Requirements

- **SCR‑DASH‑001** Dashboard must load a summary from local cache immediately (skeleton while refreshing).
- **SCR‑DASH‑002** Stats cards reflect current user data:
  - Total owned count
  - Estimated value (computed)
  - Completion percent (goal-based)
- **SCR‑DASH‑003** Recent Drops:
  - Shows up to N items (configurable)
  - Items open the Figure Details screen
  - “View All” routes to a more complete list (future screen; see §12)
- **SCR‑DASH‑004** Hunt Progress:
  - Must reflect the user’s active goal
  - “View Wishlist” routes to Wishlist screen
- **SCR‑DASH‑005** Settings icon routes to Profile/Settings screen (or Settings subsection).
- **SCR‑DASH‑006** FAB opens a modal with add options:
  - Scan barcode (routes to Scanner)
  - Manual search
  - Create custom entry (optional)

#### Data & APIs

- `GET /v1/analytics/summary` (or equivalent) for counts/value/completion.
- `GET /v1/user-figures?status=...` for recent items and drop cards.
- Optional: `GET /v1/drops/recent` for curated drops list.

#### States & Edge Cases

- Empty collection → stats show zeros; recent drops section may show “Start scanning” CTA.
- First-time user → hunt progress uses default goal template.
- Offline:
  - Use cached summary
  - Disable refresh interactions; show “Offline” badge/toast

#### Analytics Events

- `dashboard_viewed`
- `dashboard_fab_tapped`
- `dashboard_recent_drop_opened`
- `dashboard_view_wishlist_tapped`

#### Accessibility

- Stat cards must be read as “Total figures: 142” etc.
- FAB must have clear label: “Add figure”.

#### Acceptance Criteria

- Dashboard renders with cached data in < 1s after app launch.
- Tapping any interactive element results in a navigation or action with no dead ends.

---

### 11.3 Force Collector - Collection Grid Screen

![Force Collector - Collection Grid Screen](https://lh3.googleusercontent.com/aida/AOfcidVkHLtOSm82H2A4jI312MGAZWdlE5-tLTGJmkuqW20-BthnUI0xWE8S4j_63gJ-7rlJ_hDNOQsKhJcwjIF2_zQTi1zk_x08JrHPzdjAy_t7DYoq2E8iKOiXWR_QOFM4x9Ij3_sMFD7l2lp1VnFvzgu5JN1F6t9gBDrCZlh8HbyLRUyyLno7x4QhLpvhnMjK9mwOg8Qck4ImkhRDFmr7zW3ZqycLkvMriROrbO3ZCx19kA3SNr9XEEM2Zg)

#### Purpose

- Enable rapid browsing and management of the user’s collection.
- Support quick search, filtering, and status recognition.

#### Primary UI Sections (as designed)

- Sticky header with avatar + title “My Collection” + sort control
- Search input (“Find a trooper…”)
- Horizontal filter chips (All, Mandalorian, Rebels, Gaming Greats, etc.)
- Grid of figure cards (2 columns)
  - Image
  - Status badge (Owned / Pre‑order / Wishlist)
  - Name + wave + faction
- FAB for add flow
- Bottom nav (Collection active)

#### Functional Requirements

- **SCR‑COLL‑GRID‑001** Search must filter the grid by:
  - Figure name
  - Character
  - Series/era
  - (Optional) notes/tags
- **SCR‑COLL‑GRID‑002** Filter chips must filter by at least one category:
  - Era / series / franchise grouping
  - The chip list is configurable and derived from user behavior or global presets.
- **SCR‑COLL‑GRID‑003** Sort control must support at minimum:
  - A–Z
  - Newest added
  - Release year
  - Estimated value (if available)
- **SCR‑COLL‑GRID‑004** Tapping a card opens Figure Details & Lore.
- **SCR‑COLL‑GRID‑005** The UI must render status badges distinctly and consistently.
- **SCR‑COLL‑GRID‑006** FAB opens same add modal as dashboard.

#### Data & APIs

- `GET /v1/user-figures?status=OWNED|PREORDER|...&query=...&filters=...&sort=...`
- Image URLs retrieved from catalog or user storage.

#### States & Edge Cases

- No results (search/filter) → show empty state with “Clear filters” + “Scan to add”.
- Large lists → must virtualize and avoid layout jank.
- Mixed offline/online:
  - Show cached subset
  - Indicate stale values (e.g., market value) when offline

#### Analytics Events

- `collection_grid_viewed`
- `collection_search_used`
- `collection_filter_applied`
- `collection_sort_changed`
- `collection_item_opened`

#### Acceptance Criteria

- Grid remains smooth (≥ 55 FPS) while scrolling 500+ items on mid-tier devices.
- Search latency < 150ms for local filtering (or with debounced server search).

---

### 11.4 Force Collector - Figure Details & Lore Screen

![Force Collector - Figure Details & Lore Screen](https://lh3.googleusercontent.com/aida/AOfcidWBXWz0FMl4nvEe-u63CrkT9KMAuPjAl_aTivWS9JEimjUiHRkOrKs7SrvEnfkMZLb-soFjuE6tkgRI92Yv2nxzIEkgEOPb6dbl_2O4M2C9sdo7dimKdEiweUNH8X6JkPnhUSsTyuck5TTD-v9nH1JktnVM49J-ZphkvPIn18Jfgo39VO1HIHcM-fcasvhlCaPmuByFv-J7OmozUOw8jcaprG_6X3eza4XXVfuiVweVXYcu3rAcIhHj1BQ)

#### Purpose

- Provide a “single source of truth” detail view for a figure.
- Allow fast status switching (Owned/Wishlist/etc).
- Present lore, specs, and accessories in an immersive HUD style.

#### Primary UI Sections (as designed)

- Top bar: Back + Title + Share
- Hero image panel (with gradient scrim)
- Status segmented control (Owned, Wishlist; expandable to other statuses)
- Lore section (“Figure Lore” paragraph)
- Specifications grid (Wave, Release Year, Price, Exclusivity)
- Accessories carousel (e.g., lightsaber, alternate hands)
- Edit action (“Edit Figure Details”)
- Bottom nav

#### Functional Requirements

- **SCR‑FIG‑001** Screen must show canonical catalog data (name, edition, images) and user-specific data (status, purchase price, notes).
- **SCR‑FIG‑002** Status control updates `UserFigure.status` immediately in UI and persists:
  - Optimistic update allowed
  - Must roll back and show error toast on failure
- **SCR‑FIG‑003** Lore must be:
  - Cached locally
  - Fetched/refreshed from backend when stale
- **SCR‑FIG‑004** Specifications must support display of:
  - Wave / series
  - Year
  - MSRP / purchase price / market price (labels must be clear)
  - Exclusivity
- **SCR‑FIG‑005** Share button:
  - Shares a deep link to this figure (if user is allowed) or shareable card image (optional)
  - Must not leak private user notes by default
- **SCR‑FIG‑006** Edit button opens an Edit modal/screen:
  - Purchase details
  - Condition
  - Notes
  - Photos

#### Data & APIs

- `GET /v1/figures/{id}`
- `GET /v1/user-figures/{id}` (or included as expanded relation)
- `PATCH /v1/user-figures/{id}` for status/edits
- (Optional) `GET /v1/figures/{id}/lore`

#### States & Edge Cases

- Missing catalog image → show placeholder with accent border.
- No lore available → show “Lore unavailable” with option to refresh/report.
- Offline edits → queue changes and show “Sync pending” badge.

#### Analytics Events

- `figure_details_viewed`
- `figure_status_changed`
- `figure_edit_opened`
- `figure_shared`

#### Accessibility

- Hero image must have alt text (screen reader label) derived from figure name.
- Segmented control must announce selection state.

#### Acceptance Criteria

- Status change is reflected instantly with clear confirmation feedback.
- Lore and specs remain readable and structured on small screens.

---

### 11.5 Force Collector - Wishlist & Price Tracker Screen

![Force Collector - Wishlist & Price Tracker Screen](https://lh3.googleusercontent.com/aida/AOfcidVh176h2JadsKdWGtSGgmRq-hd_rd_eZ1QQnMgoxuTlQQeevnQvvVoL1NXa1TjsirVEi9PyaRSa9CtXdwhjKPJjxP8kLx4MeomU7YuE-tVszOv0J7FDPeT8Fau_Psz3Ba6g2xFel2G_sgWYYJ1OzEJdXCootlhWIEqqRWb4cAPjg4FRSFZG_KBCKEZUQGWEtBX19C8hzqqbanD7KYn6cHD_rBCxapWeWblwngcalEZPP-fFBtPLwP9suqQ)

#### Purpose

- Present wishlist items with pricing/availability intelligence.
- Provide tools for sorting, filtering, and configuring alerts.

#### Primary UI Sections (as designed)

- Header with back + title + search icon
- Filter chips (Sort, Filter, Status)
- List of wishlist items
  - Thumbnail + title + subtext
  - Price + trend label (e.g., “Stable”)
  - “Find Online” / “Waitlist” CTA depending on stock
  - Bell icon for “Set Price Alert”
- FAB add button
- Bottom nav (Wishlist active)

#### Functional Requirements

- **SCR‑WISH‑001** Wishlist list loads from local cache and refreshes.
- **SCR‑WISH‑002** Sort chip supports (minimum):
  - Price low → high
  - Price high → low
  - Most recently added
  - Biggest drop (requires pricing data)
- **SCR‑WISH‑003** Filter chip supports (minimum):
  - Exclusives
  - Retailer
  - Era/series
- **SCR‑WISH‑004** Status chip supports:
  - In stock
  - Restocking
  - Unknown
- **SCR‑WISH‑005** “Find Online” opens:
  - In-app browser (recommended) or external browser
  - Uses best listing URL available
- **SCR‑WISH‑006** Price alert bell opens alert configuration:
  - Target price
  - Retailers selection
  - Notify on restock toggle
  - Cooldown explanation
- **SCR‑WISH‑007** Items with “Restocking” state must be visually distinct and non-primary CTA should be disabled or replaced (as designed).

#### Data & APIs

- `GET /v1/user-figures?status=WISHLIST&...`
- `GET /v1/user-figures/{id}/price`
- `POST/PATCH /v1/price-alerts`

#### States & Edge Cases

- No price data → show “No pricing yet” and allow manual refresh.
- Multiple retailer listings → show primary best price and allow drill-down (future screen).
- Offline → list still available; retailer links disabled.

#### Analytics Events

- `wishlist_viewed`
- `wishlist_filter_applied`
- `wishlist_sort_changed`
- `wishlist_open_listing`
- `wishlist_price_alert_configured`

#### Acceptance Criteria

- User can configure a price alert in ≤ 3 taps from the list.
- Price/stock displays clearly indicate freshness (e.g., “Checked 3h ago” optional).

---

### 11.6 Force Collector - Collection Analytics & Stats Screen

![Force Collector - Collection Analytics & Stats Screen](https://lh3.googleusercontent.com/aida/AOfcidUNHpeiBbEbaG93ScKKIR1azY2rf_M4P7AFTCPgV5ASA3WjMFWy6T5dfOOzCBtgAuIYu1L5suvkKcjakrrqZsFF1-TkVBsgn31JhnV3Ayq6EpvaiTvWJa904StMJ3kJEz3rxWj3oNQK8qCrDZnwy9xItBv2Bmzg9IFinAkYjLVq_ccRUZTVT0qVgzzYQRSrcFmQdgcAL04CEWqqBjzyEbXgBvtf2XtJscpeJf6C61VomlusbBcb01BY2xE)

#### Purpose

- Give the user deep insight into their collection: composition, value, and progress.

#### Primary UI Sections (as designed)

- Time range pills (All Time, Last Year, Last 30 Days)
- Donut chart: “Era Distribution”
- Value card: estimated value + percent change + line chart
- KPI cards: Total Figures, Completion
- Highlight card: “Rarest Item”
- Bottom nav

#### Functional Requirements

- **SCR‑AN‑001** Time range pill changes refresh the dataset and update charts.
- **SCR‑AN‑002** Era distribution must be computed from the user’s owned figures:
  - Must handle unknown era as “Other/Unknown”.
- **SCR‑AN‑003** Estimated value must be computed from:
  - Best available listing price per owned figure (or a fallback rule)
  - Clear explanation in UI (tooltip/help) (recommended)
- **SCR‑AN‑004** Value percent change is computed relative to prior period in selected range.
- **SCR‑AN‑005** “Rarest item” is derived from a rarity score model (see below).

#### Rarity Score (Recommended Model)

- Input signals:
  - Exclusivity type (convention exclusive, retailer exclusive, general)
  - Release year (older may be rarer, but not always)
  - Market price volatility
  - Inventory scarcity across monitored retailers
- Output: normalized score 0–100

#### Data & APIs

- `GET /v1/analytics/summary?range=...`
- `GET /v1/analytics/distribution?by=era&range=...`
- `GET /v1/analytics/value-series?range=...`

#### States & Edge Cases

- Small collections (< 5 items) → charts still render; labels adapt (“Not enough data” for some metrics).
- No pricing sources configured → value series uses purchase prices or shows “Pricing unavailable”.

#### Analytics Events

- `analytics_viewed`
- `analytics_range_changed`

#### Acceptance Criteria

- Charts render without jank and support accessibility labels for key values.
- Range switching completes in < 800ms with cached data and < 2s on fresh fetch.

---

### 11.7 Force Collector - Barcode Scanner Interface Screen

![Force Collector - Barcode Scanner Interface Screen](https://lh3.googleusercontent.com/aida/AOfcidUNd_xk8UDKYL6nF4qJIiNH_BL6fgtADd6muAvE3MEDHqGP4urcTQjsWovcb6AyY9DnXjH_qVeu1MGvHaT9sXHefzdAD3WnxkTHXCXS0_BfPbjau-HP2wbnrk8rRkDajqZVIi2v_U3ZSLfkloPuYyDI8svDfPThFNXdUe_r5mZxU657VB7Ipy8cFZWRkJR3V-GAnAoWe8uuggc_Mensh4HSQoFn2e0KeWOg2vwMCRdH8mQwIBOzYD7kmAM)

#### Purpose

- Provide a focused scanning experience with strong “system active” feedback.
- Support both camera scan and manual code entry.

#### Primary UI Sections (as designed)

- Close button
- Optional “SYSTEM ACTIVE” badge
- Flash toggle
- Scan frame with animated scan line
- Instruction text
- “Enter Code Manually” CTA
- Session scan count
- Bottom nav (Search active)

#### Functional Requirements

- **SCR‑SCAN‑UI‑001** Camera permission must be requested on first entry. If denied:
  - Provide an explanation and a button to open system settings.
  - Keep manual entry available.
- **SCR‑SCAN‑UI‑002** When barcode detected:
  - Provide haptic feedback
  - Pause scanning briefly to avoid repeated detections
  - Transition to a “Processing…” state and call scan lookup API
- **SCR‑SCAN‑UI‑003** Flash toggle must be shown only when torch is supported.
- **SCR‑SCAN‑UI‑004** “Enter Code Manually” opens a modal input:
  - Validates format (UPC/EAN length)
  - Submits to same scan lookup endpoint

#### Data & APIs

- Device: camera stream + barcode detection
- `POST /v1/scan/lookup`

#### States & Edge Cases

- No match found:
  - Offer options: retry scan, manual search, create custom entry
- Multiple matches (shared UPC, bundle):
  - Route to Scan Results with ranked list and disambiguation
- Poor lighting:
  - Encourage flash; show “Move closer / steady” hint (optional)

#### Analytics Events

- `scanner_viewed`
- `scanner_permission_granted|denied`
- `scanner_flash_toggled`
- `scan_detected`
- `scan_lookup_success|failure|no_match`

#### Acceptance Criteria

- Successful scan-to-results transition in < 2 seconds on average network.
- Manual entry works even without camera permission.

---

### 11.8 Force Collector - Scan Results Screen

![Force Collector - Scan Results Screen](https://lh3.googleusercontent.com/aida/AOfcidWe5TlYdiTcD2D43W_Hsmwl3v0PHzGUUaN1Yejj2mJ5PjryUTj6cCMYJ664Gu3PveQuzjx_cBn1rRrehWLvIz-TNeHDseeRlny8yYqCVBGVPhcerFBaKU2bqf1iRE363-IyBslQVz6yoF94xcdnOxpYqz8r4Mbkaw6jxnSmJeINL3hOdcvIwaeZTf9WDeV2xfrsbti0txUS-XKwhviVIO5DKmv_CXwm-g0lxgKGHAglnNbBEJouDsmI2co)

#### Purpose

- Confirm the scanned figure (target identified) and provide immediate actions.
- Offer related/alternate versions to resolve ambiguous matches.

#### Primary UI Sections (as designed)

- Header: back + “Scan Results” + scanner shortcut
- Status banner: “Target Identified”
- Result card with badges (In Stock, Exclusive)
- Metadata row (Series, Wave, Year)
- Primary actions:
  - **COLLECTION**
  - **WISHLIST**
- Related figures:
  - “Other Versions” carousel
  - Add (+) quick action on each related card
- Bottom nav (Search active)

#### Functional Requirements

- **SCR‑RESULTS‑001** Screen must render scan lookup response:
  - Primary match
  - Confidence score (optional display)
  - Related items list
  - Retailer listing summary (if available)
- **SCR‑RESULTS‑002** “COLLECTION” button creates/updates the user figure record:
  - If already exists, switch status to `OWNED`
  - Otherwise create new `UserFigure` record with status `OWNED`
- **SCR‑RESULTS‑003** “WISHLIST” button similarly creates/updates status to `WISHLIST`.
- **SCR‑RESULTS‑004** Related items “+” action:
  - Adds to collection by default (configurable)
  - Offers long-press for alternate action (wishlist) (optional)
- **SCR‑RESULTS‑005** Scanner shortcut returns to scanner and starts a new session.

#### Data & APIs

- `POST /v1/scan/lookup` provides match + related + listings.
- `POST/PATCH /v1/user-figures` for add actions.

#### States & Edge Cases

- Duplicate detection:
  - If user already owns the item, the action should either increment a “duplicate count” (optional) or show “Already owned” prompt.
- Partial matches:
  - If only a vague match exists, require user confirmation before adding.
- Offline:
  - Allow saving a “pending add” record locally, then resolve to catalog when online.

#### Analytics Events

- `scan_results_viewed`
- `scan_results_add_collection`
- `scan_results_add_wishlist`
- `scan_results_related_add`

#### Acceptance Criteria

- User can add scanned item to collection in a single tap with immediate feedback.
- Related items are visible and actionable without leaving the screen.

---

### 11.9 Force Collector - User Profile & Settings Screen

![Force Collector - User Profile & Settings Screen](https://lh3.googleusercontent.com/aida/AOfcidUabFCQMOEOeKHkcndtjKm6bW7tLvn6Xv1pMWxDf9iV2zPPXkV3f2r5jOHbJi3npBZOFx_HDm027o-Rp_xba5MlR8K8NSX74F4Op6ENOinAe-_uPTfGlt78XI41AQB4rkAmEG2SeHqvsH204qTVGBFLJ7IB-vVaFDZ8Z60EffMiVx08qA98AF59HciKIMazRn-Au5HMWZFevklcxMS_aZzLSQqz5vYNylxkJC79ZA8oUxSA9Wt_m-dRLwA)

#### Purpose

- Provide identity, progression, achievements, and core settings.

#### Primary UI Sections (as designed)

- Header: “Profile & Settings” + settings icon
- Profile card:
  - Avatar + rank badge
  - Display name
  - Level and title
  - XP progress bar
- Achievements horizontal carousel + “View All”
- Allegiance (Theme) toggle: Light Side / Dark Side
- Settings list:
  - Notifications
  - Account Details
  - Privacy Policy
- Sign out CTA
- App version label
- Bottom nav (Profile active)

#### Functional Requirements

- **SCR‑PRO‑001** Profile card must reflect actual user profile fields:
  - name, avatar, level/xp (computed or stored)
- **SCR‑PRO‑002** Achievements:
  - Must load unlocked achievements
  - Supports “View All” navigation (future screen; see §12)
- **SCR‑PRO‑003** Allegiance theme toggle must:
  - Persist to user profile
  - Immediately apply to app theme tokens (accent colors, subtle gradients)
- **SCR‑PRO‑004** Notifications settings must configure:
  - Price drops
  - Restocks
  - New drops (optional)
- **SCR‑PRO‑005** Account details must allow:
  - Email change (if applicable)
  - Connected providers (Apple/Google)
  - Data export request (optional)
- **SCR‑PRO‑006** Privacy policy opens in-app browser.
- **SCR‑PRO‑007** Sign out removes tokens, clears user-scoped caches, and routes to Splash.

#### Data & APIs

- `GET /v1/me`
- `PATCH /v1/me` (theme preference, profile)
- Push token registration endpoint (if not already done)

#### States & Edge Cases

- Offline:
  - Profile and achievements show cached values
  - Theme toggle updates locally and queues sync

#### Analytics Events

- `profile_viewed`
- `profile_theme_changed`
- `profile_sign_out`
- `profile_notifications_opened`

#### Acceptance Criteria

- Theme toggle results in immediate visual update across the app.
- Sign out is reliable and leaves no residual access to previous user data.

---

## 12. Out‑of‑Scope / Future Screens

The designed screens imply additional screens/modals that are not yet represented as Stitch screens. These are required to fully implement the flows above.

### 12.1 Required Future Screens/Modals (Recommended)

- **Auth screens:** Sign in, Create account, Provider sign-in, Forgot password.
- **Add Figure modal:** choose scan/manual/custom, quick add options.
- **Manual Search screen:** text search + filters, then select figure.
- **Edit Figure modal/screen:** purchase details, condition, notes, photos.
- **Wishlist item detail screen:** retailer listings list, price history chart, alert tuning.
- **Achievements list screen:** all achievements + progress.
- **Settings detail screens:** notifications preferences, account details, data export/import.

### 12.2 Nice-to-have

- Collection map/diary: “drops timeline”, scanning streaks.
- Social sharing: share a collection card or rare find.
