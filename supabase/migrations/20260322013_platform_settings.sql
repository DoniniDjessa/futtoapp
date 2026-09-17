-- =============================================================================
-- FUTTO - Migration: Paramètres Plateforme (futto_platform_settings)
-- Permet de configurer les taux de commission (tournois, etc.) depuis le backoffice
-- et de les appliquer dynamiquement dans l'application mobile.
-- =============================================================================

create table if not exists public.futto_platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  label text,
  updated_at timestamptz not null default now()
);

alter table public.futto_platform_settings enable row level security;

drop policy if exists "futto_platform_settings_select" on public.futto_platform_settings;
create policy "futto_platform_settings_select" on public.futto_platform_settings
  for select using (true);

drop policy if exists "futto_platform_settings_all" on public.futto_platform_settings;
create policy "futto_platform_settings_all" on public.futto_platform_settings
  for all to authenticated using (true) with check (true);

-- Commission générale des tournois définie par défaut à 10%
insert into public.futto_platform_settings (key, value, label)
values (
  'tournament_commission',
  '{"percent": 10}'::jsonb,
  'Commission générale des tournois (%)'
)
on conflict (key) do nothing;
