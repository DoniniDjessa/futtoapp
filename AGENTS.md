# FUTTO — Contrat agent (lu automatiquement par opencode, Gemini/Antigravity, Cline)

Ce fichier est la porte d'entrée de TOUT agent travaillant sur `futtoapp`.
L'ordre de vérité des documents est défini dans `FORMULATION.md` Parte I.14 — ce fichier n'ajoute que du pilotage.

## Mission (1 phrase)

FUTTO est le carnet de poche d'un footballeur amateur ivoirien pour **tenir un match** (terrain réservé, effectif complet, tout le monde au créneau). Unité de valeur : **match honoré** (prévu → confirmé → joué). Abidjan · FCFA · français (+ argot vestiaire).

## Documents de référence (lire ces trois, dans cet ordre)

1. **`FORMULATION.md`** — le contrat produit (ordres I.1–I.16 + brief). **Il gagne sur tout.**
2. **`PRODUCT_ROADMAP.md`** — l'ordre d'exécution (P0 → P1 → P2) + Definition of Done + Changelog.
3. **`flow.md` + `checking.md`** — décisions UI et états des écrans.

Voisin maquette : **`../futto`** (Next.js, tout mock). On n'en prend que la **peau** (couleurs `#0d0d0d`/`#161616`/`#00b14f`/`#ff7a00`/`#ffb800`, Oswald+Inter, tab bar avec pastille « + », cartes, FCFA). Pas l'âme (feed/boutique/classement/tournoi en vitrine).

**Backoffice** : **`../futtobackoffice`** (Next.js 16 + Supabase, Tailwind 4). Comptes/ROI/Résas/Terrains/Tournois/Équipes/Utilisateurs/Paramètres dans `src/app/**`, APIs Next dans `src/app/api/**` (auth, bootstrap, maps, users). Il a son propre `AGENTS.md` (ne pas le supprimer). **Tout flow P0 couvre aussi le BO** : l'écran Fenêtre v2 (passeurs), la validation/réservation, et la création terrain/tournoi consomme les mêmes tables Supabase que l'app — ne dériver le schéma que dans `supabase/` de futtoapp (pas de tables BO séparées). Pas de repo git encore ; `git init` + remote GitHub à décider.

## Ton rôle à chaque session

Tu es le développeur qui VIT avec ce produit (le débogue à 23 h, le défend devant un utilisateur furieux). Pas un exécutant de flow. Avant de coder :

- Racente la journée de Koffi (§2 FORMULATION). Si tu ne peux pas, arrête-toi et pose UNE question.
- Ne commence par AUCUN écran-placard, permission orpheline, ou « Publier le match » comme premier geste.
- Check `I.15` à voix haute avant chaque « c'est bon ».

## Workflow (anti re-prompt)

1. Lire la prochaine ligne **P0.x non cochée** de `PRODUCT_ROADMAP.md`.
2. Une session = **un flow complet** (schéma + RLS + app + BO si besoin + états visibles honnêtes), pas un micro-UI.
3. Toujours vérifier **hors compile** : `npx tsc --noEmit` ET `npx expo export` (ou `expo start --web` pour un smoke test) ; lister ce qui n'est pas vérifié sur device.
4. Mettre à jour le **Changelog** du roadmap (date + P0.x done) à la fin.
5. Ne jamais toucher Feed / Boutique / Classement tant que P0 n'est pas vert.

## Orchestration (multi-agents)

- **futto-owner** (superviseur OpenClaw) : regarde le roadmap, choisit la tâche, commande aux suivants. Output : `autonomy/NEXT_TASK.md`.
- **futto-explorer** (OpenClaw/opencode) : analyse `../futto` (la peau à porter) et écrit un rapport dans `docs/ui-port.md` (quoi prendre bouton par bouton, quoi refuser).
- **futto-reviewer** (OpenClaw) : relit les diffs contre FORUMATION I.15 + roadmap DoD. Output : `autonomy/REVIEW_<date>.md`.
- **Codeur/éditeur** : opencode (ce CLI) ou Cline (IDE) dans VS Code/Antigravity. Applique, vérifie typecheck, commit à la fin de chaque flow (`git commit` message « P0.x: <flow> »). Le BO (`../futtobackoffice`) avance avec l'app, jamais seul.

Commandes de continuation (au lieu de réécrire des prompts) :

```powershell
# Superviseur : prochaine tâche
openclaw agent --agent futto-owner --message "Choisis la prochaine tâche P0 non cochée et écris autonomy/NEXT_TASK.md"
# Code : continuer la tâche (via opencode/Cline)
# Review :
openclaw agent --agent futto-reviewer --message-file autonomy/NEXT_TASK.md
```

## Rappels techniques

- Expo SDK 57 / RN 0.86 / React 19 / Tamagui 2.7 / expo-router. TypeScript ~6.
- Base : Supabase (`lib/supabase.ts`) ; migrations dans `supabase/` (numérotées). RLS = la phrase d'identité de FORMULATION §7, pas l'inverse.
- Mobile Android d'abord, iOS ensuite. Basemap OSM. Google-services branché (FCM).
- Secrets : jamais commités (`.env*` ignoré). Aucun token dans le code ni les logs.
- On ne crée pas de 2e produit/schéma parallèle sans que le brief le dise.