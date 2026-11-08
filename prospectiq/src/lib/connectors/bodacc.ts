// Connecteur BODACC (Bulletin officiel des annonces civiles et commerciales) : open data DILA, sans clé.
// Fournit des signaux datés et vérifiables : créations, ventes, changements, procédures collectives.
import 'server-only';
import { env } from '../env';
import { fetchJson } from '../apilog';
import { cached } from '../cache';
import type { Signal } from './types';

const SOURCE = 'BODACC';
type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const parse = (v: unknown): Raw | null => {
  if (!v) return null;
  if (typeof v === 'object') return v as Raw;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
};

export function toSignals(r: Raw): Signal[] {
  const date = r.dateparution || null;
  const base = { date, source: SOURCE, url: r.url_complete || null, verified: true };
  const id = String(r.id || `${r.familleavis}-${date}`);
  switch (r.familleavis) {
    case 'creation':
      return [{ ...base, id: `${id}-creation`, kind: 'opportunity', label: 'Création d’entreprise publiée au BODACC', detail: 'Une jeune entreprise a souvent besoin d’identité, de site et de visibilité.' }];
    case 'immatriculation':
      return [{ ...base, id: `${id}-immat`, kind: 'opportunity', label: 'Nouvelle immatriculation (établissement ou activité)', detail: 'Ouverture ou extension d’activité.' }];
    case 'vente':
      return [{ ...base, id: `${id}-vente`, kind: 'opportunity', label: 'Vente ou cession de fonds de commerce', detail: 'Un nouveau propriétaire revoit souvent sa communication.' }];
    case 'modification': {
      const desc = String(parse(r.modificationsgenerales)?.descriptif || '').toLowerCase();
      const out: Signal[] = [];
      if (/dissolution|cessation/.test(desc)) out.push({ ...base, id: `${id}-dissolution`, kind: 'risk', label: 'Dissolution ou cessation d’activité annoncée' });
      if (/d[ée]nomination|enseigne|nom commercial/.test(desc)) out.push({ ...base, id: `${id}-nom`, kind: 'opportunity', label: 'Changement de nom ou d’enseigne', detail: 'Moment favorable pour une nouvelle identité et un nouveau site.' });
      if (/transfert|si[èe]ge/.test(desc)) out.push({ ...base, id: `${id}-transfert`, kind: 'opportunity', label: 'Transfert d’adresse ou de siège' });
      if (/administration|dirigeant|g[ée]rant|pr[ée]sident/.test(desc)) out.push({ ...base, id: `${id}-dirigeant`, kind: 'opportunity', label: 'Changement de dirigeant', detail: 'Une nouvelle direction réévalue souvent ses prestataires.' });
      if (/activit[ée]/.test(desc) && !/cessation/.test(desc)) out.push({ ...base, id: `${id}-activite`, kind: 'opportunity', label: 'Évolution de l’activité déclarée' });
      if (!out.length) out.push({ ...base, id: `${id}-modif`, kind: 'info', label: 'Modification publiée au BODACC', detail: desc ? desc.slice(0, 160) : undefined });
      return out;
    }
    case 'collective':
    case 'conciliation':
    case 'retablissement_professionnel': {
      const nature = String(parse(r.jugement)?.nature || 'Procédure collective');
      return [{ ...base, id: `${id}-collective`, kind: 'risk', label: 'Procédure collective ou difficulté publiée', detail: nature.slice(0, 160) }];
    }
    case 'radiation':
      return [{ ...base, id: `${id}-radiation`, kind: 'risk', label: 'Radiation publiée au BODACC' }];
    default:
      return [];
  }
}

