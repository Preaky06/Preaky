# MIJORA

Encyclopédie gastronomique et plateforme internationale de recettes.
*Le monde se découvre aussi dans l'assiette.*

État : **phase 1** (identité, navigation, accueil, explorateur, pages pays, régimes, traditions, fiches recettes, base Supabase, recherche et filtres). Le catalogue contient **34 recettes de démonstration**, toutes au statut « à vérifier » : elles sont affichées comme telles et ne sont pas proposées aux moteurs de recherche tant qu'un éditeur ne les a pas relues, sourcées et illustrées par une photographie autorisée.

## Commandes

```bash
npm install
npm run build        # dist/   : site de production (URL propres /pays/japon, à servir avec cleanUrls)
npm run preview      # apercu/ : mêmes pages avec des liens relatifs vers les fichiers .html
npm run seed         # régénère supabase/seed.sql depuis data/
npm run check:db     # monte un PostgreSQL local jetable et vérifie schéma, données et politiques RLS
npm run pays         # régénère data/countries.json (195 pays) depuis world-countries
```

Aperçu local : `cd apercu && python3 -m http.server 4180`, puis http://localhost:4180/.

Variables d'environnement lues par `npm run build` :

| Variable | Rôle |
|---|---|
| `SITE_URL` | Adresse publique, pour les balises canoniques, Open Graph et le sitemap (par défaut `https://www.mijora.example`) |
| `SUPABASE_URL` | Adresse du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé publique « anon ». Le build refuse une clé `service_role`. |

Sans Supabase, le site fonctionne entièrement en lecture ; la connexion et la lettre d'information s'affichent comme indisponibles.

## Architecture

```
data/                 source de vérité éditoriale (une seule, pour le site et la base)
  countries.json      195 pays : ISO, drapeau, continent, région, gentilés (généré)
  taxonomies.mjs      continents, catégories, difficultés, budgets, tranches de temps, familles, unités, 14 allergènes
  ingredients.mjs     133 ingrédients : famille, origine (végétale, viande, lait…), allergènes, couleur
  recettes.mjs        recettes (format décrit en tête de fichier)
  regimes.mjs         11 modes d'alimentation, avec leur nature et leur règle de compatibilité
  traditions.mjs      8 traditions ; editorial-pays.mjs : textes de 34 pays ; articles.mjs : magazine
scripts/
  build.mjs           générateur statique (pages, illustrations, index de recherche, sitemap, robots, vercel.json)
  lib/donnees.mjs     relie les données et déduit régimes et allergènes de la composition des recettes
  lib/illustrations.mjs, lib/cartes.mjs   illustrations des plats et cartes (Natural Earth)
  templates/          gabarits des pages
  seed-sql.mjs        génère supabase/seed.sql ; verify-db.mjs : tests de la base
src/css/mijora.css    feuille de style unique
src/js/               modules navigateur (recherche, explorateur, fiche recette, favoris, listes, compte)
supabase/migrations/  schéma, index, fonctions, politiques RLS ; supabase/seed.sql : jeu de données initial
```

Les pages sont générées en HTML statique : contenu lisible sans JavaScript, indexable, rapide. Le JavaScript ajoute la recherche, les filtres, le recalcul des portions, les favoris et les listes. La recherche s'appuie sur un index JSON généré à partir des données ; la base Supabase expose la même recherche (`rechercher_recettes`) pour la suite.

### Publier une recette vérifiée

Dans `data/recettes.mjs`, ajouter à la recette :

```js
statut: "publie",
verification: "2026-11-15",
source: { auteur: "Nom de l'auteur ou de l'ouvrage", url: "https://…" },
photo: { url: "/img/photos/soupe-miso.webp", licence: "CC BY 4.0", credit: "Nom du photographe" },
```

Le générateur refuse une recette publiée à laquelle il manque l'un de ces éléments. Une fois publiée, la page perd le bandeau « démonstration », devient indexable, entre dans le sitemap et reçoit ses données structurées `Recipe`. La base applique la même règle (contrainte `recette_publiable`).

