'use client';
// Radar : fil des nouveautés (zones surveillées, portefeuille), alertes et résumé e-mail.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Radar, Sparkles, ShieldAlert, Activity, ExternalLink, MessageSquareText, ArrowRight, Trash2, Search, CheckCheck, Mail, RefreshCw, MapPin, Eye } from 'lucide-react';
import { PageTitle } from '@/components/app-shell';
import { Button, Card, CardHeader, EmptyState, Skeleton, Badge, buttonClass, cx } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api, toastError } from '@/lib/client';

interface Notification {
  id: string;
  kind: 'zone' | 'signal' | 'risk' | string;
  siren: string | null;
  title: string;
  detail: string | null;
  url: string | null;
  source_url: string | null;
  event_date: string | null;
  created_at: string;
  read_at: string | null;
}
interface Alert {
  id: string;
  name: string;
  description: string;
  zone: string | null;
  checkedAt: string | null;
}
interface RadarData {
  alerts: Alert[];
  notifications: Notification[];
  unread: number;
  limits: { alerts: number; used: number };
  digest: 'quotidien' | 'hebdo' | 'aucun';
  mailConfigured: boolean;
  checkedAt: string | null;
  watched: number;
}

const KIND = {
  zone: { label: 'Nouvelle opportunité', icon: Sparkles, tone: 'bg-violet-50 text-violet-700 ring-violet-100' },
  signal: { label: 'Signal portefeuille', icon: Activity, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  risk: { label: 'Alerte risque', icon: ShieldAlert, tone: 'bg-rose-50 text-rose-700 ring-rose-100' },
} as const;

const TABS = [
  { id: 'all', label: 'Tout' },
  { id: 'zone', label: 'Nouvelles opportunités' },
  { id: 'signal', label: 'Portefeuille' },
  { id: 'risk', label: 'Risques' },
] as const;

const when = (iso: string | null) => {
  if (!iso) return 'jamais';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 2) return 'à l’instant';
  if (diff < 60) return `il y a ${Math.round(diff)} min`;
  if (diff < 24 * 60) return `il y a ${Math.round(diff / 60)} h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Aujourd’hui';
  if (d.toDateString() === y.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

export default function RadarPage() {
  const toast = useToast();
  const [data, setData] = useState<RadarData | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all');
  const [running, setRunning] = useState(false);

  const load = useCallback(() => api<RadarData>('/api/radar').then(setData).catch((e) => toastError(toast, e)), [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async () => {
    setRunning(true);
    try {
      const r = await api<{ created: number; alerts: number; watched: number; examined: number }>('/api/radar/run', { body: {} });
      toast(r.created ? `${r.created} nouveauté${r.created > 1 ? 's' : ''} détectée${r.created > 1 ? 's' : ''}.` : `Rien de nouveau : ${r.examined} annonce${r.examined > 1 ? 's' : ''} de zone et ${r.watched} entreprise${r.watched > 1 ? 's' : ''} du portefeuille vérifiées.`, 'success');
      await load();
    } catch (e) {
      toastError(toast, e);
    } finally {
      setRunning(false);
    }
  };
  const markRead = async (ids?: string[]) => {
    await api('/api/radar/read', { body: ids ? { ids } : { all: true } }).catch(() => {});
    setData((d) => (d ? { ...d, unread: ids ? Math.max(0, d.unread - ids.length) : 0, notifications: d.notifications.map((n) => (!ids || ids.includes(n.id) ? { ...n, read_at: n.read_at || new Date().toISOString() } : n)) } : d));
  };
  const removeAlert = async (id: string) => {
    try {
      await api(`/api/radar/alerts/${id}`, { method: 'DELETE' });
      toast('Alerte désactivée.', 'success');
      load();
    } catch (e) {
      toastError(toast, e);
    }
  };
  const setDigest = async (digest: RadarData['digest']) => {
    try {
      await api('/api/radar', { method: 'PUT', body: { digest } });
      setData((d) => (d ? { ...d, digest } : d));
      toast('Préférence enregistrée.', 'success');
    } catch (e) {
      toastError(toast, e);
    }
  };

  const list = useMemo(() => (data?.notifications || []).filter((n) => tab === 'all' || n.kind === tab), [data, tab]);
  const groups = useMemo(() => {
    const g: { day: string; items: Notification[] }[] = [];
    for (const n of list) {
      const d = dayLabel(n.created_at);
      if (!g.length || g[g.length - 1].day !== d) g.push({ day: d, items: [] });
      g[g.length - 1].items.push(n);
    }
    return g;
  }, [list]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, (data?.notifications || []).filter((n) => !n.read_at && (t.id === 'all' || n.kind === t.id)).length])), [data]);

  return (
    <div className="animate-fade-in">
      <PageTitle
        title="Radar"
        subtitle="Les entreprises qui bougent dans vos zones, et les nouvelles annonces sur votre portefeuille. Vérifié automatiquement chaque matin."
        action={
          <Button variant="accent" onClick={run} loading={running} data-testid="radar-run">
            {!running && <RefreshCw className="size-4" />}
            Vérifier maintenant
          </Button>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
        {[
          { label: 'Nouveautés non lues', value: data?.unread, icon: Radar, tone: 'bg-violet-50 text-violet-700' },
          { label: 'Alertes de zone actives', value: data ? `${data.limits.used} / ${data.limits.alerts}` : undefined, icon: MapPin, tone: 'bg-sky-50 text-sky-700' },
          { label: 'Entreprises du portefeuille surveillées', value: data?.watched, icon: Eye, tone: 'bg-emerald-50 text-emerald-700' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="flex items-center gap-4 p-4">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>
              <Icon className="size-5" />
            </span>
            <div>
              {data ? <p className="font-display text-[1.6rem] leading-none font-semibold tracking-[-0.02em] tabular-nums">{value}</p> : <Skeleton className="h-7 w-14" />}
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">Dernière vérification : {when(data?.checkedAt || null).replace(/\.$/, '')}. Sources : annonces officielles du BODACC, entreprises vérifiées dans le répertoire SIRENE (oppositions au démarchage exclues).</p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Type de nouveauté">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors', tab === t.id ? 'bg-night-900 text-white' : 'text-slate-600 hover:bg-slate-100')}
                >
                  {t.label}
                  {counts[t.id] > 0 && <span className={cx('rounded-full px-1.5 text-[11px] font-semibold tabular-nums', tab === t.id ? 'bg-white/20' : 'bg-electric-100 text-electric-700')}>{counts[t.id]}</span>}
                </button>
              ))}
            </div>
            {!!data?.unread && (
              <Button variant="ghost" size="sm" onClick={() => markRead()}>
                <CheckCheck className="size-3.5" />
                Tout marquer comme lu
              </Button>
            )}
          </div>
          {!data && (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          )}
          {data && !list.length && (
            <div className="p-5">
              <EmptyState icon={<Radar className="size-5" />} title={data.notifications.length ? 'Rien dans cette catégorie' : 'Votre Radar est prêt'}>
                {data.notifications.length ? (
                  'Les nouveautés apparaîtront ici dès qu’elles seront détectées.'
                ) : (
                  <>Créez une alerte depuis une recherche (zone + secteur) et ajoutez des entreprises à votre CRM : chaque matin, le Radar vous signale les créations, cessions, changements de dirigeant et procédures qui les concernent.</>
                )}
              </EmptyState>
            </div>
          )}
          <div data-testid="radar-feed">
            {groups.map((g) => (
              <section key={g.day}>
                <h2 className="bg-canvas/70 px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase first-letter:uppercase">{g.day}</h2>
                <ul className="divide-y divide-line">
                  {g.items.map((n) => {
                    const k = KIND[n.kind as keyof typeof KIND] || KIND.zone;
                    const Icon = k.icon;
                    return (
                      <li key={n.id} className={cx('group flex gap-3 px-4 py-3.5 transition-colors', !n.read_at && 'bg-electric-50/40')} data-testid="radar-item">
                        <span className={cx('mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset', k.tone)}>
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-night-900">
                              {!n.read_at && <span className="mr-1.5 inline-block size-2 rounded-full bg-electric-500 align-middle" aria-label="Non lu" />}
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[11px] text-slate-400">{when(n.created_at)}</span>
                          </div>
                          {n.detail && <p className="mt-0.5 text-[13px] text-slate-600">{n.detail}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {n.url && (
                              <Link href={n.url} onClick={() => markRead([n.id])} className={buttonClass('secondary', 'sm')}>
                                Voir la fiche
                                <ArrowRight className="size-3.5" />
                              </Link>
                            )}
                            {n.siren && n.kind !== 'risk' && (
                              <Link href={`/app/messages?siren=${n.siren}`} onClick={() => markRead([n.id])} className={buttonClass('ghost', 'sm')}>
                                <MessageSquareText className="size-3.5" />
                                Rédiger un message
                              </Link>
                            )}
                            {n.source_url && (
                              <a href={n.source_url} target="_blank" rel="noopener noreferrer" className={buttonClass('ghost', 'sm')}>
                                <ExternalLink className="size-3.5" />
                                Annonce officielle
                              </a>
                            )}
                            {!n.read_at && (
                              <button type="button" onClick={() => markRead([n.id])} className="ml-auto text-xs font-medium text-slate-400 hover:text-night-900">
                                Marquer comme lu
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={<MapPin className="size-4" />} title="Alertes de zone" subtitle={data ? `${data.limits.used} sur ${data.limits.alerts} incluses dans votre offre` : ' '} />
            <div className="divide-y divide-line">
              {data?.alerts.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 px-5 py-3.5" data-testid="radar-alert">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">{a.name}</p>
                    <p className="break-words text-xs text-slate-500">
                      {a.zone ? `Zone : ${a.zone}` : 'Zone non définie'} · vérifiée {when(a.checkedAt)}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeAlert(a.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Désactiver l’alerte ${a.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <div className="px-5 py-4">
                <p className="text-[13px] text-slate-600">Lancez une recherche avec une zone (code postal, ville, département ou région) et un secteur, puis cliquez sur « Créer une alerte Radar ».</p>
                <Link href="/app/recherche" className={cx(buttonClass('secondary', 'sm'), 'mt-3')}>
                  <Search className="size-3.5" />
                  Nouvelle recherche
                </Link>
              </div>
            </div>
          </Card>

          <Card id="reglages">
            <CardHeader icon={<Mail className="size-4" />} title="Résumé par e-mail" subtitle="Les nouveautés non lues, regroupées dans un seul e-mail." />
            <div className="space-y-2 p-5" role="radiogroup" aria-label="Fréquence du résumé">
              {(
                [
                  ['quotidien', 'Chaque matin', 'Pour réagir dans la journée'],
                  ['hebdo', 'Chaque semaine', 'Un point le lundi matin'],
                  ['aucun', 'Jamais', 'Consultez le Radar dans l’application'],
                ] as const
              ).map(([id, label, hint]) => (
                <label key={id} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors', data?.digest === id ? 'border-electric-300 bg-electric-50' : 'border-line hover:bg-slate-50')}>
                  <input type="radio" name="digest" className="accent-electric-600" checked={data?.digest === id} onChange={() => setDigest(id)} />
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-slate-500">{hint}</span>
                  </span>
                </label>
              ))}
              {data && !data.mailConfigured && (
                <p className="pt-1 text-xs text-amber-700">
                  L’envoi d’e-mails n’est pas encore configuré sur ce serveur : les résumés seront envoyés dès qu’il le sera.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="size-4 text-rose-600" />
              Surveillez aussi vos clients
            </p>
            <p className="mt-1.5 text-[13px] text-slate-600">
              Ajoutez vos clients au CRM avec le statut « Client » : une procédure collective publiée à leur sujet vous est signalée, pour sécuriser vos factures en cours.
            </p>
            <Badge tone="neutral" className="mt-3">
              Source : BODACC, annonces officielles
            </Badge>
          </Card>
        </div>
      </div>
    </div>
  );
}
