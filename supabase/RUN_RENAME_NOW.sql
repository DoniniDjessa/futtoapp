-- À coller dans SQL Editor (projet tfcnforazrpfnrwtlisc)
-- Renomme profiles → futto_profiles (+ autres tables) et ajoute pseudo.

do $$
begin
  if to_regclass('public.profiles') is not null
     and to_regclass('public.futto_profiles') is null then
    alter table public.profiles rename to futto_profiles;
  end if;
  if to_regclass('public.terrains') is not null
     and to_regclass('public.futto_terrains') is null then
    alter table public.terrains rename to futto_terrains;
  end if;
  if to_regclass('public.matches') is not null
     and to_regclass('public.futto_matches') is null then
    alter table public.matches rename to futto_matches;
  end if;
  if to_regclass('public.match_players') is not null
     and to_regclass('public.futto_match_players') is null then
    alter table public.match_players rename to futto_match_players;
  end if;
  if to_regclass('public.wallet_accounts') is not null
     and to_regclass('public.futto_wallet_accounts') is null then
    alter table public.wallet_accounts rename to futto_wallet_accounts;
  end if;
  if to_regclass('public.wallet_transactions') is not null
     and to_regclass('public.futto_wallet_transactions') is null then
    alter table public.wallet_transactions rename to futto_wallet_transactions;
  end if;
  if to_regclass('public.notifications') is not null
     and to_regclass('public.futto_notifications') is null then
    alter table public.notifications rename to futto_notifications;
  end if;
  if to_regclass('public.tournaments') is not null
     and to_regclass('public.futto_tournaments') is null then
    alter table public.tournaments rename to futto_tournaments;
  end if;
end $$;

alter table public.futto_profiles add column if not exists pseudo text;
create unique index if not exists futto_profiles_pseudo_uidx
  on public.futto_profiles (pseudo) where pseudo is not null;

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

alter table public.futto_profiles drop constraint if exists futto_profiles_role_check;
alter table public.futto_profiles
  add constraint futto_profiles_role_check
  check (role in ('player', 'manager', 'superAdmin'));

-- Pointe le trigger + helpers vers futto_*
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.futto_profiles (id, email, full_name, first_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    'player'
  )
  on conflict (id) do nothing;
  insert into public.futto_wallet_accounts (profile_id) values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.futto_profiles where id = auth.uid()), 'player');
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('manager', 'superAdmin');
$$;

notify pgrst, 'reload schema';
