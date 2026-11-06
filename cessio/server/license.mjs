// Vérification des licences, sans aucune clé API.
//
// Polar, Lemon Squeezy et Gumroad exposent chacun un point d'accès PUBLIC de
// validation de licence, prévu pour être appelé depuis une application cliente.
// Ce module est isomorphe : il tourne dans la Function Cloudflare (/api/license),
// dans le serveur de dev Node, et dans le navigateur en secours.
//
// Contrat : processLicense({ action, key, activationId, label }) → { httpStatus, body }
//   action ∈ 'activate' | 'validate' | 'deactivate'
//   body succès : { ok: true, plan, planName, activationId, email, expiresAt, activations, provider }
//   body échec  : { ok: false, code, message }

const TIMEOUT_MS = 10000;

const MESSAGES = {
  bad_request: 'Requête invalide.',
  not_configured: "Le paiement n'est pas encore configuré sur ce site.",
  invalid_key: "Clé de licence introuvable. Vérifiez qu'elle a été copiée en entier.",
  inactive: "Cette licence n'est plus active (abonnement terminé, remboursé ou désactivé).",
  wrong_product: 'Cette clé ne correspond à aucun plan de ce site.',
  device_limit:
    "Nombre maximal d'appareils atteint pour cette licence. Désactivez un ancien appareil depuis sa page Compte, ou passez au plan Business.",
  provider_error: 'Le service de paiement ne répond pas. Réessayez dans un instant.',
};

const HTTP = {
  bad_request: 400,
  not_configured: 503,
  invalid_key: 404,
  inactive: 403,
  wrong_product: 403,
  device_limit: 403,
  provider_error: 502,
};

export const ERROR_CODES = Object.keys(MESSAGES);

function fail(code, message) {
  return { httpStatus: HTTP[code] ?? 400, body: { ok: false, code, message: message || MESSAGES[code] } };
}

function success(config, provider, data) {
  const plan = config.plans[data.plan];
  return {
    httpStatus: 200,
    body: {
      ok: true,
      provider,
      plan: data.plan,
      planName: plan?.name ?? data.plan,
      activationId: data.activationId ?? null,
      email: maskEmail(data.email),
      expiresAt: data.expiresAt ?? null,
      activations: data.activations ?? null,
    },
  };
}

export function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return null;
  const [user, domain] = email.split('@');
  const head = user.slice(0, Math.min(2, user.length));
  return `${head}•••@${domain}`;
}

export function paidPlans(config) {
  return Object.entries(config.plans).filter(([id]) => id !== 'free');
}

function findPlan(config, predicate) {
  const found = paidPlans(config).find(([, plan]) => predicate(plan.match || {}, plan));
  return found ? found[0] : null;
}

const asStrings = (list) => (Array.isArray(list) ? list.map((v) => String(v).trim()).filter(Boolean) : []);

/** Indique si le prestataire choisi est entièrement configuré. */
export function billingStatus(config) {
  const provider = config?.billing?.provider;
  const plans = paidPlans(config);
  const missing = [];
  if (provider === 'polar') {
    if (!config.billing.polar?.organizationId) missing.push('billing.polar.organizationId');
    for (const [id, p] of plans) if (!asStrings(p.match?.polarBenefitIds).length) missing.push(`plans.${id}.match.polarBenefitIds`);
  } else if (provider === 'lemonsqueezy') {
    if (!config.billing.lemonsqueezy?.storeId) missing.push('billing.lemonsqueezy.storeId');
    for (const [id, p] of plans) {
      if (!asStrings(p.match?.lemonVariantIds).length && !asStrings(p.match?.lemonProductIds).length) {
        missing.push(`plans.${id}.match.lemonVariantIds`);
      }
    }
  } else if (provider === 'gumroad') {
    for (const [id, p] of plans) if (!asStrings(p.match?.gumroadProductIds).length) missing.push(`plans.${id}.match.gumroadProductIds`);
  } else {
    missing.push('billing.provider');
  }
  for (const [id, p] of plans) {
    if (!p.checkout?.monthly && !p.checkout?.yearly) missing.push(`plans.${id}.checkout`);
  }
  return { provider, configured: missing.length === 0, missing };
}

function timeoutSignal(ms) {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(ms) : undefined;
}

