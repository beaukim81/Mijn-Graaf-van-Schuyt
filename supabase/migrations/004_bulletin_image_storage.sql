insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bulletin-images',
  'bulletin-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Bewoners lezen prikbordfoto''s') then
    create policy "Bewoners lezen prikbordfoto's"
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'bulletin-images');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Bewoners uploaden eigen prikbordfoto''s') then
    create policy "Bewoners uploaden eigen prikbordfoto's"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'bulletin-images'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Bewoners beheren eigen prikbordfoto''s') then
    create policy "Bewoners beheren eigen prikbordfoto's"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'bulletin-images'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'bulletin-images'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Bewoners verwijderen eigen prikbordfoto''s') then
    create policy "Bewoners verwijderen eigen prikbordfoto's"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'bulletin-images'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;
