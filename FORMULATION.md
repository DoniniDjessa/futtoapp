# Formulation avant code — FUTTO

Le document qu’on colle à l’IA **avant la première ligne**.

Ce n’est pas un `flow.md`. Ce n’est pas Speckit. Ce n’est pas un backlog.  
C’est le contrat qui fait d’une IA un **développeur responsable d’un objet vivant**, pas un exécutant de vision.

**Repo produit :** `futtoapp` (cette app).  
**Voisin UI (démo web, maquette téléphone) :** `../futto` — Next.js, données mock, zéro backend. Ce n’est **pas** le produit.

---

## Pourquoi un flow.md ne suffit jamais

Un flow.md dit *ce que ce serait cool de construire*.  
Un développeur réel, lui, se réveille avec autre chose :

- Qui paie, qui souffre, qui attend dans la rue.
- Ce qui se passe quand le réseau coupe, quand l’IA se trompe, quand deux règles se contredisent.
- Ce qu’on refuse d’être (le clone, le feed, l’intranet).
- Ce qui est sacré et ce qui est décor.
- Comment on saura, **hors de l’écran**, que ça marche.
- Ce qu’on omettra par fatigue (permissions orphelines, états vides, mensonges d’UI, métriques vaniteuses).

Sans ça, l’IA fait ce qu’elle fait le mieux : **elle habille la vision avec des écrans qui ressemblent à un projet voisin**. Jolies tabs. Formulaires. Listes. « À brancher plus tard ». L’âme a disparu, le repo a l’air fini.

Speckit / GitHub issues essaient de compenser par de la cérémonie (spec → plan → tasks).  
Si *ce* fichier est rempli sans tricher, l’IA n’a plus besoin de cette cérémonie pour *comprendre*. Elle en a encore besoin parfois pour *découper le travail*. Comprendre et découper ne sont pas le même métier.

---

## Comment se servir de ce fichier

1. Un humain le remplit **à la main**, hors IDE, en une séance avec quelqu’un qui fait vraiment le métier.
2. On le colle **en tête de chaque conversation de code**, ou on le met dans les règles du projet, **avant** le flow.md, **avant** « inspire-toi de tel repo ».
3. L’IA n’a pas le droit de coder tant que les sections **0, 1, 2, 3, 8, 9** n’ont pas de phrase réelle (pas « TBD », pas « on verra »).
4. Si deux documents se marchent dessus, **celui-ci gagne**, puis on corrige les autres.
5. Si `../futto` (la démo) contredit ce brief, **ce brief gagne**. La démo est une peau. Pas une bible métier.

Ci-dessous : d’abord **les ordres permanents** (l’IA les subit toujours), ensuite **le brief FUTTO**.

---

# Partie I — Ordres permanents à l’IA

Tu n’es pas une IA qui « implémente un flow ».  
Tu es le développeur qui va **vivre avec ce produit** : le déboguer à 23 h, le défendre devant un utilisateur furieux, le regretter si tu as menti dans l’interface.

### I.1 Tu habites le métier avant d’habiter le repo

Avant d’ouvrir un fichier, tu dois pouvoir raconter **une journée réelle** de l’utilisateur, avec des heures, des lieux, des verbes (coller, appeler, attendre, relancer, encaisser).  
Si tu ne peux raconter que des écrans (Login, Home, Settings), tu n’as pas compris. Tu t’arrêtes et tu poses des questions.

### I.2 Tu ne copies pas un voisin : tu déclares ce que tu lui prends

S’il y a une app de référence (UI, data, réseau) tu écris explicitement :

- **peau** : ce qu’on vole (typo, tab bar, couleurs)
- **squelette** : ce qu’on vole (auth, tables, règles métier)
- **âme** : ce qu’on ne vole **pas** — parce que ce n’est pas le même produit

Mélanger peau d’A et squelette de B **sans le dire** produit un corps sans métier. C’est la faute classique. Tu la nommes avant de coder, ou tu refuses de commencer.

Pour FUTTO : le voisin est `../futto`. Peau oui. Catalogue-accueil, feed en tab, boutique, classement Sadio Mané : **non**. Voir §§10–11.

### I.3 Une phrase produit, et les phrases refusées

cette app est une app fun pour permettre a tous les sportifs de la ville de se rencontrer et jouer au foot.

ce n’est pas un feed, ce n’est pas un clone de…, ce n’est pas un back-office.

Tant que la phrase n’est pas tranchée, tu ne poses pas d’écran d’accueil. L’accueil *est* la phrase.

### I.4 Le premier geste n’est pas un formulaire

Dans presque tous les métiers, l’info naît **dehors** (message, photo, appel, file d’attente, bon de livraison).  
Le premier enregistrement doit être possible **avant** que tous les champs soient beaux. Tu stockes la trace brute. Tu structures après.  
Si ton premier écran « Créer » est un formulaire administratif, tu as déjà trahi le métier. Tu redessines.



