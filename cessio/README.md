# Cessio — la cession de droits d’auteur, enfin simple pour les créatifs

Cessio aide les graphistes, illustrateurs, photographes, vidéastes et autres créatifs freelances à **facturer et céder correctement leurs droits d’auteur** :

1. **Calculateur de prix** : une ligne par usage (web, imprimés, enseigne, packaging, publicité, produits dérivés, identité de marque…), ajustée selon le territoire, la durée et l’exclusivité.
2. **Contrat de cession conforme au Code de la propriété intellectuelle (CPI)**, en PDF ou en Word. Il couvre les articles suivants :
   - L111-1 : payer une commande ne transfère aucun droit ;
   - L131-1 : pas de cession globale d’œuvres futures ;
   - L131-2 : contrat écrit ;
   - L131-3 : chaque droit mentionné séparément, usage délimité par son étendue, sa destination, son territoire et sa durée ;
   - L131-4 : forfait motivé ;
   - L131-6 : modes d’exploitation non prévus ;
   - L132-31 : en publicité, une rémunération distincte par usage ;
   - L121-1 : droit moral préservé.
3. **Récapitulatif d’une page** pour le client et **clause courte** à coller dans le devis.
4. **Registre des cessions** : statuts, échéances, alertes, renouvellement en un clic, rappels dans l’agenda (.ics), export CSV, sauvegarde.

**Pourquoi ce produit.** Nous n’avons trouvé aucun outil grand public équivalent pour les freelances. Les contrats existent en modèles statiques chez les sites juridiques. Le calcul du prix n’est outillé nulle part en français. Le suivi des échéances n’existe que dans des logiciels pour éditeurs, comme Crealo.

**Aucune clé API. 0 € de coût fixe.**
- Tout tourne dans le navigateur : les données des clients ne passent jamais par un serveur, d’où un coût d’hébergement nul quel que soit le trafic.
- Le paiement passe par un « marchand de référence » : Polar (recommandé), Lemon Squeezy ou Gumroad. Il remet une clé de licence que le site vérifie via un point d’accès public, sans clé API.

| Plan | Prix | Contenu |
|---|---|---|
| Gratuit | 0 € | Calculateur illimité ; 3 contrats ; PDF avec mention « Généré avec Cessio » |
| Solo | 9 €/mois ou 84 €/an | Contrats illimités, sans mention ; votre logo et votre couleur ; Word ; rappels d’agenda ; 3 appareils |
| Studio | 24 €/mois ou 228 €/an | Solo + plusieurs profils d’auteur + export CSV + 10 appareils |

Tout se règle dans `site.config.mjs`.

---

## 1. Mise en ligne, étape par étape

### A. Statut et paiement
1. Crée ta micro-entreprise (gratuit) : formalites.entreprises.gouv.fr. → Tu obtiens un SIRET.
2. Ouvre un compte sur **sandbox.polar.sh** (faux paiements) pour tester.
3. Crée deux bénéfices « License Keys » :
   - « Licence Solo » avec une limite d’activations de **3** ;
   - « Licence Studio » avec une limite d’activations de **10**.
4. Crée 4 produits récurrents :
   - Solo mensuel 9 € et Solo annuel 84 €, rattachés à « Licence Solo » ;
   - Studio mensuel 24 € et Studio annuel 228 €, rattachés à « Licence Studio ».
5. Crée un lien de paiement (Checkout Link) par produit, avec comme URL de succès `https://TON-SITE/merci`.
6. Récupère l’**Organization ID**, les **2 identifiants de bénéfices**, les **4 liens** et l’URL de l’espace client `https://polar.sh/TON-SLUG/portal`.

Les libellés exacts de l’interface Polar peuvent différer légèrement ; les éléments à récupérer restent ceux-là.

### B. Remplir `site.config.mjs`
- `billing.polar.organizationId` : l’Organization ID.
- `billing.polar.server` : `'sandbox'` pendant les tests.
- `billing.customerPortalUrl` : l’URL de l’espace client.
- `plans.solo.checkout` et `plans.studio.checkout` : les liens mensuels et annuels.
- `plans.solo.match.polarBenefitIds` et `plans.studio.match.polarBenefitIds` : l’identifiant de chaque bénéfice.
- `legal.*` (nom, statut, SIRET, adresse, médiateur), `contactEmail`, puis `siteUrl`.

