'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Plus, Trash2, Lock } from 'lucide-react';
import { PageTitle } from '@/components/app-shell';
import { Button, Card, EmptyState, Input, Skeleton, buttonClass, cx } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api, toastError } from '@/lib/client';
import { displayName } from '@/lib/insights';
import { STATUS_LABELS } from '@/lib/status';

interface L {
  id: string;
  name: string;
  count: number;
}
interface P {
  id: string;
  siren: string;
  status: string;
  score: number | null;
  company: { name: string; tradeNames: string[]; city: string | null };
}

export default function ListsPage() {
  const toast = useToast();
  const [lists, setLists] = useState<L[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [members, setMembers] = useState<P[] | null>(null);
  const [name, setName] = useState('');
  const [allowed, setAllowed] = useState(true);

  const load = useCallback(async () => {
    const r = await api<{ lists: L[] }>('/api/lists');
    setLists(r.lists);
    setCurrent((c) => c || r.lists[0]?.id || null);
  }, []);
  useEffect(() => {
    load().catch(() => setLists([]));
    api<{ user: { plan: { features: { savedSearches: boolean } } } }>('/api/me')
      .then((r) => setAllowed(r.user.plan.features.savedSearches))
      .catch(() => {});
  }, [load]);
  useEffect(() => {
    if (!current) return setMembers(null);
    setMembers(null);
    api<{ prospects: P[] }>(`/api/prospects?list=${current}`)
      .then((r) => setMembers(r.prospects))
      .catch(() => setMembers([]));
  }, [current]);

  const create = async () => {
    try {
      const r = await api<{ id: string }>('/api/lists', { body: { name } });
      setName('');
      await load();
      setCurrent(r.id);
      toast('Liste créée.', 'success');
    } catch (e) {
      toastError(toast, e);
    }
  };
  const remove = async (id: string) => {
    if (!confirm('Supprimer cette liste ? Les entreprises restent dans votre CRM.')) return;
    await api(`/api/lists/${id}`, { method: 'DELETE' }).catch((e) => toastError(toast, e));
    setCurrent(null);
    load();
  };
  const removeMember = async (siren: string) => {
    await api(`/api/lists/${current}`, { body: { siren, remove: true } }).catch((e) => toastError(toast, e));
    setMembers((m) => m?.filter((x) => x.siren !== siren) || null);
    load();
  };

  return (
    <div className="animate-fade-in">
      <PageTitle title="Listes personnalisées" subtitle="Regroupez vos prospects par campagne, secteur ou priorité." />
      {!allowed && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-electric-50 px-4 py-3 text-sm text-electric-700">
          <Lock className="size-4" />
          Les listes sont incluses à partir de l’offre Pro.
          <Link href="/app/abonnement" className="font-semibold underline">
            Voir les offres
          </Link>
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit p-4">
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) create();
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle liste" aria-label="Nom de la liste" data-testid="list-name" />
            <Button type="submit" disabled={!name.trim()} aria-label="Créer la liste" data-testid="list-create">
              <Plus className="size-4" />
            </Button>
          </form>
          {lists === null ? (
            <Skeleton className="h-24" />
          ) : lists.length ? (
            <ul className="space-y-1">
              {lists.map((l) => (
                <li key={l.id} className="group flex items-center gap-1">
                  <button type="button" onClick={() => setCurrent(l.id)} className={cx('flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-sm', current === l.id ? 'bg-night-900 text-white' : 'hover:bg-slate-100')}>
                    <span className="break-words">{l.name}</span>
                    <span className="text-xs opacity-70">{l.count}</span>
                  </button>
                  <button type="button" onClick={() => remove(l.id)} className="rounded p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 focus:opacity-100" aria-label={`Supprimer ${l.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Aucune liste pour l’instant.</p>
          )}
        </Card>
        <div>
          {!current ? (
            <EmptyState icon={<ListChecks className="size-5" />} title="Créez votre première liste">
              Ajoutez ensuite des entreprises depuis leur fiche (bouton « Liste »).
            </EmptyState>
          ) : members === null ? (
            <Skeleton className="h-40" />
          ) : members.length ? (
            <Card className="divide-y divide-line">
              {members.map((m) => (
                <div key={m.siren} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/app/entreprise/${m.siren}`} className="font-semibold text-night-900 hover:text-electric-700">
                      {displayName(m.company)}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {m.company.city || 'Ville non renseignée'} · {STATUS_LABELS[m.status]} · {m.score !== null ? `${m.score}/100` : 'non analysé'}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeMember(m.siren)}>
                    Retirer
                  </Button>
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState title="Liste vide" action={<Link href="/app/recherche" className={buttonClass('primary', 'sm')}>Trouver des prospects</Link>}>
              Ajoutez des entreprises depuis leur fiche.
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}
