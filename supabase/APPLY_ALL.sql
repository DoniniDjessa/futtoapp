-- FUTTO schema — tables préfixées futto_
-- Projet: tfcnforazrpfnrwtlisc
-- Si anciennes tables (profiles, terrains…) existent, lance d’abord RENAME_TO_FUTTO.sql

create extension if not exists "pgcrypto";

-- App mobile: player | manager. Backoffice staff: superAdmin (email réel).
-- Managers backoffice: créés via Utilisateurs (email alias {pseudo}@bo.futto.app).
create table if not exists public.futto_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  pseudo text unique,
  full_name text,
  first_name text,
  phone text,
  position text,
  city text default 'Abidjan',
  avatar_url text,
  cover_url text,
  skill_level text default 'nouveau',
  rating numeric(3,1) default null,
  role text not null default 'player'
    check (role in ('player', 'manager', 'superAdmin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists futto_profiles_role_idx on public.futto_profiles (role);
create index if not exists futto_profiles_pseudo_idx on public.futto_profiles (pseudo);

create table if not exists public.futto_terrains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone text,
  quartier text,
  price_per_hour integer not null default 0,
  surface text,
  rating numeric(2,1) default 0,
  distance_km numeric(4,1),
  lat double precision,
  lng double precision,
  image_url text,
  photos text[],
  description text,
  amenities text[],
  contact_phone text,
  opening_time text default '08:00',
  closing_time text default '23:00',
  pin_top text,
  pin_left text,
  created_by uuid references public.futto_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists futto_terrains_created_by_idx on public.futto_terrains (created_by);

create table if not exists public.futto_matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.futto_profiles (id) on delete cascade,
  title text not null,
  visibility text not null default 'private'
    check (visibility in ('private', 'public')),
  terrain_id uuid references public.futto_terrains (id) on delete set null,
  terrain_label text,
  zone text,
  kickoff_at timestamptz,
  format text default '5v5',
  spots_total integer not null default 10,
  spots_taken integer not null default 0,
  price_participation integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'planned', 'confirmed', 'played', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists futto_matches_host_idx on public.futto_matches (host_id);
create index if not exists futto_matches_kickoff_idx on public.futto_matches (kickoff_at);
create index if not exists futto_matches_visibility_idx on public.futto_matches (visibility);

create table if not exists public.futto_match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.futto_matches (id) on delete cascade,
  profile_id uuid references public.futto_profiles (id) on delete set null,
  display_name text,
  phone text,
  status text not null default 'invited'
    check (status in ('invited', 'joined', 'left', 'no_show')),
  created_at timestamptz not null default now(),
  unique (match_id, profile_id)
);

create table if not exists public.futto_wallet_accounts (
  profile_id uuid primary key references public.futto_profiles (id) on delete cascade,
  balance_fcfa integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.futto_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.futto_profiles (id) on delete cascade,
  amount_fcfa integer not null,
  kind text not null check (kind in ('recharge', 'participation', 'terrain', 'refund')),
  label text,
  provider text check (provider is null or provider in ('orange', 'mtn', 'wave', 'cash')),
  match_id uuid references public.futto_matches (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.futto_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.futto_profiles (id) on delete cascade,
  title text not null,
  body text,
  kind text not null default 'match'
    check (kind in ('match', 'invite', 'reminder', 'system')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.futto_tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_label text,
  location text,
  teams integer not null default 0,
  teams_max integer not null default 8,
  fee_fcfa integer not null default 0,
  prize text,
  status text not null default 'open'
    check (status in ('open', 'running', 'full', 'done')),
  poster_url text,
  organizer_id uuid references public.futto_profiles (id) on delete set null,
  commission_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.futto_profiles (id, email, full_name, first_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    'player'
  )
  on conflict (id) do nothing;
  insert into public.futto_wallet_accounts (profile_id) values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.futto_profiles where id = auth.uid()), 'player');
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('manager', 'superAdmin');
$$;

alter table public.futto_profiles enable row level security;
alter table public.futto_terrains enable row level security;
alter table public.futto_matches enable row level security;
alter table public.futto_match_players enable row level security;
alter table public.futto_wallet_accounts enable row level security;
alter table public.futto_wallet_transactions enable row level security;
alter table public.futto_notifications enable row level security;
alter table public.futto_tournaments enable row level security;

drop policy if exists futto_profiles_select on public.futto_profiles;
create policy futto_profiles_select on public.futto_profiles for select to authenticated
  using (true);

drop policy if exists futto_profiles_select_anon on public.futto_profiles;
create policy futto_profiles_select_anon on public.futto_profiles for select to anon
  using (true);

drop policy if exists futto_profiles_update_self on public.futto_profiles;
create policy futto_profiles_update_self on public.futto_profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.futto_profiles p where p.id = auth.uid())
  );

