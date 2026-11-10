# Casier

Back-office web pour communautés roleplay sur console (PS5 / Xbox) : candidatures et whitelist,
fiches personnage, casier judiciaire, connexion Discord. « Casier » est un nom de travail.

## Démarrage local

```bash
cd casier
cp .env.example .env.local   # DEV_LOGIN=1 permet de se connecter sans Discord
npm install
npm run dev                  # http://localhost:3000
```

La base SQLite est créée automatiquement dans `data/casier.db`.

## Ce que fait le MVP

- `/` : page d'atterrissage, tarifs, liste d'attente (table `waitlist`).
- `/login` : connexion Discord (OAuth, scope `identify`), ou pseudo de test si `DEV_LOGIN=1` hors production.
- `/dashboard` : mes communautés, mes candidatures, création d'une communauté.
- `/c/<slug>` : page publique et formulaire de candidature (questions configurables).
- `/c/<slug>/staff` : file de candidatures, membres et rôles, réglages (fondateur).
- `/c/<slug>/characters` : fiches personnage ; casier visible par le staff et le joueur concerné, écrit par le staff.
- Offre gratuite plafonnée à 30 membres (`FREE_MEMBER_LIMIT` dans `lib/data.ts`).

## Configuration Discord

1. Créer une application sur https://discord.com/developers/applications.
2. OAuth2 → ajouter la redirect URI `${APP_URL}/api/auth/discord/callback`.
3. Renseigner `DISCORD_CLIENT_ID` et `DISCORD_CLIENT_SECRET`.
4. Attribution automatique du rôle (optionnel) : créer un bot, l'inviter sur le serveur avec la
   permission « Gérer les rôles », placer son rôle au-dessus du rôle à attribuer, renseigner
   `DISCORD_BOT_TOKEN`, puis saisir l'ID du serveur et l'ID du rôle dans les réglages de la communauté.

## Mise en production

- Base : créer une base Turso (libSQL) et renseigner `DATABASE_URL` + `DATABASE_AUTH_TOKEN`.
  Le fichier local ne convient pas à un hébergement serverless.
- Définir `APP_URL` (https) et `SESSION_SECRET` (`openssl rand -hex 32`).
- Ne pas définir `DEV_LOGIN`.

## Hors périmètre pour l'instant

Paiement (Stripe), modification et suppression des fiches, exclusion d'un membre, économie,
téléphone RP, limitation de débit sur les formulaires.
