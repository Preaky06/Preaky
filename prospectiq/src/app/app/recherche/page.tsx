'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, Star, Plus, Check, Sparkles, MapPin, Building2, CalendarDays, Save, AlertTriangle, Info, Loader2, Radar } from 'lucide-react';
import { PageTitle } from '@/components/app-shell';
import { Button, Card, Checkbox, EmptyState, Field, Input, Modal, Pagination, Select, Skeleton, Badge, cx } from '@/components/ui';
import { CategoryBadge, ConfidenceBadge, ScorePill } from '@/components/score';
import { useToast } from '@/components/toast';
import { api, toastError, ApiError } from '@/lib/client';
import { SECTORS, SIZES } from '@/lib/sectors';
import { displayName } from '@/lib/insights';
import regions from '@/data/regions.json';
import departements from '@/data/departements.json';
import type { ResultRow, RowFacts } from '@/lib/search';
import type { Signal } from '@/lib/connectors/types';
import type { AnalysisView } from '@/lib/analysis';

interface Filters {
  q: string;
  sector: string;
  locMode: 'zone' | 'ville' | 'rayon';
  region: string;
  department: string;
  postalCode: string;
  commune: { nom: string; code: string; lat: number | null; lon: number | null } | null;
  radiusKm: number;
  sizes: string[];
  excludeLarge: boolean;
  minEstablishments: number;
  signals: string[];
  analysisFilters: string[];
  hideInPortfolio: boolean;
}

const EMPTY: Filters = { q: '', sector: '', locMode: 'zone', region: '', department: '', postalCode: '', commune: null, radiusKm: 5, sizes: [], excludeLarge: true, minEstablishments: 0, signals: [], analysisFilters: [], hideInPortfolio: false };

const LIVE_SIGNALS = [
  { id: 'recent_creation', label: 'Entreprise créée il y a moins d’un an', hint: 'Source : SIRENE' },
  { id: 'recent_change', label: 'Actualité récente publiée (vente, changement de nom, d’adresse, de dirigeant…)', hint: 'Source : BODACC, 24 mois' },
  { id: 'no_risk', label: 'Exclure les entreprises en difficulté', hint: 'Procédures collectives, dissolutions' },
];

const ANALYSIS_SIGNALS: { id: string; label: string; test: (f: RowFacts) => boolean }[] = [
  { id: 'no_website', label: 'Absence de site web (non trouvé)', test: (f) => f.websiteStatus === 'not_found' },
  { id: 'weak_site', label: 'Site internet peu performant', test: (f) => f.findings.some((x) => ['no_https', 'no_viewport', 'slow', 'old_copyright'].includes(x)) },
  { id: 'no_instagram', label: 'Pas d’Instagram relié au site', test: (f) => f.findings.includes('no_instagram') || f.findings.includes('no_socials') },
  { id: 'irregular', label: 'Communication irrégulière (contenu ancien)', test: (f) => f.findings.includes('stale_content') || f.findings.includes('old_copyright') },
  { id: 'low_visibility', label: 'Faible visibilité digitale', test: (f) => f.websiteStatus === 'not_found' || f.findings.filter((x) => ['no_description', 'no_structured', 'no_socials', 'no_h1', 'no_title'].includes(x)).length >= 2 },
  { id: 'bad_reviews', label: 'Avis clients mitigés', test: (f) => f.rating !== null && f.rating < 4 && (f.reviews || 0) >= 10 },
];

const UNAVAILABLE = [
  { label: 'Activité Instagram (fréquence de publication)', why: 'Nécessite un connecteur Instagram autorisé (Graph API), non configuré.' },
  { label: 'Recrutement de profils marketing', why: 'Nécessite un connecteur d’offres d’emploi (France Travail), non configuré.' },
];

interface SearchResponse {
  rows: ResultRow[];
  total: number;
  page: number;
  totalPages: number;
  excluded: { optOut: number; suppressed: number; inactive: number };
  source: string;
  signalsAvailable: boolean;
  searchId: string | null;
}

