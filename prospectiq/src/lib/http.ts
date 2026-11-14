// Utilitaires des routes API : réponses JSON, garde d'origine (CSRF), authentification, validation.
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import { getUser, type SessionUser } from './auth';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'error', public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

export const ok = (data: unknown = { ok: true }, init?: ResponseInit) => NextResponse.json(data, init);

export function fail(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message, code: e.code, ...e.extra }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: 'Erreur interne. Réessayez dans un instant.', code: 'internal' }, { status: 500 });
}

/** Refuse les requêtes modifiantes provenant d'une autre origine. */
export function assertSameOrigin(req: NextRequest) {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!origin || !host) throw new HttpError(403, 'Requête refusée.', 'bad_origin');
  try {
    if (new URL(origin).host !== host) throw new Error();
  } catch {
    throw new HttpError(403, 'Requête refusée.', 'bad_origin');
  }
}

export async function body<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, 'Requête invalide.', 'bad_json');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new HttpError(400, first?.message || 'Données invalides.', 'validation', { field: first?.path?.join('.') });
  }
  return parsed.data;
}

type Handler<C> = (req: NextRequest, ctx: C & { user: SessionUser }) => Promise<Response>;

/** Route authentifiée (et contrôle d'origine pour les requêtes modifiantes). */
export function authed<C = { params: Promise<Record<string, string>> }>(handler: Handler<C>, { admin = false } = {}) {
  return async (req: NextRequest, ctx: C) => {
    try {
      assertSameOrigin(req);
      const user = await getUser();
      if (!user) throw new HttpError(401, 'Session expirée. Reconnectez-vous.', 'unauthenticated');
      if (admin && !user.isAdmin) throw new HttpError(403, 'Accès réservé aux administrateurs.', 'forbidden');
      return await handler(req, { ...ctx, user });
    } catch (e) {
      return fail(e);
    }
  };
}

/** Route publique (contrôle d'origine pour les requêtes modifiantes). */
export function publicRoute<C = unknown>(handler: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    try {
      assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (e) {
      return fail(e);
    }
  };
}

export const clientIp = (req: NextRequest) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
