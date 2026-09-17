-- Fix contrainte rôle sur futto_profiles (après RENAME_TO_FUTTO / APPLY_ALL)

update public.futto_profiles set role = 'superAdmin' where role = 'admin';

do $$
declare cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public' and rel.relname = 'futto_profiles'
    and con.contype = 'c' and pg_get_constraintdef(con.oid) ilike '%role%';
  if cname is not null then
    execute format('alter table public.futto_profiles drop constraint %I', cname);
  end if;
end $$;

alter table public.futto_profiles
  add constraint futto_profiles_role_check
  check (role in ('player', 'manager', 'superAdmin'));

alter table public.futto_profiles add column if not exists pseudo text;
create unique index if not exists futto_profiles_pseudo_uidx
  on public.futto_profiles (pseudo) where pseudo is not null;
