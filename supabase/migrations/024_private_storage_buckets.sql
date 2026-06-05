insert into storage.buckets (id, name, public)
values
  ('bulletin-images', 'bulletin-images', false),
  ('knowledge-files', 'knowledge-files', false)
on conflict (id) do update set public = false;

drop policy if exists "Bewoners lezen foto's" on storage.objects;
drop policy if exists "Bewoners uploaden foto's" on storage.objects;
drop policy if exists "Eigen foto's beheren" on storage.objects;
drop policy if exists "Bewoners lezen kennisbankbestanden" on storage.objects;
drop policy if exists "Bewoners uploaden kennisbankbestanden" on storage.objects;
drop policy if exists "Eigen kennisbankbestanden beheren" on storage.objects;

create policy "Bewoners lezen foto's"
on storage.objects for select
to authenticated
using (bucket_id = 'bulletin-images');

create policy "Bewoners uploaden foto's"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'bulletin-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Eigen foto's beheren"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'bulletin-images'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

create policy "Bewoners lezen kennisbankbestanden"
on storage.objects for select
to authenticated
using (bucket_id = 'knowledge-files');

create policy "Bewoners uploaden kennisbankbestanden"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'knowledge-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Eigen kennisbankbestanden beheren"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'knowledge-files'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
