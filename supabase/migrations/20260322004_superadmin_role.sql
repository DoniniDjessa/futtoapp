-- If APPLY_ALL already ran with role 'admin', run this once
-- (or use ../FIX_ROLE_CONSTRAINT.sql — same fix, safer drop).

update public.profiles set role = 'superAdmin' where role = 'admin';

do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'profiles'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%role%';

  if cname is not null then
    execute format('alter table public.profiles drop constraint %I', cname);
  end if;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('player', 'manager', 'superAdmin'));

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('manager', 'superAdmin');
$$;

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.current_role() = 'superAdmin')
  with check (public.current_role() = 'superAdmin');

drop policy if exists terrains_update_own on public.terrains;
create policy terrains_update_own on public.terrains for update to authenticated
  using (
    public.current_role() = 'superAdmin'
    or (public.current_role() = 'manager' and created_by = auth.uid())
  );

drop policy if exists terrains_delete_own on public.terrains;
create policy terrains_delete_own on public.terrains for delete to authenticated
  using (
    public.current_role() = 'superAdmin'
    or (public.current_role() = 'manager' and created_by = auth.uid())
  );

drop policy if exists matches_update on public.matches;
create policy matches_update on public.matches for update to authenticated
  using (host_id = auth.uid() or public.current_role() = 'superAdmin');

drop policy if exists tournaments_write on public.tournaments;
create policy tournaments_write on public.tournaments for all to authenticated
  using (organizer_id = auth.uid() or public.current_role() = 'superAdmin')
  with check (organizer_id = auth.uid() or public.current_role() = 'superAdmin');

drop policy if exists futto_bucket_auth_delete on storage.objects;
create policy futto_bucket_auth_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'futto-bucket'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superAdmin')
    )
  );
