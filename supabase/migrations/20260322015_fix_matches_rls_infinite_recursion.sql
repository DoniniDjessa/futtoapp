-- Migration 20260322015_fix_matches_rls_infinite_recursion.sql
-- Correction définitive de la récursion infinie entre futto_matches et futto_match_players

-- 1. Supprimer les anciennes politiques récursives
drop policy if exists futto_matches_select on public.futto_matches;
drop policy if exists futto_matches_select_anon on public.futto_matches;
drop policy if exists futto_match_players_select on public.futto_match_players;
drop policy if exists match_players_select on public.futto_match_players;
drop policy if exists matches_select on public.futto_matches;

-- 2. Créer les fonctions de sécurité sans évaluation de RLS (security definer + row_security off)
create or replace function public.futto_is_player_in_match(p_match_id uuid, p_user_id uuid)
returns boolean
language plpgsqla
security definer
set search_path = public
as $$
declare
  is_in boolean;
begin
  perform set_config('row_security', 'off', true);
  select exists (
    select 1 from public.futto_match_players
    where match_id = p_match_id and profile_id = p_user_id
  ) into is_in;
  return coalesce(is_in, false);
end;
$$;

create or replace function public.futto_can_view_match_players(p_match_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  can_view boolean;
begin
  perform set_config('row_security', 'off', true);
  select exists (
    select 1 from public.futto_matches
    where id = p_match_id and (visibility in ('public', 'both') or host_id = p_user_id)
  ) into can_view;
  return coalesce(can_view, false);
end;
$$;

grant execute on function public.futto_is_player_in_match(uuid, uuid) to authenticated, anon;
grant execute on function public.futto_can_view_match_players(uuid, uuid) to authenticated, anon;

-- 3. Nouvelles politiques RLS garanties sans boucle infinie
create policy futto_matches_select on public.futto_matches
  for select to authenticated
  using (
    visibility in ('public', 'both')
    or host_id = auth.uid()
    or public.futto_is_player_in_match(id, auth.uid())
  );

create policy futto_matches_select_anon on public.futto_matches
  for select to anon
  using (visibility in ('public', 'both'));

create policy futto_match_players_select on public.futto_match_players
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.futto_can_view_match_players(match_id, auth.uid())
  );
