-- Migration 20260323_p01_booking_rls_hardening.sql
-- Durcissement anti-magouille du booking P0.1 :
-- un demandeur ne peut PAS se basculer en confirmed/paid/rejected tout seul.
-- Les transitions de statut passent obligatoirement par :
--   - public.futto_set_booking_status  (propriétaire/superAdmin, ou requester pour cancelled)
--   - public.futto_mark_booking_paid   (requester ou superAdmin, paye après confirmation)
-- Le requester ne peut modifier que son propre booking tant que status = 'requested',
-- sans pouvoir changer le statut ni verrouiller un créneau.

drop policy if exists futto_bookings_update_requester on public.futto_terrain_bookings;
create policy futto_bookings_update_requester on public.futto_terrain_bookings for update to authenticated
  using (requester_id = auth.uid())
  with check (
    requester_id = auth.uid()
    and status = 'requested'
  );