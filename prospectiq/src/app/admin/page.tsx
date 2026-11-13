'use client';
import { useCallback, useEffect, useState } from 'react';
import { Users, Activity, AlertTriangle, Flag, Search } from 'lucide-react';
import { PageTitle } from '@/components/app-shell';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Select, Skeleton, cx } from '@/components/ui';
import { BarList } from '@/components/charts';
import { useToast } from '@/components/toast';
import { api, toastError } from '@/lib/client';
import { PLANS } from '@/lib/plans';

interface Overview {
  totals: { users: number; orgs: number; paying: number; searches30: number; analyses30: number; messages30: number; openReports: number };
  plans: { plan: string; n: number }[];
  ai: { calls: number; input: number; output: number; cost: number };
  aiByOrg: { org: string | null; cost: number; calls: number }[];
  apis: { provider: string; calls: number; errors: number; avg_ms: number }[];
  mrr: number;
  features: Record<'ai' | 'places' | 'stripe' | 'mail', boolean>;
}
interface U {
  id: string;
  email: string;
  name: string;
  role: string;
  disabled_at: string | null;
  created_at: string;
  last_login_at: string | null;
  org_name: string;
  plan: string;
  plan_source: string | null;
  subscription_status: string | null;
  prospects: number;
  ai_messages: number;
}
interface Log {
  provider: string;
  operation: string;
  ok: boolean;
  status: number | null;
  ms: number;
  error: string | null;
  created_at: string;
}
interface R {
  id: string;
  kind: string;
  siren: string | null;
  email: string | null;
  message: string;
  status: string;
  created_at: string;
}

