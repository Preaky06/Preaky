// Paramètres de l'organisation : offre vendue (personnalise score et messages) et pondérations du score.
import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { q, json } from '@/lib/db';
import { orgSettings } from '@/lib/analysis';
import { DEFAULT_WEIGHTS } from '@/lib/scoring';
import { SERVICES, SECTORS, SIZES } from '@/lib/sectors';

export const GET = authed(async (_req, { user }) => {
  const s = await orgSettings(user.orgId);
  return ok({ orgName: user.orgName, offer: s.offer, weights: { ...DEFAULT_WEIGHTS, ...s.weights } });
});

const W = z.number().min(0).max(100);
const Schema = z.object({
  orgName: z.string().trim().min(1).max(120).optional(),
  offer: z
    .object({
      services: z.array(z.enum(SERVICES.map((s) => s.id) as [string, ...string[]])).max(9),
      sectors: z.array(z.enum(SECTORS.map((s) => s.id) as [string, ...string[]])).max(20),
      sizes: z.array(z.enum(SIZES.map((s) => s.id) as [string, ...string[]])).max(5),
      description: z.string().trim().max(600).optional(),
      senderName: z.string().trim().max(80).optional(),
      senderCompany: z.string().trim().max(120).optional(),
    })
    .optional(),
  weights: z.object({ need: W, relevance: W, digital: W, signals: W, data: W }).optional(),
});

export const PUT = authed(async (req, { user }) => {
  if (user.role !== 'owner') throw new HttpError(403, 'Seul le propriétaire du compte peut modifier ces paramètres.', 'forbidden');
  const data = await body(req, Schema);
  if (data.weights && Object.values(data.weights).reduce((s, v) => s + v, 0) === 0) throw new HttpError(400, 'Au moins un critère doit avoir un poids.', 'validation');
  if (data.orgName) await q('update orgs set name = $2 where id = $1', [user.orgId, data.orgName]);
  if (data.offer) await q('update orgs set offer = $2::jsonb where id = $1', [user.orgId, json(data.offer)]);
  if (data.weights) await q('update orgs set weights = $2::jsonb where id = $1', [user.orgId, json(data.weights)]);
  return ok({ ok: true });
});
