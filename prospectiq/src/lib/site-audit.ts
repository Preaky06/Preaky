// Audit express d'un site public (outil gratuit et rapport partageable).
// Respecte robots.txt, bloque les adresses internes (SSRF), ne conserve ni téléphone ni e-mail.
import 'server-only';
import { randomBytes } from 'node:crypto';
import { q, one, json } from './db';
import { env } from './env';
import { safeGet, robotsAllows, networkHealthy, BlockedError } from './connectors/web';
import { auditPage } from './connectors/website';
import type { WebsiteAudit } from './connectors/types';

export type PublicAudit = Omit<WebsiteAudit, 'phones' | 'emails' | 'candidatesTried'>;

export function normalizeTarget(input: string): URL | null {
  const raw = input.trim();
  if (!raw || raw.length > 300 || /\s/.test(raw)) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return null;
  return u;
}

function strip(a: Omit<WebsiteAudit, 'status' | 'verification' | 'checkedAt'>): Omit<PublicAudit, 'status' | 'verification' | 'checkedAt'> {
  // Minimisation : le rapport public ne contient ni téléphone ni adresse e-mail.
  const { phones: _p, emails: _e, candidatesTried: _c, ...rest } = a as WebsiteAudit;
  void _p;
  void _e;
  void _c;
  return rest;
}

export async function auditSite(input: string): Promise<{ ok: true; host: string; url: string; audit: PublicAudit } | { ok: false; reason: string }> {
  const u = normalizeTarget(input);
  if (!u) return { ok: false, reason: 'Adresse invalide. Exemple : www.exemple.fr' };
  if (!env.webFetchOverride && !(await networkHealthy())) return { ok: false, reason: 'Analyse impossible pour le moment : le serveur n’accède pas à Internet. Réessayez plus tard.' };
  const host = u.hostname.toLowerCase();
  let page = null;
  try {
    page = await safeGet(`https://${host}/`, { timeoutMs: 10000 });
    if (!page || page.status >= 400) page = (await safeGet(`http://${host}/`, { timeoutMs: 10000 })) || page;
  } catch (e) {
    if (e instanceof BlockedError) return { ok: false, reason: 'Adresse non autorisée.' };
    page = null;
  }
  if (!page) return { ok: false, reason: `Le site ${host} est injoignable (adresse inexistante ou serveur qui ne répond pas).` };
  if (page.status >= 400) return { ok: false, reason: `Le site ${host} répond avec une erreur ${page.status}.` };
  if (!/html|xml/i.test(page.contentType || 'text/html')) return { ok: false, reason: 'Cette adresse ne renvoie pas une page web.' };
  const origin = new URL(page.url).origin;
  if (!(await robotsAllows(origin, '/'))) return { ok: false, reason: `Le fichier robots.txt de ${host} refuse l’analyse automatique : nous respectons ce choix.` };
  const audit = await auditPage(page, { sectorId: null });
  const checkedAt = new Date().toISOString();
  return { ok: true, host, url: page.url, audit: { status: 'verified', verification: 'Page d’accueil analysée.', checkedAt, ...strip(audit) } };
}

/** Enregistre un rapport public ; jeton aléatoire non devinable. */
export async function saveReport(r: { host: string; url: string; audit: PublicAudit; orgId?: string | null; siren?: string | null }) {
  const id = randomBytes(9).toString('base64url');
  await q('insert into audit_reports (id, url, host, audit, org_id, siren) values ($1, $2, $3, $4::jsonb, $5, $6)', [id, r.url, r.host, json(r.audit), r.orgId || null, r.siren || null]);
  return id;
}

/** Rapport récent pour le même site (évite de solliciter un site plusieurs fois par jour). */
export async function recentReport(host: string) {
  return one<{ id: string }>(`select id from audit_reports where host = $1 and org_id is null and created_at > now() - interval '24 hours' order by created_at desc limit 1`, [host]);
}

export async function getReport(id: string) {
  if (!/^[A-Za-z0-9_-]{8,20}$/.test(id)) return null;
  const row = await one<{ id: string; url: string; host: string; audit: PublicAudit; created_at: Date; views: number }>('select id, url, host, audit, created_at, views from audit_reports where id = $1', [id]);
  if (row) await q('update audit_reports set views = views + 1 where id = $1', [id]);
  return row;
}
