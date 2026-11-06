'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Search, MapPin, Building2, ArrowRight } from 'lucide-react';
import { Button, Select, Input, Badge, buttonClass } from './ui';
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

export function DemoSearch() {
  const [sector, setSector] = useState('restauration');
  const [postalCode, setPostalCode] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{5}$/.test(postalCode)) return setError('Indiquez un code postal à 5 chiffres, par exemple 69002.');
    setLoading(true);
    try {
      const r = await api<{ rows: Row[]; total: number }>('/api/public/demo-search', { body: { sector, postalCode } });
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
    <div className="mx-auto w-full max-w-3xl">
      <form onSubmit={run} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white p-2 shadow-pop sm:flex-row" aria-label="Recherche de démonstration">
        <label className="flex flex-1 items-center gap-2 rounded-xl px-3 sm:border-r sm:border-line">
          <Building2 className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Secteur</span>
          <Select value={sector} onChange={(e) => setSector(e.target.value)} className="border-0 shadow-none focus:ring-0" data-testid="demo-sector">
            {SECTORS.filter((s) => s.id !== 'autres').map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 rounded-xl px-3 sm:w-44">
          <MapPin className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Code postal</span>
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" placeholder="Code postal" className="border-0 shadow-none focus:ring-0" data-testid="demo-postal" />
        </label>
        <Button type="submit" variant="accent" size="lg" loading={loading} data-testid="demo-run">
          <Search className="size-4" />
          Trouver mes prospects
        </Button>
      </form>
      {error && (
        <p className="mt-3 text-sm font-medium text-rose-300" role="alert">
          {error}
        </p>
      )}
      {rows && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white text-left text-night-900 shadow-pop animate-rise" data-testid="demo-results">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">
              {total.toLocaleString('fr-FR')} entreprise{total > 1 ? 's' : ''} active{total > 1 ? 's' : ''} trouvée{total > 1 ? 's' : ''} · aperçu de {rows.length}
            </p>
            <Badge tone="accent">Données réelles · registre SIRENE</Badge>
          </div>
          {rows.length ? (
            <ul className="divide-y divide-line">
              {rows.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="truncate text-xs text-slate-500">{[r.sector, r.city, r.created && `créée en ${r.created.slice(0, 4)}`].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{r.score}<span className="text-xs font-medium text-slate-400">/100</span></p>
                    <p className="text-[11px] text-slate-500">score préliminaire</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-slate-500">Aucune entreprise active de ce secteur à ce code postal. Essayez un code postal voisin ou un autre secteur.</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Score préliminaire calculé sur les seules données du registre. L’analyse complète (site web, annonces officielles, votre offre) se fait dans l’application.</p>
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
