-- Migration 20260322016_terrain_validation_flow.sql
-- Validation des terrains par le propriétaire/backoffice avant création de match

-- 1. S'assurer de la colonne booking_id sur futto_matches et match_id sur futto_terrain_bookings
alter table public.futto_matches
  add column if not exists booking_id uuid references public.futto_terrain_bookings (id) on delete set null;

alter table public.futto_terrain_bookings
  add column if not exists match_id uuid references public.futto_matches (id) on delete set null;

-- 2. Politiques RLS permissives et sécurisées pour propriétaires de terrain sur futto_terrain_bookings
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

-- 3. Fonction RPC de validation de créneau par le propriétaire ou superAdmin
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

  -- Vérifier autorisation : superAdmin, propriétaire du terrain, ou requester (pour annulation)
  if v_role <> 'superAdmin' and (v_terrain.created_by is null or v_terrain.created_by <> v_uid) then
    if p_status = 'cancelled' and v_booking.requester_id = v_uid then
      -- OK requester annule
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

  -- Notification automatique pour requester
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
