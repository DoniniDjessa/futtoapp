# NEXT_TASK — P0.4 Inviter WhatsApp

**Statut** : ✅ **RÉSOLU le 2026-09-23** — lien de partage `https://futto.app/m/{token}` fonctionnel.
Suite : P0.5 « Afficher les revues (notes/avis) sur la fiche terrain ».

## ✅ Récap de la résolution

**Audit** — le message prérempli existait déjà (`lib/share.ts` `matchInviteMessage` : titre, lieu, heure,
places, prix, lien) avec `openWhatsAppInvite` + `shareInvite`, branché sur le détail match et mon-equipe.
Deux trous réels :
1. **Lien mort** : `https://futto.app/m/{token}` ne menait nulle part (aucune route `m/[token]`), et un
   match privé n'était pas résolvable via RLS pour un non-invité.
2. **Home sans partage** : la card « Prochain match » n'offrait pas d'invitation directe.

**Résolution** :
- Migration `20260323_p04_share_link.sql` :
  - `futto_match_by_token(p_token)` : RPC definer **publique (anon + authenticated)** qui résout le match
    par `share_token` (titre, terrain, zone, kickoff, format, places, prix, visibilité, hôte) — requis pour
    afficher l'invitation avant login.
  - `futto_join_match(p_match_id, p_token default null)` : le token partagé équivaut à une invitation
    (match privé accessible via le lien, ce qui est le mécanisme voulu) ; gardes status/complet/adhésion
    (max 5000 FCFA, solde wallet) conservées.
- Route `app/m/[token].tsx` : carte d'invitation (infos + prix + hôte) + bouton « Rejoindre ce match »
  (rdirige vers /login si non connecté), boutons WhatsApp/Partager pour relayer le lien.
- Home `(tabs)/index.tsx` : bouton « Inviter » sur la card prochain match →
  `openWhatsAppInvite(matchInviteMessage(...))` avec `share_token` du match.
- Parity RLS/RPC dans `APPLY_P0_P2_FLOWS.sql`.

## Definition of Done (P0.4 — atteint)
- [x] Message prérempli : titre, lieu, heure, places, prix (free ou FCFA/joueur) + lien
- [x] Ouverture WhatsApp + partage natif (déjà en place, relayé depuis la page d'invitation)
- [x] Lien `https://futto.app/m/{token}` → page d'invitation résolue côté serveur (definer, hors RLS)
- [x] Rejoindre via lien (incl. match privé), garde adhésion maintenue
- [x] Home : CTA « Inviter » sur le prochain match
- [x] `npx tsc --noEmit` → **0 erreur** ; `npx expo export --platform android` → **bundle OK**
- [x] Changelog PRODUCT_ROADMAP.md : ligne P0.4 ajoutée |