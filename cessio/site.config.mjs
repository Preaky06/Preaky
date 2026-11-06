// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATION UNIQUE DU SAAS — rien de secret ici, aucune clé API nulle part.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  brand: {
    name: 'Cessio',
    tagline: 'La cession de droits d’auteur, enfin simple pour les créatifs.',
    accent: '#5b4bff',
  },

  // URL publique du site, sans "/" final (ex. 'https://cessio.pages.dev'). Vide = pas de sitemap/canonical.
  siteUrl: '',
  contactEmail: 'contact@exemple.fr',

  legal: {
    ownerName: '',
    status: '',
    siret: '',
    address: '',
    publicationDirector: '',
    host: 'Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107, États-Unis — cloudflare.com',
    mediator: '',
  },

  // ── Paiement (marchand de référence : encaisse, gère la TVA, remet une clé de licence) ──
  billing: {
    provider: 'polar', // 'polar' (recommandé) | 'lemonsqueezy' | 'gumroad'
    polar: { organizationId: '', server: 'production' },
    lemonsqueezy: { storeId: '' },
    gumroad: {},
    customerPortalUrl: '',
  },

  // ── Plans ──
  plans: {
    free: {
      name: 'Gratuit',
      price: { monthly: 0, yearly: 0 },
      limits: { maxContracts: 3, word: false, ics: false, branding: false, csv: false, profiles: 1, watermark: true },
      features: [
        'Calculateur de prix de cession illimité',
        'Contrat conforme au Code de la propriété intellectuelle (PDF)',
        'Jusqu’à 3 contrats dans le registre',
        'Mention « Généré avec Cessio » en pied de page',
      ],
    },
    solo: {
      name: 'Solo',
      price: { monthly: 9, yearly: 84 },
      checkout: { monthly: '', yearly: '' },
      maxDevices: 3,
      limits: { maxContracts: 100000, word: true, ics: true, branding: true, csv: false, profiles: 1, watermark: false },
      features: [
        'Contrats illimités, sans mention Cessio',
        'Votre logo et votre couleur sur chaque document',
        'Export Word modifiable (.docx)',
        'Rappels d’échéance dans votre agenda (Google, Apple, Outlook)',
        'Renouvellement d’une cession en un clic',
        '3 appareils',
      ],
      match: { polarBenefitIds: [], lemonVariantIds: [], lemonProductIds: [], gumroadProductIds: [] },
    },
    studio: {
      name: 'Studio',
      price: { monthly: 24, yearly: 228 },
      checkout: { monthly: '', yearly: '' },
      maxDevices: 10,
      limits: { maxContracts: 100000, word: true, ics: true, branding: true, csv: true, profiles: 20, watermark: false },
      features: [
        'Tout le plan Solo',
        'Plusieurs profils d’auteurs (studio, collectif, agence)',
        'Export du registre en CSV (comptabilité, assurance)',
        '10 appareils',
        'Support prioritaire',
      ],
      match: { polarBenefitIds: [], lemonVariantIds: [], lemonProductIds: [], gumroadProductIds: [] },
    },
  },

  license: { revalidateHours: 12, offlineGraceDays: 7 },
};
