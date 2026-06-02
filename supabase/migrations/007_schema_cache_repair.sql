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
add column if not exists updated_at timestamptz not null default now();

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

alter table public.bulletin_messages
add column if not exists author_name text,
add column if not exists author_house_number text;

create table if not exists public.building_announcements (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  inhoud text not null,
  importance text not null default 'normaal',
  notify_all boolean not null default false,
  event_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.building_announcements
add column if not exists importance text not null default 'normaal',
add column if not exists notify_all boolean not null default false,
add column if not exists event_date date,
add column if not exists updated_at timestamptz not null default now(),
add column if not exists created_by uuid references auth.users(id) on delete set null;

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

alter table public.notification_preferences
add column if not exists personal_notifications boolean not null default true,
add column if not exists building_notifications boolean not null default true,
add column if not exists help_notifications boolean not null default true,
add column if not exists report_notifications boolean not null default true,
add column if not exists knowledge_notifications boolean not null default true,
add column if not exists bulletin_notifications boolean not null default false,
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

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
