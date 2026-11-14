// security.txt (RFC 9116) : contact pour signaler une faille. Publié seulement si LEGAL_EMAIL est renseigné.
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export function GET() {
  if (!env.legal.email) return new Response('Not found', { status: 404 });
  const expires = new Date(Date.now() + 365 * 86400000).toISOString();
  const body = [`Contact: mailto:${env.legal.email}`, `Expires: ${expires}`, 'Preferred-Languages: fr, en', `Canonical: ${env.appUrl.replace(/\/$/, '')}/.well-known/security.txt`, `Policy: ${env.appUrl.replace(/\/$/, '')}/confiance#securite`, ''].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
