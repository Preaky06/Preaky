# Grand Theft News 6

Guide de fans pour GTA 6 : carte de Leonida avec repères, codes de triche, voitures rares, easter eggs, argent caché, codes de coffres, collectibles, astuces et personnages.

Site statique, sans build : ouvrir `index.html` via n'importe quel serveur (GitHub Pages, Vercel, Netlify ou `python3 -m http.server`).

## Structure

| Fichier | Rôle |
| --- | --- |
| `js/data.js` | **Tout le contenu du guide** (FR / EN / ES), avec un niveau de fiabilité par entrée et les sources |
| `js/geo.js` | Généré : position de chaque élément (coordonnées du jeu), photo associée, calage de la carte |
| `js/i18n.js` | Textes de l'interface dans les 3 langues |
| `js/icons.js` | Icônes au trait |
| `js/app.js` | Navigation, animations, carte Leaflet, recherche, filtres, fiches |
| `css/style.css` | Styles « Vice City Nights », thèmes clair/sombre, responsive |
| `img/map/leonida.jpg` | Fond de la carte interactive |
| `img/photos/` | Captures officielles GTA VI (version large + `-s` réduite) |
| `img/minimap/` | Vue rapprochée de chaque emplacement |
| `vendor/leaflet/` | Leaflet 1.9.4 (licence BSD-2) pour le zoom et le déplacement de la carte |
| `tools/` | Scripts qui régénèrent `geo.js`, les photos et les mini-cartes |

## Ajouter ou corriger un élément

1. Dans `js/data.js`, ajoute l'entrée dans la bonne catégorie (`tr("FR", "EN", "ES")` pour les textes) :

   ```js
   { id: "penumbra", name: "...", region: "vice", conf: "ok", yt: "IDVIDEO",
     loc: tr("FR", "EN", "ES"), how: tr(...), note: tr(...) }
   ```

   `conf` : `ok` (★★★, plusieurs sources concordent), `mixed` (★★, sources divergentes, détail dans `note`), `single` (★, à vérifier).

2. Pour la placer sur la carte, ajoute ses coordonnées du jeu dans `GEO` (`tools/build_assets.py`) : `"cars:penumbra": (x, y, approximatif)`. Les coordonnées se lisent sur [map.gtadb.org](https://map.gtadb.org). Pour une photo, associe une clé de `PHOTOS` dans `ITEM_PHOTO`.

3. Régénère :

   ```bash
   git clone --depth 1 --filter=blob:none --sparse https://github.com/rolux/gtadb.org
   git -C gtadb.org sparse-checkout set map/data/6 map/photos/6
   pip install pillow
   python3 tools/build_assets.py gtadb.org          # photos + mini-cartes + geo.js
   python3 tools/build_assets.py gtadb.org --geo-only   # seulement geo.js
   ```

La carte de fond est calée sur les coordonnées du jeu par `USERMAP` dans `tools/build_assets.py` (`x_pixel = (x − X0) / S`, `y_pixel = (Y0 − y) / S`). Si tu changes l'image de fond, il faut recaler ces trois valeurs.

## Crédits

- Photos (captures officielles GTA VI), coordonnées des lieux et tuiles des vues rapprochées : [gtadb.org](https://map.gtadb.org), licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Les images ont été recadrées et redimensionnées.
- Infos de jeu : sources citées en bas de chaque page du site.
- Grand Theft Auto VI © Rockstar Games. Site non officiel, non affilié à Rockstar Games ni à Take-Two.

Les préférences (langue, thème, plateforme PS5/Xbox, éléments « trouvés ») restent dans le `localStorage` du navigateur.
