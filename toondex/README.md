# ToonDex

Collection de cartes de personnages de séries, séries animées, anime et films. Un paquet de 5 cartes par jour, cinq raretés, des versions or très rares, des doublons transformés en éclats pour fabriquer les cartes manquantes.

## Lancer le site

```bash
npm install
npm run dev
```

Le site tourne sur http://localhost:3000. Sans configuration, les comptes et les collections sont stockés dans une base PGlite locale (`.data/pglite`, ignorée par git).

## Base de données

| Situation | Base utilisée |
| --- | --- |
| `DATABASE_URL` absente | PGlite, un Postgres embarqué dans `.data/pglite` (ou `PGLITE_DIR`). Un seul processus à la fois : n'ouvre pas ce dossier depuis un autre script pendant que le site tourne. |
| `DATABASE_URL` définie | N'importe quel Postgres (Neon, Supabase, serveur maison). Obligatoire pour un hébergement serverless comme Vercel, où le disque n'est pas persistant. |

Les tables sont créées au premier accès (`src/lib/db.ts`) : `users`, `sessions`, `owned_cards`, `daily_packs`.

## Règles du jeu

Toutes les valeurs sont dans `src/lib/rules.ts`.

- **Paquet du jour** : 5 cartes, une fois par jour et par compte. Renouvelé à minuit, heure de Paris. La clé primaire `(user_id, day)` empêche une double ouverture.
- **Raretés** : cartes 1 à 4 tirées à 62 % commune, 25 % rare, 9 % épique, 3,2 % légendaire, 0,8 % mythique. La carte 5 est au moins rare.
- **Version or** : 1 chance sur 250 par carte, quelle que soit la rareté. Ne se fabrique pas.
- **Doublons** : convertis automatiquement en éclats (5, 10, 25, 60, 150 selon la rareté, ×5 pour un doublon or).
- **Fabrication** : 40, 100, 250, 600 ou 1 500 éclats pour une carte manquante.
- **Animations d'ouverture** : une par rareté, plus une pour l'or (`src/app/globals.css`, section Révélation). Réduites à un simple retournement si le système demande moins d'animations.

## Catalogue

Chaque carte est un **personnage** d'une œuvre, avec sa vraie image. Une œuvre sans personnage illustré n'a pas de carte.

- `src/data/works.json` : les œuvres, `[identifiant, titre, type, année, pays, genres, rareté]`. Types : `serie`, `serie-animee`, `anime`, `film`, `film-animation`. Pays : codes ISO séparés par des virgules (`US,GB`). La rareté de l'œuvre est celle de son personnage principal.
- `src/data/cards.json` : les cartes, `{ id, name, work, rarity, image, source, credit }`. Généré par `node scripts/fetch-cards.mjs` (derrière un proxy : `NODE_USE_ENV_PROXY=1`). Personnage principal à la rareté de l'œuvre, personnages secondaires un cran en dessous.
- Sources des images, toutes gratuites et sans clé :
  - **TVMaze** pour les séries et séries animées : image du personnage dans son rôle. Le script choisit les personnages listés dans `SERIES` (avec un article Wikipédia de secours si TVMaze n'a pas d'image).
  - **Disney API** (images du wiki Disney de Fandom) pour les films Disney.
  - **Wikipédia** pour les autres films (`WIKI_FILMS`), à partir du cache `scripts/.wiki-cache.json` (ignoré par git). Wikipédia limite fortement le débit des adresses partagées : `--wiki` remplit le cache lentement, on peut relancer sans tout redemander. Les affiches de film sont écartées.
  - **AniList** pour les anime et les films d'animation japonais (`ANIME`).
- Un personnage sans image est écarté, et une œuvre sans personnage illustré n'a pas de carte.
- Les cartes sont numérotées par type d'œuvre, dans l'ordre du fichier.

Vérification : `npm run check:catalogue`.

Les personnages, leurs images et les œuvres appartiennent à leurs ayants droit. Les images sont affichées depuis leur source (TVMaze, AniList, Fandom, Wikipédia), citée sur chaque fiche. Usage non commercial.

## Direction artistique

- Titrage : Sigmar (Google Fonts), lettres droites ; `src/components/Wobble.tsx` colore les grands titres lettre par lettre. Texte courant : Rubik.
- Couleurs : bleu électrique `#3B4CFF`, encre `#15161C`, lilas, orange, citron vert, rose.
- Pages en panneaux arrondis blancs, sombres et lilas, bandeau défilant, gants de dessin animé et mascotte télé « Toono » (`src/components/Cartoon.tsx`).
- Cartes façon jeu de cartes : fond de la couleur du type, nom du personnage, fenêtre avec son image, œuvre et genres, rareté en étoiles. Rare : cadre blanc. Épique : reflet. Légendaire : bordure dorée. Mythique : bordure arc-en-ciel. Version or : carte entièrement dorée.

## Comptes

- Pseudo (3 à 20 caractères) et mot de passe (8 caractères minimum). Pas d'e-mail, donc pas de récupération de mot de passe pour l'instant.
- Mots de passe hachés avec scrypt et un sel aléatoire. Session dans un cookie `httpOnly` de 30 jours, seule son empreinte SHA-256 est stockée.
- Limite de 8 essais de connexion par pseudo et par quart d'heure. Cette limite vit dans la mémoire du processus : sur un hébergement serverless, elle ne protège qu'une instance à la fois.

## Pages

| Route | Contenu |
| --- | --- |
| `/` | Invité : présentation et chances. Connecté : paquet du jour, puis bilan de la collection. |
| `/collection` | Cartes possédées et manquantes, filtres, fabrication. |
| `/catalogue` | Toutes les cartes, recherche par personnage ou œuvre, filtres, règles. |
| `/carte/[id]` | Fiche d'une carte, chance de l'obtenir, exemplaires possédés. |
| `/connexion`, `/inscription` | Comptes. |
| `/apercu` | Paquet fixe avec une carte de chaque rareté (`?or=1` pour la version or). Désactivé en production sauf `TOONDEX_DEMO=1`. |

## Vérifications

```bash
npm run check
npm run build
```
