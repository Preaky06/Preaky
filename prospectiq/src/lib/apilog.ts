// Journal des appels aux services externes (surveillance des erreurs et coûts dans l'administration).
import 'server-only';
import { q } from './db';

export async function logApi(provider: string, operation: string, result: { ok: boolean; status?: number | null; ms?: number; error?: string | null }, orgId?: string | null) {
  try {
    await q('insert into api_logs (provider, operation, ok, status, ms, error, org_id) values ($1, $2, $3, $4, $5, $6, $7)', [
      provider,
      operation,
      result.ok,
      result.status ?? null,
      result.ms ?? null,
      result.error ? String(result.error).slice(0, 500) : null,
      orgId ?? null,
    ]);
  } catch {
    /* la journalisation ne doit jamais casser une requête */
  }
}

/** fetch JSON avec délai maximal, journalisation, erreurs explicites et une nouvelle tentative sur erreur transitoire. */
export async function fetchJson<T>(provider: string, operation: string, url: string, init: RequestInit & { timeoutMs?: number; retries?: number } = {}, orgId?: string | null): Promise<T> {
  const retries = init.retries ?? 1;
  for (let attempt = 0; ; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(init.timeoutMs ?? 12000), headers: { Accept: 'application/json', ...(init.headers || {}) } });
      const ms = Date.now() - started;
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        await logApi(provider, operation, { ok: false, status: res.status, ms, error: text.slice(0, 300) }, orgId);
        const err = new Error(`${provider} a répondu ${res.status}`) as Error & { status?: number; logged?: boolean };
        err.status = res.status;
        err.logged = true;
        throw err;
      }
      const data = (await res.json()) as T;
      await logApi(provider, operation, { ok: true, status: res.status, ms }, orgId);
      return data;
    } catch (e) {
      const err = e as Error & { status?: number; logged?: boolean };
      if (!err.logged) await logApi(provider, operation, { ok: false, status: null, ms: Date.now() - started, error: err.message }, orgId);
      // Erreurs transitoires : délai dépassé, réseau, limite de débit, indisponibilité
      const transient = err.status === undefined || [429, 502, 503, 504].includes(err.status);
      if (!transient || attempt >= retries) throw e;
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
  }
}
