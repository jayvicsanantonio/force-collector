create extension if not exists "pgcrypto";

create type public.user_figure_status as enum (
  'OWNED',
  'WISHLIST',
  'PREORDER',
  'SOLD',
  'DUPLICATE'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  barcode text unique,
  name text not null,
  series text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_figures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete restrict,
  status public.user_figure_status not null default 'OWNED',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_figures_user_id_idx on public.user_figures(user_id);

alter table public.profiles enable row level security;
alter table public.catalog_items enable row level security;
alter table public.user_figures enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles are insertable by owner"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Profiles are deletable by owner"
  on public.profiles
  for delete
  using (auth.uid() = id);

create policy "Catalog is readable"
  on public.catalog_items
  for select
  using (true);

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
