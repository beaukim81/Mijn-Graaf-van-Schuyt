insert into storage.buckets (id, name, public)
values ('knowledge-files', 'knowledge-files', true)
on conflict (id) do update set public = true;

drop policy if exists "Bewoners lezen kennisbankbestanden" on storage.objects;
drop policy if exists "Bewoners uploaden kennisbankbestanden" on storage.objects;
drop policy if exists "Eigen kennisbankbestanden beheren" on storage.objects;

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

drop policy if exists "Bewoners lezen profielen beperkt" on public.profiles;
drop policy if exists "Bewoners lezen eigen profiel en admin leest alles" on public.profiles;

create policy "Bewoners lezen eigen profiel en admin leest alles"
on public.profiles for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Bewoners lezen foto's" on storage.objects;
drop policy if exists "Bewoners uploaden foto's" on storage.objects;
drop policy if exists "Eigen foto's beheren" on storage.objects;

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

notify pgrst, 'reload schema';
