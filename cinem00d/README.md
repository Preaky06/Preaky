# CinéMood (cinem00d.com)

Version décompressée de l'export autonome `CinéMood_autonome.html` : même page, mêmes scripts,
mêmes polices et icônes, rangés en fichiers séparés au lieu d'être encodés dans un seul HTML.

## Lancer en local

```sh
cd cinem00d
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/
```

Ouvrir `index.html` directement (double-clic) fonctionne aussi.

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
```

## Clé TMDB

La clé de repli (`FALLBACK_KEY` dans `assets/js/tmdb.js`) a été retirée du dépôt. Deux façons
d'afficher les films :

- **Cloudflare Pages avec les fonctions** : le proxy `/tmdb` ajoute la clé côté serveur
  (variable d'environnement `TMDB_KEY`). Rien à mettre dans le code.
- **Hébergement statique** (sans proxy) : renseigner `FALLBACK_KEY`. La clé devient alors
  lisible par tout visiteur.

Sans clé ni proxy, la page se charge et affiche « Le catalogue ne répond pas pour le moment ».

## Ce que l'export ne contient pas

- **Les fonctions Cloudflare Pages** (`/tmdb`, `/api/*`).
- **`og-image.png`** : les balises Open Graph pointent vers `https://cinem00d.com/og-image.png`.