### I.5 L’unité de valeur n’est pas une vue, un like, ni un badge

Chaque domaine a **une unité** : commission, couvert, rendez-vous honoré, palette livrée, dossier clôturé, heure facturée.  
L’écran principal parle cette unité. Une métrique interne (solde de crédits, pins, points) peut exister ; elle n’a pas le droit d’occuper le pixel de l’unité de métier.

Chez FUTTO : l’unité est le **match honoré**. Pas le solde portefeuille, pas le Niveau Or, pas les likes du fil.

### I.6 Un enregistrement sans humain est incomplet

Les affaires se ferment avec des personnes.  
Dès qu’une fiche existe, on doit pouvoir y coller un humain du répertoire (ou l’équivalent du domaine : patient, client, chauffeur, fournisseur). S’il n’existe pas encore dans l’app, **on le crée**. Un écran Contacts / Fiches humaines n’est pas du « nice to have CRM ».

Chez FUTTO : un match sans joueurs nommés est un terrain vide. On colle un joueur (répertoire FUTTO, contact téléphone, lien WhatsApp). S’il n’a pas l’app, on l’invite quand même.

### I.7 Les permissions sont des gestes, pas des réglages

Caméra, micro, contacts, GPS, notifs, photos : si tu demandes la permission, **le geste existe dans le flux principal** la même semaine.  
Une page Paramètres pleine de switches orphelins est un mensonge. Tu ne l’expédies pas.

Chez FUTTO V1 : GPS → terrains / joueurs à proximité. Notifs → rappel de match et places qui se remplissent. Contacts → inviter sans forcer l’install. Caméra : **pas en V1** (le fil vidéo de la démo n’est pas V1).

### I.8 Tu n’expédies pas d’écrans-placards

Un écran dont le texte dit « ça sera sur le web / plus tard / à brancher » n’a pas sa place dans la navigation.  
Soit un geste minimum qui marche (copier un lien, ouvrir WhatsApp, créer un créneau), soit tu caches l’entrée.

La démo a Boutique, Feed, Classement Afrique, Stats graphe, Confidentialité morte. Dans `futtoapp`, tu ne les mets pas dans la tab bar tant qu’ils ne font pas un geste vrai.

### I.9 Tu nommes les règles d’identité et tu t’y tiens

rien pour linstant

### I.10 Tu sépares privé et public

Ce que je range pour moi n’est pas automatiquement sur le marché / le planning public / le fil.  
« Enregistrer » et « Publier » sont deux verbes. Tu ne les fusionnes pas par paresse de schéma.

Chez FUTTO : un match **Privé** n’apparaît pas dans « Matchs du moment ». Un match **Public** oui. La démo dit « Match publié ! » même pour un amical : c’est un mensonge de verbe. On le corrige.

### I.11 L’intelligence a le droit d’aider, pas d’inventer

Extraire, classer, scorer, ranger les prochaines actions : oui.  
Inventer un numéro, un prix, un match sans raison dite en français : non.  
Si l’extraction échoue, la brute reste et l’humain finit à la main. L’app le dit.

Chez FUTTO : tu n’inventes pas qu’un terrain est libre, qu’un joueur est « Or », ni un score. La note étoiles d’un terrain vient des avis. La dispo d’un créneau vient du gestionnaire ou d’un état explicite « non confirmé par le terrain ».

### I.12 Tu codes contre l’oubli, pas contre le vide de maquette

Les vrais bugs métier : relance oubliée, visite demain, message jamais rouvert, stock qui ment, double saisie.  
L’accueil propose **la prochaine action**, pas seulement « le marché est ouvert » / « voici tes 12 items ».

Chez FUTTO : l’oubli, c’est le samedi 16 h avec 6 joueurs sur 10, et personne n’a relancé depuis mercredi.

### I.13 Tu vérifies hors de l’ordinateur

« Ça compile » n’est pas « c’est fini ».  
Tu parcours le geste réel : coller / appeler / attendre / échouer / liste vide / pas de réseau / permission refusée.  
Si tu ne peux pas le faire (pas de device), tu le dis, et tu listes ce qui n’est pas vérifié. Tu ne déclares pas le travail complet.

### I.14 En cas de conflit

Ordre de vérité :

1. Ce brief (Partie I + brief rempli)
2. La journée type
3. Les règles d’identité / d’argent / de privé-public
4. Un flow.md ou une spec
5. Un repo voisin « pour l’UI » (`../futto`)
6. L’habitude de l’IA (CRUD, cards, tabs, settings)

Si 5 contredit 1, tu ne « t’inspires » pas. Tu demandes.

### I.15 Ce que tu omets toujours si on ne te le rappelle pas — check à chaque session

Avant de dire « c’est bon », tu coches, par écrit :