drop policy if exists futto_profiles_staff_update on public.futto_profiles;
create policy futto_profiles_staff_update on public.futto_profiles for update to authenticated
  using (public.current_role() = 'superAdmin')
  with check (public.current_role() = 'superAdmin');

drop policy if exists futto_terrains_select on public.futto_terrains;
create policy futto_terrains_select on public.futto_terrains for select to authenticated
  using (true);

drop policy if exists futto_terrains_select_anon on public.futto_terrains;
create policy futto_terrains_select_anon on public.futto_terrains for select to anon
  using (true);

drop policy if exists futto_terrains_insert on public.futto_terrains;
create policy futto_terrains_insert on public.futto_terrains for insert to authenticated
  with check (
    public.is_manager_or_admin()
    and created_by = auth.uid()
  );

drop policy if exists futto_terrains_update on public.futto_terrains;
create policy futto_terrains_update on public.futto_terrains for update to authenticated
  using (
    public.current_role() = 'superAdmin'
    or (public.current_role() = 'manager' and created_by = auth.uid())
  );

drop policy if exists futto_terrains_delete on public.futto_terrains;
create policy futto_terrains_delete on public.futto_terrains for delete to authenticated
  using (
    public.current_role() = 'superAdmin'
    or (public.current_role() = 'manager' and created_by = auth.uid())
  );

