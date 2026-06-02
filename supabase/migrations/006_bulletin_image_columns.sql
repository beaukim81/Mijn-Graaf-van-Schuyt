alter table public.bulletin_posts
add column if not exists image_url text,
add column if not exists image_name text;

notify pgrst, 'reload schema';
