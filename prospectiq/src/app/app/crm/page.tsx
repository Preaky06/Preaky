'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Table2, Columns3, Star, Download, Search, KanbanSquare, Lock } from 'lucide-react';
import { PageTitle } from '@/components/app-shell';
import { Badge, Card, EmptyState, Input, Select, Skeleton, buttonClass, cx } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api, toastError } from '@/lib/client';
import { STATUSES } from '@/lib/status';
import { displayName } from '@/lib/insights';

interface P {
  id: string;
  siren: string;
  status: string;
  favorite: boolean;
  lastContactAt: string | null;
  nextFollowupAt: string | null;
  updatedAt: string;
  score: number | null;
  notes: number;
  company: { name: string; tradeNames: string[]; city: string | null; nafLabel: string | null };
}

const fmt = (d: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('fr-FR') : null);

export default function CrmPage() {
  const toast = useToast();
  const [items, setItems] = useState<P[] | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [status, setStatus] = useState('');
  const [term, setTerm] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [due, setDue] = useState(false);
  const [crmFull, setCrmFull] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (term.trim()) qs.set('q', term.trim());
    if (favorite) qs.set('favorite', '1');
    if (due) qs.set('due', '1');
    try {
      setItems((await api<{ prospects: P[] }>(`/api/prospects?${qs}`)).prospects);
    } catch (e) {
      toastError(toast, e);
      setItems([]);
    }
  }, [status, term, favorite, due, toast]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    api<{ user: { plan: { features: { crmFull: boolean } } } }>('/api/me')
      .then((r) => setCrmFull(r.user.plan.features.crmFull))
      .catch(() => {});
  }, []);

  const move = async (p: P, to: string) => {
    if (p.status === to) return;
    setItems((list) => list?.map((x) => (x.id === p.id ? { ...x, status: to } : x)) || null);
    try {
      await api(`/api/prospects/${p.id}`, { method: 'PATCH', body: { status: to } });
      toast(`Statut : ${STATUSES.find((s) => s.id === to)?.label}.`, 'success');
    } catch (e) {
      toastError(toast, e);
      load();
    }
  };
  const toggleFav = async (p: P) => {
    setItems((list) => list?.map((x) => (x.id === p.id ? { ...x, favorite: !x.favorite } : x)) || null);
    await api(`/api/prospects/${p.id}`, { method: 'PATCH', body: { favorite: !p.favorite } }).catch((e) => toastError(toast, e));
  };

  return (
    <div className="animate-fade-in">
      <PageTitle
        title="CRM"
        subtitle="Votre portefeuille de prospects, sans doublon. Chaque entreprise n’y figure qu’une fois."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-line bg-white p-0.5">
              <button type="button" onClick={() => setView('table')} className={cx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold', view === 'table' ? 'bg-night-900 text-white' : 'text-slate-600')} aria-pressed={view === 'table'}>
                <Table2 className="size-4" />
                Tableau
              </button>
              <button type="button" onClick={() => (crmFull ? setView('kanban') : toast('La vue Kanban est incluse à partir de l’offre Pro.', 'info', { label: 'Voir les offres', href: '/app/abonnement' }))} className={cx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold', view === 'kanban' ? 'bg-night-900 text-white' : 'text-slate-600')} aria-pressed={view === 'kanban'} data-testid="kanban-toggle">
                {crmFull ? <Columns3 className="size-4" /> : <Lock className="size-4" />}
                Kanban
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- téléchargement d'un fichier, pas une page */}
            <a href="/api/prospects/export" className={buttonClass('secondary')} onClick={(e) => !crmFull && (e.preventDefault(), toast('L’export CSV est inclus à partir de l’offre Pro.', 'info', { label: 'Voir les offres', href: '/app/abonnement' }))} data-testid="crm-export">
              <Download className="size-4" />
              Export CSV
            </a>
          </div>
        }
      />
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Rechercher une entreprise, une ville, un SIREN…" className="pl-9" aria-label="Rechercher" data-testid="crm-search" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48" aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="accent-electric-600" />
          Favoris
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={due} onChange={(e) => setDue(e.target.checked)} className="accent-electric-600" />
          Relances échues
        </label>
      </Card>

      {items === null && <Skeleton className="h-64" />}
      {items && !items.length && (
        <EmptyState icon={<KanbanSquare className="size-5" />} title="Aucun prospect" action={<Link href="/app/recherche" className={buttonClass('primary')}>Trouver des prospects</Link>}>
          {status || term || favorite || due ? 'Aucun prospect ne correspond à ces filtres.' : 'Ajoutez des entreprises depuis la recherche ou leur fiche.'}
        </EmptyState>
      )}

      {items && items.length > 0 && view === 'table' && (
        <>
        {/* Mobile : une carte par prospect, toutes les informations visibles sans défilement horizontal */}
        <ul className="space-y-3 md:hidden" aria-label="Prospects du CRM">
          {items.map((p) => (
            <li key={p.id} className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/app/entreprise/${p.siren}`} className="font-semibold break-words text-night-900 hover:text-electric-700">
                    {displayName(p.company)}
                  </Link>
                  <p className="mt-0.5 text-xs break-words text-slate-500">{[p.company.nafLabel, p.company.city].filter(Boolean).join(' · ')}</p>
                </div>
                <button type="button" onClick={() => toggleFav(p)} aria-label={p.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-slate-100">
                  <Star className={cx('size-4', p.favorite ? 'fill-amber-400 text-amber-500' : 'text-slate-300')} />
                </button>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-slate-400">Score</dt>
                  <dd className="mt-0.5 font-semibold text-night-900 tabular-nums">{p.score ?? 'Non analysé'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Dernier contact</dt>
                  <dd className="mt-0.5 text-night-800">{fmt(p.lastContactAt) ?? 'Aucun'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Relance</dt>
                  <dd className={cx('mt-0.5', p.nextFollowupAt && new Date(p.nextFollowupAt) <= new Date() ? 'font-semibold text-rose-700' : 'text-night-800')}>{fmt(p.nextFollowupAt) ?? 'Aucune'}</dd>
                </div>
              </dl>
              <div className="mt-3 flex items-center gap-3">
                <Select value={p.status} onChange={(e) => move(p, e.target.value)} className="h-9 flex-1 text-[13px]" aria-label={`Statut de ${displayName(p.company)}`}>
                  {STATUSES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </Select>
                <span className="shrink-0 text-xs text-slate-500">{p.notes} note{p.notes > 1 ? 's' : ''}</span>
              </div>
            </li>
          ))}
        </ul>
        <Card className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-sm" data-testid="crm-table">
            <thead className="border-b border-line bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Dernier contact</th>
                <th className="px-4 py-3">Relance</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggleFav(p)} aria-label={p.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                      <Star className={cx('size-4', p.favorite ? 'fill-amber-400 text-amber-500' : 'text-slate-300')} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/app/entreprise/${p.siren}`} className="font-semibold text-night-900 hover:text-electric-700">
                      {displayName(p.company)}
                    </Link>
                    <p className="text-xs text-slate-500">{[p.company.nafLabel, p.company.city].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{p.score ?? <span className="text-xs text-slate-400">Non analysé</span>}</td>
                  <td className="px-4 py-3">
                    <Select value={p.status} onChange={(e) => move(p, e.target.value)} className="h-8 w-44 text-[13px]" aria-label="Statut" data-testid="row-status">
                      {STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmt(p.lastContactAt) ?? <span className="text-xs text-slate-400">Aucun</span>}</td>
                  <td className={cx('px-4 py-3', p.nextFollowupAt && new Date(p.nextFollowupAt) <= new Date() ? 'font-semibold text-rose-700' : 'text-slate-600')}>{fmt(p.nextFollowupAt) ?? <span className="text-xs text-slate-400">Aucune</span>}</td>
                  <td className="px-4 py-3 text-slate-600">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        </>
      )}

      {items && items.length > 0 && view === 'kanban' && (
        <div className="flex flex-col gap-3 pb-4 md:flex-row md:overflow-x-auto" data-testid="kanban">
          {STATUSES.map((s) => {
            const col = items.filter((p) => p.status === s.id);
            return (
              <div
                key={s.id}
                className={cx('flex w-full flex-col rounded-2xl border border-line bg-slate-100/70 p-2 md:w-64 md:shrink-0', dragging && 'ring-electric-200')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const p = items.find((x) => x.id === e.dataTransfer.getData('text/plain'));
                  if (p) move(p, s.id);
                  setDragging(null);
                }}
                data-status={s.id}
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{s.label}</span>
                  <Badge>{col.length}</Badge>
                </div>
                <div className="flex min-h-24 flex-col gap-2">
                  {col.map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', p.id);
                        setDragging(p.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      className={cx('cursor-grab rounded-xl border border-line bg-white p-3 shadow-sm active:cursor-grabbing', dragging === p.id && 'opacity-50')}
                      data-testid="kanban-card"
                    >
                      <Link href={`/app/entreprise/${p.siren}`} className="text-sm font-semibold text-night-900 hover:text-electric-700">
                        {displayName(p.company)}
                      </Link>
                      <p className="mt-0.5 break-words text-xs text-slate-500">{p.company.city || 'Ville non renseignée'}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs tabular-nums text-slate-600">{p.score !== null ? `${p.score}/100` : 'Non analysé'}</span>
                        <Select value={p.status} onChange={(e) => move(p, e.target.value)} className="h-7 w-auto px-1.5 text-[11px]" aria-label="Déplacer vers">
                          {STATUSES.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {items && items.length > 0 && <p className="mt-3 text-xs text-slate-500">{items.length} prospect(s). Les relances se planifient depuis la fiche de chaque entreprise.</p>}
    </div>
  );
}
