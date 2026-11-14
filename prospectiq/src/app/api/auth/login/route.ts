import { z } from 'zod';
import { publicRoute, body, ok, HttpError, clientIp } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { one } from '@/lib/db';
import { createSession, verifyPassword } from '@/lib/auth';

const Schema = z.object({ email: z.string().trim().toLowerCase().email('Adresse e-mail invalide.'), password: z.string().min(1, 'Indiquez votre mot de passe.') });

export const POST = publicRoute(async (req) => {
  const data = await body(req, Schema);
  await rateLimit(`login:${clientIp(req)}`, 20, 900);
  await rateLimit(`login:${data.email}`, 8, 900);
  const user = await one<{ id: string; password_hash: string; disabled_at: Date | null }>('select id, password_hash, disabled_at from users where email = $1', [data.email]);
  // Même message et même coût de calcul que le compte existe ou non
  const valid = await verifyPassword(data.password, user?.password_hash || 'scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
  if (!user || !valid) throw new HttpError(401, 'E-mail ou mot de passe incorrect.', 'bad_credentials');
  if (user.disabled_at) throw new HttpError(403, 'Ce compte a été désactivé. Contactez le support.', 'disabled');
  await createSession(user.id);
  return ok({ ok: true });
});
