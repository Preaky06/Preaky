'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { History, Play, GitCompare, Trash2, BookmarkCheck } from 'lucide-react';
import { PageTitle } from '@/components/app-shell';
import { Badge, Button, Card, EmptyState, Modal, Skeleton, buttonClass, cx } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api, toastError } from '@/lib/client';
import { describeSearch } from '@/lib/describe';
import { displayName } from '@/lib/insights';
import type { ResultRow } from '@/lib/search';

interface S {
  id: string;
  name: string | null;
  params: Record<string, unknown>;
  total: number;
  count: number;
  saved: boolean;
  created_at: string;
}
interface Item {
  siren: string;
  name: string;
}

export default function SearchesPage() {
  const toast = useToast();
  const [items, setItems] = useState<S[] | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [diff, setDiff] = useState<{ title: string; added: Item[]; removed: Item[]; common?: number } | null>(null);

  const load = useCallback(() => {
    api<{ searches: S[] }>(`/api/searches${savedOnly ? '?saved=1' : ''}`)
      .then((r) => setItems(r.searches))
      .catch(() => setItems([]));
  }, [savedOnly]);
  useEffect(load, [load]);

  const rerun = async (s: S) => {
    setBusy(s.id);
    try {
      const r = await api<{ rows: ResultRow[]; searchId: string; comparison: { added: string[]; removed: string[] } }>(`/api/searches/${s.id}`, { method: 'POST', body: {} });
      const names = new Map(r.rows.map((x) => [x.company.siren, displayName(x.company)]));
      setDiff({ title: `Relance de « ${s.name || describeSearch(s.params)} »`, added: r.comparison.added.map((x) => ({ siren: x, name: names.get(x) || x })), removed: r.comparison.removed.map((x) => ({ siren: x, name: `SIREN ${x}` })) });
      load();
    } catch (e) {
      toastError(toast, e);
    } finally {
      setBusy(null);
    }
  };

  const compare = async () => {
    const [a, b] = selected;
    try {
      const r = await api<{ onlyA: Item[]; onlyB: Item[]; common: Item[] }>(`/api/searches/compare?a=${a}&b=${b}`);
      setDiff({ title: 'Comparaison de deux recherches', added: r.onlyB, removed: r.onlyA, common: r.common.length });
    } catch (e) {
      toastError(toast, e);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageTitle
        title="Historique des recherches"
        subtitle="Relancez une recherche pour voir les nouvelles entreprises, ou comparez deux recherches."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSavedOnly((v) => !v)} aria-pressed={savedOnly}>
              <BookmarkCheck className="size-4" />
              {savedOnly ? 'Toutes' : 'Sauvegardées'}
            </Button>
            <Button disabled={selected.length !== 2} onClick={compare} data-testid="compare">
              <GitCompare className="size-4" />
              Comparer ({selected.length}/2)
            </Button>
          </div>
        }
      />
      {items === null && <Skeleton className="h-48" />}
      {items && !items.length && (
        <EmptyState icon={<History className="size-5" />} title="Aucune recherche" action={<Link href="/app/recherche" className={buttonClass('primary')}>Lancer une recherche</Link>}>
          Vos recherches apparaîtront ici automatiquement.
        </EmptyState>
      )}
      {items && items.length > 0 && (
        <Card className="divide-y divide-line">
          {items.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <input
                type="checkbox"
                aria-label="Sélectionner pour comparer"
                className="accent-electric-600"
                checked={selected.includes(s.id)}
                onChange={(e) => setSelected((sel) => (e.target.checked ? [...sel, s.id].slice(-2) : sel.filter((x) => x !== s.id)))}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-night-900">
                  {s.name || describeSearch(s.params)} {s.saved && <Badge tone="accent">Sauvegardée</Badge>}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(s.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} · {s.total.toLocaleString('fr-FR')} résultats · {s.count} affichés
                </p>
              </div>
              <Link href={`/app/recherche?depuis=${s.id}`} className={buttonClass('secondary', 'sm')}>
                Ouvrir
              </Link>
              <Button size="sm" variant="secondary" loading={busy === s.id} onClick={() => rerun(s)} data-testid="rerun">
                <Play className="size-3.5" />
                Relancer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Supprimer"
                onClick={async () => {
                  await api(`/api/searches/${s.id}`, { method: 'DELETE' }).catch((e) => toastError(toast, e));
                  load();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </Card>
      )}
      <Modal open={!!diff} onClose={() => setDiff(null)} title={diff?.title || ''} wide>
        {diff && (
          <div className="grid gap-5 sm:grid-cols-2" data-testid="diff">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-emerald-700">Nouvelles entreprises ({diff.added.length})</h3>
              <ul className="space-y-1 text-sm">
                {diff.added.slice(0, 50).map((x) => (
                  <li key={x.siren}>
                    <Link href={`/app/entreprise/${x.siren}`} className="hover:text-electric-700">
                      {x.name}
                    </Link>
                  </li>
                ))}
                {!diff.added.length && <li className="text-slate-500">Aucune.</li>}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-600">Disparues ({diff.removed.length})</h3>
              <ul className={cx('space-y-1 text-sm text-slate-600')}>
                {diff.removed.slice(0, 50).map((x) => (
                  <li key={x.siren}>{x.name}</li>
                ))}
                {!diff.removed.length && <li className="text-slate-500">Aucune.</li>}
              </ul>
            </div>
            {diff.common !== undefined && <p className="text-sm text-slate-500 sm:col-span-2">{diff.common} entreprise(s) en commun.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
