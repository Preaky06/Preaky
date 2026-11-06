// Quotas, auth et webhook Stripe sur une vraie base PostgreSQL (PGlite en mémoire).
import { describe, it, expect, beforeAll } from 'vitest';
import Stripe from 'stripe';
import { one } from '@/lib/db';
import { consumeProspect, consumeAiMessage, usageOf } from '@/lib/quota';
import { PLANS } from '@/lib/plans';
import { hashPassword, verifyPassword, passwordProblem } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { syncSubscription } from '@/lib/billing';

let orgId: string;

beforeAll(async () => {
  orgId = (await one<{ id: string }>(`insert into orgs (name) values ('Org test') returning id`))!.id;
});

describe('quotas serveur', () => {
  it('un prospect n’est décompté qu’une fois par mois', async () => {
    const plan = { ...PLANS.decouverte, prospects: 2 };
    expect((await consumeProspect(orgId, plan, '111111111')).charged).toBe(true);
    expect((await consumeProspect(orgId, plan, '111111111')).charged).toBe(false);
    expect((await consumeProspect(orgId, plan, '222222222')).charged).toBe(true);
    expect((await usageOf(orgId)).prospects).toBe(2);
    await expect(consumeProspect(orgId, plan, '333333333')).rejects.toMatchObject({ status: 402, code: 'quota_prospects' });
    // Une entreprise déjà décomptée reste consultable même quota atteint
    expect((await consumeProspect(orgId, plan, '111111111')).charged).toBe(false);
  });

  it('messages : refus atomique au-delà du quota', async () => {
    const plan = { ...PLANS.decouverte, aiMessages: 5 };
    await consumeAiMessage(orgId, plan, 3);
    await expect(consumeAiMessage(orgId, plan, 3)).rejects.toMatchObject({ status: 402 });
    await consumeAiMessage(orgId, plan, 2);
    expect((await usageOf(orgId)).aiMessages).toBe(5);
  });
});

describe('authentification', () => {
  it('hachage scrypt vérifiable, sel unique', async () => {
    const a = await hashPassword('motdepasse123');
    const b = await hashPassword('motdepasse123');
    expect(a).not.toBe(b);
    expect(await verifyPassword('motdepasse123', a)).toBe(true);
    expect(await verifyPassword('mauvais12345', a)).toBe(false);
  });
  it('politique de mot de passe', () => {
    expect(passwordProblem('court1')).toBeTruthy();
    expect(passwordProblem('seulementdeslettres')).toBeTruthy();
    expect(passwordProblem('lettres12345')).toBeNull();
  });
  it('limitation de débit', async () => {
    for (let i = 0; i < 3; i++) await rateLimit('test:ip', 3, 60);
    await expect(rateLimit('test:ip', 3, 60)).rejects.toMatchObject({ status: 429 });
  });
});

describe('abonnements Stripe', () => {
  const sub = (status: string, price: string) =>
    ({ id: 'sub_test', customer: 'cus_test', status, metadata: { orgId }, items: { data: [{ price: { id: price }, current_period_end: 1893456000 }] } }) as unknown as Stripe.Subscription;

  it('active, change et résilie l’offre selon Stripe (source de vérité)', async () => {
    expect(await syncSubscription(sub('active', 'price_pro'), orgId)).toMatchObject({ updated: true, plan: 'pro' });
    let org = await one<{ plan: string; stripe_customer_id: string; current_period_end: Date }>('select plan, stripe_customer_id, current_period_end from orgs where id = $1', [orgId]);
    expect(org).toMatchObject({ plan: 'pro', stripe_customer_id: 'cus_test' });
    expect(new Date(org!.current_period_end).getUTCFullYear()).toBe(2030);

    await syncSubscription(sub('active', 'price_business'));
    expect((await one<{ plan: string }>('select plan from orgs where id = $1', [orgId]))!.plan).toBe('business');

    await syncSubscription(sub('past_due', 'price_business'));
    expect((await one<{ plan: string }>('select plan from orgs where id = $1', [orgId]))!.plan).toBe('business');

    await syncSubscription(sub('canceled', 'price_business'));
    org = await one('select plan from orgs where id = $1', [orgId]);
    expect(org!.plan).toBe('decouverte');
  });

  it('prix inconnu : aucun accès payant accordé', async () => {
    await syncSubscription(sub('active', 'price_inconnu'));
    expect((await one<{ plan: string }>('select plan from orgs where id = $1', [orgId]))!.plan).toBe('decouverte');
  });

  it('webhook : signature vérifiée avant tout traitement', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const { NextRequest } = await import('next/server');
    const payload = JSON.stringify({ id: 'evt_1', object: 'event', type: 'customer.subscription.updated', data: { object: sub('active', 'price_starter') } });
    const bad = await POST(new NextRequest('http://localhost/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': 't=1,v1=faux' } }));
    expect(bad.status).toBe(400);
    const header = new Stripe('sk_test_unit').webhooks.generateTestHeaderString({ payload, secret: 'whsec_unit' });
    const good = await POST(new NextRequest('http://localhost/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': header } }));
    expect(good.status).toBe(200);
    expect((await one<{ plan: string }>('select plan from orgs where id = $1', [orgId]))!.plan).toBe('starter');
  });
});
