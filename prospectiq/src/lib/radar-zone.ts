// Radar : traduction d'une recherche en zone surveillée et filtre des entreprises détectées.
// Module pur (sans accès réseau ni base) : testé unitairement.
import type { Company } from './connectors/types';
import { sectorById, SIZES } from './sectors';

export interface RadarCriteria {
  q?: string;
  sector?: string;
  region?: string;
  department?: string;
  postalCode?: string;
  city?: string;
  cityCode?: string;
  sizes?: string[];
  excludeLarge?: boolean;
}

/** Départements de chaque région (codes Insee des régions, découpage 2016). */
export const REGION_DEPARTMENTS: Record<string, string[]> = {
  '84': ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
  '27': ['21', '25', '39', '58', '70', '71', '89', '90'],
  '53': ['22', '29', '35', '56'],
  '24': ['18', '28', '36', '37', '41', '45'],
  '94': ['2A', '2B'],
  '44': ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'],
  '32': ['02', '59', '60', '62', '80'],
  '11': ['75', '77', '78', '91', '92', '93', '94', '95'],
  '28': ['14', '27', '50', '61', '76'],
  '75': ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
  '76': ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'],
  '52': ['44', '49', '53', '72', '85'],
  '93': ['04', '05', '06', '13', '83', '84'],
  '01': ['971'],
  '02': ['972'],
  '03': ['973'],
  '04': ['974'],
  '06': ['976'],
};

/** Département d'un code postal (Corse : 200xx-201xx → 2A, 202xx-206xx → 2B ; outre-mer sur 3 chiffres). */
export function departmentOfPostalCode(cp: string): string | null {
  if (!/^\d{5}$/.test(cp)) return null;
  if (cp.startsWith('97')) return cp.slice(0, 3);
  if (cp.startsWith('20')) return Number(cp) < 20200 ? '2A' : '2B';
  return cp.slice(0, 2);
}

/** Département d'un code commune Insee (2A004, 69123, 97411…). */
export function departmentOfCityCode(code: string): string | null {
  if (/^2[AB]\d{3}$/.test(code)) return code.slice(0, 2);
  if (/^97\d{3}$/.test(code)) return code.slice(0, 3);
  if (/^\d{5}$/.test(code)) return code.slice(0, 2);
  return null;
}

export interface RadarZone {
  departments: string[];
  postalCode: string | null;
  label: string;
}

/** Zone surveillée par une alerte. Null si la recherche n'a pas de zone (le Radar a besoin d'un territoire). */
export function zoneOf(c: RadarCriteria): RadarZone | null {
  if (c.postalCode && departmentOfPostalCode(c.postalCode)) return { departments: [departmentOfPostalCode(c.postalCode)!], postalCode: c.postalCode, label: `code postal ${c.postalCode}` };
  if (c.cityCode && departmentOfCityCode(c.cityCode)) {
    const d = departmentOfCityCode(c.cityCode)!;
    return { departments: [d], postalCode: null, label: `${c.city ? `${c.city}, ` : ''}département ${d}` };
  }
  if (c.department) return { departments: [c.department.toUpperCase()], postalCode: null, label: `département ${c.department.toUpperCase()}` };
  if (c.region && REGION_DEPARTMENTS[c.region]) return { departments: REGION_DEPARTMENTS[c.region], postalCode: null, label: `région (${REGION_DEPARTMENTS[c.region].length} départements)` };
  return null;
}

/** L'entreprise détectée correspond-elle aux critères de l'alerte ? (opposition et cessation toujours exclues) */
export function matchesCriteria(company: Company, c: RadarCriteria): boolean {
  if (!company.active || company.optOut) return false;
  if (c.sector) {
    const s = sectorById(c.sector);
    if (s) {
      const naf = company.naf || '';
      const ok = (s.naf || []).includes(naf) || (s.sections || []).includes(company.section || '');
      if (!ok && company.sectorId !== c.sector) return false;
    }
  }
  if (c.sizes?.length) {
    const ranges = c.sizes.flatMap((id) => SIZES.find((s) => s.id === id)?.ranges || []);
    if (ranges.length && !(company.employeesRange && ranges.includes(company.employeesRange))) return false;
  }
  if (c.excludeLarge && (company.category === 'GE' || company.category === 'ETI')) return false;
  if (c.q?.trim()) {
    const needle = c.q.trim().toLowerCase();
    const hay = [company.name, ...(company.tradeNames || []), company.nafLabel || ''].join(' ').toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

/**
 * Pré-tri par l'activité déclarée dans l'annonce BODACC (texte libre), avant la vérification SIRENE.
 * Évite d'interroger SIRENE pour des annonces sans rapport avec le secteur surveillé.
 */
export const SECTOR_KEYWORDS: Record<string, RegExp> = {
  marketing: /communication|marketing|publicit|graphis|evenementiel|relations publiques|photograph|video|agence de presse|imprim/,
  immobilier: /immobili|gestion locative|marchand de biens|syndic|location de (biens|logements)|transaction/,
  hotellerie: /hotel|hebergement|chambres? d.hotes|gite|residence de tourisme|auberge|meubles? de tourisme/,
  restauration: /restaura|brasserie|bistro|pizz|traiteur|snack|\bcafe|\bbar\b|food|sandwich|burger|kebab|creperie|salon de the|plats|cuisine|debit de boissons/,
  bijouterie: /bijou|joaill|horlog|orfevr/,
  automobile: /automobile|vehicule|garage|carrosserie|mecanique|pneumati|depannage|\bauto\b/,
  sante: /sante|medic|soin|kine|osteo|infirm|dentaire|pharmac|bien-etre|massage|esthetique|coiff|beaute|\bspa\b|fitness|yoga|sport|optique|psycho/,
  commerce: /vente|commerce|negoce|boutique|magasin|achat|distribution|en ligne|epicerie/,
  technologie: /informatique|logiciel|numerique|developpement|\bweb\b|digital|internet|systemes d.information|donnees|application|cyber|intelligence artificielle/,
  tourisme: /tourisme|voyage|excursion|guide|location saisonniere|camping|loisirs/,
  industrie: /fabrication|production|industri|usinage|transformation|manufact|atelier/,
  services: /conseil|comptab|juridique|expert|formation|recrutement|nettoyage|secretariat|services aux entreprises|gestion administrative/,
  btp: /batiment|travaux|renovation|maconn|plomb|electricit|menuiser|peinture|construction|couverture|charpent|carrel|chauffag|isolation|terrassement/,
};

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** true / false si l'activité déclarée permet de conclure, null si inconnue (vérification SIRENE nécessaire). */
export function activityMatches(activity: string | null | undefined, sector: string | null | undefined): boolean | null {
  if (!sector || !SECTOR_KEYWORDS[sector]) return null;
  if (!activity?.trim()) return null;
  return SECTOR_KEYWORDS[sector].test(fold(activity));
}
