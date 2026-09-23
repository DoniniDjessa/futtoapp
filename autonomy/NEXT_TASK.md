# NEXT_TASK — P0.0 Restaurer une base compilable

**Statut** : ✅ **RÉSOLU le 2026-09-23** — baseline verte (commit `P0.0: baseline TS (1057 -> 0)`).
Suite : reprendre les flows P0 de `PRODUCT_ROADMAP.md` en partant de cette base.

## ✅ Récap de la résolution (leçon apprise, à transmettre aux agents)

1. **Cause racine des ~950 erreurs Tamagui** : `tamagui.config.ts` importait
   `@tamagui/config/v5` (spec « universal/CSS ») dont le **type des props style ne contient
   plus les longhands RN** (`alignItems`, `justifyContent`, `backgroundColor`, `paddingVertical`,
   `marginTop`, `minWidth`, `maxWidth`, `borderRadius`…) ni leurs shorthands. → Corrigé en
   passant sur `@tamagui/config/v4` + `settings.onlyAllowShorthands: false` (retablit le
   vocabulaire RN complet ; runtime identique).
2. **~914 erreurs `string` sur les props couleur** : `lib/theme.ts` n'avait pas `as const` →
   les hex étaient élargis en `string`, refusés par `allowedStyleValues: 'somewhat-strict-web'`
   (qui accepte les littéraux `#${string}` mais pas `string`). → `colors`/`lightColors` en
   `as const`.
3. **Reste dynamique** (badges, alpha `#hex22`, palettes locales typées `string`) : helpers dans
   `lib/theme.ts` : `toColor` (→ `OpaqueColorValue`), `withAlpha(hex, alpha)`, `toTokenColor`
   (props `placeholderTextColor`/`selectionColor` de Tamagui = `ColorTokens`).
4. **Route `/connexion` inexistante** (existe pas dans expo-router) → remplacée par `/login`
   (feed, matchs, profil, amis, joueurs/[id]).
5. Détail RN 0.8x : `StyleSheet.absoluteFillObject` n'existe plus → objet inline
   `{ position:'absolute', top/right/bottom/left: 0 }`.
6. Divers : `kind:'tournament'` ajouté à `lib/push.ts` ; `organizer_id` ajouté à
   `TournamentRow` ; `Zap` importé ; null-guards `supabase`/`match` dans les closures.

## Contexte (baseline avant correctif)
- Baseline : **1057 erreurs TypeScript** (SDK Expo 57 / RN 0.86 / React 19 / Tamagui 2.7).
- Top fichiers (≈60 % des erreurs) :
  - `app/(tabs)/*` : 207
  - `app/creer.tsx` : 63
  - `app/joueurs/[id].tsx` : 63
  - `app/tournois/[id].tsx` : 62
  - `app/mes-reservations.tsx` : 62
  - `app/match/[id].tsx` : 53

## Definition of Done (P0.0 — atteint)
- [x] `npx tsc --noEmit` → **0 erreur**
- [x] `npx expo export --platform android` → **bundle OK** (Hermes .hbc 8.5 MB)
- [x] Changelog PRODUCT_ROADMAP.md : ligne P0.0 (1057 → 0)