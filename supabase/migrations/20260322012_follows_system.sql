-- =============================================================================
-- FUTTO - Migration: Système d'Abonnements / Following (futto_follows)
-- Permet aux joueurs de se suivre mutuellement, de voir leurs amis et de les
-- inviter rapidement aux matchs.
-- =============================================================================

create table if not exists public.futto_follows (
  follower_id uuid not null references public.futto_profiles(id) on delete cascade,
  following_id uuid not null references public.futto_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create index if not exists idx_futto_follows_follower on public.futto_follows(follower_id);
create index if not exists idx_futto_follows_following on public.futto_follows(following_id);

alter table public.futto_follows enable row level security;

drop policy if exists "futto_follows_select" on public.futto_follows;
create policy "futto_follows_select" on public.futto_follows
  for select using (true);

drop policy if exists "futto_follows_insert" on public.futto_follows;
create policy "futto_follows_insert" on public.futto_follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "futto_follows_delete" on public.futto_follows;
create policy "futto_follows_delete" on public.futto_follows
  for delete using (auth.uid() = follower_id);
