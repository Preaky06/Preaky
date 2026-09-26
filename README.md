# Limpide — la paperasse, en clair

Limpide transforme n'importe quel document administratif (avis d'impôt, courrier CAF, amende, facture, bail, contrat, résultats d'analyses…) en explication claire et en plan d'action :

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
- Explications en 15 langues, niveau simple ou détaillé, historique local, partage, impression, thème clair/sombre, mobile (appareil photo).

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

Clé API : https://console.anthropic.com/settings/keys

## Héberger

Le site a besoin d'un petit serveur Node (il protège la clé API) : un hébergement purement statique (GitHub Pages, Netlify sans fonctions) ne suffit pas.

**Render** (le plus simple) : New → Blueprint → choisir ce dépôt. `render.yaml` est détecté ; renseignez `ANTHROPIC_API_KEY` quand Render le demande.

**Railway / Fly.io / tout hébergeur Docker** : le `Dockerfile` est prêt.

```bash
docker build -t limpide .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... -e TRUST_PROXY=1 limpide
```

**VPS** : `npm ci --omit=dev && node server.js` derrière Nginx ou Caddy (HTTPS). Si vous utilisez Nginx, désactivez le buffering sur `/api/` (`proxy_buffering off;`) pour que l'analyse s'affiche en direct, et mettez `TRUST_PROXY=1`.

Vérification : `GET /api/health` doit renvoyer `{"ok":true,"demo":false,...}`.

## Réglages (variables d'environnement)

| Variable | Défaut | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Clé API (obligatoire hors démo) |
| `PORT` | `3000` | Port d'écoute |
| `LIMPIDE_MODEL` | `claude-opus-5` | Modèle Claude |
| `LIMPIDE_EFFORT` | `high` | Profondeur d'analyse (`low` → `max`) |
| `LIMPIDE_CHAT_EFFORT` | `medium` | Profondeur des réponses du chat |
| `LIMPIDE_FALLBACKS` | `1` | `0` désactive le repli automatique |
| `RATE_LIMIT_PER_HOUR` | `40` | Requêtes max par IP et par heure |
| `MAX_UPLOAD_MB` | `24` | Taille max d'une requête |
| `TRUST_PROXY` | — | `1` derrière un reverse proxy (IP réelle pour la limite) |
| `DEMO_MODE` | — | `1` force le mode démo |

Coût indicatif (estimation, à vérifier sur votre console Anthropic) : une analyse d'un courrier d'une à deux pages coûte environ 0,05 à 0,30 $ avec Claude Opus 5 à l'effort `high`, surtout selon la longueur de la réflexion. Passer `LIMPIDE_EFFORT=medium` réduit ce coût. Une limite par IP est active pour éviter les abus.

## Structure

```
server.js          serveur HTTP, API /api/analyze et /api/ask (flux SSE), sécurité
lib/prompts.js     consignes et schéma JSON de l'analyse
lib/mock.js        mode démo
public/            interface (HTML, CSS, JS sans dépendance)
archive/           ancien fichier du dépôt (composant React de portfolio)
```

Limpide aide à comprendre ses documents ; ce n'est pas un conseil juridique, fiscal ou médical.
