create extension if not exists "pgcrypto";

do $$
begin
  create type public.app_role as enum ('bewoner', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.knowledge_document_status as enum ('Concept', 'Gepubliceerd', 'Te controleren');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.announcement_importance as enum ('normaal', 'belangrijk', 'urgent');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
add column if not exists achternaam text,
add column if not exists huisnummer text,
add column if not exists verdieping_of_gebouwdeel text,
add column if not exists profielfoto_url text,
add column if not exists email text,
add column if not exists telefoon text,
add column if not exists updated_at timestamptz not null default now();

alter table public.contacts
add column if not exists beschrijving text not null default '',
add column if not exists telefoonnummer text,
add column if not exists emailadres text,
add column if not exists website text,
add column if not exists whatsapp_url text,
add column if not exists zichtbaar boolean not null default true,
add column if not exists updated_at timestamptz not null default now();

alter table public.reports
add column if not exists aangemaakt_door_naam text,
add column if not exists aangemaakt_door_huisnummer text,
add column if not exists image_urls jsonb not null default '[]'::jsonb,
add column if not exists opgelost_op timestamptz,
add column if not exists opgelost_door uuid references auth.users(id) on delete set null,
add column if not exists opgelost_door_naam text,
add column if not exists oplossing_omschrijving text,
add column if not exists rebo_melding_op timestamptz,
add column if not exists rebo_melding_door uuid references auth.users(id) on delete set null,
add column if not exists rebo_melding_door_naam text,
add column if not exists updated_at timestamptz not null default now();

alter table public.knowledge_documents
add column if not exists leverancier_of_fabrikant text,
add column if not exists faq jsonb not null default '[]',
add column if not exists uitgebreide_uitleg text,
add column if not exists image_urls jsonb not null default '[]'::jsonb,
add column if not exists updated_at timestamptz not null default now();

alter table public.knowledge_documents
alter column pdf_url set default '';

alter table public.help_requests
add column if not exists aanmaker_naam text,
add column if not exists aanmaker_huisnummer text;

alter table public.help_offers
add column if not exists helper_naam text,
add column if not exists helper_huisnummer text,
add column if not exists contact_info_delen boolean not null default false;

alter table public.help_messages
add column if not exists author_name text,
add column if not exists author_house_number text;

alter table public.bulletin_posts
add column if not exists contactpersoon text,
add column if not exists image_url text,
add column if not exists image_name text,
add column if not exists image_urls jsonb not null default '[]'::jsonb,
add column if not exists aangemaakt_door_naam text,
add column if not exists aangemaakt_door_huisnummer text,
add column if not exists status text not null default 'Actief';

create table if not exists public.bulletin_messages (
  id uuid primary key default gen_random_uuid(),
  bulletin_post_id uuid not null references public.bulletin_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  author_house_number text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.building_announcements (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  inhoud text not null,
  importance public.announcement_importance not null default 'normaal',
  notify_all boolean not null default false,
  event_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  personal_notifications boolean not null default true,
  building_notifications boolean not null default true,
  help_notifications boolean not null default true,
  report_notifications boolean not null default true,
  knowledge_notifications boolean not null default true,
  bulletin_notifications boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and rol = 'admin'
  );
$$;

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

create or replace function public.create_notification_preferences_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_user_notification_preferences_created on auth.users;
create trigger auth_user_notification_preferences_created
after insert on auth.users
for each row execute function public.create_notification_preferences_for_new_user();

insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Niet ingelogd.';
  end if;

  delete from public.knowledge_documents where toegevoegd_door = current_user_id;
  delete from public.building_announcements where created_by = current_user_id;
  delete from auth.users where id = current_user_id;
end;
$$;

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Alleen beheerders kunnen bewoners verwijderen.';
  end if;

  if target_user_id is null then
    raise exception 'Geen bewoner gekozen.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Gebruik je profielpagina om je eigen account te verwijderen.';
  end if;

  delete from public.knowledge_documents where toegevoegd_door = target_user_id;
  delete from public.building_announcements where created_by = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.reports enable row level security;
alter table public.report_confirmations enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_document_flags enable row level security;
alter table public.help_requests enable row level security;
alter table public.help_offers enable row level security;
alter table public.help_messages enable row level security;
alter table public.bulletin_posts enable row level security;
alter table public.bulletin_messages enable row level security;
alter table public.building_announcements enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "Bewoners lezen profielen beperkt" on public.profiles;
drop policy if exists "Bewoner beheert eigen profiel" on public.profiles;
create policy "Bewoners lezen profielen beperkt" on public.profiles for select to authenticated using (true);
create policy "Bewoner beheert eigen profiel" on public.profiles for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Bewoners lezen zichtbare contacten" on public.contacts;
drop policy if exists "Admin beheert contacten" on public.contacts;
create policy "Bewoners lezen zichtbare contacten" on public.contacts for select to authenticated using (zichtbaar = true or public.is_admin());
create policy "Admin beheert contacten" on public.contacts for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Bewoners lezen meldingen" on public.reports;
drop policy if exists "Bewoners maken meldingen" on public.reports;
drop policy if exists "Eigenaar of admin wijzigt meldingen" on public.reports;
drop policy if exists "Admin verwijdert meldingen" on public.reports;
create policy "Bewoners lezen meldingen" on public.reports for select to authenticated using (true);
create policy "Bewoners maken meldingen" on public.reports for insert to authenticated with check (aangemaakt_door = auth.uid());
create policy "Eigenaar of admin wijzigt meldingen" on public.reports for update to authenticated using (aangemaakt_door = auth.uid() or public.is_admin()) with check (aangemaakt_door = auth.uid() or public.is_admin());
create policy "Admin verwijdert meldingen" on public.reports for delete to authenticated using (public.is_admin());

drop policy if exists "Bewoners lezen herkenningen" on public.report_confirmations;
drop policy if exists "Bewoners beheren eigen herkenning" on public.report_confirmations;
create policy "Bewoners lezen herkenningen" on public.report_confirmations for select to authenticated using (true);
create policy "Bewoners beheren eigen herkenning" on public.report_confirmations for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Gepubliceerde documenten zichtbaar" on public.knowledge_documents;
drop policy if exists "Bewoner stelt document voor" on public.knowledge_documents;
drop policy if exists "Eigen concept of admin wijzigt document" on public.knowledge_documents;
drop policy if exists "Admin verwijdert document" on public.knowledge_documents;
create policy "Gepubliceerde documenten zichtbaar" on public.knowledge_documents for select to authenticated using (status = 'Gepubliceerd' or toegevoegd_door = auth.uid() or public.is_admin());
create policy "Bewoner stelt document voor" on public.knowledge_documents for insert to authenticated with check (toegevoegd_door = auth.uid() or public.is_admin());
create policy "Eigen concept of admin wijzigt document" on public.knowledge_documents for update to authenticated using (toegevoegd_door = auth.uid() or public.is_admin()) with check (toegevoegd_door = auth.uid() or public.is_admin());
create policy "Admin verwijdert document" on public.knowledge_documents for delete to authenticated using (public.is_admin());

drop policy if exists "Bewoners lezen hulpvragen" on public.help_requests;
drop policy if exists "Bewoners maken hulpvragen" on public.help_requests;
drop policy if exists "Eigenaar of admin wijzigt hulpvraag" on public.help_requests;
drop policy if exists "Eigenaar of admin verwijdert hulpvraag" on public.help_requests;
create policy "Bewoners lezen hulpvragen" on public.help_requests for select to authenticated using (true);
create policy "Bewoners maken hulpvragen" on public.help_requests for insert to authenticated with check (aangemaakt_door = auth.uid());
create policy "Eigenaar of admin wijzigt hulpvraag" on public.help_requests for update to authenticated using (aangemaakt_door = auth.uid() or public.is_admin()) with check (aangemaakt_door = auth.uid() or public.is_admin());
create policy "Eigenaar of admin verwijdert hulpvraag" on public.help_requests for delete to authenticated using (aangemaakt_door = auth.uid() or public.is_admin());

drop policy if exists "Betrokkenen lezen hulpaanbod" on public.help_offers;
drop policy if exists "Bewoners lezen hulpaanbod" on public.help_offers;
drop policy if exists "Bewoners bieden hulp aan" on public.help_offers;
drop policy if exists "Helper of admin verwijdert hulpaanbod" on public.help_offers;
create policy "Bewoners lezen hulpaanbod" on public.help_offers for select to authenticated using (true);
create policy "Bewoners bieden hulp aan" on public.help_offers for insert to authenticated with check (helper_id = auth.uid());
create policy "Helper of admin verwijdert hulpaanbod" on public.help_offers for delete to authenticated using (helper_id = auth.uid() or public.is_admin());

drop policy if exists "Betrokkenen lezen hulpberichten" on public.help_messages;
drop policy if exists "Bewoners lezen hulpberichten" on public.help_messages;
drop policy if exists "Betrokkenen plaatsen hulpberichten" on public.help_messages;
drop policy if exists "Bewoners plaatsen hulpberichten" on public.help_messages;
drop policy if exists "Schrijver wijzigt eigen hulpbericht" on public.help_messages;
drop policy if exists "Schrijver of admin verwijdert hulpbericht" on public.help_messages;
create policy "Bewoners lezen hulpberichten" on public.help_messages for select to authenticated using (true);
create policy "Bewoners plaatsen hulpberichten" on public.help_messages for insert to authenticated with check (author_id = auth.uid());
create policy "Schrijver wijzigt eigen hulpbericht" on public.help_messages for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy "Schrijver of admin verwijdert hulpbericht" on public.help_messages for delete to authenticated using (author_id = auth.uid() or public.is_admin());

drop policy if exists "Bewoners lezen prikbord" on public.bulletin_posts;
drop policy if exists "Bewoners plaatsen prikbordbericht" on public.bulletin_posts;
drop policy if exists "Eigenaar of admin wijzigt prikbordbericht" on public.bulletin_posts;
drop policy if exists "Eigenaar of admin verwijdert prikbordbericht" on public.bulletin_posts;
create policy "Bewoners lezen prikbord" on public.bulletin_posts for select to authenticated using (true);
create policy "Bewoners plaatsen prikbordbericht" on public.bulletin_posts for insert to authenticated with check (aangemaakt_door = auth.uid());
create policy "Eigenaar of admin wijzigt prikbordbericht" on public.bulletin_posts for update to authenticated using (aangemaakt_door = auth.uid() or public.is_admin()) with check (aangemaakt_door = auth.uid() or public.is_admin());
create policy "Eigenaar of admin verwijdert prikbordbericht" on public.bulletin_posts for delete to authenticated using (aangemaakt_door = auth.uid() or public.is_admin());

drop policy if exists "Betrokkenen lezen prikbordberichten" on public.bulletin_messages;
drop policy if exists "Betrokkenen lezen prikbordreacties" on public.bulletin_messages;
drop policy if exists "Bewoners lezen prikbordberichten" on public.bulletin_messages;
drop policy if exists "Bewoners plaatsen prikbordberichtreactie" on public.bulletin_messages;
drop policy if exists "Bewoners plaatsen prikbordreacties" on public.bulletin_messages;
drop policy if exists "Schrijver wijzigt eigen prikbordberichtreactie" on public.bulletin_messages;
drop policy if exists "Schrijver wijzigt eigen prikbordreactie" on public.bulletin_messages;
drop policy if exists "Schrijver of admin verwijdert prikbordberichtreactie" on public.bulletin_messages;
drop policy if exists "Schrijver of admin verwijdert prikbordreactie" on public.bulletin_messages;
create policy "Bewoners lezen prikbordberichten" on public.bulletin_messages for select to authenticated using (true);
create policy "Bewoners plaatsen prikbordberichtreactie" on public.bulletin_messages for insert to authenticated with check (author_id = auth.uid());
create policy "Schrijver wijzigt eigen prikbordberichtreactie" on public.bulletin_messages for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy "Schrijver of admin verwijdert prikbordberichtreactie" on public.bulletin_messages for delete to authenticated using (author_id = auth.uid() or public.is_admin());

drop policy if exists "Bewoners lezen algemene meldingen" on public.building_announcements;
drop policy if exists "Admin beheert algemene meldingen" on public.building_announcements;
create policy "Bewoners lezen algemene meldingen" on public.building_announcements for select to authenticated using (true);
create policy "Admin beheert algemene meldingen" on public.building_announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Bewoner beheert eigen notificatievoorkeuren" on public.notification_preferences;
create policy "Bewoner beheert eigen notificatievoorkeuren" on public.notification_preferences for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Bewoner beheert eigen push subscriptions" on public.push_subscriptions;
create policy "Bewoner beheert eigen push subscriptions" on public.push_subscriptions for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('bulletin-images', 'bulletin-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Bewoners lezen foto's" on storage.objects;
drop policy if exists "Bewoners uploaden foto's" on storage.objects;
drop policy if exists "Eigen foto's beheren" on storage.objects;
create policy "Bewoners lezen foto's" on storage.objects for select to authenticated using (bucket_id = 'bulletin-images');
create policy "Bewoners uploaden foto's" on storage.objects for insert to authenticated with check (bucket_id = 'bulletin-images' and owner = auth.uid());
create policy "Eigen foto's beheren" on storage.objects for delete to authenticated using (bucket_id = 'bulletin-images' and (owner = auth.uid() or public.is_admin()));

update public.reports
set
  aangemaakt_door_naam = coalesce(public.reports.aangemaakt_door_naam, public.profiles.naam_of_bijnaam),
  aangemaakt_door_huisnummer = coalesce(public.reports.aangemaakt_door_huisnummer, public.profiles.huisnummer)
from public.profiles
where public.reports.aangemaakt_door = public.profiles.user_id;

update public.bulletin_posts
set
  aangemaakt_door_naam = coalesce(public.bulletin_posts.aangemaakt_door_naam, public.profiles.naam_of_bijnaam),
  aangemaakt_door_huisnummer = coalesce(public.bulletin_posts.aangemaakt_door_huisnummer, public.profiles.huisnummer)
from public.profiles
where public.bulletin_posts.aangemaakt_door = public.profiles.user_id;

notify pgrst, 'reload schema';
