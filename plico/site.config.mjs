// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATION UNIQUE DU SAAS
//  Tout ce que tu dois remplir est ici. Aucune valeur de ce fichier n'est secrète :
//  identifiants de produits et liens de paiement sont publics par nature.
//  Aucune clé API n'est nécessaire, nulle part.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  brand: {
    name: 'Plico',
    tagline: 'Tous vos outils PDF. Vos fichiers ne quittent jamais votre appareil.',
    // Couleur principale (boutons, liens, logo)
    accent: '#ff5a36',
  },

  // URL publique du site, sans "/" final. Ex. : 'https://plico.pages.dev' ou 'https://plico.fr'
  // Laisse vide tant que tu ne la connais pas : les balises canonical et le sitemap seront omis.
  siteUrl: '',

  contactEmail: 'contact@exemple.fr',

  // Informations légales obligatoires en France (mentions légales / CGV).
  legal: {
    ownerName: '',        // Ton nom ou la raison sociale
    status: '',           // Ex. : 'Entrepreneur individuel (micro-entreprise)'
    siret: '',            // Ton numéro SIRET
    address: '',          // Adresse postale de l'éditeur
    publicationDirector: '', // Directeur de la publication (souvent toi)
    host: 'Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107, États-Unis — cloudflare.com',
    mediator: '',         // Médiateur de la consommation (obligatoire pour vendre à des particuliers)
  },

  // ── Paiement ──────────────────────────────────────────────────────────────
  // Le prestataire encaisse, gère la TVA mondiale (marchand de référence) et
  // envoie une clé de licence au client. Le site vérifie la clé via un point
  // d'accès public du prestataire : pas de clé API, pas d'abonnement fixe.
  billing: {
    provider: 'polar', // 'polar' (recommandé) | 'lemonsqueezy' | 'gumroad'

    polar: {
      organizationId: '',      // Polar → Settings → Organization ID
      server: 'production',    // 'sandbox' pour tester avec de faux paiements
    },
    lemonsqueezy: {
      storeId: '',             // Lemon Squeezy → Settings → Stores → ID
    },
    gumroad: {},               // Rien à configurer ici : voir plans.*.match.gumroadProductIds

    // Lien vers l'espace client du prestataire (gérer/annuler l'abonnement, factures)
    // Polar : 'https://polar.sh/<ton-slug>/portal' — Lemon Squeezy : 'https://app.lemonsqueezy.com/my-orders'
    // Gumroad : 'https://app.gumroad.com/library'
    customerPortalUrl: '',
  },

  // ── Plans ─────────────────────────────────────────────────────────────────
  // Les limites sont appliquées par l'application. Les prix affichés doivent
  // correspondre à ceux configurés chez le prestataire.
  plans: {
    free: {
      name: 'Gratuit',
      price: { monthly: 0, yearly: 0 },
      limits: {
        maxFileMB: 20,
        maxFiles: 3,
        maxImages: 10,
        tools: ['merge', 'organize', 'split', 'images-to-pdf'],
        batch: false,
      },
    },
    pro: {
      name: 'Pro',
      price: { monthly: 6, yearly: 48 },
      // Liens de paiement (Checkout Links) créés chez le prestataire
      checkout: { monthly: '', yearly: '' },
      maxDevices: 3,
      limits: {
        maxFileMB: 500,
        maxFiles: 200,
        maxImages: 500,
        tools: 'all',
        batch: false,
      },
      // Comment reconnaître une licence Pro selon le prestataire choisi
      match: {
        polarBenefitIds: [],    // ID du bénéfice "License key" attaché aux produits Pro
        lemonVariantIds: [],    // IDs des variantes Pro (mensuelle + annuelle)
        lemonProductIds: [],    // ou ID du produit Pro
        gumroadProductIds: [],  // product_id Gumroad du produit Pro
      },
    },
    business: {
      name: 'Business',
      price: { monthly: 15, yearly: 144 },
      checkout: { monthly: '', yearly: '' },
      maxDevices: 10,
      limits: {
        maxFileMB: 2000,
        maxFiles: 1000,
        maxImages: 2000,
        tools: 'all',
        batch: true,
      },
      match: {
        polarBenefitIds: [],
        lemonVariantIds: [],
        lemonProductIds: [],
        gumroadProductIds: [],
      },
    },
  },

  // Durée pendant laquelle une licence reste active hors ligne après la dernière vérification réussie
  license: {
    revalidateHours: 12,
    offlineGraceDays: 7,
  },
};
