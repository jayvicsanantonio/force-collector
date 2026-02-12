-- Push notification device tokens (REQUIREMENTS.md §9.2)

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists push_tokens_token_idx
  on public.push_tokens(expo_push_token);

create unique index if not exists push_tokens_user_device_idx
  on public.push_tokens(user_id, device_id)
  where device_id is not null;

alter table public.push_tokens enable row level security;

create policy "Push tokens are viewable by owner"
  on public.push_tokens
  for select
  using (auth.uid() = user_id);

create policy "Push tokens are insertable by owner"
  on public.push_tokens
  for insert
  with check (auth.uid() = user_id);

create policy "Push tokens are updatable by owner"
  on public.push_tokens
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Push tokens are deletable by owner"
  on public.push_tokens
  for delete
  using (auth.uid() = user_id);
