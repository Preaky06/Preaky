# Promptoir

Tu décris ton idée en quelques mots, le site reconnaît de quoi il s'agit, te pose les questions qui comptent pour ce type d'idée, puis assemble un prompt complet : rôle, contexte, méthode, format, garde-fous et dernière consigne. Le prompt se copie ou s'ouvre directement dans Claude ou ChatGPT.

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
creer.html               le créateur : idée → questions → prompt
404.html                 page introuvable
css/style.css            toute la DA (palette, typographie, composants)
js/home.js               accueil : démo animée, types d'idées, compteurs
js/builder.js            créateur : étapes, questions, aperçu en direct, historique
js/data/types/           un fichier par type d'idée (13), index.js les rassemble
js/lib/kit.js            assemblage du prompt (sections, surlignage des réponses)
js/lib/detect.js         reconnaissance du type d'idée par mots-clés
js/lib/store.js          brouillon et historique (localStorage)
js/lib/share.js          copier, ouvrir dans Claude ou ChatGPT, télécharger
js/lib/ui.js, icons.js   en-tête, apparitions, toast, icônes
fonts/                   Chewy (titres) et Inter (texte), hébergées sur le site
vendor/lenis.min.js      défilement fluide de l'accueil
scripts/check.mjs        vérification des types d'idées
scripts/typo-fr.py       espaces insécables de la typographie française dans les pages
```

## Comment fonctionne un type d'idée

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

Le brouillon en cours et les prompts terminés sont stockés dans le `localStorage` du navigateur. Le site ne charge aucun script tiers ni outil de mesure d'audience.

## Déploiement

Le dossier se déploie tel quel sur Vercel (aucune commande de build). `vercel.json` règle le cache des polices et quelques en-têtes de sécurité. Après le premier déploiement, remplace `og.png` par son adresse complète dans les balises `og:image` : les réseaux sociaux l'exigent.

## Licences

- Chewy : Apache 2.0. Inter : SIL Open Font License 1.1.
- Lenis : MIT.
