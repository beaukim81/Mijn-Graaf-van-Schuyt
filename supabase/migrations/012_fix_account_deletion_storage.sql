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

notify pgrst, 'reload schema';