-- Security Definer functions to break RLS mutual recursion
create or replace function public.futto_is_player_in_match(p_match_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_in boolean;
begin
  perform set_config('row_security', 'off', true);
  select exists (
    select 1 from public.futto_match_players
    where match_id = p_match_id and profile_id = p_user_id
  ) into is_in;
  return coalesce(is_in, false);
end;
$$;

create or replace function public.futto_can_view_match_players(p_match_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  can_view boolean;
begin
  perform set_config('row_security', 'off', true);
  select exists (
    select 1 from public.futto_matches
    where id = p_match_id and (visibility in ('public', 'both') or host_id = p_user_id)
  ) into can_view;
  return coalesce(can_view, false);
end;
$$;

grant execute on function public.futto_is_player_in_match(uuid, uuid) to authenticated, anon;
grant execute on function public.futto_can_view_match_players(uuid, uuid) to authenticated, anon;

drop policy if exists futto_matches_select on public.futto_matches;
create policy futto_matches_select on public.futto_matches for select to authenticated
  using (
    visibility in ('public', 'both')
    or host_id = auth.uid()
    or public.futto_is_player_in_match(id, auth.uid())
  );

drop policy if exists futto_matches_select_anon on public.futto_matches;
create policy futto_matches_select_anon on public.futto_matches for select to anon
  using (visibility in ('public', 'both'));

drop policy if exists futto_matches_insert on public.futto_matches;
create policy futto_matches_insert on public.futto_matches for insert to authenticated
  with check (host_id = auth.uid());

drop policy if exists futto_matches_update on public.futto_matches;
create policy futto_matches_update on public.futto_matches for update to authenticated
  using (host_id = auth.uid() or public.current_role() = 'superAdmin');

drop policy if exists futto_match_players_select on public.futto_match_players;
create policy futto_match_players_select on public.futto_match_players for select to authenticated
  using (
    profile_id = auth.uid()
    or public.futto_can_view_match_players(match_id, auth.uid())
  );

drop policy if exists futto_match_players_insert on public.futto_match_players;
create policy futto_match_players_insert on public.futto_match_players for insert to authenticated
  with check (
    exists (select 1 from public.futto_matches m where m.id = match_id and m.host_id = auth.uid())
    or profile_id = auth.uid()
  );

drop policy if exists futto_wallet_select on public.futto_wallet_accounts;
create policy futto_wallet_select on public.futto_wallet_accounts for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists futto_wallet_tx_select on public.futto_wallet_transactions;
create policy futto_wallet_tx_select on public.futto_wallet_transactions for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists futto_notifs_select on public.futto_notifications;
create policy futto_notifs_select on public.futto_notifications for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists futto_notifs_update on public.futto_notifications;
create policy futto_notifs_update on public.futto_notifications for update to authenticated
  using (profile_id = auth.uid());

drop policy if exists futto_tournaments_select on public.futto_tournaments;
create policy futto_tournaments_select on public.futto_tournaments for select to authenticated
  using (true);

drop policy if exists futto_tournaments_select_anon on public.futto_tournaments;
create policy futto_tournaments_select_anon on public.futto_tournaments for select to anon
  using (true);

drop policy if exists futto_tournaments_write on public.futto_tournaments;
create policy futto_tournaments_write on public.futto_tournaments for all to authenticated
  using (organizer_id = auth.uid() or public.current_role() = 'superAdmin')
  with check (organizer_id = auth.uid() or public.current_role() = 'superAdmin');

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'futto-bucket',
  'futto-bucket',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists futto_bucket_public_read on storage.objects;
create policy futto_bucket_public_read on storage.objects
  for select to public
  using (bucket_id = 'futto-bucket');

drop policy if exists futto_bucket_auth_insert on storage.objects;
create policy futto_bucket_auth_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'futto-bucket');

drop policy if exists futto_bucket_auth_update on storage.objects;
create policy futto_bucket_auth_update on storage.objects
  for update to authenticated
  using (bucket_id = 'futto-bucket' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'futto-bucket');

drop policy if exists futto_bucket_auth_delete on storage.objects;
create policy futto_bucket_auth_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'futto-bucket'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from public.futto_profiles p where p.id = auth.uid() and p.role = 'superAdmin')
    )
  );

-- Storage policies end
-- ─────────────────────────────────────────────────────────
-- Feed FUTTO : posts + likes
-- ─────────────────────────────────────────────────────────
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
  using (author_id = auth.uid() or true)
  with check (true);

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

-- ============================================================================
-- 12. Feed Comments & Player Availability Status
-- ============================================================================
create table if not exists public.futto_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.futto_posts (id) on delete cascade,
  author_id uuid not null references public.futto_profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists futto_post_comments_post_idx
  on public.futto_post_comments (post_id, created_at asc);

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

-- Statut disponibilité pour jouer sur profil
alter table public.futto_profiles
  add column if not exists is_available_to_play boolean not null default false;

-- Note par défaut : Néant (null)
alter table public.futto_profiles
  alter column rating drop not null;
alter table public.futto_profiles
  alter column rating set default null;
update public.futto_profiles
  set rating = null
  where rating = 3.0;

-- Premier superAdmin (email réel) — décommente et adapte :
-- update public.futto_profiles set role = 'superAdmin' where email = 'TON_EMAIL_REEL';

-- Conversations & Messages réels entre joueurs FUTTO
create table if not exists public.futto_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_text text,
  last_message_at timestamptz default now()
);

create table if not exists public.futto_conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.futto_conversations (id) on delete cascade,
  profile_id uuid not null references public.futto_profiles (id) on delete cascade,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (conversation_id, profile_id)
);

