# Grand Theft News 6

Guide de fans pour GTA 6 : carte de Leonida, codes de triche, voitures rares, easter eggs, argent caché, codes de coffres, collectibles, astuces et personnages.

Site statique, sans build : ouvrir `index.html` via n'importe quel serveur (GitHub Pages, Vercel, Netlify ou `python3 -m http.server`).

## Structure

| Fichier | Rôle |
| --- | --- |
| `js/data.js` | **Tout le contenu du guide** (FR / EN / ES), avec un niveau de fiabilité par entrée et les sources |
| `js/i18n.js` | Textes de l'interface dans les 3 langues |
| `js/icons.js` | Illustrations 3D des catégories et icônes |
| `js/app.js` | Navigation, animations, carte, recherche, filtres, modales |
| `css/style.css` | Styles, thèmes clair/sombre, responsive |

## Mettre à jour le contenu

Chaque entrée de `js/data.js` suit le même schéma :

```js
{ id: "penumbra", name: "...", region: "vice", pin: [845, 706], conf: "ok", yt: "IDVIDEO",
  loc: L("FR", "EN", "ES"), how: L(...), note: L(...) }
```

- `conf` : `ok` (plusieurs sources concordent), `mixed` (sources divergentes, détail dans `note`), `single` (à vérifier).
- `pin` : position sur la carte stylisée (repère 1000 × 1060). Sans `pin`, l'entrée n'apparaît pas sur la carte.
- `yt` : identifiant d'une vidéo YouTube ; sa miniature sert d'image et le bouton « Voir la vidéo » y renvoie. Si la miniature ne charge pas, l'illustration de la catégorie reste affichée.

Les préférences (langue, thème, plateforme PS5/Xbox, éléments « trouvés ») sont gardées dans le `localStorage` du navigateur.

Site non officiel, non affilié à Rockstar Games ni à Take-Two.
