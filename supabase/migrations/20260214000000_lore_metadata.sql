alter table public.figures
  add column if not exists lore_updated_at timestamptz,
  add column if not exists lore_source text;
