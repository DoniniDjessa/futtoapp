-- NUCLEAR FIX — infinite recursion futto_matches ↔ futto_match_players
-- Coupe la boucle : la policy matches NE lit PLUS match_players (même via fonction).
-- Les joueurs d’un match privé le voient via host / public / both ; l’hôte voit les siens.
-- Exécuter ENTIER dans Supabase → SQL Editor

-- ── 1. Drop TOUTES les policies des 2 tables ─────────────────────────────────
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'futto_matches'
  loop
    execute format('drop policy if exists %I on public.futto_matches', r.policyname);
  end loop;

  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'futto_match_players'
  loop
    execute format('drop policy if exists %I on public.futto_match_players', r.policyname);
  end loop;
end $$;

-- ── 2. Helper host (row_security off → ne déclenche pas les policies matches) ─
create or replace function public.futto_is_match_host(p_match_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  perform set_config('row_security', 'off', true);
  select exists (
    select 1 from public.futto_matches m
    where m.id = p_match_id and m.host_id = auth.uid()
  ) into ok;
  return coalesce(ok, false);
end;
$$;

create or replace function public.futto_match_is_open(p_match_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  perform set_config('row_security', 'off', true);
  select exists (
    select 1 from public.futto_matches m
    where m.id = p_match_id and m.visibility in ('public', 'both')
  ) into ok;
  return coalesce(ok, false);
end;
$$;

-- Ancienne fonction : plus utilisée dans les policies matches (casse la boucle)
create or replace function public.futto_is_match_player(p_match_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  perform set_config('row_security', 'off', true);
  select exists (
    select 1 from public.futto_match_players mp
    where mp.match_id = p_match_id and mp.profile_id = auth.uid()
  ) into ok;
  return coalesce(ok, false);
end;
$$;

revoke all on function public.futto_is_match_host(uuid) from public;
revoke all on function public.futto_match_is_open(uuid) from public;
revoke all on function public.futto_is_match_player(uuid) from public;
grant execute on function public.futto_is_match_host(uuid) to authenticated, anon;
grant execute on function public.futto_match_is_open(uuid) to authenticated, anon;
grant execute on function public.futto_is_match_player(uuid) to authenticated, anon;

-- ── 3. Matches — AUCUNE référence à match_players ────────────────────────────
alter table public.futto_matches enable row level security;

create policy futto_matches_select on public.futto_matches
  for select to authenticated
  using (
    host_id = auth.uid()
    or visibility in ('public', 'both')
  );

create policy futto_matches_select_anon on public.futto_matches
  for select to anon
  using (visibility in ('public', 'both'));

create policy futto_matches_insert on public.futto_matches
  for insert to authenticated
  with check (host_id = auth.uid());

create policy futto_matches_update on public.futto_matches
  for update to authenticated
  using (
    host_id = auth.uid()
    or (
      exists (
        select 1 from public.futto_profiles p
        where p.id = auth.uid() and p.role = 'superAdmin'
      )
    )
  );

create policy futto_matches_delete on public.futto_matches
  for delete to authenticated
  using (host_id = auth.uid());

-- ── 4. Match players — lecture via helpers (row_security off) ────────────────
alter table public.futto_match_players enable row level security;

create policy futto_match_players_select on public.futto_match_players
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.futto_is_match_host(match_id)
    or public.futto_match_is_open(match_id)
  );

create policy futto_match_players_insert on public.futto_match_players
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    or public.futto_is_match_host(match_id)
  );

create policy futto_match_players_update on public.futto_match_players
  for update to authenticated
  using (
    profile_id = auth.uid()
    or public.futto_is_match_host(match_id)
  );

create policy futto_match_players_delete on public.futto_match_players
  for delete to authenticated
  using (
    profile_id = auth.uid()
    or public.futto_is_match_host(match_id)
  );