### Régimes et allergènes

Rien n'est saisi à la main : chaque ingrédient porte son origine et ses allergènes, et `scripts/lib/donnees.mjs` en déduit pour chaque recette et chaque régime un statut :

- **compatible** : aucun ingrédient exclu ;
- **adaptable** : l'ingrédient exclu est facultatif ou dispose d'une substitution compatible (la note indique laquelle) ;
- **selon les produits** : un ingrédient change de composition selon la marque (sauce soja, miso, asafoetida…) ;
- **non compatible** ;
- **non évalué** : keto, riche en protéines (exigent des valeurs nutritionnelles vérifiées), halal et casher (dépendent de la provenance et de la certification).

Ces statuts restent « calculés » tant qu'un éditeur ne les a pas vérifiés (`recipe_diets.verification_status`).

### Quantités

`src/js/quantites.js` est partagé entre le générateur et le navigateur. Le recalcul des portions arrondit à des valeurs utilisables (½ oignon, 1 ¼ c. à soupe, 85 g) et ne convertit qu'à l'intérieur d'une même dimension (g ↔ kg, ml ↔ l), jamais un volume en masse.

## Base de données (Supabase)

1. Créer un projet Supabase.
2. Appliquer les migrations : `supabase db push`, ou coller dans l'éditeur SQL les fichiers de `supabase/migrations/` dans l'ordre.
3. Charger `supabase/seed.sql`.
4. Après la première connexion de l'administrateur : `update public.profiles set role = 'admin' where id = '<uuid>';`
5. Construire le site avec `SUPABASE_URL` et `SUPABASE_ANON_KEY`.

Politiques RLS (vérifiées par `npm run check:db`, 43 contrôles) :

- les données éditoriales sont lisibles par tous ; une recette n'est visible que publiée, ou marquée démonstration ;
- favoris, collections, listes de courses, menus, préférences et historique ne sont visibles et modifiables que par leur propriétaire ;
- seuls les administrateurs créent, modifient et publient ; un utilisateur ne peut pas se donner ce rôle ;
- une recette ne peut passer au statut « publié » qu'avec une date de vérification, une source et une image dont la licence est renseignée ;
- chaque changement de statut est journalisé (`editorial_events`) ;
- l'inscription à la lettre d'information est ouverte, la liste des inscrits ne l'est pas.

Statuts éditoriaux : brouillon, à vérifier, vérifié, publié, archivé.

## SEO

URL lisibles (`/recettes/japon/soupe-miso`, `/pays/italie`, `/regimes/vegetarien`, `/traditions/ramadan`), titres et descriptions uniques, Open Graph, balises canoniques, `BreadcrumbList` sur les pages profondes, sitemap et robots.txt. Les pages dont le contenu n'est pas encore vérifié portent `noindex` et sont absentes du sitemap ; les données structurées `Recipe` ne sont produites que pour une recette publiée avec une image autorisée.

## Ce qui reste à faire

**Avant toute publication** : vérifier et sourcer les recettes et les textes, ajouter des photographies dont les droits sont acquis, calculer les valeurs nutritionnelles à partir d'une table de référence (par exemple Ciqual), définir `SITE_URL`.

**Phase 2** : synchronisation des favoris et des listes avec le compte (les tables et politiques existent ; ils sont aujourd'hui enregistrés sur l'appareil), collections, planning hebdomadaire, interface d'administration, import CSV avec validation et détection des doublons.

**Phase 3** : frigo intelligent, assistant culinaire, passeport gastronomique.

## Données et licences

- Pays : [mledoze/countries](https://github.com/mledoze/countries), ODbL 1.0.
- Contours : [Natural Earth](https://www.naturalearthdata.com/), domaine public (paquet world-atlas).
- Drapeaux : police Twemoji Country Flags, dessins Twemoji sous licence CC BY 4.0.
- Polices : Playfair Display et DM Sans, SIL Open Font License 1.1.
- Illustrations des plats et image de partage : générées par le projet.
