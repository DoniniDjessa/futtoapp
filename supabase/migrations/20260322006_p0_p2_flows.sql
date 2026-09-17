-- FUTTO P0–P2 core flows
-- Run in Supabase SQL Editor if MCP apply fails.
-- Bookings + match join/share + wallet writes + teams + notif insert + spots sync

-- ─── Match: min/max, free/adhesion, share token ─────────────────────────────
alter table public.futto_matches
  add column if not exists spots_min integer not null default 2;

alter table public.futto_matches
  add column if not exists join_mode text not null default 'free';

alter table public.futto_matches
  add column if not exists share_token text;

alter table public.futto_matches
  add column if not exists booking_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'futto_matches_join_mode_check'
  ) then
    alter table public.futto_matches
      add constraint futto_matches_join_mode_check
      check (join_mode in ('free', 'adhesion'));
  end if;
end $$;

create unique index if not exists futto_matches_share_token_uidx
  on public.futto_matches (share_token)
  where share_token is not null;

-- Cap adhesion (anti-magouille) — enforced in app + check soft
-- price_participation already exists; max 5000 FCFA recommended in app

-- ─── Terrain bookings ───────────────────────────────────────────────────────
create table if not exists public.futto_terrain_bookings (
  id uuid primary key default gen_random_uuid(),
  terrain_id uuid not null references public.futto_terrains (id) on delete cascade,
  requester_id uuid not null references public.futto_profiles (id) on delete cascade,
  match_id uuid references public.futto_matches (id) on delete set null,
  starts_at timestamptz not null,
  duration_hours numeric(3,1) not null default 1
    check (duration_hours > 0 and duration_hours <= 8),
  amount_fcfa integer not null default 0,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'rejected', 'paid', 'cancelled')),
  payment_provider text
    check (payment_provider is null or payment_provider in ('orange', 'mtn', 'wave', 'cash')),
  note text,
  manager_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists futto_bookings_terrain_idx on public.futto_terrain_bookings (terrain_id);
create index if not exists futto_bookings_requester_idx on public.futto_terrain_bookings (requester_id);
create index if not exists futto_bookings_status_idx on public.futto_terrain_bookings (status);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'futto_matches_booking_id_fkey'
  ) then
    alter table public.futto_matches
      add constraint futto_matches_booking_id_fkey
      foreign key (booking_id) references public.futto_terrain_bookings (id) on delete set null;
  end if;
exception when others then null;
end $$;

alter table public.futto_terrain_bookings enable row level security;

drop policy if exists futto_bookings_select on public.futto_terrain_bookings;
create policy futto_bookings_select on public.futto_terrain_bookings for select to authenticated
  using (
    requester_id = auth.uid()
    or public.current_role() = 'superAdmin'
    or exists (
      select 1 from public.futto_terrains t
      where t.id = terrain_id
        and t.created_by = auth.uid()
        and public.current_role() in ('manager', 'superAdmin')
    )
  );

drop policy if exists futto_bookings_insert on public.futto_terrain_bookings;
create policy futto_bookings_insert on public.futto_terrain_bookings for insert to authenticated
  with check (requester_id = auth.uid());

drop policy if exists futto_bookings_update_requester on public.futto_terrain_bookings;
create policy futto_bookings_update_requester on public.futto_terrain_bookings for update to authenticated
  using (requester_id = auth.uid())
  with check (requester_id = auth.uid());

drop policy if exists futto_bookings_update_manager on public.futto_terrain_bookings;
create policy futto_bookings_update_manager on public.futto_terrain_bookings for update to authenticated
  using (
    public.current_role() = 'superAdmin'
    or exists (
      select 1 from public.futto_terrains t
      where t.id = terrain_id and t.created_by = auth.uid()
        and public.current_role() = 'manager'
    )
  );

-- ─── Match players: leave + sync spots_taken ────────────────────────────────
drop policy if exists futto_match_players_update on public.futto_match_players;
create policy futto_match_players_update on public.futto_match_players for update to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.futto_matches m where m.id = match_id and m.host_id = auth.uid())
    or public.current_role() = 'superAdmin'
  );

drop policy if exists futto_match_players_delete on public.futto_match_players;
create policy futto_match_players_delete on public.futto_match_players for delete to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.futto_matches m where m.id = match_id and m.host_id = auth.uid())
    or public.current_role() = 'superAdmin'
  );

