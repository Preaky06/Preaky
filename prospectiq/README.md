# ProspectIQ

SaaS de prospection B2B pour la France : recherche d’entreprises dans les registres officiels, analyse de leur site web et de leurs annonces légales, score explicable sur 100, générateur de messages, mini-CRM, abonnements Stripe, administration.

**Les bons prospects. Au bon moment.**

## Ce qui fonctionne sans aucune clé API

| Brique | Source | Coût |
|---|---|---|
| Recherche d’entreprises (identité, NAF, effectif, dirigeants, établissements, finances publiées) | API Recherche d’entreprises de l’État (SIRENE + RNE), sans clé, 7 requêtes/s | 0 € |
| Signaux commerciaux (création, vente, changement de dirigeant/nom/adresse, procédures collectives) | BODACC (open data DILA), sans clé | 0 € |
| Communes, codes postaux, coordonnées | geo.api.gouv.fr, sans clé | 0 € |
| Découverte et audit du site web (HTTPS, mobile, SEO, fraîcheur, réseaux liés, réservation, coordonnées génériques) | Moteur interne, respecte robots.txt, protégé contre les SSRF | 0 € |
| Score, analyse, messages | Moteur interne déterministe | 0 € |

Facultatif : IA (Mistral, OpenAI… pour une rédaction plus naturelle), Google Places (note et avis). Sans elles, rien n’est simulé : l’interface indique ce qui n’est pas évalué.

## Démarrer en local (5 minutes)

```bash
cd prospectiq
npm install
cp .env.example .env.local       # puis ADMIN_EMAILS=votre@email
npm run dev                      # http://localhost:3000
```

Sans `DATABASE_URL`, une base PostgreSQL embarquée (PGlite) est créée dans `.data/`. Les tables sont créées automatiquement au premier lancement.

## Mise en production (Vercel + Neon/Supabase + Stripe)

Ordre conseillé, avec le moyen de vérifier chaque étape :

1. **Base de données** — créer une base PostgreSQL (Neon ou Supabase, région UE). Copier l’URL de connexion (Supabase : pooler, port 6543) dans `DATABASE_URL`. *Vérification :* au premier appel, la table `schema_migrations` apparaît.
2. **Vercel** — importer le dépôt, *Root Directory* = `prospectiq`. Renseigner `APP_URL`, `DATABASE_URL`, `ADMIN_EMAILS`, `CRON_SECRET`, `LEGAL_*`. Déployer. *Vérification :* l’accueil s’affiche, la recherche de démonstration renvoie des entreprises réelles, `/mentions-legales` ne contient plus « à compléter ».
3. **Compte administrateur** — s’inscrire avec l’adresse mise dans `ADMIN_EMAILS`. *Vérification :* le menu « Administration » apparaît.
4. **Stripe** — créer 3 produits à prix mensuel récurrent (19 €, 49 €, 99 €) et copier leurs identifiants `price_…` dans `STRIPE_PRICE_STARTER/PRO/BUSINESS`, la clé secrète dans `STRIPE_SECRET_KEY`. Créer un webhook vers `https://votre-domaine/api/stripe/webhook` avec les événements `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` ; copier son secret dans `STRIPE_WEBHOOK_SECRET`. Dans *Paramètres → Portail client*, autoriser l’annulation, l’historique des factures et le changement entre les 3 produits. Redéployer. *Vérification :* en mode test, souscrire avec la carte `4242 4242 4242 4242` ; l’offre change dans l’application en quelques secondes, et l’onglet « Erreurs API » de l’administration reste vide.
5. **E-mails** — créer un SMTP (Brevo gratuit : 300 e-mails/jour) et renseigner `SMTP_URL`, `MAIL_FROM`. *Vérification :* « Mot de passe oublié » envoie bien l’e-mail.
6. **Facultatif** — `AI_API_KEY` + `AI_MODEL` (+ prix par million de jetons pour suivre les coûts), `GOOGLE_PLACES_API_KEY`.

La tâche quotidienne `/api/cron/cleanup` (définie dans `vercel.json`) applique les durées de conservation.

## Coûts réels à prévoir

« Ne rien payer » n’est pas tenable pour un SaaS **commercial** ; voici le minimum :

