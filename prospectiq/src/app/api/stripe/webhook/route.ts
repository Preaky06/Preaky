// Webhook Stripe : la signature est vérifiée avant tout traitement (STRIPE_WEBHOOK_SECRET).
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { stripe, handleStripeEvent } from '@/lib/billing';
import { logApi } from '@/lib/apilog';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature || !env.stripeWebhookSecret) return NextResponse.json({ error: 'Webhook non configuré.' }, { status: 400 });
  const raw = await req.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, signature, env.stripeWebhookSecret);
  } catch {
    await logApi('stripe', 'webhook', { ok: false, status: 400, error: 'Signature invalide' });
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 400 });
  }
  try {
    const result = await handleStripeEvent(event);
    await logApi('stripe', `webhook:${event.type}`, { ok: true, status: 200 });
    return NextResponse.json({ received: true, result });
  } catch (e) {
    await logApi('stripe', `webhook:${event.type}`, { ok: false, status: 500, error: (e as Error).message });
    return NextResponse.json({ error: 'Traitement impossible.' }, { status: 500 });
  }
}
