# VERTIGE

L'encyclopédie visuelle de tout ce qui a un prix, classé du moins cher au plus cher, sur une seule échelle logarithmique (10⁻⁵ € → 10¹⁴ €).

État : identité, design system, accueil, Explorer, Duel, Jeu, Budget, Méthodologie, catégories et fiches. Les 1 000 prix (dont 150 vedettes de l'Ascension) sont des **données de démonstration non sourcées** (`status = "demo"`, `confidence = "C"`). Pas encore de base de données : l'Explorer filtre côté client (Phase 2 : Supabase, 200 000 lignes, pagination par curseur).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run check` | typecheck + lint + validation de la démo + contraste WCAG |
| `npm run demo:build` | régénère `data/demo/ascension.demo.json` depuis `scripts/demo/source.mjs` (vedettes), `source-extra.mjs` et `source-catalog.mjs` (catalogue compact, sans phrase) |
| `npm run demo:check` | vérifie la démo (statut, fiabilité, prix > 0, devise ISO, date ≤ aujourd'hui, ≥ 15 objets par palier) |
| `npm run demo:purge` | **supprime toutes les données de démo** en une commande |
| `npm run demo:images` | copie les illustrations 3D utilisées dans `public/objets/` |
| `npm run check:contrast` | contrôle ≥ 4,5:1 de toutes les paires texte/fond |

## Page d'accueil

1. **Escalier** (`components/stairs`) : escalier isométrique blanc à reliefs bleus ; le scroll fait monter la caméra sur 7 marches (une par palier), un objet et son prix apparaissent sur chacune, le compteur grimpe. Le scroll écrit directement dans le SVG (viewBox, tracé), sans rendu React par frame.
2. **Les prix** (`components/explorer`) : deux gestes (une fourchette, puis le carrousel) ; le double curseur logarithmique est derrière « Affiner » ; au-delà de 40 objets, une carte renvoie vers l'Explorer filtré.
3. **L'Ascension** (`components/ascension`) : les 150 objets vedettes, un par étage, altimètre (règle verticale sur desktop, pastille horizontale sur mobile), portes et flash de palier.

## Autres pages

| Route | Contenu |
| --- | --- |
| `/explorer` | recherche tolérante aux fautes (`/` ou ⌘K), fourchettes en puces, catégorie, tri ; « Plus de filtres » (type de prix, pays, année, fiabilité) et histogramme repliés ; cartes ou liste ; URL `?palier=`, `?categorie=`, `?q=` |
| `/duel` | deux objets, rapport « 1 A = N × B », barres logarithmiques, pluie d'icônes (500 max), duel aléatoire, URL `?a=…&b=…` |
| `/jeu` | « Plus ou moins cher ? » : série, écart de ×100 à ×1,2, défi du jour identique pour tous, grille 🟩🟥 à partager, record en localStorage |
| `/budget` | montant libre ou curseur log, préréglages (SMIC, 1 M€, plus grande fortune), plus gros achat possible, « N × … » |
| `/categorie/[slug]` | mini-ascension, min / médiane / max, top 10 |
| `/methodologie` | types de prix, fiabilité, sources, devises, limites, formulaire de correction (non transmis avant la Phase 5) |
| `/objet/[slug]` | fiche : prix, repères concrets (baguettes, temps de travail au SMIC, Big Mac ou iPhone), place sur l'échelle, voisins, détails du prix |
| `/apercu/fiche` | page technique (noindex) de l'aperçu statique : toutes les fiches via `#slug` |

Carte d'objet (`components/ui/PriceCard`) : image, nom, prix. Type de prix, date et fiabilité sont dans l'infobulle de la pastille « ≈ », lus par les lecteurs d'écran et détaillés sur la fiche.

## Choix et écarts par rapport au cahier des charges

- **Thème clair bleu/blanc** (demandé après coup) au lieu du fond quasi noir. Les 7 couleurs de palier sont assombries pour porter du texte blanc (≥ 4,5:1).
- **Police du logo provisoire : Six Caps** (Google Fonts, OFL). La police de la référence n'a pas été identifiée ; elle se remplace à un seul endroit (`--font-display`, `src/app/layout.tsx`).
- **Instrument Serif retirée** : titres et interface en Inter Tight, compteurs en JetBrains Mono.
- **Grain SVG retiré** (incohérent avec le thème clair).
- **Images** : photos réelles de Wikimedia Commons quand elles existent, sinon illustration 3D générique Fluent Emoji (© Microsoft, MIT, via `@lobehub/fluent-emoji-3d`).
  - `scripts/demo/photo-sources.json` : objet → article Wikipédia dont l'image Wikidata (P18, drapeau P41 ou logo P154) est utilisée.
  - `scripts/demo/photos.json` : image retenue, auteur, licence (libres uniquement : CC0, CC BY, CC BY-SA, domaine public), page source.
  - Trois rendus (`image_kind`) : `cutout` objet détouré (rembg, modèle isnet) qui dépasse de la carte ; `photo` image encadrée (lieux, œuvres, drapeaux, logos) ; `illustration` visuel 3D générique.
  - Pas de photo de personnes (transferts, fortunes) : illustration générique.
  - Attribution sur chaque fiche (auteur, licence, lien vers la page Commons). Une photo détourée est une œuvre dérivée : elle reste sous la licence d'origine.
- **Framer Motion** n'est pas chargé en Phase 1 : le ressort du compteur à rouleaux est codé à la main (≈ 35 Ko gzip économisés). La dépendance reste pour les transitions de la Phase 3.
- Catégorie racine ajoutée : **Économie** (PIB, dette publique).

## Aperçu statique

`python3 scripts/preview/make_site_artifact.py . <dossier>` (après `npm run build`) produit un aperçu
multi-pages autonome : chemins relatifs, liens internes réécrits (`/objet/<slug>` → `apercu-fiche.html#<slug>`,
`/categorie/<slug>` → `categorie-<slug>.html`), visuels regroupés dans `images.js`. Environ 80 fichiers.

## Structure

```
src/app            routes (/, /objet/[slug], /design, pages « bientôt »)
src/components     stairs/ explorer/ ascension/ altimeter/ ui/ layout/ brand/
src/lib            échelle log, paliers, formats fr-FR, types alignés sur le schéma Postgres
scripts/demo       données de démo (source, build, validation, purge, images)
data/demo          JSON généré (lu au build)
```
