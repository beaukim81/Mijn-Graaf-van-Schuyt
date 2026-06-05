alter table public.notification_preferences
add column if not exists neighbor_notifications boolean not null default false;

update public.notification_preferences
set
  personal_notifications = coalesce(personal_notifications, true),
  building_notifications = coalesce(building_notifications, true),
  neighbor_notifications = false;

create or replace function public.create_notification_preferences_for_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notification_preferences (
    user_id,
    personal_notifications,
    building_notifications,
    neighbor_notifications
  )
  values (new.id, true, true, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

alter table public.notification_preferences
drop column if exists help_notifications,
drop column if exists report_notifications,
drop column if exists knowledge_notifications,
drop column if exists bulletin_notifications;
