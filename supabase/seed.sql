insert into public.catalog_items (barcode, name, series)
values
  ('630509432123', 'The Mandalorian (Beskar Armor)', 'The Black Series'),
  ('630509989138', 'Darth Vader', 'The Black Series')
on conflict (barcode) do nothing;

insert into public.figures (
  name,
  subtitle,
  series,
  release_year,
  era,
  faction,
  exclusivity,
  upc,
  primary_image_url,
  specs
) values
  (
    'The Mandalorian (Beskar Armor)',
    'Deluxe',
    'The Black Series',
    2021,
    'TV',
    'Mandalorian',
    'General',
    '630509432123',
    null,
    '{"accessories": ["blaster", "jetpack"]}'::jsonb
  ),
  (
    'Darth Vader',
    'Archive',
    'The Black Series',
    2020,
    'ORIGINAL',
    'Empire',
    'General',
    '630509989138',
    null,
    '{"accessories": ["lightsaber"]}'::jsonb
  );

insert into public.achievements (key, title, description, icon)
values
  ('first_scan', 'First Scan', 'Log your first owned figure.', 'qr-code-scanner'),
  ('ten_owned', 'Collector I', 'Own 10 figures.', 'inventory-2'),
  ('wave_complete', 'Wave Hunter', 'Complete any figure wave.', 'emoji-events'),
  ('first_price_alert', 'Price Sentinel', 'Create your first price alert.', 'notifications-active')
on conflict (key) do nothing;