create index if not exists futto_conv_part_profile_idx
  on public.futto_conversation_participants (profile_id);

create table if not exists public.futto_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.futto_conversations (id) on delete cascade,
  sender_id uuid not null references public.futto_profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists futto_messages_conv_created_idx
  on public.futto_messages (conversation_id, created_at asc);

alter table public.futto_conversations enable row level security;
alter table public.futto_conversation_participants enable row level security;
alter table public.futto_messages enable row level security;

drop policy if exists futto_conversations_select on public.futto_conversations;
create policy futto_conversations_select on public.futto_conversations
  for select using (
    exists (
      select 1 from public.futto_conversation_participants cp
      where cp.conversation_id = futto_conversations.id and cp.profile_id = auth.uid()
    )
  );

drop policy if exists futto_conversations_insert on public.futto_conversations;
create policy futto_conversations_insert on public.futto_conversations
  for insert with check (auth.uid() is not null);

drop policy if exists futto_conversations_update on public.futto_conversations;
create policy futto_conversations_update on public.futto_conversations
  for update using (
    exists (
      select 1 from public.futto_conversation_participants cp
      where cp.conversation_id = futto_conversations.id and cp.profile_id = auth.uid()
    )
  );

drop policy if exists futto_conversation_participants_select on public.futto_conversation_participants;
create policy futto_conversation_participants_select on public.futto_conversation_participants
  for select using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.futto_conversation_participants cp2
      where cp2.conversation_id = futto_conversation_participants.conversation_id
        and cp2.profile_id = auth.uid()
    )
  );

drop policy if exists futto_conversation_participants_insert on public.futto_conversation_participants;
create policy futto_conversation_participants_insert on public.futto_conversation_participants
  for insert with check (auth.uid() is not null);

drop policy if exists futto_conversation_participants_update on public.futto_conversation_participants;
create policy futto_conversation_participants_update on public.futto_conversation_participants
  for update using (profile_id = auth.uid());

drop policy if exists futto_messages_select on public.futto_messages;
create policy futto_messages_select on public.futto_messages
  for select using (
    exists (
      select 1 from public.futto_conversation_participants cp
      where cp.conversation_id = futto_messages.conversation_id
        and cp.profile_id = auth.uid()
    )
  );

drop policy if exists futto_messages_insert on public.futto_messages;
create policy futto_messages_insert on public.futto_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.futto_conversation_participants cp
      where cp.conversation_id = futto_messages.conversation_id
        and cp.profile_id = auth.uid()
    )
  );

create or replace function public.futto_sync_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.futto_conversations
  set last_message_text = new.content,
      last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;

  update public.futto_conversation_participants
  set unread_count = unread_count + 1
  where conversation_id = new.conversation_id
    and profile_id <> new.sender_id;

  return new;
end;
$$;

drop trigger if exists futto_messages_sync_last on public.futto_messages;
create trigger futto_messages_sync_last
  after insert on public.futto_messages
  for each row execute function public.futto_sync_last_message();

-- -----------------------------------------------------------------------------
-- Abonnements / Following (futto_follows)
-- -----------------------------------------------------------------------------
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

drop policy if exists "futto_follows_update" on public.futto_follows;
create policy "futto_follows_update" on public.futto_follows
  for update using (auth.uid() = follower_id);

-- -----------------------------------------------------------------------------
-- Paramètres Plateforme & Commissions (futto_platform_settings)
-- -----------------------------------------------------------------------------
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

insert into public.futto_platform_settings (key, value, label)
values (
  'tournament_commission',
  '{"percent": 10}'::jsonb,
  'Commission générale des tournois (%)'
)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 20260322014_tournament_registrations_and_matches.sql
-- -----------------------------------------------------------------------------
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

