# Plico — outils PDF 100 % locaux, avec abonnements

SaaS de manipulation de PDF (fusionner, organiser, diviser, images → PDF, compresser, PDF → images, signer, filigrane, numérotation) qui tourne **entièrement dans le navigateur**. Les fichiers ne quittent jamais l'appareil de l'utilisateur.

- **Aucune clé API.** Le paiement passe par un prestataire « marchand de référence » (Polar recommandé, ou Lemon Squeezy, ou Gumroad) qui remet une clé de licence au client. Le site vérifie cette clé via un point d'accès **public** du prestataire.
- **0 € de coût fixe.** Hébergement gratuit (Cloudflare Pages, usage commercial autorisé), aucun serveur à payer : le traitement se fait sur l'appareil du client, donc le coût par utilisateur est nul quel que soit le trafic. Le prestataire de paiement prélève un pourcentage **uniquement quand tu vends**.
- **3 plans** : Gratuit, Pro (6 €/mois ou 48 €/an), Business (15 €/mois ou 144 €/an). Tout se règle dans `site.config.mjs`.

---

## 1. Ce que ça coûte réellement

| Poste | Coût | Remarque |
|---|---|---|
| Hébergement Cloudflare Pages | 0 € | Plan gratuit, usage commercial autorisé. 100 000 vérifications de licence par jour incluses. |
| Prestataire de paiement | % par vente, 0 € fixe | Polar : environ 4 % + 0,40 $ par transaction (tarif connu en 2025, **vérifie sur polar.sh/pricing**). Lemon Squeezy ≈ 5 % + 0,50 $. Gumroad ≈ 10 % + 0,50 $. TVA mondiale collectée par eux. |
| Nom de domaine | 0 € ou ~10 €/an | Facultatif : `ton-projet.pages.dev` est gratuit. |
| Statut micro-entreprise | 0 € | Obligatoire pour encaisser. Déclaration sur formalites.entreprises.gouv.fr. |
| Médiateur de la consommation | variable | Obligation légale pour vendre à des particuliers en France. Certains médiateurs sont payants. Avec un marchand de référence (qui est le vendeur légal), l'obligation est discutable : **à faire valider par un professionnel**. |

---

## 2. Mise en ligne, étape par étape

### Étape A — Créer le compte de paiement (Polar, recommandé)

1. Crée un compte sur **polar.sh** et une organisation (ex. « Plico »).
2. **Finance / Payouts** : connecte ton compte bancaire (Stripe Connect, disponible en France).
3. **Benefits → New benefit → License Keys** :
   - « Licence Pro », limite d'activations **3** (= nombre d'appareils) ;
   - « Licence Business », limite d'activations **10**.
4. **Products** : crée 4 produits récurrents (Polar gère un intervalle de facturation par produit) :
   Pro mensuel 6 €, Pro annuel 48 €, Business mensuel 15 €, Business annuel 144 €.
   Attache « Licence Pro » aux deux produits Pro et « Licence Business » aux deux produits Business.
5. **Checkout links** : crée un lien de paiement par produit. Mets comme *Success URL* : `https://TON-SITE/merci`.
6. Note : l'**Organization ID** (Settings), l'**ID de chaque bénéfice** (page du bénéfice), les **4 liens de paiement**, et l'URL de ton espace client `https://polar.sh/TON-SLUG/portal`.

Les libellés exacts de l'interface Polar peuvent différer légèrement ; les éléments à récupérer restent ceux-là.

### Étape B — Remplir `site.config.mjs`

```js
billing: {
  provider: 'polar',
  polar: { organizationId: 'TON_ORGANIZATION_ID', server: 'production' },
  customerPortalUrl: 'https://polar.sh/TON-SLUG/portal',
},
plans: {
  pro: {
    checkout: { monthly: 'https://buy.polar.sh/…', yearly: 'https://buy.polar.sh/…' },
    match: { polarBenefitIds: ['ID_BENEFICE_PRO'] },
  },
  business: {
    checkout: { monthly: '…', yearly: '…' },
    match: { polarBenefitIds: ['ID_BENEFICE_BUSINESS'] },
  },
},
```

Remplis aussi `legal` (nom, statut, SIRET, adresse, médiateur), `contactEmail` et, une fois connue, `siteUrl`.

**Vérification :** `node scripts/build.mjs` n'affiche plus la ligne « Paiement pas encore configuré ».

### Étape C — Héberger sur Cloudflare Pages (gratuit)

