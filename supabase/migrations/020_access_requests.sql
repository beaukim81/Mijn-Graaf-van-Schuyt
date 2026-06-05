create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  naam_of_bijnaam text not null,
  achternaam text,
  huisnummer text not null,
  verdieping_of_gebouwdeel text,
  status text not null default 'Nieuw' check (status in ('Nieuw', 'Goedgekeurd', 'Geweigerd')),
  beheer_notitie text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  invited_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists access_requests_email_active_key
  on public.access_requests (lower(email))
  where status = 'Nieuw';

alter table public.access_requests enable row level security;

drop policy if exists "Iedereen kan toegang aanvragen" on public.access_requests;
create policy "Iedereen kan toegang aanvragen"
  on public.access_requests
  for insert
  to anon, authenticated
  with check (status = 'Nieuw');

drop policy if exists "Admin beheert toegangsaanvragen" on public.access_requests;
create policy "Admin beheert toegangsaanvragen"
  on public.access_requests
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists access_requests_touch on public.access_requests;
create trigger access_requests_touch
  before update on public.access_requests
  for each row execute function public.touch_updated_at();

grant insert on public.access_requests to anon;
grant select, insert, update, delete on public.access_requests to authenticated;
