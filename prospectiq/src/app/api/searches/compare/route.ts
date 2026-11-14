// Comparaison de deux exécutions de recherche (entreprises apparues / disparues).
import { authed, ok, HttpError } from '@/lib/http';
import { q } from '@/lib/db';
import type { Company } from '@/lib/connectors/types';
import { displayName } from '@/lib/insights';

export const GET = authed(async (req, { user }) => {
  const a = req.nextUrl.searchParams.get('a');
  const b = req.nextUrl.searchParams.get('b');
  if (!a || !b) throw new HttpError(400, 'Choisissez deux recherches à comparer.', 'validation');
  const rows = await q<{ id: string; sirens: string[]; created_at: Date; name: string | null }>('select id, sirens, created_at, name from searches where org_id = $1 and id::text = any($2::text[])', [user.orgId, [a, b]]);
  const A = rows.find((r) => r.id === a);
  const B = rows.find((r) => r.id === b);
  if (!A || !B) throw new HttpError(404, 'Recherche introuvable.', 'not_found');
  const setA = new Set(A.sirens);
  const setB = new Set(B.sirens);
  const onlyA = [...setA].filter((s) => !setB.has(s));
  const onlyB = [...setB].filter((s) => !setA.has(s));
  const common = [...setA].filter((s) => setB.has(s));
  const names = new Map(
    (await q<{ siren: string; data: Company }>('select siren, data from companies where siren = any($1::text[])', [[...onlyA, ...onlyB, ...common]])).map((r) => [r.siren, displayName(r.data)]),
  );
  const label = (s: string) => ({ siren: s, name: names.get(s) || `SIREN ${s}` });
  return ok({ a: { id: A.id, at: A.created_at, name: A.name }, b: { id: B.id, at: B.created_at, name: B.name }, onlyA: onlyA.map(label), onlyB: onlyB.map(label), common: common.map(label) });
});