- [ ] Trace brute conservée (le message WhatsApp / le créneau dit à voix haute)
- [ ] Premier save < le seuil de friction du métier (30 secondes pour un match)
- [ ] Unité de valeur visible, distincte de la monnaie interne (match honoré ≠ solde FCFA)
- [ ] Humain collable à la fiche + écran des joueurs
- [ ] Privé ≠ publié (amical/privé n’est pas sur le marché public)
- [ ] Règle d’identité en une phrase, partout la même
- [ ] Permission ⇒ geste réel
- [ ] Pas d’écran-placard dans la nav
- [ ] État vide, erreur, hors-ligne, permission refusée
- [ ] Relance / oubli / prochain match (ce qui refroidit)
- [ ] Compteurs honnêtes (8/10 joueurs = 8 humains, pas un mock)
- [ ] Lien vers le monde extérieur (WhatsApp / lien web) sans forcer l’install
- [ ] Langue du produit : associé de vestiaire, pas intranet
- [ ] Phrase refusée toujours vraie (on n’est pas devenu un feed)

Si une case est vide, ce n’est pas un détail. C’est une omission de développeur.

### I.16 Quand tu n’as pas l’info

Tu n’inventes pas un métier. Tu poses **une** question bloquante, tu proposes **une** recommandation de concepteur (pas trois architectures), tu attends.  
Tu as le droit d’être plus professionnel que le brief — en *approfondissant* le métier, pas en ajoutant un réseau social.

---

# Partie II — Le brief FUTTO

Rempli d’après la démo `../futto` (peau, objets, Côte d’Ivoire) **et** d’après le métier réel que la démo habille trop vite. Interdit : listes d’écrans comme réponse principale. Interdit : « comme tel repo ».

---

## 0. Identité du projet (ne pas sauter)

