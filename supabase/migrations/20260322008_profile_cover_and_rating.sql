-- Migration: Add cover_url and make rating nullable (starts at null / Néant)
-- Date: 2026-03-22

-- 1. Photo de couverture
alter table public.futto_profiles
  add column if not exists cover_url text;

-- 2. Note par défaut: Néant (null) au lieu de 3.0
alter table public.futto_profiles
  alter column rating drop not null;

alter table public.futto_profiles
  alter column rating set default null;

-- 3. Assouplissement contrainte skill_level pour supporter les badges dynamiques
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'futto_profiles_skill_level_check'
  ) then
    alter table public.futto_profiles
      drop constraint futto_profiles_skill_level_check;
  end if;
end $$;
