-- Localisations manuelles FUTTO (ville → commune → quartier)
-- À coller dans Supabase SQL Editor si le MCP n'est pas lié au projet.

create table if not exists public.futto_localisations (
  id uuid primary key default gen_random_uuid(),
  ville text not null,
  commune text not null,
  quartier text not null,
  label text generated always as (
    ville || ' · ' || commune || ' · ' || quartier
  ) stored,
  lat double precision,
  lng double precision,
  boost smallint not null default 0 check (boost >= 0 and boost <= 100),
  active boolean not null default true,
  created_by uuid references public.futto_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ville, commune, quartier)
);

create index if not exists futto_localisations_ville_idx
  on public.futto_localisations (ville);
create index if not exists futto_localisations_active_idx
  on public.futto_localisations (active);
create index if not exists futto_localisations_label_idx
  on public.futto_localisations (label);

alter table public.futto_terrains
  add column if not exists localisation_id uuid
    references public.futto_localisations (id) on delete set null;

create index if not exists futto_terrains_localisation_idx
  on public.futto_terrains (localisation_id);

alter table public.futto_localisations enable row level security;

drop policy if exists futto_localisations_select on public.futto_localisations;
create policy futto_localisations_select on public.futto_localisations
  for select to authenticated using (true);

drop policy if exists futto_localisations_select_anon on public.futto_localisations;
create policy futto_localisations_select_anon on public.futto_localisations
  for select to anon using (active = true);

drop policy if exists futto_localisations_insert on public.futto_localisations;
create policy futto_localisations_insert on public.futto_localisations
  for insert to authenticated
  with check (public.current_role() = 'superAdmin');

drop policy if exists futto_localisations_update on public.futto_localisations;
create policy futto_localisations_update on public.futto_localisations
  for update to authenticated
  using (public.current_role() = 'superAdmin');

drop policy if exists futto_localisations_delete on public.futto_localisations;
create policy futto_localisations_delete on public.futto_localisations
  for delete to authenticated
  using (public.current_role() = 'superAdmin');

-- Seed Abidjan (boosté) — ignore si déjà présent
insert into public.futto_localisations (ville, commune, quartier, lat, lng, boost)
values
  ('Abidjan', 'Cocody', 'Angré', 5.398, -3.98, 80),
  ('Abidjan', 'Cocody', 'Riviera', 5.35, -3.98, 75),
  ('Abidjan', 'Cocody', 'Deux Plateaux', 5.36, -3.99, 70),
  ('Abidjan', 'Yopougon', 'Siporex', 5.34, -4.09, 60),
  ('Abidjan', 'Yopougon', 'Selmer', 5.33, -4.08, 55),
  ('Abidjan', 'Marcory', 'Zone 4', 5.29, -3.99, 65),
  ('Abidjan', 'Plateau', 'Centre', 5.32, -4.02, 50),
  ('Abidjan', 'Abobo', 'Avocatier', 5.43, -4.02, 45)
on conflict (ville, commune, quartier) do nothing;
