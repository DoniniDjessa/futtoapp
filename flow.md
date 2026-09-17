TO ADD:

decompte pour les matchs avant le debut

tournois doit etre dans le bottom tab en lieu et place de profil, profil pourra etre dans la side bar

_TOURNOIS : ajoutons aussi les affiches des tournois (donc lutilisateur peut limporter)

payer avant dorganiser un tournoi (commission ajoutéé 10%)

...

mode nuit/jour  mode nuit par defaut

---

## Décisions UI (scaffold)

- **Tabs V1 :** Accueil · Matchs · + Créer · **Feed** · **Profil**  
  (peau démo `futto` — lucide ; Tournois / Terrains via drawer & raccourcis)
- **Sidebar :** items = `../futto` navGroups · rows DealPro · titres letter-spaced · header avatar/name/niveau/ville  
- **Header accueil :** Menu + avatar + Bonjour + ville + cloche (peau démo) — tab bar inchangée  
- **Accueil :** search · prochain match + décompte · à faire · raccourcis · terrains · matchs · joueurs · tournois  
  (Marketplace hors home ; Feed aussi en bottom tab ; Boutique via drawer)
- **Décompte :** affiché sur le prochain match (accueil) avant le coup d’envoi
- **Tournois :** import d’affiche + **payer la commission 10 %** avant d’ouvrir le tournoi
- **Thème :** nuit / jour, **nuit par défaut**

---

## Roadmap flows (owner)

→ Voir **`PRODUCT_ROADMAP.md`** (P0 boucle match → P1 rétention → P2 tournois/croissance).
Ne pas fragmenter en micro-prompts UI : enchaîner les items P0.x jusqu’à done.
