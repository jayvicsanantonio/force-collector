# Mobile Data Flow

This repo now uses the following ownership model for mobile data:

- Auth/session: Supabase Auth client in the mobile app.
- Server truth for catalog, pricing, goals, profile, and scan lookup: Supabase edge API in `supabase/functions/api`.
- Device cache for collection/wishlist rendering and offline mutations: SQLite in `apps/mobile/src/offline`.
- Asset storage: Supabase Storage for user photos.

## Read Path

1. The app signs in with Supabase Auth.
2. `OfflineProvider` hydrates the local SQLite cache from `GET /v1/user-figures`.
3. Collection, wishlist, and home screens render from the local cache.
4. Catalog search, analytics, goals, pricing, and scan lookup read from the edge API.

## Write Path

1. Online mutations go through the edge API when a server endpoint exists.
2. Local cache is updated immediately for responsive UI.
3. Offline-capable collection mutations are queued in SQLite and replayed through the edge API when connectivity returns.

## Direct Supabase Client Access

Direct client-side Supabase calls should be limited to:

- Auth operations
- Storage uploads/downloads for user photos
- Profile/data export-import flows that do not yet have API wrappers

All collection, catalog, pricing, and scan/database reads should prefer the edge API so shared response normalization and auth rules stay in one place.
