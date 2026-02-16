alter table public.user_figures
add column if not exists figure_id uuid references public.figures(id) on delete set null;

alter table public.user_figures
add column if not exists custom_figure_payload jsonb;

alter table public.user_figures
add column if not exists condition public.user_figure_condition not null default 'UNKNOWN';

alter table public.user_figures
add column if not exists purchase_price numeric;

alter table public.user_figures
add column if not exists purchase_currency text;

alter table public.user_figures
add column if not exists purchase_date date;

alter table public.user_figures
add column if not exists photo_refs text[];