function toPayload(f: Filters, page: number) {
  const p: Record<string, unknown> = { page, excludeLarge: f.excludeLarge, sizes: f.sizes, signals: f.signals, hideInPortfolio: f.hideInPortfolio };
  if (f.q.trim()) p.q = f.q.trim();
  if (f.sector && f.sector !== 'autres') p.sector = f.sector;
  if (f.minEstablishments > 0) p.minEstablishments = f.minEstablishments;
  if (f.locMode === 'zone') {
    if (f.department) p.department = f.department;
    else if (f.region) p.region = f.region;
  } else if (f.locMode === 'ville') {
    if (f.commune) {
      p.cityCode = f.commune.code;
      p.city = f.commune.nom;
    } else if (f.postalCode) p.postalCode = f.postalCode;
  } else if (f.commune?.lat != null && f.commune.lon != null) {
    p.lat = f.commune.lat;
    p.lon = f.commune.lon;
    p.radiusKm = f.radiusKm;
    p.city = f.commune.nom;
  }
  return p;
}

function fromParams(p: Record<string, unknown>): Filters {
  const f = { ...EMPTY };
  f.q = String(p.q || '');
  f.sector = String(p.sector || '');
  f.sizes = (p.sizes as string[]) || [];
  f.excludeLarge = p.excludeLarge !== false;
  f.signals = (p.signals as string[]) || [];
  f.minEstablishments = Number(p.minEstablishments || 0);
  if (p.lat != null && p.radiusKm) {
    f.locMode = 'rayon';
    f.commune = { nom: String(p.city || 'Commune'), code: '', lat: Number(p.lat), lon: Number(p.lon) };
    f.radiusKm = Number(p.radiusKm);
  } else if (p.cityCode || p.postalCode) {
    f.locMode = 'ville';
    if (p.cityCode) f.commune = { nom: String(p.city || p.cityCode), code: String(p.cityCode), lat: null, lon: null };
    f.postalCode = String(p.postalCode || '');
  } else {
    f.region = String(p.region || '');
    f.department = String(p.department || '');
  }
  return f;
}

function factsFromAnalysis(a: AnalysisView): RowFacts {
  const w = a.enrichment.website;
  return { websiteStatus: w?.status || null, websiteUrl: w?.url || null, findings: (w?.findings || []).map((x) => x.id), socials: Object.keys(w?.socials || {}), rating: a.enrichment.places?.matched ? a.enrichment.places.rating ?? null : null, reviews: a.enrichment.places?.matched ? a.enrichment.places.reviews ?? null : null };
}

