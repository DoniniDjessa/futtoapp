# FUTTO — Flow propriétaires de terrains (managers)

Dernière mise à jour : 2026-09-06

## Verdict court

**Oui : une seule app mobile FUTTO + comptes managers créés uniquement via le backoffice web.**  
Pas d’app propriétaire séparée en V1. Au login, le rôle (`manager` / `superAdmin`) décide de l’interface affichée.

C’est la bonne idée pour votre contexte (souvent **1 terrain / propriétaire**, peu d’actions, revenus + disponibilités).

---

## 1. Pourquoi pas une 2ᵉ app ?

| Critère | App séparée | Même app, session manager |
|--------|-------------|---------------------------|
| Coût / maintenance | 2 codebases, 2 stores | 1 build EAS |
| Adoption proprio | Friction (installer une autre app) | Login connu, même icône FUTTO |
| Volume d’actions | Justifie une app dédiée | Trop léger (dispo + demandes + revenus) |
| Sécurité | Isolée | Rôles + RLS suffisent si bien faits |

**Décision :** rester sur **une app**, **deux peaux** (joueur vs propriétaire).

---

## 2. Qui crée les identifiants ?

**Uniquement le backoffice (webapp)** — jamais l’inscription publique.

### Flow recommandé

1. **superAdmin** (ou commercial FUTTO) ouvre le BO → **Utilisateurs / Équipe**.
2. Crée un compte **manager** :
   - email alias BO (ex. `terrain.angre@bo.futto.app`) **ou** email réel du proprio si vous préférez ;
   - mot de passe temporaire ;
   - rattache **1+ terrains** (`created_by` / ownership).
3. Le proprio reçoit (WhatsApp / SMS) : lien Play Store + identifiants.
4. Il se connecte dans **la même app FUTTO**.
5. Au login, `futto_profiles.role = manager` → l’app bascule sur **l’interface propriétaire**.

L’inscription self-service reste réservée aux **joueurs** (email perso + **pseudo obligatoire**).

---

## 3. Ce que voit le propriétaire dans l’app

Écran d’accueil manager (onglets ou home dédiée) :

| Module | Contenu |
|--------|---------|
| **Mes terrains** | Liste (souvent 1), photos, prix/h, surface, statut disponible / indisponible |
| **Demandes** | File `demandé → confirmer / refuser` |
| **Agenda** | Créneaux confirmés / payés |
| **Revenus** | Total FCFA (payé), filtre période, détail par demande |
| **Profil** | Contact, changer MDP |

**Pas dans le scope manager V1 :** créer des matchs publics pour soi, feed social, tournois (sauf s’il joue aussi en tant que joueur — alors double casquette possible plus tard).

---

## 4. Validation des terrains (qualité FUTTO)

Deux niveaux distincts :

### A. Validation **compte / propriétaire** (accès app)

- Création manuelle BO uniquement.
- Option : statut `manager_status = pending | active | suspended`.
- Tant que `pending` : login OK mais terrains non listés côté joueurs.

### B. Validation **fiche terrain** (visible catalogue joueurs)

1. Manager (ou superAdmin) **ajoute / édite** le terrain dans l’app ou le BO (photos, pin GPS, prix, surface).
2. Statut terrain : `draft → pending_review → published | rejected`.
3. **superAdmin** (ou ops FUTTO) valide dans le BO : photos OK, localisation réelle, prix cohérent.
4. Seuls les terrains `published` apparaissent dans Terrains / Carte / Créer match.

Ainsi le proprio ne “publie” pas seul un terrain douteux sur le catalogue joueur.

---

## 5. Reconnaissance au login (technique)

```
Auth Supabase (même projet)
  → futto_profiles.role
       player     → tabs joueur (Accueil, Matchs, +, Tournois, Terrains)
       manager    → shell propriétaire (Demandes, Mes terrains, Revenus)
       superAdmin → peut tout (souvent via BO ; en app = pouvoirs étendus)
```

- **Même** `EXPO_PUBLIC_SUPABASE_URL` / anon key.
- RLS : manager ne voit que **ses** terrains + bookings liés.
- superAdmin : tout.

Pas besoin d’un second projet Auth.

---

## 6. Lien revenus

- Une réservation passe `demandé → confirmé → payé`.
- Au statut **payé**, le montant compte dans **Revenus du terrain** (agrégat `sum(amount_fcfa)` où `status = paid` et `terrain.created_by = manager`).
- Commission FUTTO (si un jour) : colonne / % définie côté BO, affichée clairement au proprio.

---

## 7. Évolutions possibles (plus tard)

- Compte **joueur + manager** sur le même login (toggle “Mode proprio”).
- Portail web léger pour les multi-terrains (5+).
- App dédiée seulement si le métier gérant devient lourd (staff, multi-sites, facturation).

---

## 8. Checklist implémentation

- [ ] BO : créer manager + rattacher terrain(s)
- [ ] Colonne / enum `terrain.status` (`draft|pending_review|published|rejected`)
- [ ] App : branchement UI selon `profile.role` après login
- [ ] Écran manager : Demandes + Revenus + Mes terrains
- [ ] RLS : manager update bookings de ses terrains uniquement
- [ ] Copy FR partout (pas de “draft/free” visibles)

---

## 9. Réponse directe à ta proposition

> Identifiants créés uniquement par la webapp, connexion dans la même appli, interface propriétaire reconnue au login — utile car la plupart n’ont qu’un terrain.

**Oui, c’est le bon modèle V1.**  
Garde le BO comme **seul outil d’onboarding proprio + validation catalogue**, et l’app mobile comme **outil terrain + revenus** pour eux.
