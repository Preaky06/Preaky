// Score de potentiel commercial (0-100), explicable et paramétrable.
// Ce score mesure un potentiel d'opportunité, pas une probabilité de conversion.
import type { Company, PlaceInfo, Signal, WebsiteAudit } from './connectors/types';
import { EMPLOYEE_RANGES, SERVICES, sectorById, sizeOfRange } from './sectors';

export interface Weights {
  need: number;
  relevance: number;
  digital: number;
  signals: number;
  data: number;
}

export const DEFAULT_WEIGHTS: Weights = { need: 30, relevance: 25, digital: 20, signals: 15, data: 10 };

export const CRITERIA_LABELS: Record<keyof Weights, string> = {
  need: 'Besoin potentiel détecté',
  relevance: 'Pertinence pour vos services',
  digital: 'Opportunité digitale',
  signals: 'Signaux commerciaux récents',
  data: 'Qualité et fraîcheur des données',
};

export interface Offer {
  services: string[];
  sectors: string[];
  sizes: string[];
  description?: string;
  senderName?: string;
  senderCompany?: string;
}

export interface Criterion {
  id: keyof Weights;
  label: string;
  weight: number;
  points: number;
  ratio: number;
  /** verified : calculé sur des données constatées ; estimated : en partie déduit ; missing : non évalué */
  basis: 'verified' | 'estimated' | 'missing';
  reasons: string[];
}

export interface ScoreResult {
  total: number;
  category: { id: 'elevee' | 'interessant' | 'modere' | 'faible'; label: string };
  confidence: 'élevée' | 'moyenne' | 'faible';
  confidenceRatio: number;
  criteria: Criterion[];
  flags: string[];
  preliminary: boolean;
  neededServices: string[];
}

export function categoryOf(total: number): ScoreResult['category'] {
  if (total >= 80) return { id: 'elevee', label: 'Priorité élevée' };
  if (total >= 60) return { id: 'interessant', label: 'Prospect intéressant' };
  if (total >= 40) return { id: 'modere', label: 'Potentiel modéré' };
  return { id: 'faible', label: 'Faible priorité' };
}

export function normalizeWeights(w?: Partial<Weights> | null): Weights {
  const merged = { ...DEFAULT_WEIGHTS, ...(w || {}) };
  for (const k of Object.keys(merged) as (keyof Weights)[]) merged[k] = Math.max(0, Number(merged[k]) || 0);
  const sum = Object.values(merged).reduce((s, v) => s + v, 0);
  if (!sum) return { ...DEFAULT_WEIGHTS };
  const scaled = Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, (v * 100) / sum])) as unknown as Weights;
  return scaled;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const monthsSince = (iso: string | null | undefined, now: Date) => (iso ? (now.getTime() - new Date(iso).getTime()) / (30.44 * 86400000) : Infinity);
const serviceName = (id: string) => SERVICES.find((s) => s.id === id)?.label || id;

/** Services dont l'entreprise semble avoir besoin, déduits des constats et signaux. */
export function neededServices(website: WebsiteAudit | null | undefined, signals: Signal[], places: PlaceInfo | null | undefined): string[] {
  const out = new Set<string>();
  if (website?.status === 'not_found') ['site_web', 'seo', 'identite'].forEach((s) => out.add(s));
  for (const f of website?.findings || []) if (f.severity !== 'info') f.services.forEach((s) => out.add(s));
  for (const s of signals) {
    if (s.kind !== 'opportunity') continue;
    if (/création|immatriculation/i.test(s.label)) ['identite', 'site_web', 'reseaux_sociaux'].forEach((x) => out.add(x));
    if (/nom|enseigne|vente|cession|dirigeant/i.test(s.label)) ['identite', 'site_web', 'conseil'].forEach((x) => out.add(x));
    if (/transfert|activité/i.test(s.label)) ['publicite', 'site_web'].forEach((x) => out.add(x));
  }
  if (places?.matched && places.rating != null && places.rating < 4 && (places.reviews || 0) >= 10) out.add('reputation');
  return [...out];
}

export interface ScoreInput {
  company: Company;
  website?: WebsiteAudit | null;
  signals?: Signal[] | null;
  places?: PlaceInfo | null;
  offer?: Partial<Offer> | null;
  weights?: Partial<Weights> | null;
  now?: Date;
}

