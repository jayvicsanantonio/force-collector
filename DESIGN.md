# Design System: Force Collector

**Project ID:** 7049111668529286378

**Source screens (only `Force Collector - *`):**

- Force Collector - Splash Screen
- Force Collector - Dashboard Screen
- Force Collector - Collection Grid Screen
- Force Collector - Figure Details & Lore Screen
- Force Collector - Wishlist & Price Tracker Screen
- Force Collector - Collection Analytics & Stats Screen
- Force Collector - Barcode Scanner Interface Screen
- Force Collector - Scan Results Screen
- Force Collector - User Profile & Settings Screen

## 1. Visual Theme & Atmosphere

Force Collector is a dark, sci‑fi “collection HUD” experience: deep space‑blues and near‑black surfaces, energized by neon cyan and electric blue highlights. The UI leans into _glow_, _glass_, and _signal_ motifs—backdrop‑blurred headers/nav, soft gradient overlays on imagery, and luminous accents that feel like scanner readouts and cockpit instrumentation.

The overall density is “mobile dashboard”: compact cards, tight typographic hierarchy, and frequent micro‑labels (often uppercase) to keep data scannable without feeling cluttered. Motion is subtle but thematic (pulsing glows, scan‑line sweeps, shimmer/hover scale).

## 2. Color Palette & Roles

### Core accents (energy + focus)

- **Electric Cyan (Primary Highlight)** `#06b6d4` — primary emphasis in charts, focus rings, active states, and glow shadows.
- **Laser Cyan (High‑Intensity Accent)** `#00e5ff` — “scanner/target lock” moments: scan line, confirm banners, high-contrast buttons and icon highlights.
- **Bright Cyan (Secondary Highlight)** `#22d3ee` — secondary highlight for nav emphasis, hover accents, and “alive” UI details.

### Action blues (solid fills)

- **Royal Action Blue** `#2563eb` — primary filled actions (selected chips, primary buttons).
- **Standard Action Blue** `#3b82f6` — primary fills and title accents in detail and wishlist flows.
- **Deep Accent Blue** `#1d4ed8` — high-contrast chart segments and deeper accent moments.
- **Scan Accent Blue** `#2979ff` — scan-result banners and blue-to-cyan gradient accents.

### Foundations (backgrounds + surfaces)

- **Void Background** `#020617` — main dark app canvas.
- **HUD Surface** `#0f172a` — primary card/panel surface on dark mode.
- **Raised Surface** `#1e293b` — elevated cards, nav surfaces, and containers needing separation.
- **Scanner Ink** `#060b14` — deepest “camera/scanner” background for scan flows.
- **Camera Deep** `#050a14` — alternate near‑black for live camera UI.
- **True Black** `#050505` — splash-level black for maximum neon contrast.
- **Overlay Ink** `#02040a` — gradient overlays/scrims to keep text legible on imagery.
- **Profile Panels** `#1a2234` and **Profile Nav** `#151b2b` — profile/settings-specific surfaces.

### Text, icons, and lines (readability + structure)

- **Frost Text** `#f8fafc` — primary text on dark surfaces.
- **Muted Text** `#64748b` — secondary labels and supporting text.
- **Secondary Text** `#94a3b8` — subtle metadata text on dark.
- **Nav/Icon Tint** `#bae6fd` — light line-art icon tinting in nav and headers.
- **HUD Border Line** `#1e3a8a` — thin structural borders and dividers in analytics/HUD views.

### Special-purpose accents

- **Saber Blue (Faction Accent)** `#2e86c1` — “Light Side” styling accents.
- **Saber Red (Faction Accent)** `#c0392b` — “Dark Side” styling accents.
- **Danger Red** `#dc2626` — destructive actions like sign out.

## 3. Typography Rules

- **Font family:** Space Grotesk (300–700) as the single, app-wide type voice.
- **Hierarchy:** bold, tight-tracked headings for titles and key numbers; lighter weights for supporting copy; frequent micro‑labels in uppercase for “instrument panel” clarity.
- **Letter spacing:** use _tight_ tracking for big numeric readouts; use _wide_ tracking for labels and nav text (especially 10–12px UI).
- **Icons:** Material Symbols Outlined as the icon system; active states sometimes use a filled variant or a glow/drop-shadow to signal selection.

## 4. Component Stylings

- **Buttons:** Primary actions are solid blue or cyan fills with high contrast text, bold weight, and noticeable tracking (often uppercase). Buttons frequently include an “energy” treatment: subtle outer glow, hover brightening/inversion, and a gentle pressed scale-down. Secondary actions are outline/ghost buttons: transparent fill, thin primary-tinted border, and a soft primary wash on hover.
- **Cards/Containers:** Cards sit on dark slate surfaces with thin, low-opacity borders and rounded corners (typically 12–16px). “HUD” cards often add a single gradient hairline at the top edge, plus a cyan glow shadow for emphasis. Media cards use image backgrounds with dark-to-transparent gradients for legible overlays, plus small status badges (compact, uppercase, high-contrast).
- **Inputs/Forms:** Inputs are filled (light gray in light mode, slate surface in dark mode) with rounded corners (~12px). Focus is communicated via cyan rings and a faint neon glow. Segmented toggles behave like a pill control: the selected segment becomes bright (often cyan) with stronger contrast and a tighter shadow.

## 5. Layout Principles

- **Mobile-first column:** centered content with a fixed max width (~390–430px), using consistent padding (16–24px) and rhythmic vertical gaps (16–32px).
- **Persistent chrome:** sticky top headers with backdrop blur and hairline borders; fixed bottom navigation with 5 primary destinations and a clearly glowing active state.
- **Data scannability:** use grids (2-up cards), horizontal carousels, and compact badges to keep information dense but readable.
- **Imagery discipline:** figure imagery is framed in consistent aspect ratios (commonly 3:4 and 2:3) with gradient scrims to protect text contrast.
- **Safe areas:** bottom padding respects device safe-area insets; floating actions sit above the nav.
