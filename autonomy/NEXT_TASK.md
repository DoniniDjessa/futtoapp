# NEXT_TASK — P0.2 Séparer Demander terrain ≠ Créer match

**Statut** : ✅ **RÉSOLU le 2026-09-23** — CTA fiche terrain séparés (booking ≠ match).
Suite : P0.3 « Effectif match » (host auto-inscrit ; Rejoindre / Quitter ; sync `spots_taken`).

## ✅ Récap de la résolution

**Audit** — `TerrainDetailSheet` (modal HomeMap, mode page) était déjà séparé :
« Demander un créneau » → `/demander-creneau?terrainId=` ; « Créer un match sur ce terrain » → `/creer`.
Le vrai problème était **`app/terrain/[id].tsx`** (fiche riche, pointée par tous les listings) :
- formulaire inline trompeur : sélecteurs slot/durée, **date +1 jour fictive**, insert `requested` direct
  avec badge « Réservé pour … » (anti-fake violation), sans passer par la demande propre.

**Corrections :**
1. `terrain/[id].tsx` : supprimé le formulaire inline fake (état `slot`/`duration`/`booked`, `handleBook`,
   sélecteurs créneaux, prix total), remplacé par une **sticky bar** à 2 CTA :
   - « Demander un créneau » → `/demander-creneau?terrainId=` (booking, états request flow P0.1)
   - « Créer un match sur ce terrain » → `/creer` (match)
   Galerie, contact gérant/tel/WhatsApp, description, équipements, horaires, avis réels conservés.
2. `TerrainDetailSheet.tsx` : déjà aligné (aucun changement).
3. `reserver.tsx` (P0.1) : déjà directory réel sans formulaire (aucun changement).

## Definition of Done (P0.2 — atteint)
- [x] Bouton « Demander » fiche terrain → booking terrain (≠ `/creer`)
- [x] « Créer un match » reste `/creer` ; plus aucun formulaire de réservation fake inline
- [x] `npx tsc --noEmit` → **0 erreur** ; `npx expo export --platform android` → **bundle OK**
- [x] Changelog PRODUCT_ROADMAP.md : ligne P0.2 ajoutée