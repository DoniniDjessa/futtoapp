-- Feed FUTTO : posts + likes
-- À exécuter dans Supabase Dashboard → SQL Editor

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

create table if not exists public.futto_post_likes (
  post_id uuid not null references public.futto_posts (id) on delete cascade,
  profile_id uuid not null references public.futto_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create or replace function public.futto_post_likes_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.futto_posts
      set likes_count = likes_count + 1
      where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.futto_posts
      set likes_count = greatest(likes_count - 1, 0)
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

alter table public.futto_posts enable row level security;
alter table public.futto_post_likes enable row level security;

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
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists futto_posts_delete on public.futto_posts;
create policy futto_posts_delete on public.futto_posts
  for delete to authenticated
  using (author_id = auth.uid());

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
