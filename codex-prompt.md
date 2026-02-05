You are Codex running in GitHub Actions on repository `jayvicsanantonio/force-collector`.

Task: Implement GitHub Issue #1: [MVP] Scaffold Expo (TypeScript) app + bottom-tab navigation
Issue URL: https://github.com/jayvicsanantonio/force-collector/issues/1

## Source of truth: issue body
## Summary
Create the initial React Native (Expo) codebase and navigation skeleton so we can implement the Stitch-designed screens.

## Why
All functional requirements depend on having a working Expo app with consistent navigation (Tabs + nested stacks + modals).

## Design reference (north star)
- Stitch project: `projects/7049111668529286378`
- Stitch screen: `projects/7049111668529286378/screens/6e614e9589844066a65b7915aead04c0`
- Screenshot: https://lh3.googleusercontent.com/aida/AOfcidXdi3fIVvAZt1_jS1SlgO4-r11L-dWgHJLGo1rezjPw6FbWXZ5lmeN3bQc9xZxeBELyPx0ncIk-mibZudfvRq76U1Wen5Wf58tCdvcJi5uBwUv3ZEdEvHguk8x2SDHNDheor1KrGNY8mEoRirK4LPFWHrQgLTp6sOna-9n7kky5SNFmFSCbMO3lYybIx6OpBfsiMWpkzMtEZCW714_fwwK3Y_awMzSD-zPXzqeHf67ylbUYwWgGo2XSOg

![Force Collector - Dashboard Screen](https://lh3.googleusercontent.com/aida/AOfcidXdi3fIVvAZt1_jS1SlgO4-r11L-dWgHJLGo1rezjPw6FbWXZ5lmeN3bQc9xZxeBELyPx0ncIk-mibZudfvRq76U1Wen5Wf58tCdvcJi5uBwUv3ZEdEvHguk8x2SDHNDheor1KrGNY8mEoRirK4LPFWHrQgLTp6sOna-9n7kky5SNFmFSCbMO3lYybIx6OpBfsiMWpkzMtEZCW714_fwwK3Y_awMzSD-zPXzqeHf67ylbUYwWgGo2XSOg)

## Requirements to satisfy
- REQUIREMENTS.md §4–§6 (Supported platforms + Navigation model)
- Primary tabs: Home/Dashboard, Collection, Wishlist, Search (Scanner), Profile (§5.1)
- Recommended nav: Tabs + nested stacks + modals (§5.2)

## Implementation requirements
- App lives in `apps/mobile/` (keep docs at repo root).
- Expo managed workflow + TypeScript.
- Use **Expo Router** (preferred in REQUIREMENTS.md §10.1).
- Implement a bottom tab bar with 5 tabs and matching route groups:
  - Home (Dashboard)
  - Collection (Grid + Details)
  - Wishlist (Wishlist + Price Tracker)
  - Search (Scanner + Results + Manual lookup)
  - Profile (Profile + Settings)
- Set up a modal route group for “Add Figure” and “Edit Figure” flows (placeholders are fine).
- Add a simple `env.ts` that reads config from `.env` (do not commit secrets).

## Acceptance criteria
- `npm install` then `npm run ios`/`npm run android` starts the app.
- Bottom tabs render and route to placeholder screens without crashes.
- Modal navigation works (open/close) via a temporary button.

## Notes
- Keep routing names stable; later issues will reference them.
- Keep UI placeholder content minimal (title + short explanation) until screens are implemented.


## Constraints
- Work ONLY on Issue #1. Do not address other issues.
- Follow the issue acceptance criteria exactly; keep changes minimal and scoped.
- Add or update tests when appropriate; run existing tests/build commands if present.
- Do not create a pull request (the workflow will do it).
- Do not change GitHub Actions workflows unless the issue explicitly requires it.

## Deliverable
- Make code changes in the repo so the issue can be merged when reviewed.
- In your final message, include:
  - What changed
  - How to test (commands)
  - Any limitations / follow-ups
