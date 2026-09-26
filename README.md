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
- Comptes (e-mail + mot de passe) : chacun retrouve ses documents, ses cases cochées et ses conversations à chaque connexion, sur tous ses appareils. Contenu chiffré en AES-256-GCM dans une base SQLite, mots de passe en scrypt, suppression du compte en un clic. Les analyses faites avant l'inscription sont versées dans le compte.
- Pages légales (mentions légales, confidentialité RGPD, conditions d'utilisation), case de consentement avant l'envoi d'un document, lien « Signaler un problème ».
- Référencement : image de partage, sitemap, robots.txt, données structurées ; polices hébergées sur le site (aucune ressource tierce, aucun cookie).

Entrées acceptées : photos (JPG, PNG, WebP ; plusieurs pages possibles, redimensionnées dans le navigateur), un PDF (16 Mo max) ou du texte collé.

## Moteur

Analyse par **Claude Opus 5** (Anthropic) via le SDK officiel `@anthropic-ai/sdk` :
lecture native des images et PDF, réflexion adaptative (`thinking: adaptive`, dont le résumé s'affiche en direct pendant l'analyse), sorties structurées JSON (schéma dans `lib/prompts.js`), streaming, cache de prompt pour les questions de suivi, et repli serveur automatique en cas de refus (`fallbacks: "default"`).

La clé API reste sur le serveur. Aucun document n'est stocké : il transite vers l'API pour l'analyse, puis est oublié. L'historique vit uniquement dans le `localStorage` du navigateur.

## Lancer en local

Prérequis : Node.js 22.13 ou plus récent (base SQLite intégrée).

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
npm test          # 15 tests : pages, sécurité, validation, limites, comptes (isolation, chiffrement au repos), mode démo, requête réelle vérifiée contre une fausse API locale
npm run check     # vérification syntaxique
```

La CI GitHub (`.github/workflows/ci.yml`) lance ces tests sur Node 22 et 24 à chaque push.

`npm run assets` régénère les icônes et l'image de partage (nécessite Playwright).

Clé API : https://console.anthropic.com/settings/keys

## Héberger

Le site a besoin d'un petit serveur Node (il protège la clé API et garde les comptes) : un hébergement purement statique (GitHub Pages, Netlify sans fonctions) ne suffit pas. **Les comptes exigent un stockage persistant** : la base SQLite et la clé de chiffrement vivent dans `DATA_DIR`, qui doit survivre aux redémarrages.

### Option recommandée : un serveur (VPS) avec Docker — sans GitHub

Un VPS à quelques euros par mois (OVHcloud, Scaleway, Hetzner, Hostinger…) avec Docker installé suffit.

1. Achetez un nom de domaine et créez un enregistrement **A** qui pointe vers l'adresse IP du serveur.
2. Envoyez le dossier du site sur le serveur (par exemple `scp explisite-site.zip utilisateur@IP:` puis `unzip explisite-site.zip -d explisite`).
3. Sur le serveur : `cd explisite && cp .env.example .env`, puis remplissez `.env` : `DOMAIN`, `ANTHROPIC_API_KEY`, les informations légales. Ajoutez `ENCRYPTION_KEY=` suivi du résultat de `openssl rand -hex 32` et **gardez cette clé en lieu sûr**.
4. `docker compose up -d`

Caddy obtient le certificat HTTPS tout seul. Le site est en ligne sur `https://votre-domaine` en une à deux minutes.

- Mise à jour : remplacez les fichiers puis `docker compose up -d --build`.
- Journaux : `docker compose logs -f app`.
- Sauvegarde : `docker compose exec app node scripts/backup.mjs` (copie cohérente dans le volume, dossier `backups/`). Copiez-la ailleurs régulièrement, avec la clé de chiffrement.
- Mot de passe oublié : `docker compose exec app node scripts/reset-password.mjs adresse@exemple.fr` affiche un mot de passe provisoire à transmettre à la personne.

### Autres hébergeurs

- **Railway** : `railway up` depuis le dossier (outil en ligne de commande, sans GitHub), ajoutez un *Volume* monté sur `/data` et les variables de `.env.example`.
- **Render** : `render.yaml` est prêt (offre Starter avec disque persistant, payante ; l'offre gratuite effacerait les comptes). Render se connecte à un dépôt Git.
- **Fly.io** : `fly launch` utilise le `Dockerfile` ; créez un volume monté sur `/data`.

Dans tous les cas, mettez `TRUST_PROXY=1` et `SITE_URL=https://votre-domaine`. Vérification : `GET /api/health` doit renvoyer `{"ok":true,"demo":false,"accounts":true,...}`.

### Sans comptes

`ACCOUNTS=0` désactive les comptes : aucun stockage n'est alors nécessaire et l'offre gratuite de Render suffit (historique dans le navigateur uniquement).

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
| `DOMAIN` | — | Nom de domaine (docker compose + HTTPS) |
| `DATA_DIR` | `./data` | Base de données et clé de chiffrement (volume persistant) |
| `ENCRYPTION_KEY` | générée | Clé AES-256 (64 caractères hexadécimaux) des documents enregistrés |
| `ACCOUNTS` | `1` | `0` désactive les comptes |
| `ALLOW_SIGNUP` | `1` | `0` ferme les inscriptions |
| `MAX_DOCS_PER_USER` | `300` | Documents enregistrés max par compte |
| `SITE_URL` | — | Adresse publique (`https://…`) |
| `OWNER_NAME`, `OWNER_STATUS`, `OWNER_ADDRESS`, `OWNER_EMAIL`, `PUBLICATION_DIRECTOR`, `HOSTING_PROVIDER` | — | Informations des pages légales ; `OWNER_EMAIL` active aussi « Signaler un problème » |
| `DEMO_MODE` | — | `1` force le mode démo |

Coût indicatif (estimation, à vérifier sur votre console Anthropic) : une analyse d'un courrier d'une à deux pages coûte environ 0,05 à 0,30 $ avec Claude Opus 5 à l'effort `high`, surtout selon la longueur de la réflexion. Passer `EXPLISITE_EFFORT=medium` réduit ce coût. Une limite par IP est active pour éviter les abus.

## Structure

```
server.js              serveur HTTP, API /api/analyze et /api/ask (flux SSE), limites, arrêt propre
lib/store.js           base SQLite : comptes, sessions, documents chiffrés
lib/accounts.js        routes /api/auth/* et /api/documents*
lib/site.js            fichiers statiques, compression, ETag, pages gabarits, robots, sitemap
lib/prompts.js         consignes et schéma JSON de l'analyse
lib/mock.js            mode démo
public/                interface (HTML, CSS, JS sans dépendance), i18n.js, sw.js, polices, icônes
public/pages/          pages légales et 404 (remplies par le serveur)
test/server.test.js    tests automatisés
scripts/               sauvegarde, mot de passe provisoire, icônes, version claude.ai
docker-compose.yml     hébergement sur VPS avec HTTPS automatique (Caddy)
archive/               ancien fichier du dépôt (composant React de portfolio)
```

ExpliSite aide à comprendre ses documents ; ce n'est pas un conseil juridique, fiscal ou médical.
