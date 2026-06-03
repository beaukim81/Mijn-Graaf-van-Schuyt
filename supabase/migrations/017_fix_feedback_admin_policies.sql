drop policy if exists "feedback_select_own_or_admin" on public.feedback_items;
create policy "feedback_select_own_or_admin"
on public.feedback_items
for select
to authenticated
using (aangemaakt_door = auth.uid() or public.is_admin());

drop policy if exists "feedback_update_admin" on public.feedback_items;
create policy "feedback_update_admin"
on public.feedback_items
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "feedback_delete_admin" on public.feedback_items;
create policy "feedback_delete_admin"
on public.feedback_items
for delete
to authenticated
using (public.is_admin());
