insert into storage.buckets (id, name, public)
values ('bulletin-images', 'bulletin-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Bewoners uploaden foto's" on storage.objects;

create policy "Bewoners uploaden foto's"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'bulletin-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admin verwijdert meldingen" on public.reports;
drop policy if exists "Eigenaar of admin verwijdert meldingen" on public.reports;

create policy "Eigenaar of admin verwijdert meldingen"
on public.reports for delete
to authenticated
using (aangemaakt_door = auth.uid() or public.is_admin());

notify pgrst, 'reload schema';