export function scoreCompany(input: ScoreInput): ScoreResult {
  const now = input.now || new Date();
  const { company } = input;
  const website = input.website ?? null;
  const signalsKnown = Array.isArray(input.signals);
  const signals = input.signals || [];
  const places = input.places ?? null;
  const offer: Offer = { services: [], sectors: [], sizes: [], ...(input.offer || {}) };
  const w = normalizeWeights(input.weights);
  const flags: string[] = [];
  const analyzed = !!website && ['verified', 'probable', 'not_found'].includes(website.status);
  const audited = !!website && ['verified', 'probable'].includes(website.status) && !!website.findings;
  const needed = neededServices(website, signals, places);
  const recentRisk = signals.some((s) => s.kind === 'risk' && monthsSince(s.date, now) <= 24);
  const createdMonths = monthsSince(company.createdOn, now);
  const range = company.employeesRange ? EMPLOYEE_RANGES[company.employeesRange] : null;

  // 1. Besoin potentiel détecté
  const need: Criterion = { id: 'need', label: CRITERIA_LABELS.need, weight: w.need, points: 0, ratio: 0, basis: 'missing', reasons: [] };
  if (audited) {
    const findings = website!.findings || [];
    need.ratio = findings.reduce((s, f) => s + (f.severity === 'important' ? 0.3 : f.severity === 'mineur' ? 0.12 : 0.04), 0);
    need.basis = 'verified';
    const top = findings.filter((f) => f.severity !== 'info').slice(0, 3);
    need.reasons.push(...(top.length ? top.map((f) => f.label) : ['Site en bon état : peu de lacunes techniques détectées.']));
  } else if (website?.status === 'not_found') {
    need.ratio = 0.7;
    need.basis = 'estimated';
    need.reasons.push('Aucun site web trouvé automatiquement (absence à confirmer).');
  } else {
    need.ratio = 0.4;
    need.reasons.push('Analyse du site non lancée : besoin estimé à partir du seul profil de l’entreprise.');
  }
  if (places?.matched && places.rating != null && places.rating < 4 && (places.reviews || 0) >= 10) {
    need.ratio += 0.2;
    need.reasons.push(`Note Google de ${String(places.rating).replace('.', ',')}/5 sur ${places.reviews} avis.`);
  }
  if (createdMonths <= 12) {
    need.ratio += 0.2;
    need.reasons.push('Entreprise créée il y a moins d’un an.');
  }

  // 2. Pertinence par rapport aux services de l'utilisateur
  const relevance: Criterion = { id: 'relevance', label: CRITERIA_LABELS.relevance, weight: w.relevance, points: 0, ratio: 0, basis: 'missing', reasons: [] };
  if (!offer.services.length) {
    relevance.ratio = 0.5;
    relevance.reasons.push('Renseignez les services que vous vendez (Paramètres) pour personnaliser ce critère.');
  } else {
    const matching = needed.filter((s) => offer.services.includes(s));
    const serviceRatio = analyzed || signals.length ? Math.min(1, matching.length / Math.min(2, offer.services.length)) : 0.5;
    const sectorOk = !offer.sectors.length || (company.sectorId != null && offer.sectors.includes(company.sectorId));
    const sizeId = sizeOfRange(company.employeesRange)?.id;
    const sizeOk = !offer.sizes.length || (sizeId != null && offer.sizes.includes(sizeId));
    relevance.ratio = 0.6 * serviceRatio + 0.25 * (sectorOk ? 1 : 0) + 0.15 * (sizeOk ? 1 : 0);
    relevance.basis = analyzed ? 'verified' : 'estimated';
    if (matching.length) relevance.reasons.push(`Besoins correspondant à vos services : ${matching.map(serviceName).join(', ')}.`);
    else if (analyzed) relevance.reasons.push('Aucun besoin détecté ne correspond directement à vos services.');
    else relevance.reasons.push('Correspondance avec vos services à confirmer par l’analyse du site.');
    if (offer.sectors.length) relevance.reasons.push(sectorOk ? `Secteur dans votre cible (${sectorById(company.sectorId || '')?.label || 'secteur'}).` : 'Secteur hors de votre cible.');
    if (offer.sizes.length) relevance.reasons.push(sizeOk ? 'Taille d’entreprise dans votre cible.' : 'Taille d’entreprise hors de votre cible ou inconnue.');
  }

  // 3. Opportunité digitale (faible maturité × capacité d'investissement)
  const digital: Criterion = { id: 'digital', label: CRITERIA_LABELS.digital, weight: w.digital, points: 0, ratio: 0, basis: 'missing', reasons: [] };
  let capacity = 0.7;
  const capacityReasons: string[] = [];
  if (range) {
    capacity = range.min >= 3 ? 1 : range.min >= 1 ? 0.8 : 0.55;
    capacityReasons.push(`Effectif : ${range.label.toLowerCase()}${company.employeesYear ? ` (${company.employeesYear})` : ''}.`);
  }
  if (company.finances?.revenue != null) {
    if (company.finances.revenue >= 150000) capacity = Math.max(capacity, 1);
    capacityReasons.push(`Chiffre d’affaires publié : ${Math.round(company.finances.revenue / 1000).toLocaleString('fr-FR')} k€ (${company.finances.year}).`);
  }
  if ((company.establishments || 0) >= 2) {
    capacity = Math.max(capacity, 1);
    capacityReasons.push(`${company.establishments} établissements ouverts.`);
  }
  if (audited) {
    const maturity =
      0.4 * ((website!.quality ?? 50) / 100) +
      0.2 * (Object.keys(website!.socials || {}).length ? 1 : 0) +
      0.15 * ((website!.analytics || []).length ? 1 : 0) +
      0.15 * (website!.lastContentDate && monthsSince(website!.lastContentDate, now) <= 12 ? 1 : 0) +
      0.1 * (website!.booking || website!.ecommerce ? 1 : 0);
    digital.ratio = (1 - maturity) * (0.55 + 0.45 * capacity);
    digital.basis = 'verified';
    digital.reasons.push(`Maturité digitale mesurée : ${Math.round(maturity * 100)}/100.`);
  } else if (website?.status === 'not_found') {
    digital.ratio = 0.85 * (0.55 + 0.45 * capacity);
    digital.basis = 'estimated';
    digital.reasons.push('Présence en ligne non trouvée : potentiel digital élevé si confirmé.');
  } else {
    digital.ratio = 0.45 * (0.55 + 0.45 * capacity);
    digital.reasons.push('Maturité digitale non mesurée (analyse du site non lancée).');
  }
  digital.reasons.push(...capacityReasons);

  // 4. Signaux commerciaux récents
  const sig: Criterion = { id: 'signals', label: CRITERIA_LABELS.signals, weight: w.signals, points: 0, ratio: 0, basis: signalsKnown ? 'verified' : 'missing', reasons: [] };
  if (recentRisk) {
    sig.ratio = 0;
    flags.push('risk');
    sig.reasons.push(...signals.filter((s) => s.kind === 'risk').slice(0, 2).map((s) => `${s.label}${s.date ? ` (${new Date(s.date).toLocaleDateString('fr-FR')})` : ''}.`));
  } else {
    let r = 0;
    for (const s of signals.filter((x) => x.kind === 'opportunity')) {
      const m = monthsSince(s.date, now);
      if (m <= 12) r += 0.5;
      else if (m <= 24) r += 0.25;
      if (sig.reasons.length < 3) sig.reasons.push(`${s.label}${s.date ? ` (${new Date(s.date).toLocaleDateString('fr-FR')})` : ''}.`);
    }
    if (!signals.some((s) => /création/i.test(s.label)) && createdMonths <= 12) {
      r += 0.4;
      sig.reasons.push(`Entreprise créée le ${new Date(company.createdOn!).toLocaleDateString('fr-FR')} (SIRENE).`);
    }
    if (!r) {
      r = 0.1;
      sig.reasons.push(signalsKnown ? 'Aucun signal publié au BODACC sur les 24 derniers mois.' : 'Signaux non consultés.');
    }
    sig.ratio = r;
  }

  // 5. Qualité et fraîcheur des données
  const data: Criterion = { id: 'data', label: CRITERIA_LABELS.data, weight: w.data, points: 0, ratio: 0, basis: 'verified', reasons: [] };
  let d = 0;
  if (website?.status === 'verified') {
    d += 0.3;
    data.reasons.push('Site web vérifié par le SIREN.');
  } else if (website?.status === 'probable') {
    d += 0.15;
    data.reasons.push('Site web probable, non vérifié.');
  }
  if (company.updatedAt && monthsSince(company.updatedAt, now) <= 18) {
    d += 0.2;
    data.reasons.push('Données d’identification mises à jour récemment.');
  }
  const publicContact = (website?.phones || []).length || (website?.emails || []).some((e) => e.kind === 'generique') || places?.phone;
  if (publicContact) {
    d += 0.3;
    data.reasons.push('Coordonnées professionnelles publiques disponibles.');
  } else data.reasons.push('Aucune coordonnée publique trouvée.');
  if (company.lat != null) d += 0.1;
  if (places?.matched || company.employeesYear) d += 0.1;
  data.ratio = d;

  const criteria = [need, relevance, digital, sig, data];
  for (const c of criteria) {
    c.ratio = clamp(c.ratio);
    c.points = Math.round(c.weight * c.ratio);
  }
  let total = Math.min(100, criteria.reduce((s, c) => s + c.points, 0));
  if (recentRisk) total = Math.min(total, 25);
  if (!company.active) {
    total = 0;
    flags.push('inactive');
  }
  const confidenceRatio = criteria.reduce((s, c) => s + c.weight * (c.basis === 'verified' ? 1 : c.basis === 'estimated' ? 0.55 : 0.2), 0) / 100;
  const confidence = confidenceRatio >= 0.75 ? 'élevée' : confidenceRatio >= 0.5 ? 'moyenne' : 'faible';
  return { total, category: categoryOf(total), confidence, confidenceRatio: Math.round(confidenceRatio * 100) / 100, criteria, flags, preliminary: !analyzed, neededServices: needed };
}
