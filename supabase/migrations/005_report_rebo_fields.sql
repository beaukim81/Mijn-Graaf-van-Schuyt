alter table public.reports
add column if not exists rebo_melding_op timestamptz,
add column if not exists rebo_melding_door uuid references auth.users(id) on delete set null,
add column if not exists rebo_melding_door_naam text;
