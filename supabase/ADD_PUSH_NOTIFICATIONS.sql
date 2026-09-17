-- Push tokens + notif kinds for FUTTO
-- Lance dans Supabase SQL Editor

alter table public.futto_profiles
  add column if not exists expo_push_token text;

create index if not exists futto_profiles_push_token_idx
  on public.futto_profiles (expo_push_token)
  where expo_push_token is not null;

-- Élargir kinds notifications
do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'futto_notifications'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%kind%';
  if cname is not null then
    execute format('alter table public.futto_notifications drop constraint %I', cname);
  end if;
end $$;

alter table public.futto_notifications drop constraint if exists futto_notifications_kind_check;
alter table public.futto_notifications
  add constraint futto_notifications_kind_check
  check (kind in ('match', 'invite', 'reminder', 'system', 'booking', 'wallet'));

alter table public.futto_notifications
  add column if not exists data jsonb;

-- Notifier requester quand booking confirmé/refusé
create or replace function public.futto_notify_booking_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status
     and new.status in ('confirmed', 'rejected', 'paid') then
    insert into public.futto_notifications (profile_id, title, body, kind, data)
    values (
      new.requester_id,
      case new.status
        when 'confirmed' then 'Créneau confirmé'
        when 'rejected' then 'Créneau refusé'
        when 'paid' then 'Paiement enregistré'
        else 'Réservation'
      end,
      case new.status
        when 'confirmed' then 'Le gérant a confirmé ta demande — tu peux marquer le paiement.'
        when 'rejected' then 'Le gérant a refusé ta demande de créneau.'
        when 'paid' then 'Ton paiement terrain est enregistré.'
        else new.status
      end,
      'booking',
      jsonb_build_object('booking_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists futto_bookings_notify on public.futto_terrain_bookings;
create trigger futto_bookings_notify
  after update on public.futto_terrain_bookings
  for each row execute function public.futto_notify_booking_status();

-- Helper: create in-app notif (callable from client for self-tests / host actions)
create or replace function public.futto_notify_user(
  p_profile_id uuid,
  p_title text,
  p_body text,
  p_kind text default 'system',
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nid uuid;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if auth.uid() <> p_profile_id and public.current_role() <> 'superAdmin' then
    -- host can notify players of own match via kind match/invite
    if p_kind not in ('match', 'invite', 'reminder') then
      raise exception 'Non autorisé';
    end if;
  end if;
  insert into public.futto_notifications (profile_id, title, body, kind, data)
  values (p_profile_id, p_title, p_body, p_kind, p_data)
  returning id into nid;
  return nid;
end;
$$;

grant execute on function public.futto_notify_user(uuid, text, text, text, jsonb) to authenticated;
