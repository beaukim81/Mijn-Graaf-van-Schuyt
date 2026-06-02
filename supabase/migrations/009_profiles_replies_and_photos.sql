alter table public.reports
add column if not exists image_urls jsonb not null default '[]'::jsonb;

alter table public.bulletin_posts
add column if not exists image_urls jsonb not null default '[]'::jsonb;

create table if not exists public.bulletin_messages (
  id uuid primary key default gen_random_uuid(),
  bulletin_post_id uuid not null references public.bulletin_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  author_house_number text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.bulletin_messages enable row level security;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, naam_of_bijnaam, achternaam, huisnummer, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'naam_of_bijnaam', split_part(new.email, '@', 1), 'Bewoner'),
    nullif(new.raw_user_meta_data ->> 'achternaam', ''),
    nullif(new.raw_user_meta_data ->> 'huisnummer', ''),
    new.email
  )
  on conflict (user_id) do update
  set
    naam_of_bijnaam = coalesce(nullif(excluded.naam_of_bijnaam, ''), public.profiles.naam_of_bijnaam),
    achternaam = coalesce(excluded.achternaam, public.profiles.achternaam),
    huisnummer = coalesce(excluded.huisnummer, public.profiles.huisnummer),
    email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$$;

drop trigger if exists auth_user_profile_created on auth.users;
create trigger auth_user_profile_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

insert into public.profiles (user_id, naam_of_bijnaam, achternaam, huisnummer, email)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'naam_of_bijnaam', split_part(users.email, '@', 1), 'Bewoner'),
  nullif(users.raw_user_meta_data ->> 'achternaam', ''),
  nullif(users.raw_user_meta_data ->> 'huisnummer', ''),
  users.email
from auth.users users
on conflict (user_id) do update
set
  naam_of_bijnaam = coalesce(nullif(excluded.naam_of_bijnaam, ''), public.profiles.naam_of_bijnaam),
  achternaam = coalesce(excluded.achternaam, public.profiles.achternaam),
  huisnummer = coalesce(excluded.huisnummer, public.profiles.huisnummer),
  email = coalesce(excluded.email, public.profiles.email);

drop policy if exists "Betrokkenen lezen hulpaanbod" on public.help_offers;
drop policy if exists "Bewoners bieden hulp aan" on public.help_offers;
drop policy if exists "Helper of admin verwijdert hulpaanbod" on public.help_offers;

create policy "Bewoners lezen hulpaanbod"
on public.help_offers for select
to authenticated
using (true);

create policy "Bewoners bieden hulp aan"
on public.help_offers for insert
to authenticated
with check (helper_id = auth.uid());

create policy "Helper of admin verwijdert hulpaanbod"
on public.help_offers for delete
to authenticated
using (helper_id = auth.uid() or public.is_admin());

drop policy if exists "Betrokkenen lezen hulpberichten" on public.help_messages;
drop policy if exists "Betrokkenen plaatsen hulpberichten" on public.help_messages;
drop policy if exists "Schrijver wijzigt eigen hulpbericht" on public.help_messages;
drop policy if exists "Schrijver of admin verwijdert hulpbericht" on public.help_messages;

create policy "Bewoners lezen hulpberichten"
on public.help_messages for select
to authenticated
using (true);

create policy "Bewoners plaatsen hulpberichten"
on public.help_messages for insert
to authenticated
with check (author_id = auth.uid());

create policy "Schrijver wijzigt eigen hulpbericht"
on public.help_messages for update
to authenticated
using (author_id = auth.uid() or public.is_admin())
with check (author_id = auth.uid() or public.is_admin());

create policy "Schrijver of admin verwijdert hulpbericht"
on public.help_messages for delete
to authenticated
using (author_id = auth.uid() or public.is_admin());

drop policy if exists "Betrokkenen lezen prikbordberichten" on public.bulletin_messages;
drop policy if exists "Betrokkenen lezen prikbordreacties" on public.bulletin_messages;
drop policy if exists "Bewoners plaatsen prikbordberichtreactie" on public.bulletin_messages;
drop policy if exists "Bewoners plaatsen prikbordreacties" on public.bulletin_messages;
drop policy if exists "Schrijver wijzigt eigen prikbordberichtreactie" on public.bulletin_messages;
drop policy if exists "Schrijver wijzigt eigen prikbordreactie" on public.bulletin_messages;
drop policy if exists "Schrijver of admin verwijdert prikbordberichtreactie" on public.bulletin_messages;
drop policy if exists "Schrijver of admin verwijdert prikbordreactie" on public.bulletin_messages;

create policy "Bewoners lezen prikbordberichten"
on public.bulletin_messages for select
to authenticated
using (true);

create policy "Bewoners plaatsen prikbordberichtreactie"
on public.bulletin_messages for insert
to authenticated
with check (author_id = auth.uid());

create policy "Schrijver wijzigt eigen prikbordberichtreactie"
on public.bulletin_messages for update
to authenticated
using (author_id = auth.uid() or public.is_admin())
with check (author_id = auth.uid() or public.is_admin());

create policy "Schrijver of admin verwijdert prikbordberichtreactie"
on public.bulletin_messages for delete
to authenticated
using (author_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('bulletin-images', 'bulletin-images', true)
on conflict (id) do update set public = true;

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
with check (bucket_id = 'bulletin-images' and owner = auth.uid());

create policy "Eigen foto's beheren"
on storage.objects for delete
to authenticated
using (bucket_id = 'bulletin-images' and (owner = auth.uid() or public.is_admin()));

notify pgrst, 'reload schema';
