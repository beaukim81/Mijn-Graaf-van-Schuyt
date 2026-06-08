do $$
declare
  item record;
  constraint_name text;
begin
  for item in
    select *
    from (
      values
        ('public.reports'::regclass, 'aangemaakt_door', 'reports_aangemaakt_door_fkey'),
        ('public.help_requests'::regclass, 'aangemaakt_door', 'help_requests_aangemaakt_door_fkey'),
        ('public.help_offers'::regclass, 'helper_id', 'help_offers_helper_id_fkey'),
        ('public.help_messages'::regclass, 'author_id', 'help_messages_author_id_fkey'),
        ('public.bulletin_posts'::regclass, 'aangemaakt_door', 'bulletin_posts_aangemaakt_door_fkey'),
        ('public.bulletin_messages'::regclass, 'author_id', 'bulletin_messages_author_id_fkey')
    ) as entries(table_name, column_name, wanted_constraint_name)
  loop
    execute format('alter table %s alter column %I drop not null', item.table_name, item.column_name);

    for constraint_name in
      select constraint.conname
      from pg_constraint constraint
      join pg_attribute attribute
        on attribute.attrelid = constraint.conrelid
       and attribute.attnum = any(constraint.conkey)
      where constraint.conrelid = item.table_name
        and constraint.contype = 'f'
        and constraint.confrelid = 'auth.users'::regclass
        and attribute.attname = item.column_name
    loop
      execute format('alter table %s drop constraint if exists %I', item.table_name, constraint_name);
    end loop;

    execute format(
      'alter table %s add constraint %I foreign key (%I) references auth.users(id) on delete set null',
      item.table_name,
      item.wanted_constraint_name,
      item.column_name
    );
  end loop;
end $$;

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
  update public.knowledge_documents set toegevoegd_door = null where toegevoegd_door = current_user_id;
  update public.building_announcements set created_by = null where created_by = current_user_id;
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
  update public.knowledge_documents set toegevoegd_door = null where toegevoegd_door = target_user_id;
  update public.building_announcements set created_by = null where created_by = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';
