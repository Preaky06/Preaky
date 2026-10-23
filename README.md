# Preaky

Portfolio de Maël Gillet (Preaky) : identités visuelles, affiches, illustration 3D et produits numériques.

Site statique, sans étape de build : HTML, CSS et un petit script JavaScript.

## Pages

| Fichier | Contenu |
| --- | --- |
| `index.html` | Accueil, projets, disciplines, à propos, contact |
| `cinemood.html` | Étude de cas du site CinéMood |
| `vomalia.html` | Étude de cas de l’app mobile Vomalia |
| `prototypes/vomalia.html` | Prototype interactif de Vomalia (fichier autonome) |

Les styles sont dans `assets/css/style.css`, la visionneuse d’images et le bouton « Copier l’adresse » dans `assets/js/main.js`, les images en WebP dans `assets/img/`.

## Voir le site en local

Ouvrir `index.html` dans un navigateur, ou lancer un petit serveur :

```sh
npx serve .
```

## Mettre en ligne avec GitHub Pages

1. Sur GitHub : **Settings → Pages**.
2. Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Le site est publié à l’adresse `https://<compte>.github.io/Preaky/`.

## Ajouter une pièce graphique

1. Exporter l’image en WebP (1080 px de large suffisent) dans `assets/img/`.
2. Dans `index.html`, copier un bloc `<article class="piece">` de la section « Pièces graphiques », puis changer l’image, le titre, le texte et la palette.
3. Ajouter une vignette dans la planche d’ouverture (`<ul class="sheet">`) si le projet doit apparaître en haut de page.
