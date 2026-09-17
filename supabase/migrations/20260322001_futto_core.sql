-- FUTTO core schema
-- Run in Supabase SQL Editor (project tfcnforazrpfnrwtlisc) if CLI/MCP unavailable.

create extension if not exists "pgcrypto";

-- Roles app: player (dÃ©faut) | manager (peut ajouter terrains via backoffice).
-- admin = staff plateforme backoffice uniquement (pas un rÃ´le joueur mobile).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  first_name text,
  phone text,
  position text,
  city text default 'Abidjan',
  avatar_url text,
  role text not null default 'player'
    check (role in ('player', 'manager', 'superAdmin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

create table if not exists public.terrains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone text,
  quartier text,
  price_per_hour integer not null default 0,
  surface text,
  rating numeric(2,1) default 0,
  distance_km numeric(4,1),
  lat double precision,
  lng double precision,
  image_url text,
  pin_top text,
  pin_left text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists terrains_created_by_idx on public.terrains (created_by);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  visibility text not null default 'private'
    check (visibility in ('private', 'public')),
  terrain_id uuid references public.terrains (id) on delete set null,
  terrain_label text,
  zone text,
  kickoff_at timestamptz,
  format text default '5v5',
  spots_total integer not null default 10,
  spots_taken integer not null default 0,
  price_participation integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'planned', 'confirmed', 'played', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matches_host_idx on public.matches (host_id);
create index if not exists matches_kickoff_idx on public.matches (kickoff_at);
create index if not exists matches_visibility_idx on public.matches (visibility);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  display_name text,
  phone text,
  status text not null default 'invited'
    check (status in ('invited', 'joined', 'left', 'no_show')),
  created_at timestamptz not null default now(),
  unique (match_id, profile_id)
);

create table if not exists public.wallet_accounts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  balance_fcfa integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount_fcfa integer not null,
  kind text not null check (kind in ('recharge', 'participation', 'terrain', 'refund')),
  label text,
  provider text check (provider is null or provider in ('orange', 'mtn', 'wave', 'cash')),
  match_id uuid references public.matches (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  kind text not null default 'match'
    check (kind in ('match', 'invite', 'reminder', 'system')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_label text,
  location text,
  teams integer not null default 0,
  teams_max integer not null default 8,
  fee_fcfa integer not null default 0,
  prize text,
  status text not null default 'open'
    check (status in ('open', 'running', 'full', 'done')),
  poster_url text,
  organizer_id uuid references public.profiles (id) on delete set null,
  commission_paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, first_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    'player'
  )
  on conflict (id) do nothing;
  insert into public.wallet_accounts (profile_id) values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers for RLS (role from profiles, not user_metadata)
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'player');
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

-- RLS
alter table public.profiles enable row level security;
alter table public.terrains enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.tournaments enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles p where p.id = auth.uid())
  );

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.current_role() = 'superAdmin')
  with check (public.current_role() = 'superAdmin');

-- terrains: everyone reads; managers insert/update own; superAdmin all
drop policy if exists terrains_select on public.terrains;
create policy terrains_select on public.terrains for select to authenticated
  using (true);

drop policy if exists terrains_select_anon on public.terrains;
create policy terrains_select_anon on public.terrains for select to anon
  using (true);

drop policy if exists terrains_insert_manager on public.terrains;
create policy terrains_insert_manager on public.terrains for insert to authenticated
  with check (
    public.is_manager_or_admin()
    and created_by = auth.uid()
  );

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

-- matches
drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches for select to authenticated
  using (
    visibility = 'public'
    or host_id = auth.uid()
    or exists (
      select 1 from public.match_players mp
      where mp.match_id = matches.id and mp.profile_id = auth.uid()
    )
  );

drop policy if exists matches_insert on public.matches;
create policy matches_insert on public.matches for insert to authenticated
  with check (host_id = auth.uid());

drop policy if exists matches_update on public.matches;
create policy matches_update on public.matches for update to authenticated
  using (host_id = auth.uid() or public.current_role() = 'superAdmin');

-- match_players
drop policy if exists match_players_select on public.match_players;
create policy match_players_select on public.match_players for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_players.match_id
        and (
          m.visibility = 'public'
          or m.host_id = auth.uid()
          or match_players.profile_id = auth.uid()
        )
    )
  );

drop policy if exists match_players_insert on public.match_players;
create policy match_players_insert on public.match_players for insert to authenticated
  with check (
    exists (select 1 from public.matches m where m.id = match_id and m.host_id = auth.uid())
    or profile_id = auth.uid()
  );

-- wallet
drop policy if exists wallet_select on public.wallet_accounts;
create policy wallet_select on public.wallet_accounts for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists wallet_tx_select on public.wallet_transactions;
create policy wallet_tx_select on public.wallet_transactions for select to authenticated
  using (profile_id = auth.uid());

-- notifications
drop policy if exists notifs_select on public.notifications;
create policy notifs_select on public.notifications for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists notifs_update on public.notifications;
create policy notifs_update on public.notifications for update to authenticated
  using (profile_id = auth.uid());

-- tournaments readable by all auth
drop policy if exists tournaments_select on public.tournaments;
create policy tournaments_select on public.tournaments for select to authenticated
  using (true);

drop policy if exists tournaments_write on public.tournaments;
create policy tournaments_write on public.tournaments for all to authenticated
  using (organizer_id = auth.uid() or public.current_role() = 'superAdmin')
  with check (organizer_id = auth.uid() or public.current_role() = 'superAdmin');

