import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { one } from '@/lib/db';
import { env } from '@/lib/env';
import { stripe } from '@/lib/billing';

export const POST = authed(async (req, { user }) => {
  if (user.role !== 'owner') throw new HttpError(403, 'Seul le propriétaire du compte gère l’abonnement.', 'forbidden');
  const { plan } = await body(req, z.object({ plan: z.enum(['starter', 'pro', 'business']) }));
  const s = stripe();
  const org = await one<{ stripe_customer_id: string | null; stripe_subscription_id: string | null; subscription_status: string | null }>('select stripe_customer_id, stripe_subscription_id, subscription_status from orgs where id = $1', [user.orgId]);
  if (org?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(org.subscription_status || '')) {
    throw new HttpError(409, 'Vous avez déjà un abonnement : changez d’offre depuis « Gérer mon abonnement ».', 'has_subscription');
  }
  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: env.stripePrices[plan], quantity: 1 }],
    client_reference_id: user.orgId,
    ...(org?.stripe_customer_id ? { customer: org.stripe_customer_id } : { customer_email: user.email }),
    subscription_data: { metadata: { orgId: user.orgId, plan } },
    metadata: { orgId: user.orgId, plan },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    locale: 'fr',
    success_url: `${env.appUrl}/app/abonnement?succes=1`,
    cancel_url: `${env.appUrl}/app/abonnement?annule=1`,
  });
  return ok({ url: session.url });
});
