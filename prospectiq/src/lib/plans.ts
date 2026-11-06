// Offres et quotas. Partagé client/serveur (aucun secret ici).
// Un « prospect » consommé = une entreprise analysée (fiche ouverte avec analyse) pour la première fois du mois.
export type PlanId = 'decouverte' | 'starter' | 'pro' | 'business';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  prospects: number;
  aiMessages: number;
  seats: number;
  features: {
    deepAnalysis: boolean; // analyse enrichie par IA (si un fournisseur IA est configuré)
    crmFull: boolean; // Kanban, relances, historique complet
    export: boolean; // export CSV
    savedSearches: boolean; // recherches sauvegardées, listes, comparaison
    team: boolean; // plusieurs utilisateurs
  };
  pitch: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  decouverte: {
    id: 'decouverte',
    name: 'Découverte',
    price: 0,
    prospects: 20,
    aiMessages: 10,
    seats: 1,
    features: { deepAnalysis: false, crmFull: false, export: false, savedSearches: false, team: false },
    pitch: ['20 prospects analysés par mois', 'Recherche avancée et scoring', '10 messages générés', 'CRM de base'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 19,
    prospects: 100,
    aiMessages: 50,
    seats: 1,
    features: { deepAnalysis: false, crmFull: false, export: false, savedSearches: false, team: false },
    pitch: ['100 prospects analysés par mois', 'Recherche avancée', 'Scoring explicable', '50 messages générés par mois', 'CRM de base'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49,
    prospects: 500,
    aiMessages: 300,
    seats: 1,
    features: { deepAnalysis: true, crmFull: true, export: true, savedSearches: true, team: false },
    pitch: ['500 prospects analysés par mois', 'Analyses IA approfondies', '300 messages générés par mois', 'CRM complet (Kanban, relances)', 'Export CSV', 'Recherches sauvegardées et listes'],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 99,
    prospects: 2000,
    aiMessages: 1500,
    seats: 5,
    features: { deepAnalysis: true, crmFull: true, export: true, savedSearches: true, team: true },
    pitch: ['2 000 prospects analysés par mois', 'Toutes les fonctionnalités Pro', '5 utilisateurs et collaboration', '1 500 messages générés par mois'],
  },
};

export const PAID_PLANS: PlanId[] = ['starter', 'pro', 'business'];
export const planOf = (id: string | null | undefined): Plan => PLANS[(id as PlanId) in PLANS ? (id as PlanId) : 'decouverte'];

export function requiredPlanFor(feature: keyof Plan['features']): Plan {
  return (['starter', 'pro', 'business'] as PlanId[]).map((id) => PLANS[id]).find((p) => p.features[feature]) || PLANS.business;
}
