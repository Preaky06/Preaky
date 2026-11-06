import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { q, one } from '@/lib/db';

export const GET = authed(
  async () => {
    const reports = await q('select id, kind, siren, email, message, status, created_at, handled_at from reports order by (status = \'ouvert\') desc, created_at desc limit 200');
    const suppressions = await q('select siren, email, reason, created_at from suppressions order by created_at desc limit 200');
    return ok({ reports, suppressions });
  },
  { admin: true },
);

/** Traiter un signalement. suppress=true ajoute le SIREN / l'e-mail à la liste d'exclusion et efface les données associées. */
export const PATCH = authed(
  async (req) => {
    const data = await body(req, z.object({ id: z.string().uuid(), status: z.enum(['ouvert', 'traite', 'rejete']), suppress: z.boolean().optional() }));
    const report = await one<{ siren: string | null; email: string | null }>('select siren, email from reports where id = $1', [data.id]);
    if (!report) throw new HttpError(404, 'Signalement introuvable.', 'not_found');
    if (data.suppress) {
      if (!report.siren && !report.email) throw new HttpError(400, 'Ce signalement ne précise ni SIREN ni e-mail.', 'validation');
      if (report.siren) {
        await q('insert into suppressions (siren, reason) values ($1, $2) on conflict (siren) do nothing', [report.siren, 'Demande d’opposition']);
        await q('delete from companies where siren = $1', [report.siren]);
        await q(`delete from cache where key like 'sirene:company:' || $1`, [report.siren]);
      }
      if (report.email) await q('insert into suppressions (email, reason) values ($1, $2) on conflict (email) do nothing', [report.email, 'Demande d’opposition']);
    }
    await q('update reports set status = $2, handled_at = case when $2 = \'ouvert\' then null else now() end where id = $1', [data.id, data.status]);
    return ok({ ok: true });
  },
  { admin: true },
);