- **Hébergement** : le plan Vercel Hobby est réservé à un usage non commercial. Pour encaisser des abonnements : Vercel Pro (environ 20 $/mois) ou un hébergeur compatible Next.js (Railway, Render, Fly.io, VPS avec `npm run build && npm start`).
- **Base** : niveaux gratuits Neon/Supabase suffisants au démarrage (Supabase met en pause un projet gratuit inactif).
- **Stripe** : aucun abonnement, commission par paiement (cartes UE standard ≈ 1,5 % + 0,25 €, plus la commission Stripe Billing sur les abonnements ; voir stripe.com/fr/pricing). Stripe n’est pas « marchand officiel » : la TVA reste à déclarer par vous (ou mention « TVA non applicable, art. 293 B du CGI » en franchise).
- **IA / Google Places** : facultatifs, facturés à l’usage.

## Tests

```bash
npm test             # 73 tests unitaires (scoring, audit web, SSRF, BODACC, SIRENE, messages, CSV, quotas, Stripe)
npm run test:live    # 5 tests contre les vraies API SIRENE, BODACC, Géo (réseau requis)
npm run build && npm run test:e2e   # scénario navigateur complet en 23 étapes (sources simulées, données fictives)
```

Le test E2E nécessite Playwright (`npm i -D playwright && npx playwright install chromium`). Il couvre : accueil et démo, inscription, configuration, recherche avec exclusion des oppositions, analyse (site vérifié par SIREN, signaux BODACC), fiche et CRM, messages, verrous d’offre, quotas serveur (402), isolation entre comptes, CSRF, administration, recherches sauvegardées, opposition RGPD de bout en bout, export des données, suppression de compte, affichage mobile.

## Ce qui n’a pas pu être vérifié ici

- **Audit de vrais sites web** : l’environnement de développement n’avait pas de DNS public ; l’audit est testé sur des sites simulés. En production, vérifier sur 3-4 entreprises connues que le site est trouvé et « vérifié par SIREN ». Si le serveur n’a pas accès à Internet, l’application l’indique (« analyse impossible ») au lieu de conclure à l’absence de site.
- **Stripe, Google Places et fournisseur IA réels** : non appelés (pas de clés). Le webhook Stripe est testé avec de vraies signatures générées par la bibliothèque officielle.

## Limites connues

- Activité réelle sur Instagram/LinkedIn et offres d’emploi : non mesurées (pas d’API autorisée sans partenariat) ; les filtres correspondants sont désactivés et expliqués dans l’interface.
- L’API Recherche d’entreprises renvoie 25 résultats par page, 10 000 au maximum par recherche.
- La découverte de site repose sur les noms de domaine probables et sur Google Places s’il est configuré : un site au nom très différent de l’entreprise peut ne pas être trouvé (affiché « à confirmer », jamais « absent »).

## Conformité (RGPD) — à faire de votre côté

- Renseigner les mentions légales (`LEGAL_*`) et relire `/confidentialite`, `/cgu`.
- Rédiger une courte analyse d’intérêt légitime (prospection B2B, données publiques, minimisation, opposition) et tenir votre registre des traitements.
- Traiter les demandes du formulaire `/opposition` sous un mois depuis l’onglet « Signalements » de l’administration (le bouton « Appliquer l’opposition » efface les données et exclut durablement l’entreprise ou l’adresse).

Déjà en place : exclusion automatique des entreprises en opposition SIRENE, aucune date de naissance conservée, adresses e-mail nominatives écartées, purge des données inutilisées après 12 mois, export et suppression de compte en libre-service, journal des sources.

## Architecture

- Next.js 15 (App Router), TypeScript, Tailwind CSS 4, React 19.
- PostgreSQL via `postgres` (production) ou PGlite (local, tests) — même SQL, migrations au démarrage (`src/lib/migrations.ts`).
- Authentification maison : mots de passe scrypt, sessions opaques en base, cookie HttpOnly, contrôle d’origine (CSRF), limitation de débit en base.
- Connecteurs modulaires : `src/lib/connectors/` (sirene, bodacc, geo, website, places). Un nouveau fournisseur (B2B payant, API sociale autorisée) s’ajoute en produisant le type `Company`/`Signal`.
- Score : `src/lib/scoring.ts` (5 critères pondérés, base « constaté / estimé / non évalué », confiance). Messages : `src/lib/messages.ts`. Quotas : `src/lib/quota.ts`. Stripe : `src/lib/billing.ts`.