/** Annonces des 24 derniers mois pour une liste de SIREN (une seule requête). */
export async function bodaccSignals(sirens: string[], orgId?: string | null): Promise<Record<string, Signal[]>> {
  const list = [...new Set(sirens.filter((s) => /^\d{9}$/.test(s)))].slice(0, 30);
  const out: Record<string, Signal[]> = Object.fromEntries(list.map((s) => [s, []]));
  if (!list.length) return out;
  const since = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);
  const where = `(${list.map((s) => `registre="${s}"`).join(' or ')}) and familleavis != "dpc" and dateparution >= date'${since}'`;
  const params = new URLSearchParams({
    where,
    select: 'id,dateparution,familleavis,registre,modificationsgenerales,jugement,url_complete',
    order_by: 'dateparution desc',
    limit: '100',
  });
  const data = await cached(`bodacc:${list.sort().join(',')}:${since}`, 12 * 3600, () =>
    fetchJson<{ results: Raw[] }>('bodacc', 'records', `${env.bodaccApi}/records?${params}`, { timeoutMs: 15000 }, orgId),
  );
  for (const r of data.results || []) {
    // « registre » contient souvent le même SIREN sous deux formes (« 123 456 789 » et « 123456789 »)
    const regs = new Set<string>((Array.isArray(r.registre) ? r.registre : [r.registre]).map((x: string) => String(x).replace(/\s/g, '')));
    for (const siren of regs) {
      if (!out[siren]) continue;
      for (const s of toSignals(r)) if (!out[siren].some((x) => x.id === s.id)) out[siren].push(s);
    }
  }
  return out;
}

export interface ZoneAnnouncement {
  siren: string;
  date: string;
  family: string;
  cp: string | null;
  city: string | null;
  url: string | null;
  activity: string | null;
  signals: Signal[];
}

/** Activité déclarée dans les établissements de l'annonce (texte libre), si présente. */
function activityOf(r: Raw): string | null {
  const l = parse(r.listeetablissements);
  const list = Array.isArray(l?.etablissement) ? l.etablissement : l?.etablissement ? [l.etablissement] : [];
  const txt = list.map((e: Raw) => String(e?.activite || '')).filter(Boolean).join(' ; ');
  return txt || null;
}

/**
 * Annonces récentes (créations, immatriculations, cessions) publiées dans une zone : départements, et code postal si précisé.
 * Sert au Radar : repérer chaque jour les entreprises qui apparaissent ou changent de mains dans une zone.
 */
export async function bodaccInZone(
  departments: string[],
  since: string,
  orgId?: string | null,
  { postalCode = null as string | null, families = ['creation', 'immatriculation', 'vente'], pages = 3 } = {},
): Promise<ZoneAnnouncement[]> {
  const deps = [...new Set(departments.filter((d) => /^(\d{2,3}|2A|2B)$/.test(d)))].slice(0, 13);
  if (!deps.length || !/^\d{4}-\d{2}-\d{2}$/.test(since)) return [];
  const fam = families.filter((f) => /^[a-z_]+$/.test(f));
  const where = [
    `numerodepartement in (${deps.map((d) => `'${d}'`).join(',')})`,
    postalCode && /^\d{5}$/.test(postalCode) ? `cp = '${postalCode}'` : null,
    `familleavis in (${fam.map((f) => `'${f}'`).join(',')})`,
    `dateparution >= date'${since}'`,
  ]
    .filter(Boolean)
    .join(' and ');
  const raw: Raw[] = [];
  for (let page = 0; page < Math.max(1, Math.min(pages, 5)); page++) {
    const params = new URLSearchParams({
      where,
      select: 'id,dateparution,familleavis,registre,modificationsgenerales,cp,ville,url_complete,listeetablissements',
      order_by: 'dateparution desc',
      limit: '100',
      offset: String(page * 100),
    });
    const data = await cached(`bodacc:zone:${where}:${page}`, 6 * 3600, () =>
      fetchJson<{ results: Raw[] }>('bodacc', 'records (zone)', `${env.bodaccApi}/records?${params}`, { timeoutMs: 15000 }, orgId),
    );
    raw.push(...(data.results || []));
    if ((data.results || []).length < 100) break;
  }
  const out: ZoneAnnouncement[] = [];
  for (const r of raw) {
    const regs = (Array.isArray(r.registre) ? r.registre : [r.registre]).map((x: unknown) => String(x ?? '').replace(/\s/g, ''));
    const siren = regs.find((x: string) => /^\d{9}$/.test(x));
    if (!siren) continue;
    const signals = toSignals(r).filter((s) => s.kind === 'opportunity');
    if (!signals.length) continue;
    out.push({ siren, date: String(r.dateparution || '').slice(0, 10), family: String(r.familleavis), cp: r.cp ? String(r.cp) : null, city: r.ville ? String(r.ville) : null, url: r.url_complete || null, activity: activityOf(r), signals });
  }
  return out;
}
