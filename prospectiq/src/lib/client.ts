// Appels à l'API depuis le navigateur : erreurs explicites, redirection si la session a expiré.
'use client';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public field?: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'Connexion impossible. Vérifiez votre accès à Internet.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/connexion')) {
      location.href = `/connexion?retour=${encodeURIComponent(location.pathname + location.search)}`;
    }
    throw new ApiError(res.status, data.error || 'Une erreur est survenue.', data.code, data.field);
  }
  return data as T;
}

/** Affiche une erreur d'API avec, si besoin, un lien vers les offres. */
export function toastError(toast: (m: string, t?: 'error', a?: { label: string; href: string }) => void, e: unknown) {
  const err = e as ApiError;
  toast(err?.message || 'Une erreur est survenue.', 'error', err?.status === 402 ? { label: 'Voir les offres', href: '/app/abonnement' } : undefined);
}