const TABS = [
  { id: 'overview', label: 'Vue d’ensemble', icon: Activity },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'logs', label: 'Erreurs API', icon: AlertTriangle },
  { id: 'reports', label: 'Signalements', icon: Flag },
] as const;
const KIND: Record<string, string> = { opposition: 'Opposition RGPD', data_error: 'Erreur de données', abuse: 'Abus' };
const dt = (d: string | null) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n < 10 ? 4 : 2 });

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export default function AdminPage() {
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('overview');
  const [ov, setOv] = useState<Overview | null>(null);
  const [users, setUsers] = useState<U[] | null>(null);
  const [term, setTerm] = useState('');
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [errorsOnly, setErrorsOnly] = useState(true);
  const [reports, setReports] = useState<R[] | null>(null);

  useEffect(() => {
    api<Overview>('/api/admin/overview').then(setOv).catch((e) => toastError(toast, e));
  }, [toast]);
  const loadUsers = useCallback(() => {
    api<{ users: U[] }>(`/api/admin/users?q=${encodeURIComponent(term)}`)
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]));
  }, [term]);
  useEffect(() => {
    if (tab !== 'users') return;
    const t = setTimeout(loadUsers, 200);
    return () => clearTimeout(t);
  }, [tab, loadUsers]);
  useEffect(() => {
    if (tab === 'logs')
      api<{ logs: Log[] }>(`/api/admin/logs${errorsOnly ? '?errors=1' : ''}`)
        .then((r) => setLogs(r.logs))
        .catch(() => setLogs([]));
  }, [tab, errorsOnly]);
  const loadReports = useCallback(() => {
    api<{ reports: R[] }>('/api/admin/reports')
      .then((r) => setReports(r.reports))
      .catch(() => setReports([]));
  }, []);
  useEffect(() => {
    if (tab === 'reports') loadReports();
  }, [tab, loadReports]);

  const patchUser = async (id: string, body: Record<string, unknown>, msg: string) => {
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body });
      toast(msg, 'success');
      loadUsers();
    } catch (e) {
      toastError(toast, e);
    }
  };
  const handle = async (id: string, status: string, suppress = false) => {
    try {
      await api('/api/admin/reports', { method: 'PATCH', body: { id, status, suppress } });
      toast(suppress ? 'Opposition appliquée : entreprise exclue et données effacées.' : 'Signalement mis à jour.', 'success');
      loadReports();
    } catch (e) {
      toastError(toast, e);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageTitle title="Administration" subtitle="Comptes, abonnements, consommation, erreurs des sources de données et demandes RGPD." />
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap', tab === id ? 'bg-night-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
            <Icon className="size-4" />
            {label}
            {id === 'reports' && !!ov?.totals.openReports && <Badge tone="danger">{ov.totals.openReports}</Badge>}
          </button>
        ))}
      </div>

      {tab === 'overview' &&
        (!ov ? (
          <Skeleton className="h-72" />
        ) : (
          <div className="space-y-6" data-testid="admin-overview">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Utilisateurs" value={ov.totals.users.toLocaleString('fr-FR')} hint={`${ov.totals.orgs} organisation${ov.totals.orgs > 1 ? 's' : ''}`} />
              <Stat label="Revenu mensuel récurrent" value={eur(ov.mrr)} hint={`${ov.totals.paying} compte${ov.totals.paying > 1 ? 's' : ''} payant${ov.totals.paying > 1 ? 's' : ''} (HT)`} />
              <Stat label="Analyses (30 j)" value={ov.totals.analyses30.toLocaleString('fr-FR')} hint={`${ov.totals.searches30} recherches`} />
              <Stat label="Coût IA (30 j)" value={eur(ov.ai.cost)} hint={`${ov.ai.calls} appels · ${(ov.ai.input + ov.ai.output).toLocaleString('fr-FR')} jetons`} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="Répartition par offre" />
                <div className="p-5">
                  <BarList items={ov.plans.map((p) => ({ label: PLANS[p.plan as keyof typeof PLANS]?.name || p.plan, value: p.n }))} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Sources de données (7 jours)" />
                <div className="overflow-x-auto p-2">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2 text-right">Appels</th>
                        <th className="px-3 py-2 text-right">Erreurs</th>
                        <th className="px-3 py-2 text-right">Temps moyen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {ov.apis.map((a) => (
                        <tr key={a.provider}>
                          <td className="px-3 py-2 font-medium">{a.provider}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{a.calls}</td>
                          <td className={cx('px-3 py-2 text-right tabular-nums', a.errors > 0 && 'font-semibold text-rose-700')}>{a.errors}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{a.avg_ms} ms</td>
                        </tr>
                      ))}
                      {!ov.apis.length && (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-slate-500">
                            Aucun appel enregistré.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card>
                <CardHeader title="Coûts IA par organisation (30 jours)" />
                <ul className="divide-y divide-line p-2 text-sm">
                  {ov.aiByOrg.map((a, i) => (
                    <li key={i} className="flex justify-between px-3 py-2">
                      <span>{a.org || 'Compte supprimé'}</span>
                      <span className="tabular-nums">
                        {eur(a.cost)} · {a.calls} appels
                      </span>
                    </li>
                  ))}
                  {!ov.aiByOrg.length && <li className="px-3 py-3 text-slate-500">{ov.features.ai ? 'Aucun appel IA ce mois-ci.' : 'Aucun fournisseur IA configuré (messages rédigés par modèles).'}</li>}
                </ul>
              </Card>
              <Card>
                <CardHeader title="Configuration de l’instance" />
                <ul className="space-y-2 p-5 text-sm">
                  {(
                    [
                      ['stripe', 'Paiement Stripe'],
                      ['ai', 'Fournisseur IA'],
                      ['places', 'Google Places'],
                      ['mail', 'Envoi d’e-mails (SMTP)'],
                    ] as const
                  ).map(([k, l]) => (
                    <li key={k} className="flex items-center justify-between">
                      {l}
                      <Badge tone={ov.features[k] ? 'success' : 'neutral'}>{ov.features[k] ? 'Configuré' : 'Non configuré'}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        ))}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="E-mail, nom, organisation…" className="pl-9" aria-label="Rechercher un utilisateur" />
          </div>
          {users === null ? (
            <Skeleton className="h-64" />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm" data-testid="admin-users">
                <thead className="border-b border-line bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Offre</th>
                    <th className="px-4 py-3">Consommation du mois</th>
                    <th className="px-4 py-3">Dernière connexion</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((u) => (
                    <tr key={u.id} className={u.disabled_at ? 'bg-rose-50/40' : ''}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">
                          {u.name} {u.disabled_at && <Badge tone="danger">Désactivé</Badge>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {u.email} · {u.org_name} · {u.role === 'owner' ? 'propriétaire' : 'membre'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={u.plan} onChange={(e) => patchUser(u.id, { plan: e.target.value }, 'Offre modifiée.')} className="h-8 w-36 text-[13px]" aria-label="Offre">
                          {Object.values(PLANS).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Select>
                        <p className="mt-1 text-xs text-slate-500">{u.plan_source === 'stripe' ? `Stripe · ${u.subscription_status}` : u.plan_source === 'admin' ? 'Attribuée manuellement' : 'Gratuite'}</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">
                        {u.prospects} prospects · {u.ai_messages} messages
                      </td>
                      <td className="px-4 py-3 text-slate-600">{dt(u.last_login_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => patchUser(u.id, { resetUsage: true }, 'Quota du mois remis à zéro.')}>
                            Réinitialiser le quota
                          </Button>
                          <Button size="sm" variant={u.disabled_at ? 'secondary' : 'danger'} onClick={() => patchUser(u.id, { disabled: !u.disabled_at }, u.disabled_at ? 'Compte réactivé.' : 'Compte désactivé.')}>
                            {u.disabled_at ? 'Réactiver' : 'Désactiver'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length && <p className="p-6 text-sm text-slate-500">Aucun utilisateur trouvé.</p>}
            </Card>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} className="accent-electric-600" />
            Erreurs uniquement
          </label>
          {logs === null ? (
            <Skeleton className="h-64" />
          ) : logs.length ? (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-line bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Opération</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Durée</th>
                    <th className="px-4 py-3">Erreur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {logs.map((l, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-600">{dt(l.created_at)}</td>
                      <td className="px-4 py-2 font-medium">{l.provider}</td>
                      <td className="px-4 py-2 text-slate-600">{l.operation}</td>
                      <td className="px-4 py-2">
                        <Badge tone={l.ok ? 'success' : 'danger'}>{l.status ?? (l.ok ? 'OK' : 'échec')}</Badge>
                      </td>
                      <td className="px-4 py-2 tabular-nums text-slate-600">{l.ms} ms</td>
                      <td className="max-w-xs truncate px-4 py-2 text-xs text-rose-700" title={l.error || ''}>
                        {l.error || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <EmptyState icon={<AlertTriangle className="size-5" />} title={errorsOnly ? 'Aucune erreur récente' : 'Aucun appel enregistré'} />
          )}
        </div>
      )}

      {tab === 'reports' &&
        (reports === null ? (
          <Skeleton className="h-64" />
        ) : reports.length ? (
          <div className="space-y-3">
            {reports.map((r) => (
              <Card key={r.id} className={cx('p-4', r.status !== 'ouvert' && 'opacity-70')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={r.kind === 'opposition' ? 'warning' : 'neutral'}>{KIND[r.kind] || r.kind}</Badge>
                    <Badge tone={r.status === 'ouvert' ? 'danger' : 'success'}>{r.status === 'ouvert' ? 'À traiter' : r.status === 'traite' ? 'Traité' : 'Rejeté'}</Badge>
                    <span className="text-xs text-slate-500">{dt(r.created_at)}</span>
                  </div>
                  <span className="text-xs text-slate-500">{[r.siren && `SIREN ${r.siren}`, r.email].filter(Boolean).join(' · ')}</span>
                </div>
                <p className="mt-2 text-sm whitespace-pre-line text-night-800">{r.message}</p>
                {r.status === 'ouvert' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(r.siren || r.email) && (
                      <Button size="sm" variant="danger" onClick={() => handle(r.id, 'traite', true)}>
                        Appliquer l’opposition (exclure et effacer)
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => handle(r.id, 'traite')}>
                      Marquer comme traité
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handle(r.id, 'rejete')}>
                      Rejeter
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Flag className="size-5" />} title="Aucun signalement" />
        ))}
    </div>
  );
}
