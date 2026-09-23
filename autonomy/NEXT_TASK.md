# NEXT_TASK — P0.3 Effectif match

**Statut** : ✅ **RÉSOLU le 2026-09-23** — join/leave durcis + host auto-inscrit partout.
Suite : P0.4 « Inviter WhatsApp » (message prérempli : titre, lieu, heure, places, prix).

## ✅ Récap de la résolution

**Audit** — l'existant était solide :
- SQL : contrainte unique `futto_match_players(match_id, profile_id)` (upsert OK), trigger
  `futto_match_players_spots_aiud` (recalcul `spots_taken` après insert/update/delete),
  trigger `futto_match_players_min_notify` (notif hôte quand min atteint), RLS select/insert/update/delete.
- App : `creer.tsx` auto-inscrit l'hôte (`status='joined'`) après création ; `match/[id]` join/leave +
  inviter équipe ; `matchs.tsx` toggle join.

**Faille anti-magouille corrigée** — `futto_join_match` (security definer) **ne vérifiait ni visibilité ni
invitation** : n'importe quel user connecté pouvait rejoindre un match privé par id (ou lien). En plus, la
RLS `insert`/`update` permettait l'auto-`joined` par upsert/update direct (contournant le RPC).
- Migration `20260323_p03_join_match_hardening.sql` : requiert `public|both` **OU** `status='invited'`
  **OU** hôte pour rejoindre ; RLS insert = seuls hôte/superAdmin créent des lignes, update joueur limité
  à `status='left'` (retrait/décline), toute montée en `joined` passe par le RPC.
- `match/[id].tsx` `duplicate()` : hôte désormais auto-inscrit (comme `creer`, spots_taken sync par trigger).
- Parity RLS/`futto_join_match` dans `APPLY_P0_P2_FLOWS.sql`.

## Definition of Done (P0.3 — atteint)
- [x] Hôte auto-inscrit (création + duplication)
- [x] Rejoindre / Quitter (RPC join → statut `joined`/`left`, déclin invitation)
- [x] Sync `spots_taken` par trigger (aucun update manuel du compteur côté app)
- [x] Anti-magouille : match privé = invité/hôte uniquement ; plus d'auto-`joined` hors RPC
- [x] `npx tsc --noEmit` → **0 erreur** ; `npx expo export --platform android` → **bundle OK**
- [x] Changelog PRODUCT_ROADMAP.md : ligne P0.3 ajoutée |