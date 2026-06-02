do $$
begin
  create type public.announcement_importance as enum ('normaal', 'belangrijk', 'urgent');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
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

create table if not exists public.building_announcements (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  inhoud text not null,
  importance public.announcement_importance not null default 'normaal',
  notify_all boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.bulletin_messages (
  id uuid primary key default gen_random_uuid(),
  bulletin_post_id uuid not null references public.bulletin_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_house_number text,
  message text not null,
  created_at timestamptz not null default now()
);

create trigger building_announcements_touch
before update on public.building_announcements
for each row execute function public.touch_updated_at();

create trigger notification_preferences_touch
before update on public.notification_preferences
for each row execute function public.touch_updated_at();

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

create trigger auth_user_notification_preferences_created
after insert on auth.users
for each row execute function public.create_notification_preferences_for_new_user();

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.building_announcements enable row level security;
alter table public.bulletin_messages enable row level security;

create policy "Bewoner beheert eigen push subscriptions"
on public.push_subscriptions
for all to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Bewoner beheert eigen notificatievoorkeuren"
on public.notification_preferences
for all to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Bewoners lezen algemene meldingen"
on public.building_announcements
for select to authenticated
using (true);

create policy "Admin beheert algemene meldingen"
on public.building_announcements
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Betrokkenen lezen prikbordreacties"
on public.bulletin_messages
for select to authenticated
using (
  public.is_admin()
  or author_id = auth.uid()
  or exists (
    select 1 from public.bulletin_posts
    where id = bulletin_post_id and aangemaakt_door = auth.uid()
  )
);

create policy "Bewoners plaatsen prikbordreacties"
on public.bulletin_messages
for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (select 1 from public.bulletin_posts where id = bulletin_post_id)
);

create policy "Schrijver wijzigt eigen prikbordreactie"
on public.bulletin_messages
for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "Schrijver of admin verwijdert prikbordreactie"
on public.bulletin_messages
for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;
