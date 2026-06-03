create table if not exists public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  onderwerp text not null,
  bericht text not null,
  status text not null default 'Nieuw' check (status in ('Nieuw', 'In behandeling', 'Opgelost')),
  aangemaakt_door uuid not null references auth.users(id) on delete cascade,
  aangemaakt_door_naam text,
  aangemaakt_door_huisnummer text,
  beheer_reactie text,
  opgelost_op timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feedback_items enable row level security;

create or replace function public.set_feedback_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feedback_items_updated_at on public.feedback_items;
create trigger feedback_items_updated_at
before update on public.feedback_items
for each row execute function public.set_feedback_items_updated_at();

drop policy if exists "feedback_select_own_or_admin" on public.feedback_items;
create policy "feedback_select_own_or_admin"
on public.feedback_items
for select
to authenticated
using (
  aangemaakt_door = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid()
    and profiles.rol = 'admin'
  )
);

drop policy if exists "feedback_insert_own" on public.feedback_items;
create policy "feedback_insert_own"
on public.feedback_items
for insert
to authenticated
with check (aangemaakt_door = auth.uid());

drop policy if exists "feedback_update_admin" on public.feedback_items;
create policy "feedback_update_admin"
on public.feedback_items
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid()
    and profiles.rol = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid()
    and profiles.rol = 'admin'
  )
);

drop policy if exists "feedback_delete_admin" on public.feedback_items;
create policy "feedback_delete_admin"
on public.feedback_items
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid()
    and profiles.rol = 'admin'
  )
);
