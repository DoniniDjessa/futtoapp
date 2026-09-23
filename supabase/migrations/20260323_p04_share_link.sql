-- Migration 20260323_p04_share_link.sql
-- P0.4 Inviter WhatsApp : rend le lien de partage https://futto.app/m/{token} fonctionnel.
-- 1. futto_match_by_token : résolution publique du match par share_token (affichage invitation
--    avant login, y compris matchs privés — le lien est le mécanisme d'invitation).
-- 2. futto_join_match(p_match_id, p_token) : le token partagé équivaut à une invitation.

create or replace function public.futto_match_by_token(p_token text)
returns table (
  id uuid,
  title text,
  terrain_label text,
  zone text,
  kickoff_at timestamptz,
  format text,
  spots_total integer,
  spots_taken integer,
  spots_min integer,
  join_mode text,
  price_participation integer,
  visibility text,
  status text,
  host_pseudo text,
  host_full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id, m.title, m.terrain_label, m.zone, m.kickoff_at, m.format,
    m.spots_total, m.spots_taken, m.spots_min, m.join_mode, m.price_participation,
    m.visibility, m.status,
    p.pseudo as host_pseudo, p.full_name as host_full_name
  from public.futto_matches m
  left join public.futto_profiles p on p.id = m.host_id
  where m.share_token = p_token
    and m.status not in ('cancelled', 'played');
$$;

grant execute on function public.futto_match_by_token(text) to anon, authenticated;

create or replace function public.futto_join_match(p_match_id uuid, p_token text default null)
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

  -- Ouvert, hôte, invité explicitement, ou lien de partage valide (= invitation).
  if not (is_open or is_host or is_invited
          or (p_token is not null and m.share_token = p_token)) then
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

grant execute on function public.futto_join_match(uuid, text) to authenticated;