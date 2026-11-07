// Chiffres en direct affichés sur le site public : annonces BODACC des 7 derniers jours, état des sources.
// Requêtes publiques sans clé, mises en cache par Next.js ; en cas d'échec, rien n'est affiché (jamais de chiffre inventé).
import 'server-only';
import { env } from './env';

export interface BodaccPulse {
  since: string; // AAAA-MM-JJ
  lastPublication: string | null;
  creations: number;
  sales: number;
  changes: number;
  insolvencies: number;
  total: number;
  sourceUrl: string;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function bodaccPulse(now = new Date()): Promise<BodaccPulse | null> {
  const since = day(new Date(now.getTime() - 7 * 86400000));
  const url = new URL(`${env.bodaccApi}/records`);
  url.searchParams.set('select', 'familleavis,count(*) as n,max(dateparution) as last');
  url.searchParams.set('where', `dateparution >= date'${since}'`);
  url.searchParams.set('group_by', 'familleavis');
  url.searchParams.set('limit', '20');
  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { familleavis?: unknown; n?: unknown; last?: unknown }[] };
    const rows = (data.results || []).filter((r) => typeof r.familleavis === 'string' && typeof r.n === 'number') as { familleavis: string; n: number; last?: string }[];
    if (!rows.length) return null;
    const n = (...f: string[]) => rows.filter((r) => f.includes(r.familleavis)).reduce((a, r) => a + r.n, 0);
    const last = rows.map((r) => r.last || '').sort().pop() || null;
    const pulse = {
      since,
      lastPublication: last ? last.slice(0, 10) : null,
      creations: n('creation', 'immatriculation'),
      sales: n('vente'),
      changes: n('modification'),
      insolvencies: n('collective'),
      total: rows.reduce((a, r) => a + r.n, 0),
      sourceUrl: 'https://www.bodacc.fr/',
    };
    return pulse.creations + pulse.sales + pulse.changes > 0 ? pulse : null;
  } catch {
    return null;
  }
}

export interface SourceStatus {
  id: string;
  name: string;
  producer: string;
  ok: boolean;
  latencyMs: number | null;
}

async function ping(url: string) {
  const t = Date.now();
  try {
    const res = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, latencyMs: Date.now() - t };
  } catch {
    return { ok: false, latencyMs: null };
  }
}

/** État des sources publiques, vérifié réellement (mis en cache 5 minutes). */
export async function sourcesStatus(): Promise<{ checkedAt: string; sources: SourceStatus[] }> {
  const [sirene, bodacc, geo] = await Promise.all([
    ping(`${env.sireneApi}/search?q=insee&per_page=1`),
    ping(`${env.bodaccApi}/records?limit=1`),
    ping(`${env.geoApi}/communes?codePostal=75001&fields=nom`),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    sources: [
      { id: 'sirene', name: 'API Recherche d’entreprises (SIRENE, RNE)', producer: 'DINUM / Insee / INPI', ...sirene },
      { id: 'bodacc', name: 'BODACC — annonces commerciales', producer: 'DILA', ...bodacc },
      { id: 'geo', name: 'API Découpage administratif', producer: 'Etalab', ...geo },
    ],
  };
}
