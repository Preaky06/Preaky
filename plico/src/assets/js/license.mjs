// Gestion de la licence côté navigateur.
// La clé est vérifiée via /api/license (Function Cloudflare) qui interroge le point d'accès
// public du prestataire. Si cette route n'existe pas (hébergement 100 % statique),
// la vérification est faite directement depuis le navigateur.
import config from './config.mjs';

const STORE_KEY = 'plico.license.v1';
const DEVICE_KEY = 'plico.device.v1';
const EVENT = 'plico:license';
const HOUR = 3600 * 1000;
const DEFINITIVE = new Set(['invalid_key', 'inactive', 'wrong_product']);

function read() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(state) {
  try {
    if (state) localStorage.setItem(STORE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* stockage indisponible (navigation privée stricte) : la licence reste valable pour la session */
  }
  memory = state;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: state }));
}

let memory = read();

export function getLicense() {
  return memory;
}

export function onLicenseChange(callback) {
  window.addEventListener(EVENT, (e) => callback(e.detail));
  window.addEventListener('storage', (e) => {
    if (e.key === STORE_KEY) {
      memory = read();
      callback(memory);
    }
  });
}

/** Plan effectivement actif, en tenant compte du délai de grâce hors ligne. */
export function currentPlanId() {
  const s = memory;
  if (!s || s.status !== 'active' || !config.plans[s.plan] || s.plan === 'free') return 'free';
  const graceMs = (config.license?.offlineGraceDays ?? 7) * 24 * HOUR;
  if (Date.now() - (s.lastSuccess || 0) > graceMs) return 'free';
  return s.plan;
}

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'session';
  }
}

export function deviceLabel() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Appareil';
  return `${browser} · ${os} · ${deviceId().slice(0, 8)}`;
}

async function direct(action, payload) {
  const core = await import('./license-core.mjs');
  const { body } = await core.processLicense({ action, ...payload }, config);
  return body;
}

async function call(action, payload) {
  try {
    const res = await fetch('/api/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      cache: 'no-store',
    });
    const type = res.headers.get('content-type') || '';
    if (type.includes('application/json')) return await res.json();
    // Pas de fonction serveur (hébergement statique) : vérification directe
    if (res.status === 404 || res.status === 405) return await direct(action, payload);
    return { ok: false, code: 'provider_error', message: 'Service de licence indisponible.' };
  } catch {
    try {
      return await direct(action, payload);
    } catch {
      return { ok: false, code: 'provider_error', message: 'Connexion impossible. Vérifiez votre accès à Internet.' };
    }
  }
}

function fromResult(key, result, previous = {}) {
  const now = Date.now();
  return {
    key,
    plan: result.plan,
    planName: result.planName,
    provider: result.provider,
    activationId: result.activationId ?? previous.activationId ?? null,
    email: result.email ?? previous.email ?? null,
    expiresAt: result.expiresAt ?? null,
    activations: result.activations ?? null,
    activatedAt: previous.activatedAt || now,
    lastCheck: now,
    lastSuccess: now,
    status: 'active',
    error: null,
  };
}

/** Active une clé sur cet appareil. */
export async function activate(rawKey) {
  const key = String(rawKey || '').replace(/\s+/g, '');
  const result = await call('activate', { key, label: deviceLabel() });
  if (result.ok) write(fromResult(key, result));
  return result;
}

/** Revérifie la licence auprès du prestataire. */
export async function refresh({ force = false } = {}) {
  const s = memory;
  if (!s?.key) return null;
  const every = (config.license?.revalidateHours ?? 12) * HOUR;
  if (!force && s.status === 'active' && Date.now() - (s.lastCheck || 0) < every) return { ok: true, cached: true };
  const result = await call('validate', { key: s.key, activationId: s.activationId });
  if (result.ok) {
    write(fromResult(s.key, result, s));
  } else if (DEFINITIVE.has(result.code)) {
    write({ ...s, status: 'invalid', error: result.message, lastCheck: Date.now() });
  } else {
    // Erreur passagère (réseau, prestataire) : on garde la licence pendant le délai de grâce.
    write({ ...s, lastCheck: Date.now() });
  }
  return result;
}

/** Libère cet appareil puis oublie la licence localement. */
export async function deactivate() {
  const s = memory;
  if (s?.key && s.status === 'active') {
    await call('deactivate', { key: s.key, activationId: s.activationId }).catch(() => null);
  }
  write(null);
}

export function forget() {
  write(null);
}
