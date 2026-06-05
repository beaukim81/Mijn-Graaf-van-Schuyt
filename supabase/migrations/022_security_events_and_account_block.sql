alter table public.profiles
add column if not exists account_geblokkeerd boolean not null default false;

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'email_wijziging_niet_herkend'
    check (type in ('email_wijziging_niet_herkend')),
  status text not null default 'Nieuw'
    check (status in ('Nieuw', 'In behandeling', 'Opgelost')),
  email text,
  nieuwe_email text,
  user_id uuid references auth.users(id) on delete set null,
  bericht text not null,
  beheer_reactie text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.security_events enable row level security;

drop trigger if exists security_events_touch on public.security_events;
create trigger security_events_touch
  before update on public.security_events
  for each row execute function public.touch_updated_at();

drop policy if exists "Iedereen kan veiligheidsmelding maken" on public.security_events;
create policy "Iedereen kan veiligheidsmelding maken"
  on public.security_events
  for insert
  to anon, authenticated
  with check (status = 'Nieuw');

drop policy if exists "Admin beheert veiligheidsmeldingen" on public.security_events;
create policy "Admin beheert veiligheidsmeldingen"
  on public.security_events
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant insert on public.security_events to anon;
grant select, insert, update, delete on public.security_events to authenticated;
