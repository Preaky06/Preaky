'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Search, MapPin, Building2, ArrowRight, Database } from 'lucide-react';
import { Button, Select, Input, buttonClass, cx } from './ui';
import { api, ApiError } from '@/lib/client';
import { SECTORS } from '@/lib/sectors';

interface Row {
  name: string;
  sector: string | null;
  city: string | null;
  created: string | null;
  score: number;
  category: string;
  confidence: string;
}

const EXAMPLES = [
  ['69002', 'Lyon 2e'],
  ['33000', 'Bordeaux'],
  ['59000', 'Lille'],
] as const;

const scoreTone = (s: number) => (s >= 80 ? 'bg-electric-50 text-electric-700' : s >= 60 ? 'bg-emerald-50 text-emerald-700' : s >= 40 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600');

export function DemoSearch() {
  const [sector, setSector] = useState('restauration');
  const [postalCode, setPostalCode] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (cp: string) => {
    setError(null);
    if (!/^\d{5}$/.test(cp)) return setError('Indiquez un code postal à 5 chiffres, par exemple 69002.');
    setLoading(true);
    try {
      const r = await api<{ rows: Row[]; total: number }>('/api/public/demo-search', { body: { sector, postalCode: cp } });
      setRows(r.rows);
      setTotal(r.total);
    } catch (err) {
      setError((err as ApiError).message);
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(postalCode);
        }}
        className="ring-duo grid grid-cols-[minmax(0,1fr)] gap-1.5 rounded-2xl p-1.5 shadow-float sm:grid-cols-[minmax(0,1fr)_9.5rem_auto]"
        aria-label="Recherche de démonstration"
      >
        <label className="flex items-center gap-2 rounded-xl px-3 sm:border-r sm:border-line">
          <Building2 className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Secteur</span>
          <Select value={sector} onChange={(e) => setSector(e.target.value)} className="border-0 px-1 shadow-none focus:ring-0" data-testid="demo-sector">
            {SECTORS.filter((s) => s.id !== 'autres').map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-1.5 rounded-xl px-2.5">
          <MapPin className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Code postal</span>
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" placeholder="Code postal" className="border-0 px-1 shadow-none focus:ring-0" data-testid="demo-postal" />
        </label>
        <Button type="submit" variant="brand" size="lg" loading={loading} data-testid="demo-run" className="rounded-xl">
          {!loading && <Search className="size-4" />}
          Trouver mes prospects
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
        <span>Essayez :</span>
        {EXAMPLES.map(([cp, label]) => (
          <button
            key={cp}
            type="button"
            onClick={() => {
              setPostalCode(cp);
              search(cp);
            }}
            className="rounded-full border border-night-900/10 bg-white/80 px-2.5 py-1 font-mono text-[11px] font-medium text-night-800 transition-colors hover:border-brand-violet/40 hover:text-brand-violet"
          >
            {label} · {cp}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-center text-sm font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}

      {rows && (
        <div className="mt-5 animate-rise overflow-hidden rounded-2xl bg-white text-left text-night-900 shadow-pop" data-testid="demo-results">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">
              {total.toLocaleString('fr-FR')} entreprise{total > 1 ? 's' : ''} active{total > 1 ? 's' : ''} trouvée{total > 1 ? 's' : ''} · aperçu de {rows.length}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 ring-inset">
              <Database className="size-3" />
              Données réelles · registre SIRENE
            </span>
          </div>
          {rows.length ? (
            <ul className="stagger divide-y divide-line">
              {rows.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-night-900/5 text-xs font-bold text-night-700">{r.name.replace(/[^\p{L}\d ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{r.name}</p>
                      <p className="break-words text-xs text-slate-500">{[r.sector, r.city, r.created && `créée en ${r.created.slice(0, 4)}`].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cx('inline-flex rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums', scoreTone(r.score))}>
                      {r.score}
                      <span className="ml-0.5 self-end text-[10px] font-medium opacity-60">/100</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">score préliminaire</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-slate-500">Aucune entreprise active de ce secteur à ce code postal. Essayez un code postal voisin ou un autre secteur.</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3">
            <p className="max-w-sm text-xs text-slate-500">Score préliminaire calculé sur les seules données du registre. L’analyse complète (site web, annonces officielles, votre offre) se fait dans l’application.</p>
            <Link href="/inscription" className={buttonClass('primary', 'sm')}>
              Analyser ces prospects
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
