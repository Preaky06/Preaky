# Pro Spectre

SaaS de prospection B2B pour la France : recherche d’entreprises dans les registres officiels, analyse de leur site web et de leurs annonces légales, score explicable sur 100, **Radar** quotidien (nouvelles entreprises, cessions, changements et risques), **audit de site gratuit** partageable, générateur de messages, mini-CRM, abonnements Stripe, administration.

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

Deux tâches quotidiennes sont définies dans `vercel.json` (toutes deux protégées par `CRON_SECRET`) :
- `/api/cron/radar` (6 h 41 UTC) : passage du Radar pour chaque organisation, puis résumés e-mail selon la préférence (quotidien, hebdomadaire, aucun). Budget de 50 s par appel : les organisations non traitées passent en premier le lendemain.
- `/api/cron/cleanup` (3 h 17 UTC) : durées de conservation.

## Le moteur : acquisition, activation, rétention

| Brique | Rôle | Où |
|---|---|---|
| **Audit de site gratuit** | Attire du trafic (« audit site web gratuit ») et sert de pièce jointe aux agences : rapport public par lien privé (non indexé), sans coordonnées, robots.txt respecté, un même site au plus une fois par 24 h. | `/outils/audit-site`, `/rapport/[id]`, bouton « Partager l’audit » sur la fiche |
| **Démo publique** | Recherche réelle sans compte, depuis l’accueil. | Accueil |
| **Démarrage guidé** | 5 étapes calculées sur les données du compte (offre, recherche, 3 analyses, alerte, message). | Tableau de bord |
| **Radar** | Alertes de zone (annonces BODACC de création, immatriculation, cession, pré-triées par activité puis vérifiées dans SIRENE ; oppositions et entrepreneurs non diffusibles exclus) et veille du portefeuille (changements, procédures collectives). 1 / 3 / 10 / 30 alertes selon l’offre. | `/app/radar`, badge du menu, résumé e-mail |
| **SEO** | `sitemap.xml`, `robots.txt`, données structurées (éditeur, logiciel et offres, FAQ), image de partage. | `src/app/sitemap.ts`, `robots.ts`, `opengraph-image.tsx` |

Constat sur données réelles (Rhône, novembre 2026) : une large part des entreprises nouvellement créées a demandé à ne pas être démarchée (opposition SIRENE). Le Radar les exclut : il signale moins d’entreprises, mais uniquement des entreprises démarchables.

## Confiance : ce qui est affiché publiquement, et d’où ça vient

- **Accueil** : chiffres BODACC des 7 derniers jours (créations, cessions, modifications, procédures), lus en direct dans l’open data de la DILA et rafraîchis toutes les heures. Si la source ne répond pas, le bandeau affiche un texte sans chiffre : aucun nombre n’est inventé.
- **`/confiance`** (centre de confiance) : état réel des sources publiques (vérifié par le serveur, toutes les 5 minutes), sources et producteurs, méthode du score, données conservées et durées, mesures de sécurité, et **liste des sous-traitants générée depuis la configuration** (Stripe, SMTP, IA, Google n’apparaissent « Actif » que si leurs variables sont renseignées).
- **`/.well-known/security.txt`** : publié automatiquement dès que `LEGAL_EMAIL` est renseigné.
- Aucun avis client, logo de client ou statistique d’usage n’est affiché : il n’y en a pas encore. Quand vous aurez de vrais clients, ajoutez leurs retours **avec leur accord écrit**.

## Coûts réels à prévoir

« Ne rien payer » n’est pas tenable pour un SaaS **commercial** ; voici le minimum :

- **Hébergement** : le plan Vercel Hobby est réservé à un usage non commercial. Pour encaisser des abonnements : Vercel Pro (environ 20 $/mois) ou un hébergeur compatible Next.js (Railway, Render, Fly.io, VPS avec `npm run build && npm start`).
- **Base** : niveaux gratuits Neon/Supabase suffisants au démarrage (Supabase met en pause un projet gratuit inactif).
- **Stripe** : aucun abonnement, commission par paiement (cartes UE standard ≈ 1,5 % + 0,25 €, plus la commission Stripe Billing sur les abonnements ; voir stripe.com/fr/pricing). Stripe n’est pas « marchand officiel » : la TVA reste à déclarer par vous (ou mention « TVA non applicable, art. 293 B du CGI » en franchise).
- **IA / Google Places** : facultatifs, facturés à l’usage.

## Tests

```bash
npm test             # 91 tests unitaires (scoring, Radar, audit web, SSRF, BODACC, SIRENE, messages, CSV, quotas, Stripe)
npm run test:live    # 5 tests contre les vraies API SIRENE, BODACC, Géo (réseau requis)
npm run build && npm run test:e2e   # scénario navigateur complet en 27 étapes (sources simulées, données fictives)
```

Le test E2E nécessite Playwright (`npm i -D playwright && npx playwright install chromium`). Il couvre : accueil et démo, centre de confiance, audit de site gratuit (robots.txt, rapport sans coordonnées), inscription, configuration, recherche avec exclusion des oppositions, analyse (site vérifié par SIREN, signaux BODACC), fiche et CRM, messages, verrous d’offre, Radar (alerte de zone, oppositions exclues, signal du portefeuille, limite d’offre), rapport d’audit partagé, démarrage guidé, quotas serveur (402), isolation entre comptes, CSRF, administration, recherches sauvegardées, opposition RGPD de bout en bout, export des données, suppression de compte, affichage mobile.

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
- Identité : logotype « Pro » en blanc dans un bloc violet (#7C3AED), « Spectre » et un point violet (`src/components/logo.tsx`) ; icône carrée : œil blanc au point violet sur fond noir (onglet, applications). Typos Poppins (logotype, titres) et Inter (texte), hébergées avec le site (aucune police chargée depuis un service tiers).
- PostgreSQL via `postgres` (production) ou PGlite (local, tests) — même SQL, migrations au démarrage (`src/lib/migrations.ts`).
- Authentification maison : mots de passe scrypt, sessions opaques en base, cookie HttpOnly, contrôle d’origine (CSRF), limitation de débit en base.
- Connecteurs modulaires : `src/lib/connectors/` (sirene, bodacc, geo, website, places). Un nouveau fournisseur (B2B payant, API sociale autorisée) s’ajoute en produisant le type `Company`/`Signal`.
- Score : `src/lib/scoring.ts` (5 critères pondérés, base « constaté / estimé / non évalué », confiance). Messages : `src/lib/messages.ts`. Quotas : `src/lib/quota.ts`. Stripe : `src/lib/billing.ts`.
