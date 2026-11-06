// Mini-CRM : statuts, notes, historique, relances, dédoublonnage par SIREN.
import 'server-only';
import { q, one } from './db';
import { HttpError } from './http';
import { getCompany } from './connectors/sirene';
import { storeCompany, isSuppressed } from './analysis';

export { STATUSES, STATUS_IDS, statusLabel, type StatusId } from './status';
import type { StatusId } from './status';

/** Ajoute une entreprise au portefeuille (sans doublon) et retourne la fiche CRM. */
export async function ensureProspect(orgId: string, userId: string, siren: string, init: { status?: StatusId; favorite?: boolean } = {}) {
  const existing = await one<{ id: string }>('select id from prospects where org_id = $1 and siren = $2', [orgId, siren]);
  if (existing) return { id: existing.id, created: false };
  if (!(await one('select 1 from companies where siren = $1', [siren]))) {
    const company = await getCompany(siren, orgId);
    if (!company) throw new HttpError(404, 'Entreprise introuvable.', 'not_found');
    if (company.optOut || (await isSuppressed(siren))) throw new HttpError(403, 'Cette entreprise s’est opposée à la prospection : elle ne peut pas être ajoutée.', 'opt_out');
    await storeCompany(company);
  } else if (await isSuppressed(siren)) {
    throw new HttpError(403, 'Cette entreprise s’est opposée à la prospection : elle ne peut pas être ajoutée.', 'opt_out');
  }
  const row = await one<{ id: string }>(
    `insert into prospects (org_id, siren, status, favorite, owner_id) values ($1, $2, $3, $4, $5)
     on conflict (org_id, siren) do update set updated_at = prospects.updated_at returning id`,
    [orgId, siren, init.status || 'nouveau', !!init.favorite, userId],
  );
  await q('insert into interactions (org_id, prospect_id, user_id, kind, content) values ($1, $2, $3, $4, $5)', [orgId, row!.id, userId, 'creation', 'Ajouté au portefeuille']);
  return { id: row!.id, created: true };
}

export async function getProspectOwned(orgId: string, id: string) {
  const p = await one<{ id: string; siren: string; status: string }>('select id, siren, status from prospects where org_id = $1 and id = $2', [orgId, id]);
  if (!p) throw new HttpError(404, 'Prospect introuvable.', 'not_found');
  return p;
}
