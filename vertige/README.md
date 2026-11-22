# VERTIGE

L'encyclopédie visuelle de tout ce qui a un prix, classé du moins cher au plus cher, sur une seule échelle logarithmique (10⁻⁵ € → 10¹⁴ €).

État : identité, design system, accueil, Explorer, Duel, Jeu, Budget, Méthodologie, catégories et fiches. Les 350 prix (dont 150 vedettes de l'Ascension) sont des **données de démonstration non sourcées** (`status = "demo"`, `confidence = "C"`). Pas encore de base de données : l'Explorer filtre côté client (Phase 2 : Supabase, 200 000 lignes, pagination par curseur).

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
| `npm run demo:build` | régénère `data/demo/ascension.demo.json` depuis `scripts/demo/source.mjs` (vedettes) et `source-extra.mjs` |
| `npm run demo:check` | vérifie la démo (statut, fiabilité, prix > 0, devise ISO, date ≤ aujourd'hui, ≥ 15 objets par palier) |
| `npm run demo:purge` | **supprime toutes les données de démo** en une commande |
| `npm run demo:images` | copie les illustrations 3D utilisées dans `public/objets/` |
| `npm run check:contrast` | contrôle ≥ 4,5:1 de toutes les paires texte/fond |

## Page d'accueil

1. **Escalier** (`components/stairs`) : escalier isométrique blanc à reliefs bleus ; le scroll fait monter la caméra sur 7 marches (une par palier), un objet et son prix apparaissent sur chacune, le compteur grimpe. Le scroll écrit directement dans le SVG (viewBox, tracé), sans rendu React par frame.
2. **Les prix** (`components/explorer`) : fourchettes en puces (une par palier), double curseur logarithmique, recherche tolérante aux accents, carrousel de cartes.
3. **L'Ascension** (`components/ascension`) : les 150 objets vedettes, un par étage, altimètre (règle verticale sur desktop, pastille horizontale sur mobile), portes et flash de palier.

## Autres pages

| Route | Contenu |
| --- | --- |
| `/explorer` | recherche tolérante aux fautes (`/` ou ⌘K), histogramme sélectionnable, filtres (palier, catégorie, type de prix, pays, année, fiabilité, image), tris, grille ou liste |
| `/duel` | deux objets, rapport « 1 A = N × B », barres logarithmiques, pluie d'icônes (500 max), duel aléatoire, URL `?a=…&b=…` |
| `/jeu` | « Plus ou moins cher ? » : série, écart de ×100 à ×1,2, défi du jour identique pour tous, grille 🟩🟥 à partager, record en localStorage |
| `/budget` | montant libre ou curseur log, préréglages (SMIC, 1 M€, plus grande fortune), plus gros achat possible, « N × … » |
| `/categorie/[slug]` | mini-ascension, min / médiane / max, top 10 |
| `/methodologie` | types de prix, fiabilité, sources, devises, limites, formulaire de correction (non transmis avant la Phase 5) |
| `/objet/[slug]` | fiche (minimale : la version complète arrive en Phase 3) |

Carte d'objet (`components/ui/PriceCard`) : image, nom, prix. Type de prix, date et fiabilité sont dans l'infobulle de la pastille « ≈ », lus par les lecteurs d'écran et détaillés sur la fiche.

## Choix et écarts par rapport au cahier des charges

- **Thème clair bleu/blanc** (demandé après coup) au lieu du fond quasi noir. Les 7 couleurs de palier sont assombries pour porter du texte blanc (≥ 4,5:1).
- **Police du logo provisoire : Six Caps** (Google Fonts, OFL). La police de la référence n'a pas été identifiée ; elle se remplace à un seul endroit (`--font-display`, `src/app/layout.tsx`).
- **Instrument Serif retirée** : titres et interface en Inter Tight, compteurs en JetBrains Mono.
- **Grain SVG retiré** (incohérent avec le thème clair).
- **Illustrations** : Fluent Emoji 3D (© Microsoft, MIT) via `@lobehub/fluent-emoji-3d`. Ce sont des visuels génériques (un même avion pour l'A320 et l'A380). Les photos Wikimedia Commons détourées restent à faire pour les objets vedettes ; `upload.wikimedia.org` est bloqué dans l'environnement de développement actuel.
- **Framer Motion** n'est pas chargé en Phase 1 : le ressort du compteur à rouleaux est codé à la main (≈ 35 Ko gzip économisés). La dépendance reste pour les transitions de la Phase 3.
- Catégorie racine ajoutée : **Économie** (PIB, dette publique).

## Aperçu statique

`python3 scripts/preview/make_site_artifact.py . <dossier>` (après `npm run build`) produit un aperçu
multi-pages autonome : chemins relatifs, liens internes réécrits vers `objet-<slug>.html`, etc., visuels
regroupés dans `images.js`. Sert à publier une version consultable sans serveur.

## Structure

```
src/app            routes (/, /objet/[slug], /design, pages « bientôt »)
src/components     stairs/ explorer/ ascension/ altimeter/ ui/ layout/ brand/
src/lib            échelle log, paliers, formats fr-FR, types alignés sur le schéma Postgres
scripts/demo       données de démo (source, build, validation, purge, images)
data/demo          JSON généré (lu au build)
```