async function send(fx, url, { json, form, headers = {} }) {
  const init = { method: 'POST', headers: { Accept: 'application/json', ...headers } };
  const signal = timeoutSignal(TIMEOUT_MS);
  if (signal) init.signal = signal;
  if (form) {
    init.body = new URLSearchParams(form).toString();
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else {
    init.body = JSON.stringify(json);
    if (!init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';
  }
  try {
    const res = await fx(url, init);
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, json: body };
  } catch (error) {
    return { ok: false, status: 0, json: null, networkError: String(error?.message || error) };
  }
}

const isTransient = (r) => r.status === 0 || r.status === 429 || r.status >= 500;

// ── Polar ────────────────────────────────────────────────────────────────────
// POST {base}/v1/customer-portal/license-keys/{validate|activate|deactivate}
// Points d'accès sans authentification (documentés pour les applications clientes).
async function polar(input, config, fx) {
  const settings = config.billing.polar || {};
  const organizationId = String(settings.organizationId || '').trim();
  if (!organizationId) return fail('not_configured');
  const base = settings.server === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
  const endpoint = (name) => `${base}/v1/customer-portal/license-keys/${name}`;
  const { key, activationId, label, action } = input;

  if (action === 'deactivate') {
    if (!activationId) return { httpStatus: 200, body: { ok: true, deactivated: true } };
    const r = await send(fx, endpoint('deactivate'), { json: { key, organization_id: organizationId, activation_id: activationId } });
    if (isTransient(r)) return fail('provider_error');
    return { httpStatus: 200, body: { ok: true, deactivated: true } };
  }

  const payload = { key, organization_id: organizationId };
  if (action === 'validate' && activationId) payload.activation_id = activationId;
  const v = await send(fx, endpoint('validate'), { json: payload });
  if (isTransient(v)) return fail('provider_error');
  if (v.status === 404) return fail('invalid_key');
  if (!v.ok || !v.json) return fail('invalid_key');

  const lk = v.json;
  if (lk.status && lk.status !== 'granted') return fail('inactive');
  if (lk.expires_at && Date.parse(lk.expires_at) < Date.now()) return fail('inactive');
  const plan = findPlan(config, (m) => asStrings(m.polarBenefitIds).includes(String(lk.benefit_id)));
  if (!plan) return fail('wrong_product');

  const common = {
    plan,
    email: lk.customer?.email,
    expiresAt: lk.expires_at,
    activations: lk.limit_activations != null ? { used: null, limit: lk.limit_activations } : null,
  };

  if (action === 'validate') return success(config, 'polar', { ...common, activationId: activationId || null });

  // Activation : uniquement si le bénéfice limite les activations (= nombre d'appareils).
  if (lk.limit_activations == null) return success(config, 'polar', { ...common, activationId: null });
  const a = await send(fx, endpoint('activate'), {
    json: { key, organization_id: organizationId, label: label || 'Appareil', meta: { app: String(config.brand?.name || 'app').slice(0, 40) } },
  });
  if (isTransient(a)) return fail('provider_error');
  if (a.ok && a.json?.id) return success(config, 'polar', { ...common, activationId: a.json.id });
  if (a.status === 403) return fail('device_limit');
  if (a.status === 404) return fail('invalid_key');
  return fail('inactive');
}

// ── Lemon Squeezy ────────────────────────────────────────────────────────────
// POST https://api.lemonsqueezy.com/v1/licenses/{validate|activate|deactivate}
// License API publique (sans clé API), même format que le SDK officiel.
async function lemonsqueezy(input, config, fx) {
  const storeId = String(config.billing.lemonsqueezy?.storeId || '').trim();
  if (!storeId) return fail('not_configured');
  const headers = { Accept: 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json' };
  const call = (name, json) => send(fx, `https://api.lemonsqueezy.com/v1/licenses/${name}`, { json, headers });
  const { key, activationId, label, action } = input;

  if (action === 'deactivate') {
    if (!activationId) return { httpStatus: 200, body: { ok: true, deactivated: true } };
    const r = await call('deactivate', { license_key: key, instance_id: activationId });
    if (isTransient(r)) return fail('provider_error');
    return { httpStatus: 200, body: { ok: true, deactivated: true } };
  }

  const payload = { license_key: key };
  if (action === 'validate' && activationId) payload.instance_id = activationId;
  const v = await call('validate', payload);
  if (isTransient(v)) return fail('provider_error');
  const data = v.json;
  if (!data || !data.license_key || !data.license_key.id) return fail('invalid_key');

  const meta = data.meta || {};
  if (String(meta.store_id) !== storeId) return fail('wrong_product');
  const plan = findPlan(
    config,
    (m) => asStrings(m.lemonVariantIds).includes(String(meta.variant_id)) || asStrings(m.lemonProductIds).includes(String(meta.product_id)),
  );
  if (!plan) return fail('wrong_product');
  const status = data.license_key.status;
  if (status === 'expired' || status === 'disabled') return fail('inactive');
  if (!data.valid) return fail(action === 'validate' && activationId ? 'invalid_key' : 'inactive');

  const common = {
    plan,
    email: meta.customer_email,
    expiresAt: data.license_key.expires_at,
    activations: { used: data.license_key.activation_usage ?? null, limit: data.license_key.activation_limit ?? null },
  };
  if (action === 'validate') return success(config, 'lemonsqueezy', { ...common, activationId: activationId || null });

  const a = await call('activate', { license_key: key, instance_name: label || 'Appareil' });
  if (isTransient(a)) return fail('provider_error');
  if (a.json?.activated && a.json.instance?.id) {
    return success(config, 'lemonsqueezy', {
      ...common,
      activationId: a.json.instance.id,
      activations: { used: a.json.license_key?.activation_usage ?? null, limit: a.json.license_key?.activation_limit ?? null },
    });
  }
  if (/limit/i.test(String(a.json?.error || ''))) return fail('device_limit');
  if (a.status === 404) return fail('invalid_key');
  return fail('inactive');
}

// ── Gumroad ──────────────────────────────────────────────────────────────────
// POST https://api.gumroad.com/v2/licenses/verify (product_id, license_key, increment_uses_count)
// Aucun jeton requis. Un produit Gumroad par plan.
async function gumroad(input, config, fx) {
  const entries = paidPlans(config).flatMap(([planId, plan]) =>
    asStrings(plan.match?.gumroadProductIds).map((productId) => ({ planId, plan, productId })),
  );
  if (!entries.length) return fail('not_configured');
  const { key, action } = input;
  // Gumroad n'offre pas de désactivation publique : rien à faire côté prestataire.
  if (action === 'deactivate') return { httpStatus: 200, body: { ok: true, deactivated: true } };

  let disabled = false;
  for (const { planId, plan, productId } of entries) {
    const r = await send(fx, 'https://api.gumroad.com/v2/licenses/verify', {
      form: { product_id: productId, license_key: key, increment_uses_count: action === 'activate' ? 'true' : 'false' },
    });
    if (isTransient(r)) return fail('provider_error');
    if (!r.json?.success) {
      if (/disabled|désactiv/i.test(String(r.json?.message || ''))) disabled = true;
      continue;
    }
    const p = r.json.purchase || {};
    if (p.refunded || p.chargebacked || p.chargedback || (p.disputed && !p.dispute_won)) return fail('inactive');
    if (p.subscription_ended_at || p.subscription_failed_at) return fail('inactive');
    const uses = Number(r.json.uses) || 0;
    if (action === 'activate' && plan.maxDevices && uses > plan.maxDevices) return fail('device_limit');
    return success(config, 'gumroad', {
      plan: planId,
      activationId: null,
      email: p.email,
      expiresAt: null,
      activations: { used: uses, limit: plan.maxDevices ?? null },
    });
  }
  return fail(disabled ? 'inactive' : 'invalid_key');
}

const PROVIDERS = { polar, lemonsqueezy, gumroad };

export function normalizeInput(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const action = raw.action;
  if (!['activate', 'validate', 'deactivate'].includes(action)) return null;
  const key = typeof raw.key === 'string' ? raw.key.replace(/\s+/g, '') : '';
  if (key.length < 6 || key.length > 256 || !/^[\x21-\x7e]+$/.test(key)) return null;
  const activationId = typeof raw.activationId === 'string' && raw.activationId.length <= 128 ? raw.activationId : null;
  const label = typeof raw.label === 'string' ? raw.label.slice(0, 100) : '';
  return { action, key, activationId, label };
}

export async function processLicense(raw, config, fetchImpl) {
  const fx = fetchImpl || ((...args) => fetch(...args));
  const input = normalizeInput(raw);
  if (!input) return fail('bad_request');
  const handler = PROVIDERS[config?.billing?.provider];
  if (!handler) return fail('not_configured');
  try {
    return await handler(input, config, fx);
  } catch {
    return fail('provider_error');
  }
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

/** Adaptateur Request → Response (Cloudflare Pages Functions, Workers, Node ≥ 18). */
export async function handleLicenseRequest(request, config, fetchImpl) {
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
  if (request.method === 'GET') {
    const { provider, configured } = billingStatus(config);
    return reply(200, { ok: true, service: 'license', provider, configured });
  }
  if (request.method !== 'POST') return reply(405, { ok: false, code: 'method_not_allowed', message: 'POST uniquement.' });
  let raw;
  try {
    const text = await request.text();
    if (text.length > 4096) return reply(413, { ok: false, code: 'bad_request', message: MESSAGES.bad_request });
    raw = JSON.parse(text);
  } catch {
    return reply(400, { ok: false, code: 'bad_request', message: MESSAGES.bad_request });
  }
  const { httpStatus, body } = await processLicense(raw, config, fetchImpl);
  return reply(httpStatus, body);
}
