create or replace function public.prevent_duplicate_access_request_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text;
begin
  normalized_email := lower(trim(new.email));
  new.email := normalized_email;

  if exists (
    select 1
    from auth.users users
    where lower(users.email) = normalized_email
  ) or exists (
    select 1
    from public.profiles profiles
    where lower(profiles.email) = normalized_email
  ) then
    raise exception 'Dit e-mailadres is al in gebruik. Log in of kies Wachtwoord vergeten.';
  end if;

  if exists (
    select 1
    from public.access_requests requests
    where lower(requests.email) = normalized_email
      and requests.status = 'Nieuw'
      and requests.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'Je aanvraag is al ontvangen en staat nog in behandeling. Je hoeft niets opnieuw te versturen.';
  end if;

  if exists (
    select 1
    from public.access_requests requests
    where lower(requests.email) = normalized_email
      and requests.status = 'Goedgekeurd'
      and requests.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'Dit e-mailadres is al goedgekeurd. Log in of kies Wachtwoord vergeten.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_access_request_email_trigger on public.access_requests;
create trigger prevent_duplicate_access_request_email_trigger
  before insert or update of email on public.access_requests
  for each row
  execute function public.prevent_duplicate_access_request_email();
