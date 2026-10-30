# Promptoir

Une bibliothèque de 6 709 prompts prêts à l'emploi, classés en 196 domaines (métiers, matières, passions, moments de vie) et 29 univers. On choisit un prompt, on complète deux ou trois champs, on le copie ou on l'ouvre directement dans Claude ou ChatGPT. Chaque prompt suit la même structure : rôle, contexte, mission, méthode, format, règles et dernière consigne.

Pour un besoin absent de la bibliothèque, le créateur sur mesure (`creer.html`) part d'une idée décrite en quelques mots et pose 6 à 10 questions adaptées.

Site statique : HTML, CSS et JavaScript sans framework ni étape de build. Rien n'est envoyé à un serveur.

## Lancer en local

Les scripts sont des modules ES : il faut un serveur, l'ouverture directe du fichier ne suffit pas.

```bash
python3 -m http.server 4173
# puis http://localhost:4173
```

## Structure

```
index.html               accueil
bibliotheque.html        la bibliothèque : recherche, filtres, fiche d'un prompt
creer.html               le créateur sur mesure : idée → questions → prompt
404.html                 page introuvable
css/style.css            toute la DA (palette, typographie, composants)
js/home.js               accueil : démo animée, univers, compteurs
js/library.js            bibliothèque : recherche, filtres, favoris, profil, fiche avec aperçu en direct
js/builder.js            créateur sur mesure : étapes, questions, aperçu en direct, historique
js/data/catalogue/       le catalogue (voir plus bas)
js/data/stats.js         chiffres du catalogue pour l'accueil (généré)
js/lib/compose.js        assemblage d'un prompt du catalogue
js/data/types/           un fichier par type d'idée (13), index.js les rassemble
js/lib/kit.js            assemblage du prompt (sections, surlignage des réponses)
js/lib/detect.js         reconnaissance du type d'idée par mots-clés
js/lib/store.js          brouillon, historique, favoris et profil (localStorage)
js/lib/share.js          copier, ouvrir dans Claude ou ChatGPT, télécharger
js/lib/ui.js, icons.js   en-tête, apparitions, toast, icônes
fonts/                   Chewy (titres) et Inter (texte), hébergées sur le site
vendor/lenis.min.js      défilement fluide de l'accueil
scripts/check.mjs        vérification du catalogue et des types d'idées
scripts/stats.mjs        régénère js/data/stats.js
scripts/typo-fr.py       espaces insécables de la typographie française dans les pages
```

## Comment est construit le catalogue

Un prompt de la bibliothèque croise deux choses écrites à la main :

- une **fiche de domaine** (`domaines-1.js` à `domaines-6.js`), créée avec `dom(id, nom, univers, types, profil, prompts)`. Le profil donne le rôle de l'IA et ce que l'on sait du domaine. Selon le type : pour un métier (`b2c`, `b2b`, `employe`, `sante`, combinables avec `+`), le cadre, les clients, les enjeux, les indicateurs, les outils, les livrables, les tâches et les règles ; pour une pratique (`perso`) ou une relation (`relation`), le sujet ; pour la carrière (`carriere`), la situation ; pour les études (`etude`), la matière, les notions, les examens et les exercices ; pour la création (`creatif`), la pratique, le public, les lieux de diffusion et les techniques. Chaque fiche contient 4 prompts écrits pour ce seul domaine ;
- des **modèles** (`modeles-pro.js`, `modeles-vie.js`, `modeles-savoir.js`) : une méthode de travail réutilisable (email délicat, plan de révision, préparation d'entretien), avec ses champs, sa méthode, son format et ses garde-fous.

`index.js` donne à chaque domaine les modèles des familles qui correspondent à son type (`FAMILLES`), sauf ceux listés dans `sans`. Les champs à compléter sont déclarés une seule fois dans `champs.js`.

Pour ajouter un domaine : ajoute une fiche dans un des fichiers `domaines-*.js`, puis lance `node scripts/stats.mjs` et `node scripts/check.mjs`. La vérification assemble chacun des prompts, vides et complétés, et refuse : un champ non déclaré, un modèle exclu inconnu, une fiche incomplète, un titre en double dans un domaine, un mot répété, un « … », moins de 5 000 prompts, ou un `stats.js` pas à jour.

## Comment fonctionne un type d'idée (créateur sur mesure)

Chaque fichier de `js/data/types/` exporte :

- `nom`, `icon`, `couleur`, `description`, `exemples` : ce qui s'affiche ;
- `motsCles` : `[mot, poids]` pour la reconnaissance. Un mot-clé matche en début de mot (`poem` trouve « poèmes ») ; terminé par `$`, il doit correspondre au mot entier (`post$` ne trouve pas « poste ») ;
- `questions` : `choice` (un choix), `multi` (plusieurs), `text` (réponse courte), `long` (texte libre). Options possibles : `pourquoi` (affiché sous la question), `optional`, `auto` (bouton « Laisse l'IA décider »), `when(réponses)` (question conditionnelle), `suggestions`, `prefill(idée)`, et pour chaque option `match` (pré-sélection d'après les mots de l'idée) ;
- `build(c)` : construit le prompt avec `c.v(id)` (texte saisi), `c.l(id)` (libellés choisis), `c.is(id, valeur)`, `c.has(id)`, et les fonctions `sec`, `line`, `steps` de `kit.js`.

## Ajouter ou modifier un type d'idée

1. Copie un fichier de `js/data/types/`, adapte-le, puis ajoute-le dans `js/data/types/index.js`.
2. Lance la vérification :

```bash
node scripts/check.mjs
```

Elle assemble chaque prompt avec des réponses vides, complètes et « laissées à l'IA », et refuse : les erreurs, les lignes vides, les doubles espaces, les « … » qui donnent l'impression d'un texte coupé, les exemples affichés qui ne seraient pas reconnus comme leur propre type, et 26 cas de reconnaissance de référence.

## Données personnelles

Le brouillon en cours, les prompts terminés, les favoris et le profil (activité, public, ton, pays) sont stockés dans le `localStorage` du navigateur. Le site ne charge aucun script tiers ni outil de mesure d'audience.

## Déploiement

Le dossier se déploie tel quel sur Vercel (aucune commande de build). `vercel.json` règle le cache des polices et quelques en-têtes de sécurité. Après le premier déploiement, remplace `og.png` par son adresse complète dans les balises `og:image` : les réseaux sociaux l'exigent.

## Licences

- Chewy : Apache 2.0. Inter : SIL Open Font License 1.1.
- Lenis : MIT.