1. Pousse ce dépôt sur GitHub (c'est déjà le cas).
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → choisis le dépôt.
3. Réglages de build :
   - **Root directory** : `plico`
   - **Build command** : `node scripts/build.mjs`
   - **Build output directory** : `dist`
4. Déploie. Le site est en ligne sur `https://NOM-DU-PROJET.pages.dev`.
5. Reporte cette URL dans `siteUrl`, pousse : le sitemap et les balises canonical sont générés.

**Vérification :** `https://TON-SITE/api/license` affiche `{"ok":true,"service":"license","provider":"polar","configured":true}`.

Alternative sans Pages : déploiement en Worker avec `wrangler.jsonc` (`npx wrangler deploy` après `node scripts/build.mjs`).

### Étape D — Tester un vrai achat avant d'ouvrir

1. Dans `site.config.mjs`, mets `server: 'sandbox'` et utilise une organisation créée sur **sandbox.polar.sh** (mêmes étapes A, avec de faux paiements).
2. Achète Pro avec la carte de test `4242 4242 4242 4242`.
3. Récupère la clé (e-mail ou espace client), colle-la sur `/compte` : le badge passe à « Pro ».
4. Teste « Désactiver sur cet appareil », puis réactive.
5. Repasse en `production` avec les identifiants de ton organisation réelle.

### Étape E — Domaine (facultatif)

Cloudflare Pages → Custom domains → ajoute ton domaine, puis mets-le dans `siteUrl`.

---

## 3. Autres prestataires (sans clé API non plus)

**Lemon Squeezy** : `provider: 'lemonsqueezy'`, `lemonsqueezy.storeId`, et pour chaque plan `match.lemonVariantIds` (IDs des variantes) ou `match.lemonProductIds`. Active « License keys » sur les produits avec la limite d'activations voulue. Le site vérifie que la clé appartient bien à **ta** boutique.

**Gumroad** : `provider: 'gumroad'`, un produit Gumroad par plan (abonnement avec « Generate a unique license key »), et `match.gumroadProductIds` pour chaque plan. Limite : Gumroad ne permet pas de libérer un appareil sans jeton privé ; la limite d'appareils (`maxDevices`) compte les activations successives.

---

## 4. Développer et tester en local

```bash
cd plico
npm install            # uniquement pour les tests (les bibliothèques sont déjà copiées dans src/assets/vendor)
npm run dev:mock       # http://localhost:8788 avec paiement simulé
```

Clés de test en mode simulé : `PRO-TEST-0000-0001` (Pro, 3 appareils), `BIZ-TEST-0000-0002` (Business), `OTHER-PRODUCT-0003` (refusée : autre produit).

```bash
npm test               # 28 tests unitaires + 29 tests de bout en bout dans Chromium
```

Les tests de bout en bout utilisent chaque outil dans un vrai navigateur et vérifient le fichier produit (pages, ordre, rotation, texte, position des numéros et signatures, ZIP), les limites des plans, l'activation/désactivation, la limite d'appareils, le délai de grâce hors ligne, le fonctionnement **sans réseau**, l'absence d'erreur JavaScript et de violation de la politique de sécurité (CSP), et l'absence de débordement sur mobile. Ils nécessitent Playwright (`npm i -D playwright && npx playwright install chromium`).

---

## 5. Architecture

```
plico/
├── site.config.mjs          ← tout se configure ici (marque, plans, prix, paiement, mentions légales)
├── server/license.mjs       ← vérification de licence Polar / Lemon Squeezy / Gumroad (sans clé API)
├── functions/api/license.js ← route /api/license sur Cloudflare Pages
├── worker/ + wrangler.jsonc ← variante Cloudflare Workers
├── scripts/build.mjs        ← générateur de site statique (aucune dépendance)
├── scripts/dev.mjs          ← serveur local identique à Cloudflare (+ paiement simulé)
├── src/pages/               ← accueil, tarifs, compte, merci, pages légales
├── src/content/             ← textes SEO des 9 pages outils
├── src/assets/js/tools/     ← un fichier par outil
├── src/assets/vendor/       ← pdf.js, pdf-lib, fflate, police Inter (licences libres incluses)
└── tests/                   ← tests unitaires et de bout en bout
```

Pour renommer le produit : change `brand.name` et `brand.accent`, puis `node scripts/make-images.mjs` pour régénérer icônes et image de partage.

---

## 6. Limites connues (à connaître avant de vendre)

- **Le contrôle des plans se fait dans le navigateur.** Un développeur motivé peut le contourner en modifiant le code chez lui. C'est le prix du « zéro serveur, zéro coût, zéro fichier envoyé » ; les clients paient pour la commodité, les mises à jour et le support. Le nombre d'appareils, lui, est contrôlé par le prestataire.
- **PDF chiffrés / protégés par mot de passe** : refusés avec un message clair.
- **Formulaires PDF** : en fusion ou réorganisation, les champs remplissables peuvent perdre leur interactivité (le contenu visible reste).
- **Compression « Équilibré » / « Fort »** : les pages deviennent des images (texte non sélectionnable). C'est indiqué à l'utilisateur ; le mode « Sans perte » garde tout.
- **Signature** : signature électronique simple, pas une signature qualifiée eIDAS (indiqué dans les CGV).
- **Textes légaux** : ce sont des modèles sérieux, mais pas un avis juridique. Fais-les relire avant d'encaisser.
