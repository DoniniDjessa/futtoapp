-- 20260322011_conversations_and_messages.sql
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

-- Policies
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

-- Trigger pour synchroniser last_message_text sur la conversation
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

  -- Incrémenter le compteur de non lus pour les autres participants
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
