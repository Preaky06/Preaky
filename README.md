# ExpliSite — la paperasse, en clair

ExpliSite transforme n'importe quel document administratif (avis d'impôt, courrier CAF, amende, facture, bail, contrat, résultats d'analyses…) en explication claire et en plan d'action :

- **En clair** : ce que le document signifie pour vous, en une ou deux phrases.
- **Jauge d'urgence** : rien à faire, pour info, à traiter, urgent.
- **À faire** : liste d'actions cochable (mémorisée dans le navigateur) avec dates limites.
- **Dates clés** : frise avec compte à rebours et export `.ics` vers votre agenda (rappels J-3 et H-12).
- **Montants** : ce que vous devez payer ou recevoir.
- **Attention / Vos droits** : pièges, clauses sensibles, recours et aides possibles.
- **Mots compliqués** : lexique en cartes à retourner.
- **Contacts et références** : cliquables et copiables.
- **Réponse prête** : courrier modifiable, à copier, télécharger ou envoyer par e-mail.
- **Chat** : posez vos questions sur le document, réponses en direct.
- Explications en 15 langues ; l'écran de résultat, l'analyse et le chat s'affichent aussi dans la langue choisie (14 langues, arabe de droite à gauche). La page d'accueil reste en français.
- Niveau simple ou détaillé, historique local, partage, impression, thème clair/sombre, mobile (appareil photo).
- Application installable (PWA) : l'interface et l'historique restent consultables hors ligne.
- Pages légales (mentions légales, confidentialité RGPD, conditions d'utilisation), case de consentement avant l'envoi d'un document, lien « Signaler un problème ».
- Référencement : image de partage, sitemap, robots.txt, données structurées ; polices hébergées sur le site (aucune ressource tierce, aucun cookie).

Entrées acceptées : photos (JPG, PNG, WebP ; plusieurs pages possibles, redimensionnées dans le navigateur), un PDF (16 Mo max) ou du texte collé.

## Moteur

Analyse par **Claude Opus 5** (Anthropic) via le SDK officiel `@anthropic-ai/sdk` :
lecture native des images et PDF, réflexion adaptative (`thinking: adaptive`, dont le résumé s'affiche en direct pendant l'analyse), sorties structurées JSON (schéma dans `lib/prompts.js`), streaming, cache de prompt pour les questions de suivi, et repli serveur automatique en cas de refus (`fallbacks: "default"`).

La clé API reste sur le serveur. Aucun document n'est stocké : il transite vers l'API pour l'analyse, puis est oublié. L'historique vit uniquement dans le `localStorage` du navigateur.

## Lancer en local

Prérequis : Node.js 20.12 ou plus récent.

```bash
npm install
cp .env.example .env      # puis collez votre clé dans ANTHROPIC_API_KEY
npm start                 # http://localhost:3000
```

Sans clé, le site démarre en **mode démo** (bandeau jaune, résultat fictif) pour tester l'interface.

Au démarrage, le serveur signale les informations légales manquantes. Tant qu'elles ne sont pas renseignées, les pages légales affichent « [à compléter : …] » surligné.

## Avant la mise en ligne publique

1. Renseignez `OWNER_NAME`, `OWNER_STATUS`, `OWNER_ADDRESS`, `OWNER_EMAIL` et `HOSTING_PROVIDER` (identité et adresse exactes de votre hébergeur, à recopier depuis ses propres mentions légales).
2. Renseignez `SITE_URL` avec l'adresse publique en `https://` (liens de partage, sitemap, en-tête HSTS).
3. Relisez `/confidentialite` : elle décrit le fonctionnement réel du code, mais les engagements d'Anthropic (durée de conservation, non-utilisation pour l'entraînement, garanties de transfert) sont à vérifier sur leurs conditions en vigueur, et le texte ne remplace pas l'avis d'un juriste.
4. Fixez une limite de dépense mensuelle dans la console Anthropic (Settings → Limits), en plus de `DAILY_LIMIT`.

## Tests

