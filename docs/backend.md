# Backend (Supabase)

This project uses Supabase (Postgres + Auth + Edge Functions) as the backend foundation.

## Local development (Supabase CLI)

1) Install the Supabase CLI:
   - macOS (Homebrew): `brew install supabase/tap/supabase`
   - npm: `npm install -g supabase`

2) Start Supabase locally from the repo root:
   - `supabase start`

3) Health check (edge function):
   - `supabase functions serve health`
   - In another terminal:
     - `curl http://127.0.0.1:54321/functions/v1/health`

## Migrations

- Apply migrations locally:
  - `supabase db reset`

- Push migrations to a linked cloud project:
  - `supabase link --project-ref <your-project-ref>`
  - `supabase db push`

## Seeding minimal catalog data

- Local seed (runs with `db reset`):
  - `supabase db reset`

- Manual seed:
  - `supabase db seed`

## Edge functions

- Serve locally:
  - `supabase functions serve health`

- Deploy to cloud:
  - `supabase functions deploy health`

## Environment variables

Create a `.env` file for the mobile app at `apps/mobile/.env` (never commit secrets). A template is provided at `apps/mobile/.env.example`.

Minimum keys:

```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

API_BASE_URL=
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never ship to the client app. Store it in a server `.env` (see `.env.example` at the repo root).
- Local Supabase keys are printed by `supabase start` or `supabase status`.
- Cloud keys live in the Supabase project settings.

Server-only `.env` keys (placeholders listed in `.env.example`): `SUPABASE_SERVICE_ROLE_KEY`, `BARCODE_LOOKUP_API_KEY`, `EBAY_APP_ID`.

## Security

Row Level Security (RLS) is enabled for per-user tables, with policies that restrict reads/writes to `auth.uid()`.
