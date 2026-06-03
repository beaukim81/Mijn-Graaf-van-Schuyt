alter table public.reports
add column if not exists image_urls jsonb not null default '[]'::jsonb;

alter table public.bulletin_posts
add column if not exists image_urls jsonb not null default '[]'::jsonb;

update public.bulletin_posts
set image_urls = to_jsonb(array[image_url])
where image_url is not null
  and image_url <> ''
  and image_urls = '[]'::jsonb;

notify pgrst, 'reload schema';
