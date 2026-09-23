# FUTTO — Roadmap produit (owner)

Document de référence pour enchaîner les flows **sans re-prompt fragmentaire**.  
Priorité : **tenir un match honoré** (terrain confirmé + effectif + créneau tenu), pas le polish UI.

Dernière mise à jour : 2026-09-04

---

## 1. Vision V1 (1 phrase)

Un joueur à Abidjan trouve un terrain FUTTO, demande un créneau,  paie / marque payé, joue — le gérant confirme le terrain., rassemble son effectif (il fait des demande, il peut creer une demande et dans les details de la demande partager le lien a ses amis sur whatsapp, via link et autres reseaux possibles , en creant sa demande il peux fixer le minimum et le maximum d personne disponible, si le minimum est atteint cest a dire les utilisateurs ont cliquer sur le lien et valider sa demande de match, il recoit une notif) les liens de partages sont de deux types 'free' et 'adhesion' celui qui rejoint le match de 'free' ne paie rien
il peut aussi faire des demandes dans lapp pour que les utilisateurs dans les environs puissent adherer (les utilisateurs public qui adherent paie un montant que lui aura defini , on met une limite de montant max de tel sorte quil ne fasse pas des benefices pour eviter que certains fassent des magouilles avec loption donc pour adherer a un match payant lutilisateur doit avoir un solde superieur pour pouvoir etre prelevé), lutilisateur peut aussi definir ladhesion au match en tant que free pour les joueurs.
---

## 2. État actuel (snapshot)

### Solide
- Auth joueur (welcome → login/register → permissions)
- Tabs V1 + drawer + thème nuit/jour
- Terrains : catalogue, carte OSM, détail, GPS → Google Maps
- Localisations FUTTO (ville · commune · quartier) BO + pickers app
- Créer un match **brouillon privé** (terrain + date/heure)
- Accueil data-driven + décompte prochain match
- BO : superAdmin, équipe managers (`@futtoapp.vercel.app`), utilisateurs + set manager, terrains + photos, localisations

### Cassé / trompeur / stub (à traiter en P0–P1)
| Élément | Problème |
|--------|----------|
| Bouton **Demander** (détail terrain) | Ouvre `/creer` (match), **pas** une réservation terrain |
| Effectif match | `futto_match_players` non utilisé ; `spots_taken` figé |
| Détail match | Lecture seule — pas Rejoindre / Inviter / Confirmer |
| Portefeuille | Solde FCFA |
| Tournois | Liste seule — pas affiche / commission 10 % / création |
| Amis / Messages / Classement / Stats / Feed / Boutique / Mon équipe | Peaux ou faux data |
| Ajouter terrain (app) | Pas de photo (OK côté BO) |
| Profil | Lecture seule |
| Reset MDP | « Bientôt » |

---

## 3. Matrice rôles (cible)

| Action | Player | Manager | superAdmin |
|--------|--------|---------|------------|
| Créer / rejoindre match | ✅ | ✅ (si joue) | ✅ (si joue) |
| Demander créneau terrain | ✅ | ✅ | ✅ |
| Confirmer / refuser créneau | — | ✅ (ses terrains) | ✅ (tous) |
| Ajouter / éditer terrain + photos | — | ✅ | ✅ |
| CRUD localisations | — | — | ✅ |
| Promouvoir manager | — | — | ✅ |
| Organiser tournoi + payer 10 % | ✅ (organisateur) | ✅ | ✅ |

**Règle** : superAdmin connecté sur l’app a déjà l’accès terrains (sans être manager). Managers viennent du BO (Utilisateurs / Équipe).

---

## 4. Roadmap par phases

### P0 — Boucle « un samedi à Angré » (bloquant)

Sans P0, l’app n’est pas un produit foot — c’est une vitrine.

| # | Flow | Livrable concret | Où |
|---|------|------------------|-----|
| P0.1 | **Réservation terrain** | Table `futto_terrain_bookings` + UI demande (date, durée, message) + états `requested → confirmed \| rejected \| paid \| cancelled` | App + BO file « Réservations » |
| P0.2 | **Séparer Demander terrain ≠ Créer match** | CTA détail terrain → booking ; Créer match reste `/creer` | `TerrainDetailSheet`, `reserver` |
| P0.3 | **Effectif match** | Host auto-inscrit ; Rejoindre / Quitter ; sync `spots_taken` | `match/[id]`, `creer` |
| P0.4 | **Inviter WhatsApp** | Message prérempli (titre, lieu, heure, places, prix) | Détail match + home |
| P0.5 | **États match honnêtes** | `draft → planned → confirmed → played \| cancelled` + actions host | `match/[id]`, `matchs` |
| P0.6 | **Paiement V1 manuel** | Marquer « payé cash / Wave / OM / MTN » lié booking ou participation ; écrire `wallet_transactions` (Edge Function / service role) ; **supprimer solde fake** | `portefeuille`, booking |
| P0.7 | **Nav V1 propre** | Greyer ou retirer Feed / Boutique / Amis / Classement vanity / Messages globaux (drawer + raccourcis) | `lib/nav.ts`, home |

**Critère de done P0** : un joueur crée un match, invite WhatsApp, remplit l’effectif, demande un terrain, voit « demandé ≠ confirmé », le manager confirme, le match passe « joué ».

---

### P1 — Rétention (la boucle se répète)

