// Fournisseur d'IA configurable : toute API compatible « Chat Completions » (OpenAI, Mistral, Groq…).
// Les appels sont journalisés avec leur consommation et un coût estimé (prix renseignés en variables d'environnement).
import 'server-only';
import type { ZodType } from 'zod';
import { env, features } from './env';
import { logApi } from './apilog';
import { q } from './db';

export interface AiResult<T> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
}

export async function chatJson<T>(opts: { system: string; user: string; schema: ZodType<T>; kind: string; orgId?: string | null; timeoutMs?: number }): Promise<AiResult<T> | null> {
  if (!features.ai()) return null;
  const started = Date.now();
  try {
    const res = await fetch(`${env.aiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.aiApiKey}` },
      body: JSON.stringify({
        model: env.aiModel,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 45000),
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      await logApi('ai', opts.kind, { ok: false, status: res.status, ms, error: (await res.text()).slice(0, 300) }, opts.orgId);
      return null;
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const content = body.choices?.[0]?.message?.content || '';
    const parsed = opts.schema.safeParse(JSON.parse(content));
    const inputTokens = body.usage?.prompt_tokens || 0;
    const outputTokens = body.usage?.completion_tokens || 0;
    const costEur = (inputTokens * env.aiPriceInputPerMTok + outputTokens * env.aiPriceOutputPerMTok) / 1_000_000;
    await q('insert into ai_usage (org_id, kind, model, input_tokens, output_tokens, cost_eur) values ($1, $2, $3, $4, $5, $6)', [opts.orgId ?? null, opts.kind, env.aiModel, inputTokens, outputTokens, costEur]);
    if (!parsed.success) {
      await logApi('ai', opts.kind, { ok: false, status: res.status, ms, error: 'Réponse IA non conforme au format attendu' }, opts.orgId);
      return null;
    }
    await logApi('ai', opts.kind, { ok: true, status: res.status, ms }, opts.orgId);
    return { data: parsed.data, inputTokens, outputTokens, costEur };
  } catch (e) {
    await logApi('ai', opts.kind, { ok: false, ms: Date.now() - started, error: (e as Error).message }, opts.orgId);
    return null;
  }
}

export const GROUNDING_RULES = `Règles impératives :
- Utilise UNIQUEMENT les faits fournis dans le JSON. N'invente aucun chiffre, nom, avis, client, récompense ou événement.
- Si une information manque, écris « Non renseigné » ou ne l'évoque pas.
- Distingue ce qui est constaté (verified=true) de ce qui est estimé : formule les estimations comme des hypothèses (« semble », « à confirmer »).
- N'affirme jamais une absence (de site, de réseau) comme un fait : écris « nous n'avons pas trouvé ».
- Rédige en français, de façon professionnelle et concise.`;
