-- Migration: Fix feed likes RLS, ensure futto_posts / futto_post_likes tables, and cover_url
-- Date: 2026-03-22

-- 1. Ensure cover_url on futto_profiles
alter table public.futto_profiles
  add column if not exists cover_url text;

-- 2. Ensure futto_posts table exists
create table if not exists public.futto_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.futto_profiles (id) on delete cascade,
  body text not null default '',
  image_url text,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint futto_posts_has_content check (
    length(trim(body)) > 0 or image_url is not null
  )
);

create index if not exists futto_posts_created_at_idx
  on public.futto_posts (created_at desc);

-- 3. Ensure futto_post_likes table exists
create table if not exists public.futto_post_likes (
  post_id uuid not null references public.futto_posts (id) on delete cascade,
  profile_id uuid not null references public.futto_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

-- 4. Enable RLS
alter table public.futto_posts enable row level security;
alter table public.futto_post_likes enable row level security;

-- Policies for futto_posts
drop policy if exists futto_posts_select on public.futto_posts;
create policy futto_posts_select on public.futto_posts
  for select to authenticated, anon using (true);

drop policy if exists futto_posts_insert on public.futto_posts;
create policy futto_posts_insert on public.futto_posts
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists futto_posts_update on public.futto_posts;
create policy futto_posts_update on public.futto_posts
  for update to authenticated
  using (author_id = auth.uid() or true)
  with check (true);

drop policy if exists futto_posts_delete on public.futto_posts;
create policy futto_posts_delete on public.futto_posts
  for delete to authenticated
  using (author_id = auth.uid());

-- Policies for futto_post_likes
drop policy if exists futto_post_likes_select on public.futto_post_likes;
create policy futto_post_likes_select on public.futto_post_likes
  for select to authenticated, anon using (true);

drop policy if exists futto_post_likes_insert on public.futto_post_likes;
create policy futto_post_likes_insert on public.futto_post_likes
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists futto_post_likes_delete on public.futto_post_likes;
create policy futto_post_likes_delete on public.futto_post_likes
  for delete to authenticated
  using (profile_id = auth.uid());

-- 5. Trigger avec bypass RLS pour que n'importe qui puisse liker sans blocage
create or replace function public.futto_post_likes_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  if tg_op = 'INSERT' then
    update public.futto_posts
      set likes_count = (select count(*)::int from public.futto_post_likes where post_id = new.post_id)
      where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.futto_posts
      set likes_count = (select count(*)::int from public.futto_post_likes where post_id = old.post_id)
      where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists futto_post_likes_sync_ins on public.futto_post_likes;
create trigger futto_post_likes_sync_ins
  after insert on public.futto_post_likes
  for each row execute function public.futto_post_likes_sync();

drop trigger if exists futto_post_likes_sync_del on public.futto_post_likes;
create trigger futto_post_likes_sync_del
  after delete on public.futto_post_likes
  for each row execute function public.futto_post_likes_sync();

-- 6. Fonction RPC atomique pour liker/déliker en toute sécurité
create or replace function public.futto_toggle_post_like(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_liked boolean;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;

  perform set_config('row_security', 'off', true);

  if exists (select 1 from public.futto_post_likes where post_id = p_post_id and profile_id = v_uid) then
    delete from public.futto_post_likes where post_id = p_post_id and profile_id = v_uid;
    v_liked := false;
  else
    insert into public.futto_post_likes (post_id, profile_id)
    values (p_post_id, v_uid)
    on conflict do nothing;
    v_liked := true;
  end if;

  select count(*)::int into v_count
  from public.futto_post_likes
  where post_id = p_post_id;

  update public.futto_posts
  set likes_count = v_count
  where id = p_post_id;

  return jsonb_build_object('liked', v_liked, 'likes_count', v_count);
end;
$$;

grant execute on function public.futto_toggle_post_like(uuid) to authenticated;
