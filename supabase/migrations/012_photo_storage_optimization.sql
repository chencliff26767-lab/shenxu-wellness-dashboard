alter table public.meal_entries
add column if not exists thumbnail_path text,
add column if not exists photo_width_px integer check (photo_width_px is null or photo_width_px > 0),
add column if not exists photo_height_px integer check (photo_height_px is null or photo_height_px > 0),
add column if not exists photo_size_bytes integer check (photo_size_bytes is null or photo_size_bytes >= 0),
add column if not exists thumbnail_size_bytes integer check (thumbnail_size_bytes is null or thumbnail_size_bytes >= 0),
add column if not exists compression_version smallint not null default 1;
