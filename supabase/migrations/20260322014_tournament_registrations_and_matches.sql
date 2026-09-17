-- Migration 20260322014_tournament_registrations_and_matches.sql
-- Inscriptions d'équipes et tableau des matchs pour tournois FUTTO

create table if not exists public.futto_tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.futto_tournaments (id) on delete cascade,
  captain_id uuid references public.futto_profiles (id) on delete set null,
  team_name text not null,
  contact_phone text,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled')),
  paid_fcfa integer not null default 0,
  created_at timestamptz not null default now(),
  constraint uq_tournament_captain unique (tournament_id, captain_id)
);

create table if not exists public.futto_tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.futto_tournaments (id) on delete cascade,
  round text not null default 'Poule',
  team_a_name text not null,
  team_b_name text not null,
  score_a integer,
  score_b integer,
  status text not null default 'scheduled' check (status in ('scheduled', 'playing', 'finished')),
  match_date text,
  pitch_name text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.futto_tournament_registrations enable row level security;
alter table public.futto_tournament_matches enable row level security;

drop policy if exists futto_tournament_reg_select on public.futto_tournament_registrations;
create policy futto_tournament_reg_select on public.futto_tournament_registrations
  for select using (true);

drop policy if exists futto_tournament_reg_insert on public.futto_tournament_registrations;
create policy futto_tournament_reg_insert on public.futto_tournament_registrations
  for insert to authenticated with check (true);

drop policy if exists futto_tournament_matches_select on public.futto_tournament_matches;
create policy futto_tournament_matches_select on public.futto_tournament_matches
  for select using (true);

drop policy if exists futto_tournament_matches_all on public.futto_tournament_matches;
create policy futto_tournament_matches_all on public.futto_tournament_matches
  for all to authenticated using (true) with check (true);

-- Seed de tournois initiaux réels si la table est vide
insert into public.futto_tournaments (id, name, date_label, location, teams, teams_max, fee_fcfa, prize, status, commission_paid)
values
  ('11111111-1111-1111-1111-111111111101', 'FUTTO CUP 2026', '15 Octobre 2026', 'Abidjan · Cocody', 4, 16, 50000, '1 000 000 FCFA', 'open', true),
  ('11111111-1111-1111-1111-111111111102', 'Maracana Champions League', '28 Octobre 2026', 'Abidjan · Yopougon', 8, 8, 35000, '500 000 FCFA', 'full', true),
  ('11111111-1111-1111-1111-111111111103', 'Five Elite Plateau', '5 Novembre 2026', 'Abidjan · Plateau', 2, 10, 40000, '600 000 FCFA', 'open', true)
on conflict (id) do nothing;

-- Inscriptions exemples réelles pour amorcer l'arbre de compétition
insert into public.futto_tournament_registrations (tournament_id, team_name, status, paid_fcfa)
values
  ('11111111-1111-1111-1111-111111111101', 'Sicogi United', 'confirmed', 50000),
  ('11111111-1111-1111-1111-111111111101', 'Yopougon All Stars', 'confirmed', 50000),
  ('11111111-1111-1111-1111-111111111101', 'Marcory FC', 'confirmed', 50000),
  ('11111111-1111-1111-1111-111111111101', 'Plateau Warriors', 'confirmed', 50000)
on conflict do nothing;

-- Matchs réels du tournoi
insert into public.futto_tournament_matches (tournament_id, round, team_a_name, team_b_name, score_a, score_b, status, match_date, pitch_name)
values
  ('11111111-1111-1111-1111-111111111101', 'Quart de finale', 'Marcory FC', 'Sicogi United', 3, 1, 'finished', 'Samedi · 10:00', 'Terrain 1'),
  ('11111111-1111-1111-1111-111111111101', 'Quart de finale', 'Plateau Warriors', 'Yopougon All Stars', 2, 0, 'finished', 'Samedi · 11:30', 'Terrain 2'),
  ('11111111-1111-1111-1111-111111111101', 'Demi-finale', 'Marcory FC', 'Plateau Warriors', null, null, 'scheduled', 'Dimanche · 15:00', 'Terrain Central')
on conflict do nothing;
