insert into public.catalog_items (barcode, name, series)
values
  ('630509432123', 'The Mandalorian (Beskar Armor)', 'The Black Series'),
  ('630509989138', 'Darth Vader', 'The Black Series')
on conflict (barcode) do nothing;
