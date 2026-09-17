-- Pseudo + niveau / note joueur + annulation auto des matchs
-- À exécuter dans Supabase SQL Editor

alter table public.futto_profiles
  add column if not exists pseudo text;

alter table public.futto_profiles
  add column if not exists skill_level text not null default 'amateur';

alter table public.futto_profiles
  add column if not exists rating numeric(3,1) not null default 3.0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'futto_profiles_skill_level_check'
  ) then
    alter table public.futto_profiles
      add constraint futto_profiles_skill_level_check
      check (skill_level in ('beginner', 'amateur', 'intermediate', 'advanced', 'pro'));
  end if;
end $$;

create unique index if not exists futto_profiles_pseudo_uidx
  on public.futto_profiles (lower(pseudo))
  where pseudo is not null and length(trim(pseudo)) > 0;

-- Annule les matchs dont le kickoff est passé et :
-- 1) effectif < minimum, OU
-- 2) un booking terrain est lié et n'est pas payé
create or replace function public.futto_cancel_stale_matches()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
begin
  perform set_config('row_security', 'off', true);

  with targets as (
    select m.id
    from public.futto_matches m
    left join public.futto_terrain_bookings b on b.id = m.booking_id
    where m.status in ('draft', 'planned', 'confirmed')
      and m.kickoff_at is not null
      and m.kickoff_at <= now()
      and (
        coalesce(m.spots_taken, 0) < coalesce(m.spots_min, 2)
        or (
          m.booking_id is not null
          and coalesce(b.status, 'requested') <> 'paid'
        )
      )
  ),
  upd as (
    update public.futto_matches m
    set status = 'cancelled', updated_at = now()
    from targets t
    where m.id = t.id
    returning m.id
  )
  select count(*)::int into n from upd;

  insert into public.futto_notifications (profile_id, title, body, kind)
  select
    m.host_id,
    'Match annulé',
    format(
      '« %s » a été annulé : %s.',
      m.title,
      case
        when coalesce(m.spots_taken, 0) < coalesce(m.spots_min, 2)
          then 'minimum de joueurs non atteint'
        else 'créneau terrain non payé à l’heure du coup d’envoi'
      end
    ),
    'match'
  from public.futto_matches m
  where m.status = 'cancelled'
    and m.updated_at >= now() - interval '2 minutes'
    and m.kickoff_at <= now();

  return n;
end;
$$;

grant execute on function public.futto_cancel_stale_matches() to authenticated;

comment on function public.futto_cancel_stale_matches() is
  'À planifier (pg_cron toutes les 5–15 min) ou appeler depuis un job Edge.';
