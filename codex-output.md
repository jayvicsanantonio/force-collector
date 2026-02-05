Implemented a clean Expo Router scaffold in `apps/mobile` with the required 5-tab navigation, nested stacks, and modal routes. Added minimal placeholder screens, a shared placeholder component, Expo config, and a simple `env.ts` + `.env.example` for config.

Changes
- Expo Router app scaffold in `apps/mobile` with tab groups and nested stacks: Home, Collection, Wishlist, Search, Profile.
- Modal route group with “Add Figure” and “Edit Figure” placeholders + close buttons.
- Placeholder screens per route with minimal copy and temporary buttons to open modals.
- Expo config, Metro/Babel config, TypeScript config, and assets stubs.
- `env.ts` + `.env.example`; root `.gitignore` to avoid committing secrets.

How to test
1. `cd apps/mobile`
2. `npm install`
3. `npm run ios` or `npm run android`

Limitations / follow-ups
- Screens are placeholders only (no real data, camera, or styling beyond minimal layout).
- Populate `.env` locally as needed using `.env.example`.