```bash
npm test          # 13 tests : pages, sécurité, validation, limites, mode démo, et requête réelle vérifiée contre une fausse API locale
npm run check     # vérification syntaxique
```

La CI GitHub (`.github/workflows/ci.yml`) lance ces tests sur Node 20 et 22 à chaque push.

`npm run assets` régénère les icônes et l'image de partage (nécessite Playwright).

Clé API : https://console.anthropic.com/settings/keys

## Héberger

Le site a besoin d'un petit serveur Node (il protège la clé API) : un hébergement purement statique (GitHub Pages, Netlify sans fonctions) ne suffit pas.

**Render** (le plus simple) : New → Blueprint → choisir ce dépôt. `render.yaml` est détecté ; renseignez la clé API et les informations légales quand Render les demande. L'adresse de Render pré-remplie dans `HOSTING_PROVIDER` est à vérifier sur render.com. L'offre gratuite met le service en veille après inactivité (premier chargement lent) ; passez à une offre payante pour un usage public.

**Railway / Fly.io / tout hébergeur Docker** : le `Dockerfile` est prêt.

```bash
docker build -t explisite .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... -e TRUST_PROXY=1 explisite
```

**VPS** : `npm ci --omit=dev && node server.js` derrière Nginx ou Caddy (HTTPS). Si vous utilisez Nginx, désactivez le buffering sur `/api/` (`proxy_buffering off;`) pour que l'analyse s'affiche en direct, et mettez `TRUST_PROXY=1`.

Vérification : `GET /api/health` doit renvoyer `{"ok":true,"demo":false,...}`.

## Réglages (variables d'environnement)

| Variable | Défaut | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Clé API (obligatoire hors démo) |
| `PORT` | `3000` | Port d'écoute |
| `EXPLISITE_MODEL` | `claude-opus-5` | Modèle Claude |
| `EXPLISITE_EFFORT` | `high` | Profondeur d'analyse (`low` → `max`) |
| `EXPLISITE_CHAT_EFFORT` | `medium` | Profondeur des réponses du chat |
| `EXPLISITE_FALLBACKS` | `1` | `0` désactive le repli automatique |
| `RATE_LIMIT_PER_HOUR` | `40` | Requêtes max par IP et par heure |
| `MAX_UPLOAD_MB` | `24` | Taille max d'une requête |
| `TRUST_PROXY` | — | `1` derrière un reverse proxy (IP réelle pour la limite) |
| `DAILY_LIMIT` | `1000` | Appels d'API max par jour, tous visiteurs confondus |
| `SITE_URL` | — | Adresse publique (`https://…`) |
| `OWNER_NAME`, `OWNER_STATUS`, `OWNER_ADDRESS`, `OWNER_EMAIL`, `PUBLICATION_DIRECTOR`, `HOSTING_PROVIDER` | — | Informations des pages légales ; `OWNER_EMAIL` active aussi « Signaler un problème » |
| `DEMO_MODE` | — | `1` force le mode démo |

Coût indicatif (estimation, à vérifier sur votre console Anthropic) : une analyse d'un courrier d'une à deux pages coûte environ 0,05 à 0,30 $ avec Claude Opus 5 à l'effort `high`, surtout selon la longueur de la réflexion. Passer `EXPLISITE_EFFORT=medium` réduit ce coût. Une limite par IP est active pour éviter les abus.

## Structure

```
server.js              serveur HTTP, API /api/analyze et /api/ask (flux SSE), limites, arrêt propre
lib/site.js            fichiers statiques, compression, ETag, pages gabarits, robots, sitemap
lib/prompts.js         consignes et schéma JSON de l'analyse
lib/mock.js            mode démo
public/                interface (HTML, CSS, JS sans dépendance), i18n.js, sw.js, polices, icônes
public/pages/          pages légales et 404 (remplies par le serveur)
test/server.test.js    tests automatisés
scripts/               génération des icônes et de l'image de partage
archive/               ancien fichier du dépôt (composant React de portfolio)
```

ExpliSite aide à comprendre ses documents ; ce n'est pas un conseil juridique, fiscal ou médical.
