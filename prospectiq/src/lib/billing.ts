// Abonnements Stripe : Checkout (souscription), portail client (factures, changement d'offre, résiliation), webhook.
import 'server-only';
import Stripe from 'stripe';
import { env, features } from './env';
import { q, one } from './db';
import { HttpError } from './http';
import type { PlanId } from './plans';

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!features.stripe()) throw new HttpError(503, 'Le paiement en ligne n’est pas encore configuré sur cette instance.', 'billing_disabled');
  client ??= new Stripe(env.stripeSecretKey);
  return client;
}

export function planForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const entry = Object.entries(env.stripePrices).find(([, id]) => id === priceId);
  return (entry?.[0] as PlanId) || null;
}

const ACTIVE = new Set(['active', 'trialing', 'past_due']);

/** Met à jour l'organisation à partir d'un abonnement Stripe (source de vérité). */
export async function syncSubscription(sub: Stripe.Subscription, orgIdHint?: string | null) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const plan = planForPrice(item?.price?.id);
  const periodEndUnix = (item as unknown as { current_period_end?: number })?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
  const org =
    (orgIdHint && (await one<{ id: string }>('select id from orgs where id::text = $1', [orgIdHint]))) ||
    (await one<{ id: string }>('select id from orgs where stripe_customer_id = $1', [customerId])) ||
    (sub.metadata?.orgId ? await one<{ id: string }>('select id from orgs where id::text = $1', [sub.metadata.orgId]) : null);
  if (!org) return { updated: false, reason: 'organisation inconnue' };
  const effective: PlanId = ACTIVE.has(sub.status) && plan ? plan : 'decouverte';
  await q(
    `update orgs set plan = $2, plan_source = 'stripe', stripe_customer_id = $3, stripe_subscription_id = $4, subscription_status = $5,
       current_period_end = $6 where id = $1`,
    [org.id, effective, customerId, sub.id, sub.status, periodEndUnix ? new Date(periodEndUnix * 1000) : null],
  );
  return { updated: true, orgId: org.id, plan: effective, status: sub.status };
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription' || !session.subscription) return { ignored: true };
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
      const sub = await stripe().subscriptions.retrieve(subId);
      return syncSubscription(sub, session.client_reference_id);
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return syncSubscription(event.data.object as Stripe.Subscription);
    default:
      return { ignored: true };
  }
}
