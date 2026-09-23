# NEXT_TASK — P0.1 Réservation terrain

**Statut** : ✅ **RÉSOLU le 2026-09-23** — flow terrain opérationnel de bout en bout.
Suite : P0.2 « Séparer Demander terrain ≠ Créer match » (CTA détail terrain vs booking).

## ✅ Récap de la résolution

**Audit (≈ 90 % déjà câblé de façon autonome)** — la table, les RPC et l'app existaient :
- SQL : table `futto_terrain_bookings` (migration `20260322006`) + RPC `futto_set_booking_status`
  (016, propriétaire/superAdmin/requester-cancel) + `futto_mark_booking_paid` (006, requester/superAdmin,
  garde wallet `futto_wallet_transactions`), politiques RLS select/insert/update owner.
- App : `app/demander-creneau.tsx` (date `MatchDateTimeField`, durée, note → insert `requested` + notif
  manager/joueur) ; `app/mes-reservations.tsx` (2 onglets : mes demandes + demandes reçues, confirmer/
  refuser via RPC, payer cash/wave/orange/mtn, CTA « Créer mon match » si confirmé).
- BO : `futtobackoffice/src/app/reservations/page.tsx` complet (valider/refuser/payé + notif in-app+push +
  filtre manager/superAdmin), lien Sidebar + dashboard.

**Corrections apportées :**
1. **Faille anti-magouille RLS** : la policy `futto_bookings_update_requester` permettait au demandeur
   de passer lui-même en `confirmed`/`paid`/`rejected` par update direct. → Migration
   `20260323_p01_booking_rls_hardening.sql` : requester ne peut updater que tant que `status = 'requested'`.
   Les transitions passent obligatoirement par `futto_set_booking_status` / `futto_mark_booking_paid`.
   (`APPLY_P0_P2_FLOWS.sql` mis à jour en parity.)
2. **`app/reserver.tsx` = écran démo legacy** : dates fictives (+1 jour sans lien jours), bouton
   « Payer et réserver » trompeur, fallback DEMO_TERRAINS fantômes. → Réécrit en **directory réel** :
   liste des vraies terrains + bouton « Demander un créneau » → `/demander-creneau?terrainId=` +
   « Voir la fiche » ; état vide si aucun terrain (CTA Ajouter un terrain pour manager).
3. **`mes-reservations.tsx`** : boutons « Payer » n'apparaissent plus en `requested`, seulement après
   `confirmed` (cohérent avec « le gérant confirme, tu paies ensuite »).

## Definition of Done (P0.1 — atteint)
- [x] Demande de créneau (date, durée, message) → status `requested` ≠ `confirmed`
- [x] Gérant confirme / refuse / marque payé (app + BO), requester voit les états et paie après validation
- [x] RLS : aucun passage de statut par update direct du demandeur (par RPC uniquement)
- [x] `npx tsc --noEmit` → **0 erreur** ; `npx expo export --platform android` → **bundle OK**
- [x] Changelog PRODUCT_ROADMAP.md : ligne P0.1 ajoutée