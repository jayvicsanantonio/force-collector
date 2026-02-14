create table if not exists public.scan_lookup_cache (
  upc text primary key,
  figure_id uuid references public.figures(id) on delete set null,
  confidence numeric,
  related_figure_ids uuid[] not null default '{}'::uuid[],
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.scan_provider_cache (
  upc text primary key,
  provider text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists scan_lookup_cache_expires_idx
  on public.scan_lookup_cache(expires_at);

create index if not exists scan_provider_cache_expires_idx
  on public.scan_provider_cache(expires_at);

alter table public.scan_lookup_cache enable row level security;
alter table public.scan_provider_cache enable row level security;
