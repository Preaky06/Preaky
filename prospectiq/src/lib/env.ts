// Lecture centralisée des variables d'environnement. Aucune clé secrète n'est exposée au navigateur :
// ce module n'est importé que côté serveur.
import 'server-only';

const str = (name: string) => (process.env[name] || '').trim();

export const env = {
  appUrl: str('APP_URL') || 'http://localhost:3000',
  databaseUrl: str('DATABASE_URL'),
  pgliteDir: str('PGLITE_DIR') || '.data/pglite',
  sessionDays: Number(str('SESSION_DAYS') || 30),
  adminEmails: str('ADMIN_EMAILS')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  // E-mail (réinitialisation de mot de passe, invitations)
  smtpUrl: str('SMTP_URL'),
  mailFrom: str('MAIL_FROM') || 'Pro Spectre <no-reply@localhost>',
  // Sources de données
  sireneApi: str('SIRENE_API_URL') || 'https://recherche-entreprises.api.gouv.fr',
  bodaccApi: str('BODACC_API_URL') || 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales',
  geoApi: str('GEO_API_URL') || 'https://geo.api.gouv.fr',
  googlePlacesKey: str('GOOGLE_PLACES_API_KEY'),
  pagespeedKey: str('PAGESPEED_API_KEY'),
  // Accès web pour l'analyse des sites (tests uniquement : redirige toutes les requêtes vers un serveur local)
  webFetchOverride: str('WEB_FETCH_OVERRIDE'),
  // IA : tout fournisseur compatible avec l'API Chat Completions d'OpenAI (OpenAI, Mistral, Groq…)
  aiApiKey: str('AI_API_KEY'),
  aiBaseUrl: str('AI_BASE_URL') || 'https://api.openai.com/v1',
  aiModel: str('AI_MODEL'),
  aiPriceInputPerMTok: Number(str('AI_PRICE_INPUT_EUR_PER_MTOK') || 0),
  aiPriceOutputPerMTok: Number(str('AI_PRICE_OUTPUT_EUR_PER_MTOK') || 0),
  // Paiements
  stripeSecretKey: str('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: str('STRIPE_WEBHOOK_SECRET'),
  stripePrices: {
    starter: str('STRIPE_PRICE_STARTER'),
    pro: str('STRIPE_PRICE_PRO'),
    business: str('STRIPE_PRICE_BUSINESS'),
  },
  cronSecret: str('CRON_SECRET'),
  // Mentions légales (éditeur du service) : à renseigner avant la mise en ligne
  legal: {
    company: str('LEGAL_COMPANY'),
    form: str('LEGAL_FORM'),
    address: str('LEGAL_ADDRESS'),
    siren: str('LEGAL_SIREN'),
    vat: str('LEGAL_VAT'),
    director: str('LEGAL_DIRECTOR'),
    email: str('LEGAL_EMAIL'),
    host: str('LEGAL_HOST') || 'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com',
    dbHost: str('LEGAL_DB_HOST'),
  },
  isProd: process.env.NODE_ENV === 'production',
};

export const features = {
  ai: () => Boolean(env.aiApiKey && env.aiModel),
  places: () => Boolean(env.googlePlacesKey),
  stripe: () => Boolean(env.stripeSecretKey && env.stripePrices.starter && env.stripePrices.pro && env.stripePrices.business),
  mail: () => Boolean(env.smtpUrl),
  pagespeed: () => Boolean(env.pagespeedKey),
};