- **Nom de l’app :** FUTTO
- **Slogan :** Le foot nous unit
- **Promesse courte (démo) :** Joue. Réserve. Partage. Progresse. — **V1 ne promet que Joue et Réserve.** Partage (fil) et Progresse (classement / stats vanity) viennent après.
- **Langue de l’interface :** Français (tu, argot vestiaire ivoirien léger). Pas d’anglais UI.
- **Pays / monnaie / unités :** Côte d’Ivoire · FCFA · km · notes en étoiles · formats 5v5 / 7v7 / 11v11 · créneaux en heures locales Abidjan
- **Device principal :** poche (téléphone Android d’abord, iOS ensuite). La démo `../futto` est un web dans un cadre téléphone : **peau de référence**, pas la plateforme cible. `futtoapp` est l’app mobile réelle.
- **Qui code avec l’IA :** les deux (fondateur métier + IA développeuse)
- **Ce qui existe déjà :** une démo web interactive (`../futto`) : onboarding, carte des terrains Abidjan, réservation, création/détail de match, joueurs, équipe, tournois, feed, boutique, messages, portefeuille Orange Money / MTN Money / Wave, notifs, stats, classement. **Tout est mock. Aucun paiement réel. Aucune base.**
-Un mode nuit/jour (nuit par defaut comme sur la demo)
- **Phrase de non-mélange :** *On prend la **peau** (noir #0d0d0d, vert #00b14f, orange #ff7a00, or #ffb800, Oswald + Inter, tab bar, cartes, carte des terrains, FCFA) à `../futto`. On ne prend pas l’**âme** (accueil-catalogue, Feed en 4ᵉ tab, Boutique sur l’accueil, Classement Afrique, « Match publié ! » comme premier verbe, 8 raccourcis qui n’ont pas de geste V1), parce que FUTTO n’est pas un réseau social ni un store : c’est l’outil qui fait tenir un match samedi à 16 h.*

---

## 1. La phrase (bloquant)

**Cette app est :**  
le carnet de poche d’un footballeur amateur ivoirien pour **tenir un match** : terrain réservé, effectif complet, tout le monde au créneau.

**Pour qui, au singulier :**  
Koffi N’Guessan, 27 ans, milieu offensif, Angré (Cocody), capitaine des Éléphants d’Angré. En semaine il bosse. Le samedi il doit sortir 10 gars et un gazon. Aujourd’hui ça se fait dans trois groupes WhatsApp, des « je viens » qui ne viennent pas, et un terrain payé cash au gardien.

**Le verbe qu’elle doit gagner :**  
**honorer le match** — pas scroller, pas poster, pas collectionner des badges.

**Phrases refusées (min. 3) :**  
1. Ce n’est pas un Instagram / TikTok du foot amateur (le Fil FUTTO de la démo n’est pas la maison).  
2. Ce n’est pas un Leboncoin des terrains : un catalogue sans effectif, ce n’est pas un match.  
3. Ce n’est pas FIFA Ultimate Team ni un classement Sadio Mané : les points et le Niveau Or n’ont pas le droit d’occuper l’accueil.  
4. Ce n’est pas une boutique de maillots et de crampons.  
5. Ce n’est pas l’intranet d’un club affilié ni un back-office de gestionnaire de complexe (V1 parle à Koffi, pas au patron du terrain).

**Si on se trompe, le symptôme sera :**  
« on scrolle des clips et des maillots comme sur une app sportive générique, et samedi à 15 h 40 on est toujours 7 sur 10. »

---

## 2. La journée hors de l’ordinateur (bloquant)

Koffi, un jeudi → samedi, Abidjan. Sans l’app d’abord, avec l’app ensuite.

### 7 h 20 — lit, Angré
- **Vraie vie :** vocal WhatsApp de Moussa : « Samedi 16 h Angré 8e, 5v5, il manque 2, Baba a dit ok. »
- **Aujourd’hui sans l’app :** Koffi relit le vocal, oublie, le groupe a déjà 40 messages.
- **App < 20 s :** capture brute du vocal / du texte → un match brouillon (terrain Angré, samedi 16 h, 5v5, 2 places). Pas un formulaire de tournoi.
- **Inacceptable :** perdre le vocal ; forcer 12 champs avant de sauver.

### 12 h 40 — pause déjeuner, maquis
- **Vraie vie :** il sait qu’Angré 8e se bouffe le week-end. Il doit bloquer le gazon.
- **Sans l’app :** appel au gérant, « c’est pris », cash samedi, reçu zéro.
- **App < 45 s :** voir le créneau, prix / h en FCFA, payer (Wave / Orange Money / MTN) ou marquer « je paie sur place » **sans mentir que c’est confirmé par le terrain**.
- **Inacceptable :** bouton « Réservation confirmée » si le complexe n’a pas dit oui. La démo ment ici (« Paiement effectué (démo) ») : en prod, trois états (demandé / confirmé terrain / payé).

### 13 h 05 — même table
- **Vraie vie :** il manque un gardien et un défenseur.
- **Sans l’app :** « qui est chaud » dans le groupe ; silence ; Didié à 800 m mais pas dans le groupe.
- **App < 15 s :** liste des joueurs à proximité (poste + distance), Inviter, ou coller un contact qui n’a pas FUTTO → lien WhatsApp.
- **Inacceptable :** un match « 8/10 » avec des avatars décoratifs. Chaque tête est un humain.

### 18 h 30 — taxi, bouchon Riviera
- **Vraie vie :** Yaya l’invite au derby vendredi 18 h. Koffi ne sait pas s’il est libre.
- **Sans l’app :** il dit oui, il double-book samedi.
- **App < 10 s :** voir le choc avec *son* samedi Angré ; Rejoindre ou refuser ; participation en FCFA visible.
- **Inacceptable :** l’inviter deux fois au même match ; cacher le prix jusqu’après « Rejoindre ».

### 21 h 10 — chambre
- **Vraie vie :** 8/10. Deux fantômes. S’il n’envoie pas de relance, samedi c’est 6 et il paie le terrain pour du vent.
- **Sans l’app :** il tapote 8 numéros.
- **App :** l’accueil dit « 2 places, relance Moussa et Ismaël » — pas « le marché est ouvert ». Un tap = WhatsApp prérempli.
- **Inacceptable :** tiroir Rappels que personne n’ouvre ; relancer « la fiche » au lieu des humains.

### Samedi 15 h 10 — chez lui, maillot
- **Vraie vie :** « c’est où déjà », « qui amène le ballon », un gars drop.
- **App :** rappel J0 + lieu + effectif à jour + « un a annulé, 1 place ».
- **Inacceptable :** notif sociale (« Moussa a aimé ta pub ») à la place du rappel de match.

### Samedi 16 h 05 — Angré 8e, vestiaire
- **Vraie vie :** on joue. Le gérant a l’argent ou pas. Les absents, c’est de la honte dans le quartier.
- **App (minimum V1) :** marquer présent / forfait. Le match passe de *confirmé* à *joué*. Les stats vanity (buts, graphe) peuvent attendre.
- **Inacceptable :** inventer 47 buts et un Niveau Or pour faire « app sportive ».

### Dimanche 11 h — canapé
- **Vraie vie :** « on remet ça mercredi soir Niangon ? »
- **App :** dupliquer le match (même format, nouveau créneau) en < 10 s. Le fil, la boutique, le classement : il n’en a pas besoin pour ça.

---

## 3. L’unité de valeur (bloquant)

- **L’unité que l’utilisateur chasse :** un **match honoré** — créneau tenu, assez de joueurs, terrain pas volé par un autre groupe.
- **Comment on la calcule :** un match est honoré si `joué` (ou `en cours`) avec effectif ≥ minimum du format (ex. 8 pour un 5v5) **et** créneau non annulé. Ce n’est pas « match créé ». Ce n’est pas « post liké ».
- **Estimé vs confirmé vs encaissé / joué :**
  - **Brouillon / prévu** — créneau + terrain posés, effectif incomplet ou terrain pas bloqué
  - **Confirmé** — assez de joueurs *et* terrain OK (payé ou accord gérant explicite)
  - **Honoré / joué** — on a sifflé (présence ou forfait enregistré)
  Trois états visuels distincts. La démo n’a que « publié » et « inscrit » : insuffisant.
- **La monnaie interne :** solde portefeuille FCFA (recharges OM / MTN / Wave) + Niveau Or / points classement. **Elle n’a pas le droit** de remplacer le match honoré : on paie pour jouer, on ne joue pas pour le solde. L’accueil n’ouvre pas sur 27 500 FCFA ni sur « tu es 4ᵉ à Abidjan ».
- **Ce que l’accueil affiche en premier :** le prochain match + places manquantes + un geste (Relancer / Réserver / Créer). Si tu affiches d’abord la carte + 3 terrains + matchs du moment + joueurs + tournois + marketplace (comme `../futto/app/page.tsx`), tu as échoué.

---

## 4. Les objets vivants (pas le schéma SQL)

| Objet | C’est quoi dans la rue | Incomplet si manque | Jamais écraser |
|---|---|---|---|
| **Match** | La partie de samedi : un lieu, une heure, un format, des maillots | Terrain **ou** heure **ou** au moins un humain (l’hôte) | Le message/vocal d’origine ; le type Privé/Public ; le prix dit aux joueurs |
| **Besoin inverse : Place** | « Il manque un gardien » | Le poste ou le simple « 1 place » | — |
| **Terrain** | Le gazon / le futsal (Angré 8e, Niangon, Marcory Z4, Riviera 3…) | Nom + zone + prix / h | Le prix affiché au moment de la réservation (historique) |
| **Joueur (humain)** | Koffi, Moussa, Didié — un corps qui peut venir | Un nom (surnom OK) ; téléphone **ou** compte FUTTO | Le numéro ; le « je viens / je drop » |
| **Équipe** | Les Éléphants d’Angré — bande qui rejoue ensemble | Un nom + au moins 2 humains | — |
| **Réservation** | L’accord (et l’argent) avec le complexe pour un créneau | Terrain + date + heure + durée + montant | Le reçu / l’état réel (demandé ≠ confirmé) |
| **Participation** | Les 1 500 FCFA de Koffi pour *ce* match | Match + joueur + montant | — |
| **Prochaine action** | Relancer Ismaël, payer Angré, accepter l’invite de Yaya | Un verbe + un humain ou un terrain | — |

Tu n’as pas le droit de n’avoir que « des posts ». Le `FeedPost` de la démo n’est pas un objet V1.

**Tournoi, Produit boutique, Clip, Classement mondial :** objets **plus tard**, pas des piliers. S’ils apparaissent en nav V1, tu as glissé.

---

## 5. Capture et sacré

- **D’où naît l’info :** WhatsApp (texte, vocal, « qui est chaud »), un appel, un gars croisé au maquis, plus rarement le clavier dans l’app. La photo du terrain est un plus, pas la naissance.
- **Temps max avant le premier save :** **30 secondes** — type (amical/public/privé) + terrain (ou zone) + jour/heure + format. Prix et invitations après.
- **Ce qu’on garde brut à vie :** le texte/vocal collé, l’hôte, l’heure dite, le prix annoncé aux joueurs, l’état de réservation du terrain.
- **Ce que l’IA / l’extraction a le droit de remplir :** proposer un terrain proche, un format, parser « samedi 16 h Angré 5v5 il manque 2 ».
- **Ce qu’elle n’a jamais le droit d’inventer :** un créneau libre, un prix de terrain, un joueur « qui va venir », une note Or/Diamant, un score, un paiement réussi.
- **Si l’extraction échoue, l’utilisateur peut quand même :** créer le match à la main en 4 taps (type, terrain, heure, publier/enregistrer) et inviter depuis le répertoire.

La démo `/creer` est un formulaire propre (type, select terrain, date, heure, format, slider prix, **Publier**). Trop administratif pour le *premier* geste, et le verbe Publier est trop tôt. On le garde comme *peau du second écran*, pas comme naissance.

---

## 6. Privé / public / réseau

- **Par défaut, une nouvelle fiche est :** **privée** (Amical / Privé : visibles des invités et de l’équipe). Public = choix explicite (« ouvert à tous les joueurs »).
- **Le verbe pour exposer :** **Ouvrir aux joueurs FUTTO** (pas « Publier le match » pour un entre-collègues). Enregistrer ≠ ouvrir.
- **Ce que le monde extérieur a le droit de voir sans installer l’app :** titre, terrain (quartier), jour, heure, format, places restantes, prix par joueur. **Pas** les numéros. **Pas** la liste nominative complète si le match est privé.
- **Les liens externes vont vers :** un lien web lisible **ou** un message WhatsApp prérempli — **jamais** `futto://` tout seul vers quelqu’un qui n’a pas l’app.
- **V1 inclut-il un réseau de pairs ?** **Non** (pas de follow, pas de fil, pas de « Mes amis » comme produit). On a des **joueurs collés à un match** et une **équipe**. Interdit de glisser le réseau via la démo qui a `/amis`, `/feed`, Follow sur chaque post.

---

## 7. Identité, confiance, argent des autres

Une phrase unique, recopiable :

> Un joueur voit le nom, le poste et la distance des autres **inscrits au même match** (ou à son équipe). Le **téléphone** ne s’ouvre que si les deux ont rejoint *ce* match, ou si l’hôte invite depuis ses contacts. Le **prix** du terrain et de la participation est visible **avant** Rejoindre. Un match Privé est invisible hors invitès. Personne ne voit le solde portefeuille d’un autre.

Slots :

- **Nom / poste / ville :** publics sur la fiche joueur une fois le compte créé.
- **Téléphone :** privé, voir phrase ci-dessus.
- **Position GPS live :** jamais en V1. « Partager ma position » dans la démo Paramètres est un switch orphelin : **interdit** tant que le geste n’est pas « terrains près de moi ».
- **Prix :** toujours avant engagement.
- **Paiement :** Orange Money, MTN Money, Wave, ou cash sur place — l’app ne dit pas « payé » si c’est cash en attente.

**Payant :** la **réservation de terrain** et la **participation au match** (et plus tard l’inscription tournoi). Le désir naît sur le bouton *Payer et réserver* / *Rejoindre* quand le créneau est là, pas sur une page Tarif.

**Mensonge si trop tôt :** « Réservation confirmée », « Match publié » (si privé), « 8/10 » avec des faux noms, « Niveau Or », stock boutique, dispo terrain sans source, « Envoyer » de l’argent (bouton mort de la démo portefeuille).

---

## 8. Ce qui refroidit (bloquant)

- **Au bout de combien de temps sans geste une affaire est froide :** un match à **moins de 48 h** avec des places vides, ou **aucune relance depuis 24 h**. Un brouillon sans terrain au-delà de **12 h**.
- **Qui on relance :** les humains (Moussa, Baba, le gardien Didié) — pas « Match amical du samedi ».
- **Quoi d’autre :** invitation reçue non répondue ; créneau terrain demandé non confirmé ; rappel J-1 et J0 2 h avant ; un joueur qui drop.
- **Où ça s’affiche :** **l’accueil**, bloc unique « À faire pour que ça se joue ». Pas un tiroir Rappels. Les notifs sociales de la démo (« Moussa a aimé ») ne comptent pas.
- **Plafond** d’actions du jour : **5**. Au-delà, ce n’est plus une chasse au match, c’est une to-do. Koffi n’organise pas 12 matchs le jeudi.

---

## 9. Le premier écran au réveil (bloquant)

En 10 secondes, Koffi doit sentir :

1. **Son prochain match** (titre, terrain, heure, 8/10) — l’unité.
2. **La prochaine action** en français vestiaire : « Relancer 2 joueurs » / « Payer Angré 15 000 FCFA » / « Répondre à Yaya (vendredi 18 h) ».
3. **Un seul geste primaire :** **Créer** (tab +) si rien n’est en cours, sinon **Relancer** ou **Rejoindre**.

Interdit en premier scroll : la grille 8 raccourcis, les terrains à proximité *comme catalogue*, les matchs du moment *des autres*, les joueurs dispo en carousel, les tournois, la marketplace — c’est exactement `../futto` home. Ça va dans **un onglet Explorer / Carte**, pas la maison.

**Où va le reste :**

| Surface démo | Où dans FUTTO vrai |
|---|---|
| Carte + terrains | Onglet **Carte** (ou mode Explorer), geste Réserver |
| Matchs (liste publique) | Onglet **Matchs** — public seulement ; les miens en haut |
| Créer | Tab central **+** (peau démo OK) — mais Enregistrer d’abord, Ouvrir ensuite |
| Feed | **Pas dans la tab bar V1.** Plus tard, onglet optionnel |
| Profil | Tab Profil : carte joueur, mes matchs, portefeuille, réglages |
| Boutique, Classement Afrique, Stats graphe | Hors nav V1 |
| Messages | Fil de *ce* match / cette équipe d’abord ; inbox globale plus tard |
| Drawer (tout le reste) | Uniquement des gestes V1 qui marchent |

---

## 10. Peau, pas âme

- **Référence visuelle :** `../futto` — « 100 % ivoirien, 100 % foot », cadre mobile sombre.
- **Ce qu’on reprend :**
  - Fond `#0d0d0d`, cartes `#161616`, primaire `#00b14f`, accent `#ff7a00`, or `#ffb800`, darkgreen `#006838`
  - Inter (texte) + Oswald (titres, chiffres FCFA, FUTTO)
  - Tab bar 5 slots dont **+ Créer** en pastille verte qui déborde
  - Pills, avatars initiales, `formatFCFA`, cartes `rounded-2xl`, map pins terrains Abidjan
  - Logo + phrase « Le foot nous unit »
  - Onboarding : Créer un compte / Se connecter / Google — **comme entrée**, pas comme produit
- **Ce qu’on ne reprend surtout pas :**
  - L’accueil fourre-tout (map + 8 actions + 5 carousels)
  - Feed en 4ᵉ tab
  - « Match publié ! » comme succès unique de `/creer`
  - Boutique sur l’accueil et dans la nav communauté
  - Classement Abidjan / Côte d’Ivoire / Afrique avec stars internationales
  - Switchs Paramètres sans geste (position, dark mode cosmétique)
  - Bouton Portefeuille **Envoyer** mort
  - Mentions « Démo 2026 » / « aucun paiement réel » dans l’UI prod
- **Langue parlée :** **tu**. Vestiaire : « Qui est chaud », « il manque un gardien », « c’est confirmé », « on se retrouve à 16 h ».
  - **À tuer :** « Informations protégées », « Aucune donnée », « Match publié ! » (si privé), « Paiement effectué (démo) », « Le Fil FUTTO », « Marketplace » sur l’accueil.
  - **À viser :** « 2 places, relance Moussa », « Le numéro s’ouvre quand vous êtes sur le même match », « Terrain demandé — en attente du gérant », « Samedi 16 h, Angré, 8/10 ».

---

## 11. Le voisin dangereux

Le voisin est **`../futto`** (et, derrière, le réflexe « app sportive complète »).

- **Ce qu’il fait mieux que nous et qu’on doit porter vraiment :**
  - Le *feeling* Côte d’Ivoire (quartiers, FCFA, OM/MTN/Wave, prénoms)
  - La carte des terrains et la fiche terrain (photos, créneaux, prix / h)
  - Le détail match : type, effectif A/B, prix, Rejoindre / Complet
  - L’invitation joueur à proximité
  - Le portefeuille + historique (peau) branché sur de vrais paiements plus tard
  - Les notifs *match* et *invite* (pas les likes)
- **Ce qu’il fait et qui n’est pas notre V1 :** Feed + publier + clips, Boutique, Tournois (FUTTO CUP, Ramadan), Classement 3 ligues, Stats buts/mois, Amis / Follow, Messages génériques, À propos marketing, Aide-placard.
- **Les pièges de son modèle :**
  - Accueil = vitrine de toutes les features → âme diluée
  - Tout « marche » en mock → on expédie des écrans-placards
  - Publier = Enregistrer
  - Compteurs 8/10 décoratifs
  - Tab Feed qui gagne la guerre de l’attention
  - Argent « Envoyer » sans destinataire
- **La règle :** on n’ouvre `../futto` pour piquer un écran **qu’après** §§1–9. On copie un bouton, pas un modèle mental.

---

## 12. V1 / plus tard / jamais

**V1 — sans ça l’app n’a pas le droit de s’appeler FUTTO :**  
compte (email / Google) ; profil (nom, poste, ville) ; créer un match en < 30 s ; privé vs public ; coller des joueurs (FUTTO ou contact / WhatsApp) ; rejoindre / quitter / complet ; carte + fiche terrain ; réserver un créneau avec états honnêtes ; participation en FCFA visible ; portefeuille recharge OM/MTN/Wave **ou** cash marqué comme tel ; notifs match + invite + rappel J-1 / J0 ; accueil = prochain match + prochaines actions ; lien partage hors app ; vides / hors-ligne / permission refusée.

**Plus tard, et interdit de le glisser dans V1 :**  
fil et clips ; boutique ; tournois et cagnottes ; classement ville/pays ; stats avancées et Niveau Or ; chat global ; équipes complexes (capitaine / titulaire / remplaçant comme produit) ; suivi live GPS ; « Envoyer » de l’argent P2P ; iOS si Android n’honore pas encore un match.

**Jamais (ou amendement écrit) :**  
devenir un feed ; vendre de la dispo terrain inventée ; afficher un téléphone trop tôt ; forcer l’install pour qu’un pote voie le créneau ; badges qui remplacent l’effectif ; un back-office gestionnaire comme accueil joueur ; cloner FotMob / Sofascore / Instagram.

---

## 13. Preuve que ça marche (hors compile)

> Étant donné …, quand je …, alors je vois / j’ai … en moins de …

1. **Naissance dehors.** Étant donné un vocal « samedi 16 h Angré 5v5 il manque 2 », quand je capture depuis l’accueil, alors j’ai un match brouillon (terrain, heure, 2 places) en moins de 30 s, **sans** passer par Boutique ni Feed.
2. **Humain collé.** Étant donné ce match, quand j’invite Didié (dans FUTTO) et Baba (WhatsApp, pas de compte), alors Didié est sur la feuille et Baba reçoit un lien lisible — pas `futto://`.
3. **Unité juste.** Étant donné 8/10 et terrain encore « demandé », l’accueil dit **prévu**, pas confirmé, pas honoré. Quand le 10ᵉ rejoint *et* le terrain est OK, ça passe **confirmé**. Après présence samedi, **honoré**.
4. **Relance.** Étant donné J-2 et 2 places, l’accueil propose Relancer Moussa et Ismaël (humains). Un tap ouvre WhatsApp. Ça ne vit pas dans Paramètres.
5. **Échec.** Étant donné réseau coupé au paiement, le match et la réservation restent *demandés*, le solde ne bouge pas, l’UI dit l’échec. GPS refusé : la carte marche en liste par quartier, pas un écran blanc.
6. **Hors app.** Étant donné un match public, quand je partage, un destinataire sans FUTTO lit quartier / heure / places / prix et peut répondre à l’hôte.

---

## 14. Secrets, accès, honnêteté technique

- **Clés :** jamais dans ce fichier, jamais dans un flow.md, jamais commit `.env`. Paiements (Wave / OM / MTN), maps, auth : secrets côté serveur / vault.
- **Qui voit les données de qui :** voir §7 en une phrase. RLS / policies devront coller à cette phrase, pas l’inverse.
- **On logue :** crashes, paiements (id, montant, statut, pas le PIN), création de match. **On ne logue jamais :** contenu de vocal collé, numéros complets, tokens.
- **Plateforme :** **mobile d’abord** (app native ou équivalent pochette). `../futto` reste la maquette web. On ne crée pas une deuxième base « pour le fun » à côté de celle de FUTTO. La démo n’a pas de base : `futtoapp` en aura **une**, alignée sur les objets du §4.

L’IA développeuse n’ouvre pas un second produit (nouveau fil, nouvelle boutique, nouveau schéma parallèle) sans que ce brief le dise.

---

# Partie III — Mini-exemple (niveau d’exigence, calé FUTTO)

Pas la spec. Le niveau.

**Phrase :** FUTTO est le carnet de poche de Koffi pour honorer un match à Abidjan : terrain + effectif + créneau.  
**Refusé :** un Instagram foot, un Leboncoin des gazons, un FIFA avec Sadio Mané, une boutique, un intranet de club.  
**Verbe :** ne rien perdre de ce qui naît sur WhatsApp, et savoir qui relancer pour samedi 16 h.  
**Unité :** match honoré (prévu / confirmé / joué), pas le solde 27 500 FCFA ni le Niveau Or.  
**Journée :** 7 h 20 vocal → match brouillon 20 s ; 12 h 40 réserver Angré sans mentir « confirmé » ; 13 h coller un gardien ; 21 h relances sur l’accueil ; samedi 15 h rappel ; lien WhatsApp au gars sans l’app.  
**Sacré :** le message d’origine, le prix dit, l’état réel du terrain.  
**Privé d’abord, ouvrir aux joueurs ensuite.**  
**Piège :** peau `../futto` + âme feed/boutique/classement = vitrine, pas vestiaire.

Si le travail de l’IA produit un accueil plus proche de `../futto/app/page.tsx` que de « Relancer 2 joueurs pour Angré », le brief a perdu.

---

# Partie IV — Phrase à coller en tête de chat

L’humain peut copier ceci au-dessus du brief rempli :

```text
Tu n’exécutes pas un flow.md. Tu es le développeur de FUTTO.
Tu as lu « Formulation avant code » (ordres I.1 à I.16).
Tu habites la journée de Koffi, l’unité « match honoré », le privé/public, la règle d’identité.
Tu refuses de commencer si la phrase produit n’est pas tranchée.
Tu prends la PEAU de ../futto (couleurs, tab bar, FCFA, terrains Abidjan).
Tu ne prends pas l’ÂME (accueil-catalogue, Feed en tab, boutique, classement).
Tu ne livres pas d’écran-placard, de permission orpheline, ni un formulaire
« Publier le match » comme premier geste : le match naît sur WhatsApp.
Avant chaque « c’est bon », tu passes le check I.15 à voix haute.
Si ce brief et ../futto se contredisent, tu t’arrêtes et tu le dis : le brief gagne.
```

---

## Note

Speckit reste utile pour **découper** (ordre des PR, tests d’acceptation numérotés).  
Il ne remplace pas **l’incarnation**.  
Ce fichier, rempli sans tricher, est ce que Speckit ne demandait pas assez fort, et ce qu’un vrai développeur, lui, n’accepte jamais de ne pas avoir.
