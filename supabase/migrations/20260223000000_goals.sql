create type if not exists public.goal_progress_rule as enum ('OWNED_COUNT');

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  target_figure_ids uuid[],
  target_wave text,
  target_era public.figure_era,
  progress_rule public.goal_progress_rule not null default 'OWNED_COUNT',
  is_active boolean not null default false,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_target_check check (
    (
      (case when target_figure_ids is not null and cardinality(target_figure_ids) > 0 then 1 else 0 end)
      + (case when target_wave is not null then 1 else 0 end)
      + (case when target_era is not null then 1 else 0 end)
    ) = 1
  )
);

create index if not exists goals_user_active_idx
  on public.goals(user_id, is_active);

create index if not exists goals_template_idx
  on public.goals(is_template);

alter table public.goals enable row level security;

create policy "Goals are viewable by owner"
  on public.goals
  for select
  using (auth.uid() = user_id);

create policy "Goal templates are readable by authenticated"
  on public.goals
  for select
  using (is_template = true and auth.role() = 'authenticated');

create policy "Goals are insertable by owner"
  on public.goals
  for insert
  with check (auth.uid() = user_id);

create policy "Goals are updatable by owner"
  on public.goals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Goals are deletable by owner"
  on public.goals
  for delete
  using (auth.uid() = user_id);

insert into public.goals (
  name,
  target_era,
  progress_rule,
  is_active,
  is_template
) values (
  'Original Trilogy Collection',
  'ORIGINAL',
  'OWNED_COUNT',
  false,
  true
)
on conflict do nothing;
