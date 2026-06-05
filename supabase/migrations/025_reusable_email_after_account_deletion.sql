create or replace function public.archive_access_requests_for_deleted_user(target_user_id uuid, target_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text := lower(trim(coalesce(target_email, '')));
begin
  update public.access_requests
  set
    status = 'Geweigerd',
    beheer_notitie = trim(coalesce(beheer_notitie || E'\n', '') || 'Account verwijderd; e-mailadres kan opnieuw toegang aanvragen.'),
    updated_at = now()
  where status in ('Nieuw', 'Goedgekeurd')
    and (
      invited_user_id = target_user_id
      or (normalized_email <> '' and lower(email) = normalized_email)
    );
end;
$$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
begin
  if current_user_id is null then
    raise exception 'Niet ingelogd.';
  end if;

  select email into current_email
  from auth.users
  where id = current_user_id;

  perform public.archive_access_requests_for_deleted_user(current_user_id, current_email);
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
declare
  target_email text;
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

  select email into target_email
  from auth.users
  where id = target_user_id;

  if target_email is null then
    select email into target_email
    from public.profiles
    where user_id = target_user_id;
  end if;

  perform public.archive_access_requests_for_deleted_user(target_user_id, target_email);
  delete from public.knowledge_documents where toegevoegd_door = target_user_id;
  delete from public.building_announcements where created_by = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;

update public.access_requests requests
set
  status = 'Geweigerd',
  beheer_notitie = trim(coalesce(requests.beheer_notitie || E'\n', '') || 'Oude goedkeuring opgeschoond; e-mailadres kan opnieuw toegang aanvragen.'),
  updated_at = now()
where requests.status = 'Goedgekeurd'
  and not exists (
    select 1
    from auth.users users
    where lower(users.email) = lower(requests.email)
  )
  and not exists (
    select 1
    from public.profiles profiles
    where lower(profiles.email) = lower(requests.email)
  );

grant execute on function public.archive_access_requests_for_deleted_user(uuid, text) to authenticated;
grant execute on function public.delete_own_account() to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';
