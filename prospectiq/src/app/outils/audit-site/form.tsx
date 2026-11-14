'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Globe, ScanSearch, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/client';

const STEPS = ['Connexion au site…', 'Lecture du fichier robots.txt…', 'Analyse de la page d’accueil…', 'Rédaction des recommandations…'];

export function AuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 2200);
    return () => clearInterval(t);
  }, [loading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url.trim()) return setError('Indiquez l’adresse du site, par exemple www.exemple.fr');
    setLoading(true);
    try {
      const r = await api<{ id: string }>('/api/public/audit', { body: { url } });
      router.push(`/rapport/${r.id}`);
    } catch (err) {
      setError((err as ApiError).message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={submit} className="ring-duo flex flex-col gap-1.5 rounded-2xl p-1.5 shadow-float sm:flex-row" aria-label="Audit de site">
        <label className="flex flex-1 items-center gap-2 px-3">
          <Globe className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Adresse du site</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="www.site-a-auditer.fr"
            inputMode="url"
            autoComplete="url"
            className="h-12 w-full bg-transparent text-[15px] text-night-900 placeholder:text-slate-400 focus:outline-none"
            data-testid="audit-url"
            disabled={loading}
          />
        </label>
        <button type="submit" disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-violet px-6 text-[15px] font-semibold whitespace-nowrap text-white shadow-brand transition-colors hover:bg-violet-700 disabled:opacity-80" data-testid="audit-run">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
          {loading ? 'Analyse en cours' : 'Lancer l’audit gratuit'}
        </button>
      </form>
      <p className="mt-3 min-h-5 text-sm" aria-live="polite">
        {error ? <span className="font-medium text-rose-600" role="alert">{error}</span> : loading ? <span className="text-night-800">{STEPS[step]}</span> : <span className="text-slate-500">Sans inscription · résultat en moins de 30 secondes · rapport partageable</span>}
      </p>
    </div>
  );
}
