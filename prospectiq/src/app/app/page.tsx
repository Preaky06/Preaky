'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, Sparkles, CalendarClock, History, ArrowRight, Target, Building2, BadgeCheck, Bookmark, Send, Percent, Check, Radar } from 'lucide-react';
import { PageTitle } from '@/components/app-shell';
import { Card, CardHeader, EmptyState, Skeleton, buttonClass } from '@/components/ui';
import { BarList, LineChart } from '@/components/charts';
import { CategoryBadge, ConfidenceBadge, ScorePill } from '@/components/score';
import { api } from '@/lib/client';
import { describeSearch } from '@/lib/describe';

interface Dashboard {
  counts: { found: number; qualified: number; analyzed: number; saved: number; contacted: number; qualificationRate: number | null };
  sectors: { id: string | null; label: string; count: number }[];
  activity: { day: string; searches: number; analyses: number; contacts: number }[];
  recentSearches: { id: string; name: string | null; params: Record<string, unknown>; total: number; created_at: string }[];
  recommended: { siren: string; name: string; city: string | null; sector: string | null; score: number; category: string; confidence: string; status: string | null }[];
  followups: { id: string; siren: string; name: string; date: string }[];
  onboarding: { offer: boolean; searches: number; analyses: number; alerts: number; messages: number; prospects: number } | null;
  unread: number;
}

