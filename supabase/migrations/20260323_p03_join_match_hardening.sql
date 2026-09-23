-- Migration 20260323_p03_join_match_hardening.sql
-- P0.3 Effectif match : durcissement du join.
-- Un match privé ne se rejoint que si :
--   - visibilité 'public'/'both' (ouvert), OU
--   - l'utilisateur est invité (ligne futto_match_players status='invited'), OU
--   - l'utilisateur est l'hôte.
-- Le RPC reste security definer (ne dépend pas de la RLS) mais fait ses propres checks.

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
  is_open boolean;
  is_host boolean;
  is_invited boolean;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;

  select * into m from public.futto_matches where id = p_match_id;
  if m is null then raise exception 'Match introuvable'; end if;
  if m.status in ('cancelled', 'played') then raise exception 'Match fermé'; end if;

  select (m.visibility in ('public', 'both')) into is_open;
  select (m.host_id = auth.uid()) into is_host;
  select exists (
    select 1 from public.futto_match_players
    where match_id = p_match_id and profile_id = auth.uid() and status = 'invited'
  ) into is_invited;

  if not (is_open or is_host or is_invited) then
    raise exception 'Ce match n''est pas ouvert aux joueurs FUTTO.';
  end if;

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

grant execute on function public.futto_join_match(uuid) to authenticated;

-- RLS : bloquer l'auto-insertion / auto-update en 'joined' hors RPC.
-- - Insert : seul l'hôte (ou superAdmin) crée des lignes match_players (auto-inscrit créé via RPC ou hôte).
-- - Update : le joueur ne peut que se retirer (status = 'left') ; toute montée en 'joined' passe par le RPC.
drop policy if exists futto_match_players_insert on public.futto_match_players;
create policy futto_match_players_insert on public.futto_match_players for insert to authenticated
  with check (
    public.futto_is_match_host(match_id)
    or public.current_role() = 'superAdmin'
  );

drop policy if exists futto_match_players_update on public.futto_match_players;
create policy futto_match_players_update on public.futto_match_players for update to authenticated
  using (
    profile_id = auth.uid()
    or public.futto_is_match_host(match_id)
    or public.current_role() = 'superAdmin'
  )
  with check (
    status = 'left'
    or public.futto_is_match_host(match_id)
    or public.current_role() = 'superAdmin'
  );