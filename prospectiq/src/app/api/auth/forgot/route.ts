import { z } from 'zod';
import { publicRoute, body, ok, clientIp } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { one, q } from '@/lib/db';
import { newToken, sha256 } from '@/lib/auth';
import { sendMail } from '@/lib/mail';
import { env } from '@/lib/env';

const Schema = z.object({ email: z.string().trim().toLowerCase().email('Adresse e-mail invalide.') });

export const POST = publicRoute(async (req) => {
  await rateLimit(`forgot:${clientIp(req)}`, 6, 3600);
  const { email } = await body(req, Schema);
  const user = await one<{ id: string; name: string }>('select id, name from users where email = $1 and disabled_at is null', [email]);
  if (user) {
    const token = newToken();
    await q(`insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, now() + interval '1 hour')`, [sha256(token), user.id]);
    const link = `${env.appUrl}/reinitialiser?token=${token}`;
    await sendMail(email, 'Réinitialisation de votre mot de passe Pro Spectre', `Bonjour ${user.name},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${link}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.\n\nL’équipe Pro Spectre`);
  }
  // Réponse identique que le compte existe ou non (pas de divulgation des comptes)
  return ok({ ok: true });
});