insert into public.futto_tournaments (id, name, date_label, location, teams, teams_max, fee_fcfa, prize, status, commission_paid)
values
  ('11111111-1111-1111-1111-111111111101', 'FUTTO CUP 2026', '15 Octobre 2026', 'Abidjan · Cocody', 4, 16, 50000, '1 000 000 FCFA', 'open', true),
  ('11111111-1111-1111-1111-111111111102', 'Maracana Champions League', '28 Octobre 2026', 'Abidjan · Yopougon', 8, 8, 35000, '500 000 FCFA', 'full', true),
  ('11111111-1111-1111-1111-111111111103', 'Five Elite Plateau', '5 Novembre 2026', 'Abidjan · Plateau', 2, 10, 40000, '600 000 FCFA', 'open', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 20260322016_terrain_validation_flow.sql
-- -----------------------------------------------------------------------------
alter table public.futto_matches
  add column if not exists booking_id uuid references public.futto_terrain_bookings (id) on delete set null;

alter table public.futto_terrain_bookings
  add column if not exists match_id uuid references public.futto_matches (id) on delete set null;

drop policy if exists futto_bookings_select on public.futto_terrain_bookings;
create policy futto_bookings_select on public.futto_terrain_bookings for select to authenticated
  using (
    requester_id = auth.uid()
    or public.current_role() = 'superAdmin'
    or exists (
      select 1 from public.futto_terrains t
      where t.id = terrain_id and t.created_by = auth.uid()
    )
  );

drop policy if exists futto_bookings_update_owner on public.futto_terrain_bookings;
create policy futto_bookings_update_owner on public.futto_terrain_bookings for update to authenticated
  using (
    public.current_role() = 'superAdmin'
    or exists (
      select 1 from public.futto_terrains t
      where t.id = terrain_id and t.created_by = auth.uid()
    )
  )
  with check (
    public.current_role() = 'superAdmin'
    or exists (
      select 1 from public.futto_terrains t
      where t.id = terrain_id and t.created_by = auth.uid()
    )
  );

create or replace function public.futto_set_booking_status(
  p_booking_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.futto_terrain_bookings;
  v_terrain public.futto_terrains;
  v_role text;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;

  if p_status not in ('confirmed', 'rejected', 'paid', 'cancelled') then
    raise exception 'Statut invalide: %', p_status;
  end if;

  select * into v_booking from public.futto_terrain_bookings where id = p_booking_id;
  if not found then
    raise exception 'Réservation non trouvée';
  end if;

  select * into v_terrain from public.futto_terrains where id = v_booking.terrain_id;

  select role into v_role from public.futto_profiles where id = v_uid;

  if v_role <> 'superAdmin' and (v_terrain.created_by is null or v_terrain.created_by <> v_uid) then
    if p_status = 'cancelled' and v_booking.requester_id = v_uid then
      null;
    else
      raise exception 'Non autorisé à modifier cette réservation';
    end if;
  end if;

  perform set_config('row_security', 'off', true);

  update public.futto_terrain_bookings
  set status = p_status,
      updated_at = now()
  where id = p_booking_id;

  if p_status in ('confirmed', 'rejected', 'paid') then
    insert into public.futto_notifications (profile_id, title, body, kind, data)
    values (
      v_booking.requester_id,
      case p_status
        when 'confirmed' then 'Terrain validé ! ⚽'
        when 'rejected' then 'Demande de terrain refusée'
        when 'paid' then 'Paiement terrain validé'
      end,
      case p_status
        when 'confirmed' then 'Ta réservation pour « ' || coalesce(v_terrain.name, 'le terrain') || ' » a été validée. Tu peux désormais créer ton match !'
        when 'rejected' then 'Le propriétaire a refusé ta demande pour « ' || coalesce(v_terrain.name, 'le terrain') || ' ».'
        when 'paid' then 'Ton paiement pour « ' || coalesce(v_terrain.name, 'le terrain') || ' » a été enregistré.'
      end,
      'system',
      jsonb_build_object('booking_id', p_booking_id, 'status', p_status, 'terrain_id', v_terrain.id)
    );
  end if;

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

grant execute on function public.futto_set_booking_status(uuid, text) to authenticated;




