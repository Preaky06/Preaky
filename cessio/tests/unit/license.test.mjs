import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processLicense, handleLicenseRequest, billingStatus, maskEmail, normalizeInput } from '../../server/license.mjs';
import baseConfig from '../../site.config.mjs';

const clone = (o) => JSON.parse(JSON.stringify(o));

function configFor(provider) {
  const c = clone(baseConfig);
  c.billing.provider = provider;
  c.billing.polar.organizationId = 'org_123';
  c.billing.lemonsqueezy.storeId = '777';
  c.plans.solo.match = { polarBenefitIds: ['ben_pro'], lemonVariantIds: ['11', '12'], lemonProductIds: [], gumroadProductIds: ['gpro'] };
  c.plans.studio.match = { polarBenefitIds: ['ben_biz'], lemonVariantIds: [], lemonProductIds: ['900'], gumroadProductIds: ['gbiz'] };
  c.plans.solo.checkout.monthly = 'https://example.test/pro';
  c.plans.studio.checkout.monthly = 'https://example.test/biz';
  return c;
}

/** Faux fetch : routes = (url, body) => { status, json } */
function mockFetch(route) {
  const calls = [];
  const fx = async (url, init) => {
    const body = init.headers['Content-Type'] === 'application/x-www-form-urlencoded'
      ? Object.fromEntries(new URLSearchParams(init.body))
      : JSON.parse(init.body);
    calls.push({ url, body, headers: init.headers });
    const r = route(url, body, calls.length);
    if (r instanceof Error) throw r;
    return new Response(r.json === undefined ? null : JSON.stringify(r.json), { status: r.status });
  };
  fx.calls = calls;
  return fx;
}

const KEY = 'ABCD-1234-EFGH-5678';

// ── Polar ──
const polarKey = (over = {}) => ({
  id: 'lk_1', status: 'granted', benefit_id: 'ben_pro', limit_activations: 3, usage: 0,
  expires_at: null, customer: { email: 'jean.dupont@gmail.com' }, ...over,
});

test('polar: activation réussie → plan Solo + activationId', async () => {
  const fx = mockFetch((url) => {
    if (url.endsWith('/validate')) return { status: 200, json: polarKey() };
    if (url.endsWith('/activate')) return { status: 200, json: { id: 'act_9', license_key: polarKey() } };
  });
  const r = await processLicense({ action: 'activate', key: KEY, label: 'Chrome' }, configFor('polar'), fx);
  assert.equal(r.httpStatus, 200);
  assert.equal(r.body.plan, 'solo');
  assert.equal(r.body.activationId, 'act_9');
  assert.equal(r.body.email, 'je•••@gmail.com');
  assert.equal(fx.calls[0].url, 'https://api.polar.sh/v1/customer-portal/license-keys/validate');
  assert.deepEqual(fx.calls[0].body, { key: KEY, organization_id: 'org_123' });
  assert.equal(fx.calls[1].body.label, 'Chrome');
  assert.equal(fx.calls[0].headers.Authorization, undefined, 'aucune authentification envoyée');
});

test('polar: limite d’activations atteinte → device_limit', async () => {
  const fx = mockFetch((url) => (url.endsWith('/validate') ? { status: 200, json: polarKey() } : { status: 403, json: { error: 'NotPermitted' } }));
  const r = await processLicense({ action: 'activate', key: KEY }, configFor('polar'), fx);
  assert.equal(r.body.code, 'device_limit');
});

test('polar: bénéfice sans limite → activé sans activationId', async () => {
  const fx = mockFetch(() => ({ status: 200, json: polarKey({ limit_activations: null, benefit_id: 'ben_biz' }) }));
  const r = await processLicense({ action: 'activate', key: KEY }, configFor('polar'), fx);
  assert.equal(r.body.plan, 'studio');
  assert.equal(r.body.activationId, null);
  assert.equal(fx.calls.length, 1);
});

test('polar: clé inconnue / révoquée → invalid_key', async () => {
  const fx = mockFetch(() => ({ status: 404, json: { error: 'ResourceNotFound' } }));
  const r = await processLicense({ action: 'validate', key: KEY, activationId: 'act_9' }, configFor('polar'), fx);
  assert.equal(r.body.code, 'invalid_key');
  assert.equal(fx.calls[0].body.activation_id, 'act_9');
});

