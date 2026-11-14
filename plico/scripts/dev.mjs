// Serveur local : sert dist/ comme Cloudflare (URLs propres, en-têtes de _headers) et /api/license.
// Usage : node scripts/dev.mjs [--dir dist] [--port 8788] [--config site.config.mjs] [--mock]
//   --mock : simule le prestataire de paiement (clés de test ci-dessous), aucun appel réseau.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { handleLicenseRequest } from '../server/license.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const DIR = resolve(arg('--dir', join(ROOT, 'dist')));
const PORT = Number(arg('--port', process.env.PORT || 8788));
const MOCK = args.includes('--mock');
const baseConfig = (await import(pathToFileURL(resolve(arg('--config', join(ROOT, 'site.config.mjs')))).href)).default;

// En mode simulé, on branche une configuration Polar fictive cohérente avec les clés de test.
const config = MOCK
  ? {
      ...baseConfig,
      billing: { ...baseConfig.billing, provider: 'polar', polar: { organizationId: 'org_test', server: 'production' } },
      plans: {
        ...baseConfig.plans,
        pro: { ...baseConfig.plans.pro, match: { ...baseConfig.plans.pro.match, polarBenefitIds: ['ben_pro'] } },
        business: { ...baseConfig.plans.business, match: { ...baseConfig.plans.business.match, polarBenefitIds: ['ben_biz'] } },
      },
    }
  : baseConfig;

export const TEST_KEYS = {
  'PRO-TEST-0000-0001': { benefit_id: 'ben_pro', limit: 3 },
  'BIZ-TEST-0000-0002': { benefit_id: 'ben_biz', limit: 10 },
  'OTHER-PRODUCT-0003': { benefit_id: 'ben_autre', limit: 3 },
};
const activations = new Map(); // key → Set(activationId)

async function mockFetch(url, init) {
  const body = JSON.parse(init.body);
  const json = (status, data) => new Response(data === undefined ? null : JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const k = TEST_KEYS[body.key];
  if (!k || body.organization_id !== 'org_test') return json(404, { error: 'ResourceNotFound' });
  const set = activations.get(body.key) || new Set();
  activations.set(body.key, set);
  const lk = { id: 'lk_test', status: 'granted', benefit_id: k.benefit_id, limit_activations: k.limit, usage: 0, expires_at: null, customer: { email: 'client.test@exemple.fr' } };
  if (url.endsWith('/validate')) {
    if (body.activation_id && !set.has(body.activation_id)) return json(404, { error: 'ResourceNotFound' });
    return json(200, lk);
  }
  if (url.endsWith('/activate')) {
    if (set.size >= k.limit) return json(403, { error: 'NotPermitted' });
    const id = `act_${set.size + 1}_${Date.now().toString(36)}`;
    set.add(id);
    return json(200, { id, license_key: lk });
  }
  if (url.endsWith('/deactivate')) {
    set.delete(body.activation_id);
    return json(204);
  }
  return json(404, {});
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.bcmap': 'application/octet-stream',
  '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf',
  '.icc': 'application/vnd.iccprofile',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.md': 'text/plain; charset=utf-8',
};

function parseHeaders() {
  const file = join(DIR, '_headers');
  if (!existsSync(file)) return [];
  const rules = [];
  let current = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
    } else if (current) {
      const i = line.indexOf(':');
      current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}
const RULES = parseHeaders();
const matches = (pattern, path) => (pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : pattern === path);

function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates = clean.endsWith('/') ? [join(clean, 'index.html')] : [clean, `${clean}.html`, join(clean, 'index.html')];
  for (const c of candidates) {
    const full = join(DIR, c);
    if (full.startsWith(DIR) && existsSync(full) && statSync(full).isFile()) return full;
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/license') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const response = await handleLicenseRequest(request, config, MOCK ? mockFetch : undefined);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  let file = resolveFile(url.pathname);
  let status = 200;
  if (!file) {
    file = join(DIR, '404.html');
    status = 404;
  }
  const headers = { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
  for (const rule of RULES) if (matches(rule.pattern, url.pathname)) Object.assign(headers, rule.headers);
  res.writeHead(status, headers);
  res.end(readFileSync(file));
});

server.listen(PORT, () => {
  console.log(`▶ http://localhost:${PORT}  (dossier : ${DIR}${MOCK ? ', paiement simulé' : ''})`);
  if (MOCK) console.log(`  Clés de test : ${Object.keys(TEST_KEYS).join(', ')}`);
});