→ **Vérification :** `node scripts/build.mjs` n’affiche plus « Paiement pas encore configuré ».

### C. Héberger gratuitement (Cloudflare Pages)
Cloudflare → Workers & Pages → Create → Pages → Connect to Git → ce dépôt.
- Root directory : `cessio`
- Build command : `node scripts/build.mjs`
- Build output directory : `dist`

→ **Vérification :** `https://TON-SITE/api/license` renvoie `"configured":true`.

Variante Worker : `wrangler.jsonc`, puis `npx wrangler deploy` après le build.

### D. Tester un achat, puis ouvrir
1. Achète Solo en sandbox avec la carte de test 4242 4242 4242 4242.
2. Colle la clé reçue sur `/compte`. → Le badge passe à « Solo » et le PDF ne porte plus la mention.
3. Repasse `server: 'production'` avec ton organisation réelle.

### E. Faire relire le modèle de contrat
Le contrat suit le CPI, mais tu vas le vendre : fais relire `src/assets/js/core/contract.mjs` par un avocat en propriété intellectuelle avant le lancement. Compte une prestation ponctuelle, souvent quelques centaines d’euros (ordre de grandeur, confiance faible). C’est ton principal argument de vente : « modèle relu par Me X ».

---

## 2. Développement et tests

```bash
cd cessio
npm install            # pour les tests ; les bibliothèques sont déjà copiées dans src/assets/vendor
npm run dev:mock       # http://localhost:8788, paiement simulé
npm test               # 36 tests unitaires + 19 tests de bout en bout (Chromium)
```

Clés de test en mode simulé : `SOLO-TEST-0000-0001`, `STUDIO-TEST-0000-0002`, `OTHER-PRODUCT-0003` (refusée).

**Ce que vérifient les tests**
- Contrats PDF : présence de chaque mention obligatoire, prix exacts, pagination.
- Fichiers Word : XML valide, fichier lu par pandoc et converti par LibreOffice.
- Rappels d’agenda (.ics) : dates exactes, conformité RFC 5545.
- Export CSV, limites de chaque plan, activation et désactivation de licence.
- Registre : renouvellement, sauvegarde et restauration, alertes d’échéance.
- Contrats existants inchangés quand on modifie les réglages.
- Fonctionnement hors ligne, absence de débordement sur mobile, absence d’erreur JavaScript et de violation de la politique de sécurité (CSP).

---

## 3. Architecture

```
cessio/
├── site.config.mjs            ← marque, plans, prix, paiement, mentions légales
├── server/license.mjs         ← vérification de licence sans clé API (Polar, Lemon Squeezy, Gumroad)
├── functions/api/license.js   ← route /api/license (Cloudflare Pages)
├── src/assets/js/core/        ← moteur : prix, contrat, PDF, Word, agenda, CSV, stockage local
├── src/assets/js/app/         ← assistant, registre, réglages, calculateur, exports
├── src/pages/                 ← accueil, application, calculateur, guide, tarifs, compte, légal
├── scripts/                   ← build sans dépendance, serveur local, images
└── tests/                     ← unitaires et de bout en bout
```

## 4. Limites assumées

- **Pas un conseil juridique.** Le contrat applique des règles générales ; il est indiqué partout de le faire relire pour les dossiers à fort enjeu.
- **Hors périmètre :**
  - les contrats d’édition (livres) ;
  - les œuvres musicales gérées par la Sacem ;
  - les droits voisins ;
  - le droit à l’image des personnes photographiées.
- **Aucun barème légal** n’existe : les pourcentages proposés sont des points de départ modifiables.
- **Données dans le navigateur :** sans sauvegarde, effacer les données du site efface le registre. Une sauvegarde JSON en un clic est proposée, et rappelée dans l’interface.
- **Contournement possible :** les limites de plan sont appliquées dans le navigateur, donc contournables par un développeur. Les limites d’appareils, elles, sont contrôlées par le prestataire de paiement.