test('polar: bénéfice d’un autre produit → wrong_product', async () => {
  const fx = mockFetch(() => ({ status: 200, json: polarKey({ benefit_id: 'ben_autre' }) }));
  const r = await processLicense({ action: 'validate', key: KEY }, configFor('polar'), fx);
  assert.equal(r.body.code, 'wrong_product');
});

test('polar: sandbox utilise sandbox-api', async () => {
  const c = configFor('polar');
  c.billing.polar.server = 'sandbox';
  const fx = mockFetch(() => ({ status: 200, json: polarKey() }));
  await processLicense({ action: 'validate', key: KEY }, c, fx);
  assert.match(fx.calls[0].url, /^https:\/\/sandbox-api\.polar\.sh\//);
});

test('polar: panne réseau → provider_error (transitoire)', async () => {
  const fx = mockFetch(() => new Error('ECONNRESET'));
  const r = await processLicense({ action: 'validate', key: KEY }, configFor('polar'), fx);
  assert.equal(r.body.code, 'provider_error');
  assert.equal(r.httpStatus, 502);
});

test('polar: désactivation', async () => {
  const fx = mockFetch(() => ({ status: 204 }));
  const r = await processLicense({ action: 'deactivate', key: KEY, activationId: 'act_9' }, configFor('polar'), fx);
  assert.equal(r.body.ok, true);
  assert.match(fx.calls[0].url, /deactivate$/);
});

// ── Lemon Squeezy ──
const lsResp = (over = {}, meta = {}) => ({
  valid: true, error: null,
  license_key: { id: 5, status: 'active', key: KEY, activation_limit: 3, activation_usage: 1, expires_at: null, ...over },
  instance: null,
  meta: { store_id: 777, product_id: 100, variant_id: 11, customer_email: 'marie@exemple.fr', ...meta },
});

test('lemonsqueezy: activation réussie', async () => {
  const fx = mockFetch((url) => {
    if (url.endsWith('/validate')) return { status: 200, json: lsResp() };
    return { status: 200, json: { activated: true, ...lsResp({ activation_usage: 2 }), instance: { id: 'inst_1' } } };
  });
  const r = await processLicense({ action: 'activate', key: KEY, label: 'Firefox' }, configFor('lemonsqueezy'), fx);
  assert.equal(r.body.plan, 'solo');
  assert.equal(r.body.activationId, 'inst_1');
  assert.deepEqual(r.body.activations, { used: 2, limit: 3 });
  assert.deepEqual(fx.calls[1].body, { license_key: KEY, instance_name: 'Firefox' });
  assert.equal(fx.calls[0].headers.Authorization, undefined);
});

test('lemonsqueezy: clé d’une autre boutique refusée', async () => {
  const fx = mockFetch(() => ({ status: 200, json: lsResp({}, { store_id: 1 }) }));
  const r = await processLicense({ action: 'validate', key: KEY }, configFor('lemonsqueezy'), fx);
  assert.equal(r.body.code, 'wrong_product');
});

test('lemonsqueezy: mapping par produit → Studio', async () => {
  const fx = mockFetch(() => ({ status: 200, json: lsResp({}, { product_id: 900, variant_id: 55 }) }));
  const r = await processLicense({ action: 'validate', key: KEY }, configFor('lemonsqueezy'), fx);
  assert.equal(r.body.plan, 'studio');
});

test('lemonsqueezy: licence expirée → inactive', async () => {
  const fx = mockFetch(() => ({ status: 200, json: { ...lsResp({ status: 'expired' }), valid: false } }));
  const r = await processLicense({ action: 'validate', key: KEY }, configFor('lemonsqueezy'), fx);
  assert.equal(r.body.code, 'inactive');
});

test('lemonsqueezy: limite atteinte → device_limit', async () => {
  const fx = mockFetch((url) => (url.endsWith('/validate')
    ? { status: 200, json: lsResp() }
    : { status: 400, json: { activated: false, error: 'This license key has reached the activation limit.' } }));
  const r = await processLicense({ action: 'activate', key: KEY }, configFor('lemonsqueezy'), fx);
  assert.equal(r.body.code, 'device_limit');
});

test('lemonsqueezy: clé introuvable', async () => {
  const fx = mockFetch(() => ({ status: 404, json: { valid: false, error: 'license_key not found.' } }));
  const r = await processLicense({ action: 'validate', key: KEY }, configFor('lemonsqueezy'), fx);
  assert.equal(r.body.code, 'invalid_key');
});

// ── Gumroad ──
const gumOk = (purchase = {}, uses = 1) => ({ success: true, uses, purchase: { email: 'paul@exemple.fr', refunded: false, chargebacked: false, disputed: false, subscription_ended_at: null, subscription_failed_at: null, ...purchase } });

test('gumroad: essaie chaque produit, trouve Studio', async () => {
  const fx = mockFetch((url, body) => (body.product_id === 'gbiz' ? { status: 200, json: gumOk() } : { status: 404, json: { success: false, message: 'That license does not exist for the provided product.' } }));
  const r = await processLicense({ action: 'activate', key: KEY }, configFor('gumroad'), fx);
  assert.equal(r.body.plan, 'studio');
  assert.equal(fx.calls.length, 2);
  assert.equal(fx.calls[1].body.increment_uses_count, 'true');
});

test('gumroad: validation ne compte pas d’utilisation', async () => {
  const fx = mockFetch(() => ({ status: 200, json: gumOk() }));
  await processLicense({ action: 'validate', key: KEY }, configFor('gumroad'), fx);
  assert.equal(fx.calls[0].body.increment_uses_count, 'false');
});

test('gumroad: abonnement terminé / remboursé → inactive', async () => {
  for (const purchase of [{ subscription_ended_at: '2026-01-01T00:00:00Z' }, { refunded: true }, { chargebacked: true }]) {
    const fx = mockFetch(() => ({ status: 200, json: gumOk(purchase) }));
    const r = await processLicense({ action: 'validate', key: KEY }, configFor('gumroad'), fx);
    assert.equal(r.body.code, 'inactive', JSON.stringify(purchase));
  }
});

test('gumroad: trop d’appareils → device_limit', async () => {
  const fx = mockFetch(() => ({ status: 200, json: gumOk({}, 4) }));
  const r = await processLicense({ action: 'activate', key: KEY }, configFor('gumroad'), fx);
  assert.equal(r.body.code, 'device_limit');
});

test('gumroad: clé inconnue → invalid_key', async () => {
  const fx = mockFetch(() => ({ status: 404, json: { success: false, message: 'That license does not exist for the provided product.' } }));
  const r = await processLicense({ action: 'validate', key: KEY }, configFor('gumroad'), fx);
  assert.equal(r.body.code, 'invalid_key');
});

// ── Généraux ──
test('non configuré → not_configured (503)', async () => {
  const r = await processLicense({ action: 'validate', key: KEY }, clone(baseConfig), mockFetch(() => ({ status: 500 })));
  assert.equal(r.body.code, 'not_configured');
  assert.equal(r.httpStatus, 503);
});

test('entrée invalide rejetée', () => {
  assert.equal(normalizeInput({ action: 'hack', key: KEY }), null);
  assert.equal(normalizeInput({ action: 'validate', key: 'x' }), null);
  assert.equal(normalizeInput({ action: 'validate', key: ' AB CD\n-12 34 ' }).key, 'ABCD-1234');
});

test('handleLicenseRequest: JSON invalide → 400, GET → statut', async () => {
  const bad = await handleLicenseRequest(new Request('http://x/api/license', { method: 'POST', body: '{nope' }), configFor('polar'));
  assert.equal(bad.status, 400);
  const get = await handleLicenseRequest(new Request('http://x/api/license'), configFor('polar'));
  const json = await get.json();
  assert.equal(json.configured, true);
  assert.equal(get.headers.get('cache-control'), 'no-store');
});

test('billingStatus liste ce qui manque', () => {
  const s = billingStatus(clone(baseConfig));
  assert.equal(s.configured, false);
  assert.ok(s.missing.includes('billing.polar.organizationId'));
  assert.equal(billingStatus(configFor('polar')).configured, true);
});

test('maskEmail', () => {
  assert.equal(maskEmail('a@b.fr'), 'a•••@b.fr');
  assert.equal(maskEmail(null), null);
});