| # | Flow | Livrable |
|---|------|----------|
| P1.1 | Relance places | One-tap WhatsApp depuis accueil / match (spots manquants) |
| P1.2 | Notifications | Insert `futto_notifications` + rappels J-1 / J0 (~2 h) |
| P1.3 | Portefeuille réel | Solde lu en base ; recharge manuelle tracée ; débit |
| P1.4 | Édition profil | Poste, téléphone, ville, avatar (`uploadCompressedImage`) |
| P1.5 | Photos terrains **dans l’app** manager | Même flow que BO |
| P1.6 | BO Réservations | File confirm/refus pour manager + vue superAdmin |
| P1.7 | Dupliquer un match | Même format, nouveau créneau |
| P1.8 | Reset mot de passe | Flow Supabase Auth réel |

---

### P2 — Croissance

| # | Flow | Livrable |
|---|------|----------|
| P2.1 | **Tournois** | Créer + upload affiche + **commission 10 % payée** avant ouverture (`flow.md`) |
| P2.2 | Inscription équipes tournoi | Places / équipes max |
| P2.3 | Matchs publics | Verbe « Ouvrir aux joueurs FUTTO » (pas « publier ») |
| P2.4 | Mon équipe | 2–3 contacts WhatsApp (table `futto_teams`) |
| P2.5 | Classement honnête | Matchs `played` / assiduité (pas `created_at`) |
| P2.6 | Lien web partageable | Deep link / page match hors app |

---

### P3 — Plus tard (ne pas commencer avant P0–P1)

- Chat **par match** (pas inbox sociale)
- Marketplace / Feed / Amis follow
- Stats avancées (buts, graphes)
- APIs paiement opérateurs (OM / MTN / Wave) automatisées
- Push native (build EAS, pas Expo Go)

---

## 5. Backend à créer / durcir (ordre)

1. Migration `futto_terrain_bookings` + RLS (demandeur insert ; manager update ses terrains ; superAdmin all)
2. Policies write `futto_match_players` (join/leave) + trigger `spots_taken`
3. Edge Function ou API BO : wallet credit/debit + « marquer payé »
4. Insert notifications (cron ou trigger sur booking/match)
5. Vérifier `ADD_LOCALISATIONS.sql` appliqué sur tous les envs
6. Tournois write + `commission_paid` + storage affiches (P2)

---

## 6. Process de travail (anti re-prompt)

### Avant chaque session
1. Lire **cette roadmap** + cocher la prochaine ligne **P0.x** non done.
2. Une session = **un flow complet** (schema + app + BO si besoin + états visibles), pas un micro-UI.
3. Ne pas ouvrir Feed / Boutique / Classement tant que P0 n’est pas vert.

### Definition of Done d’un flow
- [ ] Table / RLS (si data)
- [ ] Écran(s) app qui écrivent + lisent le vrai état
- [ ] Écran BO si rôle manager/admin concerné
- [ ] Copy honnête (jamais « réservé » si seulement « demandé »)
- [ ] Pas de solde / liste / ami fake sur ce parcours
- [ ] Note courte dans ce fichier : `## Changelog` (date + P0.x done)

### Prompt type à coller (au lieu de 10 petits)

```
Continue FUTTO selon PRODUCT_ROADMAP.md — prochaine tâche P0.x non cochée.
Implémente le flow complet (DB + app + BO si besoin). Pas de polish UI hors flow.
À la fin : mets à jour le Changelog du roadmap et liste ce qui reste en P0.
```

---

## 7. Changelog

| Date | Item | Note |
|------|------|------|
| 2026-09-04 | Socle | Auth, terrains, carte, localisations, match draft, BO… |
| 2026-09-04 | **P0–P2** | Bookings, match join, wallet, teams, tournois… SQL `APPLY_P0_P2_FLOWS.sql` |
| 2026-09-04 | **Push** | `expo-image-picker` + `ADD_PUSH_NOTIFICATIONS.sql` + `lib/push.ts` |
| 2026-09-23 | **P0.0** | Baseline TS verte : **1057 → 0** (`tsc --noEmit` OK + `expo export` Android OK). Cause Tamagui v5 (universal) → `defaultConfig` **v4** + `onlyAllowShorthands:false` ; palette `as const` ; helpers `toColor`/`withAlpha`/`toTokenColor` ; route `/connexion`→`/login` |
| 2026-09-23 | **P0.1** | Réservation terrain de bout en bout : `demander-creneau` (demande `requested` ≠ confirmé), `mes-reservations` (états + payer après confirmation, CTA créer match), BO Réservations (confirmer/refuser/payé + notifs). RLS durci : le demandeur ne peut plus se passer `confirmed`/`paid` par update direct (migration `20260323_p01_booking_rls_hardening`). `reserver.tsx` réécrit en directory réel (fini le formulaire démo) |
| 2026-09-23 | **P0.2** | Séparer « Demander un créneau » (`/demander-creneau`) ≠ « Créer un match » (`/creer`). `terrain/[id].tsx` : formulaire inline fake (slot/durée, date +1j fictive, badge « Réservé ! ») supprimé → sticky bar avec CTA Demander créneau + Créer match ; galerie/équipements/contact/horaires réels conservés. `TerrainDetailSheet` déjà séparé |

---

## 8. Décisions figées (ne pas rediscuter)

- App name : **FUTTO** (folder `futtoapp` ≠ product name)
- Android/iOS id : `com.rixxelstudio.futto`
- `google-services.json` branché (FCM / builds Android)
- Tabs : Accueil · Matchs · + · Tournois · **Feed**
- Profil dans drawer ; Carte hors tab (`/carte` + home)
- Thème nuit par défaut
- Demande terrain ≠ payé ≠ confirmé (copy toujours honnête)
- Commission tournoi **10 %** avant ouverture
- Managers BO = alias `@bo.futto.app` ; joueurs = email réel
- Basemap OSM inchangé ; overlays UI FUTTO seulement
