// Accès HTTP sortant pour l'analyse de sites publics.
// Protections : adresses internes bloquées (SSRF), redirections revalidées, taille et durée limitées, robots.txt respecté.
import 'server-only';
import dns from 'node:dns/promises';
import net from 'node:net';
import { env } from '../env';

export const USER_AGENT = `ProspectIQ-Analyse/1.0 (+${env.appUrl}/robot)`;

export class BlockedError extends Error {}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  if (v6 === '::1' || v6 === '::') return true;
  if (v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb')) return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateAddress(mapped[1]) : false;
}

export async function resolvesPublic(hostname: string): Promise<boolean> {
  if (net.isIP(hostname)) return !isPrivateAddress(hostname);
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

export interface FetchedPage {
  url: string;
  status: number;
  contentType: string;
  text: string;
  ms: number;
  bytes: number;
}

async function readLimited(res: Response, maxBytes: number): Promise<{ text: string; bytes: number }> {
  const reader = res.body?.getReader();
  if (!reader) return { text: '', bytes: 0 };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(chunks.reduce((s, c) => s + c.byteLength, 0));
  let o = 0;
  for (const c of chunks) {
    buf.set(c, o);
    o += c.byteLength;
  }
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(buf), bytes };
}

/**
 * GET d'une page publique. Retourne null si l'hôte n'existe pas ou ne répond pas.
 * En test, WEB_FETCH_OVERRIDE redirige toutes les requêtes vers un serveur local (l'hôte d'origine est transmis).
 */
export async function safeGet(rawUrl: string, { timeoutMs = 8000, maxBytes = 1_500_000, accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } = {}): Promise<FetchedPage | null> {
  let url = rawUrl;
  const started = Date.now();
  for (let hop = 0; hop < 5; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || (parsed.port && !['80', '443'].includes(parsed.port))) throw new BlockedError('Protocole ou port non autorisé');
    let target = url;
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Language': 'fr-FR,fr;q=0.9' };
    if (env.webFetchOverride) {
      target = `${env.webFetchOverride}${parsed.pathname}${parsed.search}`;
      headers['X-Test-Host'] = parsed.host;
      headers['X-Test-Proto'] = parsed.protocol.replace(':', '');
    } else if (!(await resolvesPublic(parsed.hostname))) {
      return null;
    }
    let res: Response;
    try {
      res = await fetch(target, { headers, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      return null;
    }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) return null;
      url = new URL(loc, url).toString();
      continue;
    }
    const { text, bytes } = await readLimited(res, maxBytes);
    return { url, status: res.status, contentType: res.headers.get('content-type') || '', text, ms: Date.now() - started, bytes };
  }
  return null;
}

/** robots.txt : l'analyse est-elle autorisée pour ce chemin ? (en cas de doute : oui si robots.txt absent) */
export async function robotsAllows(origin: string, path = '/'): Promise<boolean> {
  const page = await safeGet(`${origin}/robots.txt`, { timeoutMs: 5000, maxBytes: 200_000, accept: 'text/plain' }).catch(() => null);
  if (!page || page.status >= 400) return true;
  let applies = false;
  let matchedSpecific = false;
  const rules: { allow: boolean; path: string; specific: boolean }[] = [];
  for (const rawLine of page.text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      const v = value.toLowerCase();
      applies = v === '*' || v.includes('prospectiq');
      if (v.includes('prospectiq')) matchedSpecific = true;
    } else if (applies && (key === 'disallow' || key === 'allow') && value) {
      rules.push({ allow: key === 'allow', path: value, specific: matchedSpecific });
    }
  }
  const relevant = rules.some((r) => r.specific) ? rules.filter((r) => r.specific) : rules;
  let best: { allow: boolean; len: number } | null = null;
  for (const r of relevant) {
    const prefix = r.path.replace(/\*.*$/, '').replace(/\$$/, '');
    if (path.startsWith(prefix) && (!best || prefix.length > best.len)) best = { allow: r.allow, len: prefix.length };
  }
  return best ? best.allow : true;
}
