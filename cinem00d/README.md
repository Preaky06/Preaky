# CinéMood (cinem00d.com)

Version décompressée de l'export autonome `CinéMood_autonome.html` : même page, mêmes scripts,
mêmes polices et icônes, rangés en fichiers séparés au lieu d'être encodés dans un seul HTML.

## Lancer en local

```sh
cd cinem00d
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/
```

Ouvrir `index.html` directement (double-clic) fonctionne aussi. Sans proxy ni clé, la page
affiche « Le catalogue ne répond pas pour le moment » (voir plus bas).

## Structure

```
index.html                    page + gabarit de l'application (runtime dc)
assets/js/dc-runtime.js       moteur de rendu du gabarit ({{ }}, sc-if, sc-for…)
assets/js/tmdb.js             couche TMDB : requêtes, score, recommandations
assets/js/comptes.js          comptes, quota, abonnement (désactivés : CINEMOOD_NO_ACCOUNTS)
assets/js/legal.js            mentions légales et confidentialité
assets/vendor/                React 18.3.1 et ReactDOM (licence MIT), chargés localement
assets/fonts/                 Anton et Archivo (woff2, sous-ensembles latin / latin-ext / vietnamien)
assets/icons/                 favicons et icône Apple
functions/tmdb/[[path]].js    proxy TMDB (Cloudflare Pages Functions), clé côté serveur
og-image.png                  image de partage 1200×630 (Open Graph / Twitter)
robots.txt, sitemap.xml       référencement
```

## Mise en ligne sur Cloudflare Pages

1. Créer un projet Pages relié à ce dépôt.
2. Réglages de build : *Root directory* `cinem00d`, *Build command* vide, *Build output directory* `.`.
3. Variables d'environnement : `TMDB_KEY` = clé API TMDB v3 ou jeton de lecture v4.
4. Déployer, puis brancher le domaine `cinem00d.com`.

Le site appelle `/tmdb/…` ; le proxy n'accepte que les chemins utilisés par le site
(`discover/movie`, `search/movie`, `movie/{id}`) et ajoute la clé. Vérification : les affiches
de la rangée « Action » apparaissent, et un parcours complet donne des films classés.

## Clé TMDB

La clé de repli (`FALLBACK_KEY` dans `assets/js/tmdb.js`) a été retirée du dépôt. Elle ne sert
que sans proxy (hébergement statique pur) : la renseigner rend alors la clé lisible par tout visiteur.

## Non inclus

- **Le serveur `/api/*`** (comptes, quota, abonnement Stripe) : absent de l'export, et inutile
  dans la configuration actuelle (`CINEMOOD_FREE_MODE` et `CINEMOOD_NO_ACCOUNTS` valent `true`,
  aucun appel n'est fait).
- **`og-image.png` d'origine** : absente de l'export ; celle du dépôt est une recréation
  aux couleurs et polices du site.
