-- MVP achievements set for profile progression (Issue #26).

delete from public.achievements
where key in ('first-figure', 'wishlist-starter');

insert into public.achievements (key, title, description, icon)
values
  ('first_scan', 'First Scan', 'Log your first owned figure.', 'qr-code-scanner'),
  ('ten_owned', 'Collector I', 'Own 10 figures.', 'inventory-2'),
  ('wave_complete', 'Wave Hunter', 'Complete any figure wave.', 'emoji-events'),
  ('first_price_alert', 'Price Sentinel', 'Create your first price alert.', 'notifications-active')
on conflict (key)
do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon;
