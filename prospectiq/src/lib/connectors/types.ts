// Modèle de données normalisé, indépendant des fournisseurs.
// Règle : toute valeur inconnue vaut null (affichée « Non renseigné »), jamais une supposition.

export interface Company {
  siren: string;
  siret: string | null;
  name: string;
  tradeNames: string[];
  naf: string | null;
  nafLabel: string | null;
  section: string | null;
  sectorId: string | null;
  legalForm: string | null;
  category: 'PME' | 'ETI' | 'GE' | null;
  employeesRange: string | null;
  employeesLabel: string | null;
  employeesYear: string | null;
  createdOn: string | null;
  active: boolean;
  establishments: number | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  department: string | null;
  region: string | null;
  lat: number | null;
  lon: number | null;
  /** Établissement correspondant à la recherche géographique, s'il diffère du siège. */
  localAddress: string | null;
  finances: { year: string; revenue: number | null; netIncome: number | null } | null;
  directors: { name: string; role: string | null }[];
  labels: string[];
  optOut: boolean;
  isIndividual: boolean;
  updatedAt: string | null;
  source: { name: string; url: string; fetchedAt: string };
  demo?: boolean;
}

export interface SearchParams {
  q?: string;
  sector?: string;
  naf?: string;
  region?: string;
  department?: string;
  postalCode?: string;
  city?: string;
  cityCode?: string;
  lat?: number;
  lon?: number;
  radiusKm?: number;
  sizes?: string[];
  excludeLarge?: boolean;
  page?: number;
}

export interface SearchResult {
  companies: Company[];
  total: number;
  page: number;
  totalPages: number;
  excluded: { optOut: number; suppressed: number; inactive: number };
  source: string;
}

export type SignalKind = 'opportunity' | 'risk' | 'info';

export interface Signal {
  id: string;
  label: string;
  detail?: string;
  kind: SignalKind;
  date?: string | null;
  source: string;
  url?: string | null;
  /** true = constaté dans une source ; false = déduit (à confirmer). */
  verified: boolean;
}

export interface Finding {
  id: string;
  label: string;
  severity: 'info' | 'mineur' | 'important';
  services: string[];
}

export interface WebsiteAudit {
  status: 'verified' | 'probable' | 'not_found' | 'unreachable' | 'blocked';
  url: string | null;
  verification: string;
  checkedAt: string;
  https?: boolean;
  statusCode?: number | null;
  responseMs?: number | null;
  htmlKb?: number | null;
  title?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  mobileViewport?: boolean;
  openGraph?: boolean;
  structuredData?: boolean;
  cms?: string | null;
  analytics?: string[];
  copyrightYear?: number | null;
  lastContentDate?: string | null;
  lastContentSource?: string | null;
  socials?: Partial<Record<'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x' | 'pinterest', string>>;
  phones?: string[];
  emails?: { address: string; kind: 'generique' | 'nominative' }[];
  booking?: boolean;
  ecommerce?: boolean;
  findings?: Finding[];
  quality?: number | null;
  candidatesTried?: string[];
}

export interface PlaceInfo {
  matched: boolean;
  name?: string;
  address?: string;
  website?: string | null;
  phone?: string | null;
  rating?: number | null;
  reviews?: number | null;
  status?: string | null;
  mapsUrl?: string | null;
  matchConfidence?: 'élevée' | 'moyenne' | 'faible';
  checkedAt: string;
  error?: string;
}

export interface Enrichment {
  website: WebsiteAudit | null;
  signals: Signal[];
  places: PlaceInfo | null;
  analyzedAt: string;
}