create or replace function public.futto_sync_match_spots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mid uuid;
begin
  mid := coalesce(new.match_id, old.match_id);
  update public.futto_matches m
  set spots_taken = (
      select count(*)::int from public.futto_match_players mp
      where mp.match_id = mid and mp.status = 'joined'
    ),
    updated_at = now()
  where m.id = mid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists futto_match_players_spots_aiud on public.futto_match_players;
create trigger futto_match_players_spots_aiud
  after insert or update or delete on public.futto_match_players
  for each row execute function public.futto_sync_match_spots();

-- Notify host when spots_min reached
create or replace function public.futto_notify_min_reached()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  joined_count int;
begin
  select * into m from public.futto_matches where id = new.match_id;
  if m is null then return new; end if;
  select count(*)::int into joined_count
  from public.futto_match_players
  where match_id = new.match_id and status = 'joined';
  if joined_count >= m.spots_min and joined_count - 1 < m.spots_min then
    insert into public.futto_notifications (profile_id, title, body, kind)
    values (
      m.host_id,
      'Minimum atteint',
      format('Ton match « %s » a atteint le minimum (%s joueurs).', m.title, m.spots_min),
      'match'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists futto_match_players_min_notify on public.futto_match_players;
create trigger futto_match_players_min_notify
  after insert or update on public.futto_match_players
  for each row
  when (new.status = 'joined')
  execute function public.futto_notify_min_reached();

-- ─── Wallet writes (recharge + mark paid) ───────────────────────────────────
create or replace function public.futto_wallet_recharge(
  p_amount integer,
  p_provider text,
  p_label text default 'Recharge'
)
returns public.futto_wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acc public.futto_wallet_accounts;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if p_amount is null or p_amount < 100 then raise exception 'Montant invalide'; end if;
  if p_provider is null or p_provider not in ('orange', 'mtn', 'wave', 'cash') then
    raise exception 'Provider invalide';
  end if;

  insert into public.futto_wallet_accounts (profile_id, balance_fcfa)
  values (auth.uid(), 0)
  on conflict (profile_id) do nothing;

  update public.futto_wallet_accounts
  set balance_fcfa = balance_fcfa + p_amount, updated_at = now()
  where profile_id = auth.uid()
  returning * into acc;

  insert into public.futto_wallet_transactions (profile_id, amount_fcfa, kind, label, provider)
  values (auth.uid(), p_amount, 'recharge', p_label, p_provider);

  return acc;
end;
$$;

create or replace function public.futto_mark_booking_paid(
  p_booking_id uuid,
  p_provider text
)
returns public.futto_terrain_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.futto_terrain_bookings;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select * into b from public.futto_terrain_bookings where id = p_booking_id;
  if b is null then raise exception 'Réservation introuvable'; end if;
  if b.requester_id <> auth.uid() and public.current_role() <> 'superAdmin' then
    raise exception 'Non autorisé';
  end if;
  if b.status not in ('confirmed', 'requested') then
    raise exception 'Statut incompatible';
  end if;
  if p_provider is null or p_provider not in ('orange', 'mtn', 'wave', 'cash') then
    raise exception 'Provider invalide';
  end if;

  update public.futto_terrain_bookings
  set status = 'paid', payment_provider = p_provider, updated_at = now()
  where id = p_booking_id
  returning * into b;

  insert into public.futto_wallet_transactions (
    profile_id, amount_fcfa, kind, label, provider
  ) values (
    b.requester_id, -b.amount_fcfa, 'terrain',
    'Paiement créneau terrain', p_provider
  );

  return b;
end;
$$;

create or replace function public.futto_join_match(p_match_id uuid)
returns public.futto_match_players
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.futto_matches;
  bal int;
  mp public.futto_match_players;
  pname text;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select * into m from public.futto_matches where id = p_match_id;
  if m is null then raise exception 'Match introuvable'; end if;
  if m.status in ('cancelled', 'played') then raise exception 'Match fermé'; end if;
  if m.spots_taken >= m.spots_total then raise exception 'Complet'; end if;

  if m.join_mode = 'adhesion' and coalesce(m.price_participation, 0) > 0 then
    if m.price_participation > 5000 then raise exception 'Adhésion trop élevée (max 5000 FCFA)'; end if;
    select balance_fcfa into bal from public.futto_wallet_accounts where profile_id = auth.uid();
    bal := coalesce(bal, 0);
    if bal < m.price_participation then raise exception 'Solde insuffisant'; end if;
    update public.futto_wallet_accounts
    set balance_fcfa = balance_fcfa - m.price_participation, updated_at = now()
    where profile_id = auth.uid();
    insert into public.futto_wallet_transactions (
      profile_id, amount_fcfa, kind, label, provider, match_id
    ) values (
      auth.uid(), -m.price_participation, 'participation',
      'Adhésion match', 'cash', m.id
    );
  end if;

  select coalesce(full_name, first_name, 'Joueur') into pname
  from public.futto_profiles where id = auth.uid();

  insert into public.futto_match_players (match_id, profile_id, display_name, status)
  values (p_match_id, auth.uid(), pname, 'joined')
  on conflict (match_id, profile_id) do update
    set status = 'joined', display_name = excluded.display_name
  returning * into mp;

  return mp;
end;
$$;

-- Notifications: allow insert for system via definer only; users can insert to self for demo
drop policy if exists futto_notifs_insert on public.futto_notifications;
create policy futto_notifs_insert on public.futto_notifications for insert to authenticated
  with check (profile_id = auth.uid() or public.current_role() = 'superAdmin');

-- ─── Teams (P2) ─────────────────────────────────────────────────────────────
create table if not exists public.futto_teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.futto_profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.futto_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.futto_teams (id) on delete cascade,
  display_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.futto_teams enable row level security;
alter table public.futto_team_members enable row level security;

drop policy if exists futto_teams_all on public.futto_teams;
create policy futto_teams_all on public.futto_teams for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists futto_team_members_all on public.futto_team_members;
create policy futto_team_members_all on public.futto_team_members for all to authenticated
  using (
    exists (select 1 from public.futto_teams t where t.id = team_id and t.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.futto_teams t where t.id = team_id and t.owner_id = auth.uid())
  );

-- Tournament fee / commission helper columns already exist (poster_url, commission_paid)

-- Visibilité both (après P0) — aussi dans ADD_VISIBILITY_BOTH.sql
do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'futto_matches'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%visibility%';
  if cname is not null then
    execute format('alter table public.futto_matches drop constraint %I', cname);
  end if;
end $$;
alter table public.futto_matches drop constraint if exists futto_matches_visibility_check;
alter table public.futto_matches
  add constraint futto_matches_visibility_check
  check (visibility in ('private', 'public', 'both'));

drop policy if exists futto_matches_select on public.futto_matches;
create policy futto_matches_select on public.futto_matches for select to authenticated
  using (
    visibility in ('public', 'both')
    or host_id = auth.uid()
    or exists (
      select 1 from public.futto_match_players mp
      where mp.match_id = futto_matches.id and mp.profile_id = auth.uid()
    )
  );

drop policy if exists futto_matches_select_anon on public.futto_matches;
create policy futto_matches_select_anon on public.futto_matches for select to anon
  using (visibility in ('public', 'both'));

grant execute on function public.futto_wallet_recharge(integer, text, text) to authenticated;
grant execute on function public.futto_mark_booking_paid(uuid, text) to authenticated;
grant execute on function public.futto_join_match(uuid) to authenticated;

create or replace function public.futto_wallet_debit(
  p_amount integer,
  p_kind text,
  p_label text default 'Débit',
  p_provider text default 'cash'
)
returns public.futto_wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acc public.futto_wallet_accounts;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if p_amount is null or p_amount < 1 then raise exception 'Montant invalide'; end if;
  if p_kind not in ('recharge', 'participation', 'terrain', 'refund') then
    raise exception 'Kind invalide';
  end if;

  insert into public.futto_wallet_accounts (profile_id, balance_fcfa)
  values (auth.uid(), 0)
  on conflict (profile_id) do nothing;

  select * into acc from public.futto_wallet_accounts where profile_id = auth.uid() for update;
  if acc.balance_fcfa < p_amount then raise exception 'Solde insuffisant'; end if;

  update public.futto_wallet_accounts
  set balance_fcfa = balance_fcfa - p_amount, updated_at = now()
  where profile_id = auth.uid()
  returning * into acc;

  insert into public.futto_wallet_transactions (profile_id, amount_fcfa, kind, label, provider)
  values (auth.uid(), -p_amount, p_kind, p_label, p_provider);

  return acc;
end;
$$;

grant execute on function public.futto_wallet_debit(integer, text, text, text) to authenticated;