function CommunePicker({ value, onChange }: { value: Filters['commune']; onChange: (c: Filters['commune']) => void }) {
  const [term, setTerm] = useState(value?.nom || '');
  const [items, setItems] = useState<{ nom: string; code: string; codesPostaux: string[]; codeDepartement: string; lat: number | null; lon: number | null }[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setTerm(value?.nom || ''), [value?.nom]);
  return (
    <div className="relative">
      <Input
        value={term}
        placeholder="Nom de ville ou code postal"
        aria-label="Ville"
        data-testid="commune-input"
        onChange={(e) => {
          const t = e.target.value;
          setTerm(t);
          onChange(null);
          if (timer.current) clearTimeout(timer.current);
          if (t.trim().length < 2) return setItems([]);
          timer.current = setTimeout(async () => {
            try {
              const r = await api<{ communes: typeof items }>(`/api/geo/communes?q=${encodeURIComponent(t)}`);
              setItems(r.communes);
              setOpen(true);
            } catch {
              setItems([]);
            }
          }, 250);
        }}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && items.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-pop" role="listbox">
          {items.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ nom: c.nom, code: c.code, lat: c.lat, lon: c.lon });
                  setTerm(c.nom);
                  setOpen(false);
                }}
              >
                <span>{c.nom}</span>
                <span className="text-xs text-slate-500">
                  {c.codesPostaux[0]} · {c.codeDepartement}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SignalChip({ s }: { s: Signal }) {
  return (
    <Badge wrap tone={s.kind === 'risk' ? 'danger' : s.kind === 'opportunity' ? 'accent' : 'neutral'} title={`${s.source}${s.date ? ` · ${new Date(s.date).toLocaleDateString('fr-FR')}` : ''}`}>
      {s.kind === 'risk' && <AlertTriangle className="size-3" />}
      {s.label}
      {s.date && <span className="font-normal opacity-70">· {new Date(s.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>}
    </Badge>
  );
}

function SearchPage() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [f, setF] = useState<Filters>(EMPTY);
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [onlyAnalyzed, setOnlyAnalyzed] = useState(false);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k: 'sizes' | 'signals' | 'analysisFilters', id: string) => setF((x) => ({ ...x, [k]: x[k].includes(id) ? x[k].filter((i) => i !== id) : [...x[k], id] }));

  const run = useCallback(
    async (filters: Filters, p = 1) => {
      if (filters.locMode === 'rayon' && !filters.commune?.lat) return toast('Choisissez une ville dans la liste pour la recherche autour d’un point.', 'error');
      setLoading(true);
      try {
        const r = await api<SearchResponse>('/api/search', { body: toPayload(filters, p) });
        setRes(r);
        setShowFilters(false);
      } catch (e) {
        toastError(toast, e);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    const from = params.get('depuis');
    if (!from) return;
    api<{ searches: { id: string; params: Record<string, unknown> }[] }>('/api/searches')
      .then((r) => {
        const s = r.searches.find((x) => x.id === from);
        if (s) {
          const filters = fromParams(s.params);
          setF(filters);
          run(filters, Number(s.params.page || 1));
        }
      })
      .catch(() => {});
  }, [params, run]);

  const deps = useMemo(() => (f.region ? departements.filter((d) => d.codeRegion === f.region) : departements), [f.region]);

  const patchRow = (siren: string, patch: Partial<ResultRow>) => setRes((r) => (r ? { ...r, rows: r.rows.map((row) => (row.company.siren === siren ? { ...row, ...patch } : row)) } : r));

  /** 'ok' = analysée ; 'stop' = quota atteint (inutile de continuer) ; 'fail' = échec ponctuel. */
  const analyze = async (row: ResultRow, silent = false): Promise<'ok' | 'stop' | 'fail'> => {
    setBusy((b) => ({ ...b, [row.company.siren]: 'analyze' }));
    try {
      const r = await api<{ analysis: AnalysisView }>(`/api/companies/${row.company.siren}/analyze`, { body: {} });
      patchRow(row.company.siren, { score: r.analysis.score, analyzed: true, facts: factsFromAnalysis(r.analysis) });
      if (!silent) {
        toast(`${displayName(row.company)} analysée : ${r.analysis.score.total}/100.`, 'success');
        router.refresh();
      }
      return 'ok';
    } catch (e) {
      const status = (e as ApiError).status;
      if (!silent || status === 402) toastError(toast, e);
      return status === 402 ? 'stop' : 'fail';
    } finally {
      setBusy((b) => Object.fromEntries(Object.entries(b).filter(([k]) => k !== row.company.siren)));
    }
  };

  const analyzeAll = async () => {
    if (!res) return;
    const todo = res.rows.filter((r) => !r.analyzed);
    setBulk({ done: 0, total: todo.length });
    let failed = 0;
    let stopped = false;
    for (let i = 0; i < todo.length; i++) {
      const result = await analyze(todo[i], true);
      setBulk({ done: i + 1, total: todo.length });
      if (result === 'fail') failed++;
      if (result === 'stop') {
        stopped = true;
        break;
      }
    }
    setBulk(null);
    router.refresh();
    if (stopped) return;
    if (failed) toast(`${todo.length - failed} entreprise(s) analysée(s), ${failed} échec(s) : relancez l’analyse de celles qui restent.`, 'error');
    else toast('Analyse des résultats terminée.', 'success');
  };

  const addToCrm = async (row: ResultRow, favorite?: boolean) => {
    setBusy((b) => ({ ...b, [row.company.siren]: 'crm' }));
    try {
      const r = await api<{ id: string; created: boolean }>('/api/prospects', { body: { siren: row.company.siren, ...(favorite !== undefined ? { favorite } : {}) } });
      patchRow(row.company.siren, { prospect: { id: r.id, status: row.prospect?.status || 'nouveau', favorite: favorite ?? row.prospect?.favorite ?? false } });
      toast(favorite !== undefined ? (favorite ? 'Ajouté aux favoris.' : 'Retiré des favoris.') : r.created ? 'Ajouté au CRM.' : 'Déjà dans votre CRM.', 'success');
    } catch (e) {
      toastError(toast, e);
    } finally {
      setBusy((b) => Object.fromEntries(Object.entries(b).filter(([k]) => k !== row.company.siren)));
    }
  };

  const [alerting, setAlerting] = useState(false);
  const createAlert = async () => {
    if (!res?.searchId) return;
    setAlerting(true);
    try {
      const r = await api<{ created: number; examined: number }>('/api/radar/alerts', { body: { searchId: res.searchId } });
      toast(
        r.created ? `Alerte Radar créée : ${r.created} entreprise${r.created > 1 ? 's' : ''} détectée${r.created > 1 ? 's' : ''} ces 7 derniers jours.` : 'Alerte Radar créée : la zone sera surveillée chaque matin.',
        'success',
        { label: 'Ouvrir le Radar', href: '/app/radar' },
      );
    } catch (e) {
      toastError(toast, e);
    } finally {
      setAlerting(false);
    }
  };

  const saveSearch = async () => {
    if (!res?.searchId) return;
    try {
      await api(`/api/searches/${res.searchId}`, { method: 'PATCH', body: { name: saveName, saved: true } });
      toast('Recherche sauvegardée.', 'success');
      setSaveOpen(false);
    } catch (e) {
      toastError(toast, e);
    }
  };

  const rows = (res?.rows || []).filter((r) => {
    if (onlyAnalyzed && !r.analyzed) return false;
    if (!f.analysisFilters.length) return true;
    if (!r.facts) return !onlyAnalyzed && false;
    return f.analysisFilters.every((id) => ANALYSIS_SIGNALS.find((s) => s.id === id)!.test(r.facts!));
  });
  const notAnalyzed = res ? res.rows.filter((r) => !r.analyzed).length : 0;

  const filtersPanel = (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(f, 1);
      }}
    >
      <Field label="Mots-clés" htmlFor="q" hint="Nom d’entreprise, activité, adresse…">
        <Input id="q" value={f.q} onChange={(e) => set('q', e.target.value)} placeholder="Ex. : joaillier, agence immobilière" data-testid="q" />
      </Field>
      <Field label="Secteur d’activité" htmlFor="sector">
        <Select id="sector" value={f.sector} onChange={(e) => set('sector', e.target.value)} data-testid="sector">
          <option value="">Tous les secteurs</option>
          {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="space-y-3">
        <legend className="text-[13px] font-semibold text-night-800">Localisation</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          {(
            [
              ['zone', 'Zone'],
              ['ville', 'Ville'],
              ['rayon', 'Rayon'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => set('locMode', id)} className={cx('rounded-md py-1.5', f.locMode === id ? 'bg-white text-night-900 shadow-sm' : 'text-slate-500')} aria-pressed={f.locMode === id}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Pays : France (données SIRENE).</p>
        {f.locMode === 'zone' && (
          <>
            <Select aria-label="Région" value={f.region} onChange={(e) => setF((x) => ({ ...x, region: e.target.value, department: '' }))}>
              <option value="">Toutes les régions</option>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.nom}
                </option>
              ))}
            </Select>
            <Select aria-label="Département" value={f.department} onChange={(e) => set('department', e.target.value)} data-testid="department">
              <option value="">Tous les départements</option>
              {deps.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} · {d.nom}
                </option>
              ))}
            </Select>
          </>
        )}
        {f.locMode === 'ville' && (
          <>
            <CommunePicker value={f.commune} onChange={(c) => set('commune', c)} />
            <Input aria-label="Code postal" placeholder="ou code postal (5 chiffres)" inputMode="numeric" maxLength={5} value={f.postalCode} onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, ''))} data-testid="postal-code" />
          </>
        )}
        {f.locMode === 'rayon' && (
          <>
            <CommunePicker value={f.commune} onChange={(c) => set('commune', c)} />
            <label className="block text-xs text-slate-600">
              Rayon : <b className="text-night-900">{f.radiusKm} km</b>
              <input type="range" min={1} max={50} value={f.radiusKm} onChange={(e) => set('radiusKm', Number(e.target.value))} className="mt-1 w-full accent-electric-600" />
            </label>
          </>
        )}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-[13px] font-semibold text-night-800">Taille estimée</legend>
        {SIZES.map((s) => (
          <Checkbox key={s.id} label={s.label} checked={f.sizes.includes(s.id)} onChange={() => toggle('sizes', s.id)} />
        ))}
        <Checkbox label="Exclure les ETI et grands groupes" checked={f.excludeLarge} onChange={(e) => set('excludeLarge', e.target.checked)} />
      </fieldset>
      <Field label="Établissements (minimum)" htmlFor="estab">
        <Input id="estab" type="number" min={0} max={1000} value={f.minEstablishments || ''} placeholder="Aucun minimum" onChange={(e) => set('minEstablishments', Number(e.target.value) || 0)} />
      </Field>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-[13px] font-semibold text-night-800">Signaux commerciaux</legend>
        {LIVE_SIGNALS.map((s) => (
          <Checkbox key={s.id} label={s.label} hint={s.hint} checked={f.signals.includes(s.id)} onChange={() => toggle('signals', s.id)} />
        ))}
        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Après analyse des sites</p>
        {ANALYSIS_SIGNALS.map((s) => (
          <Checkbox key={s.id} label={s.label} checked={f.analysisFilters.includes(s.id)} onChange={() => toggle('analysisFilters', s.id)} />
        ))}
        {UNAVAILABLE.map((u) => (
          <Checkbox key={u.label} label={u.label} hint={u.why} disabled className="opacity-60" />
        ))}
      </fieldset>
      <Checkbox label="Masquer les entreprises déjà dans mon CRM" checked={f.hideInPortfolio} onChange={(e) => set('hideInPortfolio', e.target.checked)} />
      <div className="sticky bottom-0 flex gap-2 bg-white pt-2 pb-1">
        <Button type="submit" variant="accent" className="flex-1" loading={loading} data-testid="run-search">
          <Search className="size-4" />
          Lancer la recherche
        </Button>
        <Button variant="ghost" onClick={() => setF(EMPTY)}>
          Effacer
        </Button>
      </div>
    </form>
  );

  return (
    <div className="animate-fade-in">
      <PageTitle title="Recherche de prospects" subtitle="Données officielles SIRENE, RNE et BODACC. Les entreprises opposées à la prospection sont exclues automatiquement." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[320px_1fr]">
        <div>
          <Button variant="secondary" className="mb-3 w-full lg:hidden" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal className="size-4" />
            {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          </Button>
          <Card className={cx('p-5 lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto', showFilters || !res ? 'block' : 'hidden')}>{filtersPanel}</Card>
        </div>
        <div className="min-w-0 space-y-4">
          {!res && !loading && (
            <EmptyState icon={<Search className="size-5" />} title="Lancez votre première recherche">
              Combinez un secteur, une zone et des signaux. Exemples : restauration dans le 06, agences immobilières à Lyon, bijouteries dans un rayon de 10 km autour de Nantes.
            </EmptyState>
          )}
          {loading && !res && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
          {res && (
            <>
              <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="text-sm">
                  <b className="text-night-900" data-testid="result-total">
                    {res.total.toLocaleString('fr-FR')} entreprises
                  </b>{' '}
                  <span className="text-slate-500">
                    · page {res.page} sur {Math.max(1, res.totalPages).toLocaleString('fr-FR')} · triées par score
                  </span>
                  {res.excluded.optOut + res.excluded.suppressed > 0 && (
                    <p className="mt-0.5 text-xs text-slate-500" data-testid="excluded-note">
                      {res.excluded.optOut + res.excluded.suppressed} exclue(s) sur cette page : opposition à la prospection.
                    </p>
                  )}
                  {!res.signalsAvailable && <p className="mt-0.5 text-xs text-amber-700">BODACC indisponible : signaux non évalués pour cette recherche.</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Checkbox label="Uniquement les analysées" checked={onlyAnalyzed} onChange={(e) => setOnlyAnalyzed(e.target.checked)} className="mr-2 self-center text-xs" />
                  <Button variant="secondary" size="sm" disabled={!notAnalyzed || !!bulk} onClick={analyzeAll} data-testid="analyze-all">
                    {bulk ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    {bulk ? `Analyse ${bulk.done}/${bulk.total}` : `Analyser la page (${notAnalyzed})`}
                  </Button>
                  <Button variant="secondary" size="sm" disabled={!res.searchId} onClick={() => setSaveOpen(true)}>
                    <Save className="size-3.5" />
                    Sauvegarder
                  </Button>
                  <Button variant="accent" size="sm" disabled={!res.searchId} loading={alerting} onClick={createAlert} data-testid="create-alert" title="Surveiller chaque matin les nouvelles entreprises et cessions de cette zone et de ce secteur">
                    {!alerting && <Radar className="size-3.5" />}
                    Créer une alerte Radar
                  </Button>
                </div>
              </Card>
              {f.analysisFilters.length > 0 && notAnalyzed > 0 && (
                <p className="flex items-center gap-2 rounded-lg bg-electric-50 px-4 py-2.5 text-sm text-electric-700">
                  <Info className="size-4" />
                  Les filtres « après analyse » ne s’appliquent qu’aux entreprises analysées. Analysez la page pour les appliquer à tous les résultats.
                </p>
              )}
              {!rows.length && <EmptyState title="Aucun résultat avec ces filtres">Élargissez la zone, retirez un signal ou changez de page.</EmptyState>}
              <ul className="space-y-3" data-testid="results">
                {rows.map((r) => {
                  const c = r.company;
                  return (
                    <li key={c.siren}>
                      <Card className="flex flex-col gap-4 p-4 transition-shadow hover:shadow-pop sm:flex-row sm:items-start">
                        <ScorePill score={r.score.total} preliminary={!r.analyzed} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/app/entreprise/${c.siren}`} className="text-[15px] font-semibold text-night-900 hover:text-electric-700" data-testid="result-name">
                              {displayName(c)}
                            </Link>
                            <CategoryBadge category={r.score.category} />
                            <ConfidenceBadge confidence={r.score.confidence} />
                            {r.prospect && <Badge tone="night">Dans le CRM</Badge>}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="size-3.5" />
                              {c.nafLabel || c.naf || 'Activité non renseignée'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3.5" />
                              {[c.postalCode, c.city].filter(Boolean).join(' ') || 'Non renseigné'}
                            </span>
                            <span>{c.employeesLabel || 'Effectif non renseigné'}</span>
                            {c.createdOn && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="size-3.5" />
                                Créée en {new Date(c.createdOn).getFullYear()}
                              </span>
                            )}
                            {(c.establishments || 0) > 1 && <span>{c.establishments} établissements</span>}
                          </div>
                          {(r.signals.length > 0 || r.facts) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {r.signals.slice(0, 3).map((s) => (
                                <SignalChip key={s.id} s={s} />
                              ))}
                              {r.facts &&
                                ANALYSIS_SIGNALS.filter((s) => s.test(r.facts!)).map((s) => (
                                  <Badge key={s.id} tone="warning" wrap>
                                    {s.label}
                                  </Badge>
                                ))}
                            </div>
                          )}
                          <p className="mt-2 text-xs text-slate-500">{r.score.criteria.slice().sort((a, b) => b.points - a.points)[0]?.reasons[0]}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
                          {!r.analyzed ? (
                            <Button size="sm" variant="primary" loading={busy[c.siren] === 'analyze'} disabled={!!bulk} onClick={() => analyze(r)} data-testid="analyze">
                              <Sparkles className="size-3.5" />
                              Analyser
                            </Button>
                          ) : (
                            <Link href={`/app/entreprise/${c.siren}`} className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-night-900 px-3 text-[13px] font-semibold text-white hover:bg-night-800">
                              Voir la fiche
                            </Link>
                          )}
                          <Button size="sm" variant="secondary" loading={busy[c.siren] === 'crm'} onClick={() => addToCrm(r)} disabled={!!r.prospect} data-testid="add-crm">
                            {r.prospect ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                            {r.prospect ? 'Au CRM' : 'Ajouter au CRM'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => addToCrm(r, !r.prospect?.favorite)} aria-label={r.prospect?.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={!!r.prospect?.favorite}>
                            <Star className={cx('size-4', r.prospect?.favorite && 'fill-amber-400 text-amber-500')} />
                          </Button>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
              <Pagination page={res.page} totalPages={Math.min(res.totalPages, 400)} onPage={(p) => run(f, p)} />
              <p className="text-center text-xs text-slate-400">Source : {res.source}. Score préliminaire tant que le site n’est pas analysé.</p>
            </>
          )}
        </div>
      </div>
      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Sauvegarder la recherche"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveSearch} disabled={!saveName.trim()}>
              Sauvegarder
            </Button>
          </>
        }
      >
        <Field label="Nom de la recherche" htmlFor="save-name">
          <Input id="save-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Ex. : Restaurants Nice centre" autoFocus />
        </Field>
        <p className="mt-3 text-xs text-slate-500">Vous pourrez la relancer et comparer ses résultats depuis l’historique.</p>
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
