// Envoi d'e-mails transactionnels (SMTP). Sans SMTP configuré : enregistrement dans la table outbox (développement).
import 'server-only';
import { env, features } from './env';
import { q } from './db';

export async function sendMail(to: string, subject: string, text: string): Promise<{ delivered: boolean }> {
  if (features.mail()) {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport(env.smtpUrl);
    await transport.sendMail({ from: env.mailFrom, to, subject, text });
    return { delivered: true };
  }
  await q('insert into outbox (to_email, subject, body) values ($1, $2, $3)', [to, subject, text]);
  if (!env.isProd) console.info(`[mail non envoyé — SMTP non configuré] À: ${to}\nObjet: ${subject}\n${text}`);
  return { delivered: false };
}
