-- Visibilité match : private | public | both
-- + policies sans récursion (matches ne lit PAS match_players)
-- À lancer dans Supabase SQL Editor

do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'futto_matches'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%visibility%';
  if cname is not null then
    execute format('alter table public.futto_matches drop constraint %I', cname);
  end if;
end $$;

alter table public.futto_matches drop constraint if exists futto_matches_visibility_check;

alter table public.futto_matches
  add constraint futto_matches_visibility_check
  check (visibility in ('private', 'public', 'both'));

-- Appliquer aussi FIX_MATCHES_RLS_RECURSION.sql si la récursion persiste.
drop policy if exists futto_matches_select on public.futto_matches;
create policy futto_matches_select on public.futto_matches for select to authenticated
  using (
    host_id = auth.uid()
    or visibility in ('public', 'both')
  );

drop policy if exists futto_matches_select_anon on public.futto_matches;
create policy futto_matches_select_anon on public.futto_matches for select to anon
  using (visibility in ('public', 'both'));
