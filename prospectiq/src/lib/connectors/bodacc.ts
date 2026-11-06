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
    const regs: string[] = (Array.isArray(r.registre) ? r.registre : [r.registre]).map((x: string) => String(x).replace(/\s/g, ''));
    for (const siren of regs) if (out[siren]) out[siren].push(...toSignals(r));
  }
  return out;
}
