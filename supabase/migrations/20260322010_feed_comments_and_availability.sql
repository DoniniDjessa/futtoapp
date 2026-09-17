-- Migration: Feed comments flow & player availability status ('is_available_to_play')
-- Date: 2026-03-22

-- 1. Ensure comments_count column exists on futto_posts
alter table public.futto_posts
  add column if not exists comments_count int not null default 0;

-- 2. Create futto_post_comments table
create table if not exists public.futto_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.futto_posts (id) on delete cascade,
  author_id uuid not null references public.futto_profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists futto_post_comments_post_idx
  on public.futto_post_comments (post_id, created_at asc);

-- 3. RLS for futto_post_comments
alter table public.futto_post_comments enable row level security;

drop policy if exists futto_post_comments_select on public.futto_post_comments;
create policy futto_post_comments_select on public.futto_post_comments
  for select using (true);

drop policy if exists futto_post_comments_insert on public.futto_post_comments;
create policy futto_post_comments_insert on public.futto_post_comments
  for insert with check (auth.uid() = author_id);

drop policy if exists futto_post_comments_delete on public.futto_post_comments;
create policy futto_post_comments_delete on public.futto_post_comments
  for delete using (auth.uid() = author_id);

-- 4. Trigger to sync comments_count on futto_posts
create or replace function public.futto_post_comments_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  if tg_op = 'INSERT' then
    update public.futto_posts
    set comments_count = coalesce((
      select count(*) from public.futto_post_comments where post_id = new.post_id
    ), 0)
    where id = new.post_id;
    return new;
  else
    update public.futto_posts
    set comments_count = coalesce((
      select count(*) from public.futto_post_comments where post_id = old.post_id
    ), 0)
    where id = old.post_id;
    return old;
  end if;
end;
$$;

drop trigger if exists futto_post_comments_count_trigger on public.futto_post_comments;
create trigger futto_post_comments_count_trigger
  after insert or delete on public.futto_post_comments
  for each row execute function public.futto_post_comments_sync();

-- 5. Add availability status column to futto_profiles
alter table public.futto_profiles
  add column if not exists is_available_to_play boolean not null default false;

-- 6. Reset legacy default 3.0 ratings to null ('Note : Néant')
alter table public.futto_profiles
  alter column rating drop not null;
alter table public.futto_profiles
  alter column rating set default null;
update public.futto_profiles
  set rating = null
  where rating = 3.0;
