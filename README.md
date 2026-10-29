# Promptoir

Bibliothèque de prompts IA classés par métier. Chaque prompt contient la méthode du métier, des champs à remplir (le prompt s'adapte au contexte de la personne) et des garde-fous contre les inventions de l'IA. Site statique : HTML, CSS et JavaScript sans framework ni étape de build.

## Lancer en local

Les scripts sont des modules ES : il faut un serveur, l'ouverture directe du fichier ne suffit pas.

```bash
python3 -m http.server 4173
# puis http://localhost:4173
```

## Structure

```
index.html              page d'accueil
bibliotheque.html       la bibliothèque (recherche, filtres, fiche prompt, profil)
404.html                page introuvable
css/style.css           toute la DA (couleurs, typographie, composants)
js/home.js              accueil : métiers, parcours, démo animée du hero
js/library.js           bibliothèque
js/lib/                 assemblage des prompts, stockage local, icônes, interface
js/data/metiers.js      métiers, catégories de tâches, parcours
js/data/variables.js    champs à remplir ({{cle}}) : libellé, exemple, profil, facultatif
js/data/prompts/        un fichier par métier
fonts/                  Chewy (titres) et Inter (texte), hébergées sur le site
vendor/lenis.min.js     défilement fluide de l'accueil
scripts/check-data.mjs  vérification des données
```

## Ajouter un prompt

1. Ajoute un objet dans le fichier du métier (`js/data/prompts/<metier>.js`), sur le modèle des autres : `id`, `metier`, `categorie`, `niveau`, `titre`, `resume`, `tags`, `prompt`, `resultat`, `verifier`, `relance`.
2. Dans le texte du prompt, écris les champs à remplir sous la forme `{{cle}}`. Toute nouvelle clé doit être déclarée dans `js/data/variables.js`.
3. Lance la vérification :

```bash
node scripts/check-data.mjs
```

Elle échoue sur un identifiant en double, un métier ou une catégorie inconnus, un champ non déclaré ou un parcours qui pointe vers un prompt absent.

Pour ajouter un métier : une entrée dans `METIERS` (et éventuellement un parcours dans `PARCOURS`), un fichier dans `js/data/prompts/`, et son import dans `js/data/prompts/index.js`.

## Données personnelles

Rien n'est envoyé à un serveur : le profil, les champs remplis et les favoris sont stockés dans le `localStorage` du navigateur. Le site ne charge aucun script tiers ni outil de mesure d'audience.

## Déploiement

Le dossier se déploie tel quel sur Vercel (aucune commande de build). `vercel.json` règle le cache des polices et quelques en-têtes de sécurité.

## Licences

- Chewy : Apache 2.0. Inter : SIL Open Font License 1.1.
- Lenis : MIT.
