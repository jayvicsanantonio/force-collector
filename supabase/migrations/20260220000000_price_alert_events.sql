create table if not exists public.price_alert_events (
  id uuid primary key default gen_random_uuid(),
  price_alert_id uuid not null references public.price_alerts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_figure_id uuid not null references public.user_figures(id) on delete cascade,
  retailer_listing_id uuid references public.retailer_listings(id) on delete set null,
  event_type text not null,
  price numeric,
  currency text,
  in_stock boolean,
  triggered_at timestamptz not null default now()
);

create index if not exists price_alert_events_alert_type_time_idx
  on public.price_alert_events(price_alert_id, event_type, triggered_at desc);

alter table public.price_alert_events enable row level security;

create policy "Price alert events are viewable by owner"
  on public.price_alert_events
  for select
  using (auth.uid() = user_id);

create policy "Price alert events are insertable by owner"
  on public.price_alert_events
  for insert
  with check (auth.uid() = user_id);

create policy "Price alert events are updatable by owner"
  on public.price_alert_events
  for update
  using (auth.uid() = user_id);

create policy "Price alert events are deletable by owner"
  on public.price_alert_events
  for delete
  using (auth.uid() = user_id);