const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Dashboard>('/api/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <EmptyState title="Tableau de bord indisponible">{error}</EmptyState>;
  const c = data?.counts;
  const stats = [
    { label: 'Prospects trouvés', value: c?.found, hint: 'Entreprises distinctes dans vos recherches', icon: Building2, tone: 'bg-electric-50 text-electric-600' },
    { label: 'Prospects qualifiés', value: c?.qualified, hint: 'Analysés avec un score ≥ 60', icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Prospects enregistrés', value: c?.saved, hint: 'Dans votre CRM', icon: Bookmark, tone: 'bg-violet-50 text-violet-600' },
    { label: 'Prospects contactés', value: c?.contacted, hint: 'Statut « Contacté » ou plus loin', icon: Send, tone: 'bg-sky-50 text-sky-700' },
    { label: 'Taux de qualification', value: c?.qualificationRate, unit: ' %', hint: 'Qualifiés / analysés', icon: Percent, tone: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="animate-fade-in">
      <PageTitle
        title="Tableau de bord"
        subtitle="Votre activité de prospection et les opportunités à traiter en priorité."
        action={
          <Link href="/app/recherche" className={buttonClass('accent')}>
            <Search className="size-4" />
            Trouver des prospects
          </Link>
        }
      />
      {data?.onboarding && <Onboarding o={data.onboarding} />}
      {!!data?.unread && (
        <Link href="/app/radar" className="mb-6 flex items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white px-4 py-3 text-sm transition-shadow hover:shadow-card" data-testid="radar-banner">
          <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white">
            <Radar className="size-4" />
          </span>
          <span className="flex-1">
            <b>{data.unread} nouveauté{data.unread > 1 ? 's' : ''} sur votre Radar</b>
            <span className="block text-xs text-slate-500">Créations, cessions, changements de dirigeant ou risques détectés dans vos zones et votre portefeuille.</span>
          </span>
          <ArrowRight className="size-4 text-violet-600" />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map(({ icon: Icon, ...s }) => (
          <Card key={s.label} className="group relative overflow-hidden p-4 transition-shadow hover:shadow-lift" title={s.hint}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-slate-500">{s.label}</p>
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${s.tone}`}>
                <Icon className="size-4" />
              </span>
            </div>
            {data ? (
              <p className="font-display mt-2.5 text-[1.7rem] leading-none font-semibold tracking-[-0.02em] tabular-nums text-night-900" data-testid={`stat-${s.label}`}>
                {s.value === null || s.value === undefined ? 'Aucune donnée' : `${s.value.toLocaleString('fr-FR')}${s.unit || ''}`}
              </p>
            ) : (
              <Skeleton className="mt-2 h-8 w-16" />
            )}
            <p className="mt-2 break-words text-[11px] text-slate-400">{s.hint}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader icon={<Sparkles className="size-4" />} title="Opportunités recommandées" subtitle="Les entreprises analysées au meilleur potentiel, pas encore contactées." />
          <div className="divide-y divide-line">
            {!data && [0, 1, 2].map((i) => <Skeleton key={i} className="m-5 h-12" />)}
            {data && !data.recommended.length && (
              <div className="p-5">
                <EmptyState icon={<Target className="size-5" />} title="Aucune entreprise analysée" action={<Link href="/app/recherche" className={buttonClass('primary')}>Lancer une recherche</Link>}>
                  Recherchez des entreprises puis analysez-les : les plus prometteuses apparaîtront ici.
                </EmptyState>
              </div>
            )}
            {data?.recommended.map((r) => (
              <Link key={r.siren} href={`/app/entreprise/${r.siren}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50">
                <ScorePill score={r.score} />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-night-900">{r.name}</p>
                  <p className="break-words text-xs text-slate-500">{[r.sector, r.city].filter(Boolean).join(' · ') || 'Non renseigné'}</p>
                </div>
                <div className="hidden flex-col items-end gap-1 sm:flex">
                  <CategoryBadge category={{ id: r.category }} />
                  <ConfidenceBadge confidence={r.confidence} />
                </div>
                <ArrowRight className="size-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Répartition par secteur" subtitle="Entreprises analysées" />
          <div className="p-5">
            {!data ? <Skeleton className="h-40" /> : data.sectors.length ? <BarList items={data.sectors.slice(0, 7).map((s) => ({ label: s.label, value: s.count }))} /> : <p className="text-sm text-slate-500">Aucune donnée pour l’instant.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Évolution de votre prospection" subtitle="30 derniers jours" />
          <div className="p-5">
            {!data ? (
              <Skeleton className="h-52" />
            ) : (
              <LineChart
                labels={data.activity.map((a) => a.day)}
                formatLabel={fmtDay}
                series={[
                  { name: 'Recherches', values: data.activity.map((a) => a.searches) },
                  { name: 'Analyses', values: data.activity.map((a) => a.analyses) },
                  { name: 'Contacts', values: data.activity.map((a) => a.contacts) },
                ]}
              />
            )}
          </div>
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardHeader icon={<CalendarClock className="size-4" />} title="Relances à venir" subtitle="7 prochains jours" />
            <ul className="divide-y divide-line">
              {data && !data.followups.length && <li className="px-5 py-4 text-sm text-slate-500">Aucune relance planifiée.</li>}
              {data?.followups.map((f) => (
                <li key={f.id}>
                  <Link href={`/app/entreprise/${f.siren}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50">
                    <span className="break-words font-medium">{f.name}</span>
                    <span className={new Date(f.date) <= new Date() ? 'font-semibold text-rose-700' : 'text-slate-500'}>{new Date(`${f.date}T12:00:00`).toLocaleDateString('fr-FR')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader icon={<History className="size-4" />} title="Dernières recherches" action={<Link href="/app/recherches" className="text-sm font-semibold text-electric-700 hover:underline">Tout voir</Link>} />
            <ul className="divide-y divide-line">
              {data && !data.recentSearches.length && <li className="px-5 py-4 text-sm text-slate-500">Aucune recherche pour l’instant.</li>}
              {data?.recentSearches.map((s) => (
                <li key={s.id}>
                  <Link href={`/app/recherche?depuis=${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                    <span className="break-words">{s.name || describeSearch(s.params)}</span>
                    <span className="shrink-0 text-xs text-slate-500">{s.total.toLocaleString('fr-FR')} résultats</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Démarrage guidé : les étapes qui mènent à la première vraie valeur (calculées sur les données du compte). */
function Onboarding({ o }: { o: NonNullable<Dashboard['onboarding']> }) {
  const steps = [
    { done: o.offer, label: 'Décrire votre offre', hint: 'Le score et les messages s’adaptent à ce que vous vendez.', href: '/app/parametres' },
    { done: o.searches > 0, label: 'Lancer une première recherche', hint: 'Une zone et un secteur suffisent.', href: '/app/recherche' },
    { done: o.analyses >= 3, label: 'Analyser 3 entreprises', hint: `${Math.min(3, o.analyses)}/3 : site web, annonces légales, score détaillé.`, href: '/app/recherche' },
    { done: o.alerts > 0, label: 'Activer une alerte Radar', hint: 'Les nouvelles opportunités de votre zone, chaque matin.', href: '/app/recherche' },
    { done: o.messages > 0, label: 'Rédiger un premier message', hint: 'Une accroche fondée sur un fait réel.', href: '/app/messages' },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.find((s) => !s.done)!;
  return (
    <Card className="mb-6 overflow-hidden" data-testid="onboarding">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <p className="font-display text-[1.05rem] font-semibold tracking-[-0.02em]">Bien démarrer avec Pro Spectre</p>
          <p className="text-[13px] text-slate-500">
            {done} étape{done > 1 ? 's' : ''} sur {steps.length} · prochaine : {next.label.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={done} aria-valuemax={steps.length} aria-label="Progression du démarrage">
            <div className="bg-spectrum h-full rounded-full transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
          <Link href={next.href} className={buttonClass('accent', 'sm')}>
            Continuer
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
      <ol className="grid grid-cols-[minmax(0,1fr)] divide-y divide-line sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Link href={s.href} className="flex h-full gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50">
              <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${s.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}</span>
              <span className="min-w-0">
                <span className={`block text-[13px] font-semibold ${s.done ? 'text-slate-400 line-through' : 'text-night-900'}`}>{s.label}</span>
                <span className="block text-xs text-slate-500">{s.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
