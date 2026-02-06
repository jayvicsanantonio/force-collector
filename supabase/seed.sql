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
  ('first-figure', 'First Figure', 'Add your first figure to the collection.', 'trophy'),
  ('wishlist-starter', 'Wishlist Starter', 'Add your first wishlist item.', 'star')
on conflict (key) do nothing;
