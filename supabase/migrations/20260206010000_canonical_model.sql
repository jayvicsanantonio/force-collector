-- Canonical data model (REQUIREMENTS.md §8.1)
-- Table names match canonical entities:
-- user_profiles, figures, user_figures, retailer_listings, price_history_points,
-- price_alerts, achievements, user_achievements.

create extension if not exists "pgcrypto";

create type if not exists public.allegiance_theme as enum ('LIGHT', 'DARK');
create type if not exists public.user_figure_status_canon as enum (
  'OWNED',
  'WISHLIST',
  'PREORDER',
  'SOLD'
);
create type if not exists public.user_figure_condition as enum (
  'MINT',
  'OPENED',
  'LOOSE',
  'UNKNOWN'
);
create type if not exists public.figure_era as enum (
  'PREQUEL',
  'ORIGINAL',
  'SEQUEL',
  'TV',
  'GAMING',
  'OTHER'
);
create type if not exists public.retailer_kind as enum (
  'EBAY',
  'AMAZON',
  'TARGET',
  'WALMART',
  'OTHER'
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  level integer not null default 1,
  xp integer not null default 0,
  allegiance_theme public.allegiance_theme not null default 'LIGHT',
  preferences jsonb not null default '{}'::jsonb
);

create table if not exists public.figures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text,
  edition text,
  series text,
  wave text,
  release_year integer,
  era public.figure_era,
  faction text,
  exclusivity text,
  upc text,
  primary_image_url text,
  lore text,
  specs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_figures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  figure_id uuid references public.figures(id) on delete set null,
  custom_figure_payload jsonb,
  status public.user_figure_status_canon not null default 'OWNED',
  condition public.user_figure_condition not null default 'UNKNOWN',
  purchase_price numeric,
  purchase_currency text,
  purchase_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.retailer_listings (
  id uuid primary key default gen_random_uuid(),
  figure_id uuid not null references public.figures(id) on delete cascade,
  retailer public.retailer_kind not null,
  product_url text not null,
  external_id text,
  last_checked_at timestamptz,
  in_stock boolean,
  current_price numeric,
  currency text not null
);

create table if not exists public.price_history_points (
  id uuid primary key default gen_random_uuid(),
  retailer_listing_id uuid not null references public.retailer_listings(id) on delete cascade,
  price numeric not null,
  currency text not null,
  in_stock boolean,
  captured_at timestamptz not null default now()
);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_figure_id uuid not null references public.user_figures(id) on delete cascade,
  target_price numeric not null,
  currency text not null,
  enabled boolean not null default true,
  retailers public.retailer_kind[] not null default '{}'::public.retailer_kind[],
  notify_on_restock boolean not null default false,
  cooldown_hours integer not null default 24
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text,
  icon text
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists user_figures_user_status_idx
  on public.user_figures(user_id, status);

create index if not exists figures_upc_idx
  on public.figures(upc);

create index if not exists figures_name_idx
  on public.figures(name);

create index if not exists figures_name_tsv_idx
  on public.figures using gin (to_tsvector('simple', name));

comment on index public.figures_name_tsv_idx is
  'Text search via to_tsvector(\'simple\', figures.name).';

create index if not exists retailer_listings_figure_retailer_idx
  on public.retailer_listings(figure_id, retailer);

create index if not exists price_history_points_listing_captured_idx
  on public.price_history_points(retailer_listing_id, captured_at);

alter table public.user_profiles enable row level security;
alter table public.figures enable row level security;
alter table public.user_figures enable row level security;
alter table public.retailer_listings enable row level security;
alter table public.price_history_points enable row level security;
alter table public.price_alerts enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "User profiles are viewable by owner"
  on public.user_profiles
  for select
  using (auth.uid() = user_id);

create policy "User profiles are insertable by owner"
  on public.user_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "User profiles are updatable by owner"
  on public.user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "User profiles are deletable by owner"
  on public.user_profiles
  for delete
  using (auth.uid() = user_id);

create policy "Figures are readable by authenticated"
  on public.figures
  for select
  using (auth.role() = 'authenticated');

create policy "Figures are writable by service role"
  on public.figures
  for insert
  with check (auth.role() = 'service_role');

create policy "Figures are updatable by service role"
  on public.figures
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Figures are deletable by service role"
  on public.figures
  for delete
  using (auth.role() = 'service_role');

create policy "User figures are viewable by owner"
  on public.user_figures
  for select
  using (auth.uid() = user_id);

create policy "User figures are insertable by owner"
  on public.user_figures
  for insert
  with check (auth.uid() = user_id);

create policy "User figures are updatable by owner"
  on public.user_figures
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "User figures are deletable by owner"
  on public.user_figures
  for delete
  using (auth.uid() = user_id);

create policy "Retailer listings are readable by authenticated"
  on public.retailer_listings
  for select
  using (auth.role() = 'authenticated');

create policy "Retailer listings are writable by service role"
  on public.retailer_listings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Price history is readable by authenticated"
  on public.price_history_points
  for select
  using (auth.role() = 'authenticated');

create policy "Price history is writable by service role"
  on public.price_history_points
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Price alerts are viewable by owner"
  on public.price_alerts
  for select
  using (auth.uid() = user_id);

create policy "Price alerts are insertable by owner"
  on public.price_alerts
  for insert
  with check (auth.uid() = user_id);

create policy "Price alerts are updatable by owner"
  on public.price_alerts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Price alerts are deletable by owner"
  on public.price_alerts
  for delete
  using (auth.uid() = user_id);

create policy "Achievements are readable by authenticated"
  on public.achievements
  for select
  using (auth.role() = 'authenticated');

create policy "Achievements are writable by service role"
  on public.achievements
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "User achievements are viewable by owner"
  on public.user_achievements
  for select
  using (auth.uid() = user_id);

create policy "User achievements are insertable by owner"
  on public.user_achievements
  for insert
  with check (auth.uid() = user_id);

create policy "User achievements are updatable by owner"
  on public.user_achievements
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "User achievements are deletable by owner"
  on public.user_achievements
  for delete
  using (auth.uid() = user_id);

-- Storage bucket for user photos (private)
insert into storage.buckets (id, name, public)
values ('user-photos', 'user-photos', false)
on conflict (id) do nothing;

create policy "User photos are readable by owner path"
  on storage.objects
  for select
  using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "User photos are insertable by owner path"
  on storage.objects
  for insert
  with check (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and auth.uid() = owner
  );

create policy "User photos are updatable by owner path"
  on storage.objects
  for update
  using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "User photos are deletable by owner path"
  on storage.objects
  for delete
  using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
