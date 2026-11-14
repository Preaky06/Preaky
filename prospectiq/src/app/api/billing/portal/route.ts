import { authed, ok, HttpError } from '@/lib/http';
import { one } from '@/lib/db';
import { env } from '@/lib/env';
import { stripe } from '@/lib/billing';

export const POST = authed(async (_req, { user }) => {
  if (user.role !== 'owner') throw new HttpError(403, 'Seul le propriétaire du compte gère l’abonnement.', 'forbidden');
  const org = await one<{ stripe_customer_id: string | null }>('select stripe_customer_id from orgs where id = $1', [user.orgId]);
  if (!org?.stripe_customer_id) throw new HttpError(400, 'Aucun abonnement à gérer pour le moment.', 'no_customer');
  const session = await stripe().billingPortal.sessions.create({ customer: org.stripe_customer_id, return_url: `${env.appUrl}/app/abonnement`, locale: 'fr' });
  return ok({ url: session.url });
});
