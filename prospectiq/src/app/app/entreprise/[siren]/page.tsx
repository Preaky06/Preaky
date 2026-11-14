'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Star, Plus, Download, MessageSquareText, PhoneCall, StickyNote, Globe, Phone, Mail, MapPin, ExternalLink, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Flag, ListPlus, Building2, ShieldAlert, Lock, Share2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Select, Skeleton, Textarea, cx, buttonClass } from '@/components/ui';
import { CategoryBadge, ConfidenceBadge, ScoreBreakdown } from '@/components/score';
import { RatioBar } from '@/components/charts';
import { useToast } from '@/components/toast';
import { api, toastError } from '@/lib/client';
import { displayName } from '@/lib/insights';
import { STATUS_LABELS } from '@/lib/status';
import type { AnalysisView } from '@/lib/analysis';
import type { Company } from '@/lib/connectors/types';
import type { ScoreResult } from '@/lib/scoring';

interface Detail {
  analyzed: boolean;
  analysis: AnalysisView | null;
  company?: Company;
  preliminary?: ScoreResult;
  blocked?: boolean;
  prospect: { id: string; status: string; favorite: boolean; next_followup_at: string | null; last_contact_at: string | null } | null;
  lists: { id: string; name: string }[];
}

interface Interaction {
  id: string;
  kind: string;
  content: string;
  created_at: string;
  author: string | null;
}

const NR = <span className="text-slate-400">Non renseigné</span>;
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : null);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-night-900">{children ?? NR}</dd>
    </div>
  );
}

function Check({ ok, label, detail }: { ok: boolean | null | undefined; label: string; detail?: string | null }) {
  return (
    <li className="flex items-start gap-2 py-1.5 text-sm">
      {ok === null || ok === undefined ? <span className="mt-0.5 size-4 shrink-0 rounded-full border border-slate-300" /> : ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />}
      <span>
        {label}
        {detail && <span className="block text-xs text-slate-500">{detail}</span>}
      </span>
    </li>
  );
}

export default function CompanyPage() {
  const { siren } = useParams<{ siren: string }>();
  const toast = useToast();
  const [sharing, setSharing] = useState(false);
  const shareAudit = async () => {
    setSharing(true);
    try {
      const r = await api<{ path: string }>(`/api/companies/${siren}/audit-report`, { body: {} });
      const link = `${window.location.origin}${r.path}`;
      await navigator.clipboard?.writeText(link).catch(() => {});
      toast('Lien du rapport copié : joignez-le à votre message.', 'success', { label: 'Ouvrir le rapport', href: r.path });
    } catch (e) {
      toastError(toast, e);
    } finally {
      setSharing(false);
    }
  };
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [history, setHistory] = useState<Interaction[]>([]);
  const [note, setNote] = useState('');
  const [noteKind, setNoteKind] = useState('note');
  const [lists, setLists] = useState<{ id: string; name: string }[] | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api<Detail>(`/api/companies/${siren}`);
      setD(r);
      if (r.prospect) setHistory((await api<{ interactions: Interaction[] }>(`/api/prospects/${r.prospect.id}/interactions`)).interactions);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [siren]);
  useEffect(() => {
    load();
  }, [load]);

  const analyze = async (force = false) => {
    setAnalyzing(true);
    try {
      await api(`/api/companies/${siren}/analyze`, { body: { force } });
      await load();
      router.refresh();
      toast(force ? 'Analyse actualisée.' : 'Analyse terminée.', 'success');
    } catch (e) {
      toastError(toast, e);
    } finally {
      setAnalyzing(false);
    }
  };

  const ensureProspect = async (extra: Record<string, unknown> = {}) => {
    const r = await api<{ id: string }>('/api/prospects', { body: { siren, ...extra } });
    return r.id;
  };
  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      await load();
      toast(success, 'success');
    } catch (e) {
      toastError(toast, e);
    }
  };

  if (error) return <EmptyState icon={<Building2 className="size-5" />} title="Entreprise introuvable" action={<Link href="/app/recherche" className={buttonClass('primary')}>Retour à la recherche</Link>}>{error}</EmptyState>;
  if (!d) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;

  const a = d.analysis;
  const c: Company = a?.company || d.company!;
  const w = a?.enrichment.website || null;
  const places = a?.enrichment.places || null;
  const signals = a?.enrichment.signals || [];
  const score = a?.score || d.preliminary!;
  const phone = w?.phones?.[0] || places?.phone || null;
  const emails = w?.emails || [];
  const host = w?.url ? new URL(w.url).host : null;

  return (
    <div className="animate-fade-in space-y-6">
      {/* En-tête */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-night-800 to-electric-600 text-lg font-bold text-white shadow-lift">
              {/* Initiales : aucune ressource chargée depuis le site du prospect (pas de requête tierce). */}
              {displayName(c).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-night-900" data-testid="company-name">
                {displayName(c)}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {c.nafLabel || c.naf || 'Activité non renseignée'} · {(c.establishments || 0) > 1 ? 'siège : ' : ''}{c.city || 'Ville non renseignée'} · SIREN {c.siren}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <CategoryBadge category={score.category} />
                <ConfidenceBadge confidence={score.confidence} />
                {!a && <Badge tone="warning">Score préliminaire</Badge>}
                {a?.aiUsed && <Badge tone="accent">Analyse rédigée par IA</Badge>}
                {d.prospect && <Badge tone="night">{STATUS_LABELS[d.prospect.status] || d.prospect.status}</Badge>}
                {d.lists.map((l) => (
                  <Badge key={l.id}>{l.name}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="w-full shrink-0 md:w-56">
            <p className="text-[13px] font-medium text-slate-500">Score de potentiel</p>
            <p className="text-5xl font-bold tracking-tight text-night-900" data-testid="score">
              {score.total}
              <span className="text-xl font-semibold text-slate-400">/100</span>
            </p>
            <RatioBar value={score.total} max={100} label="Score sur 100" className="mt-2" />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          {d.blocked ? (
            <p className="flex items-center gap-2 text-sm font-medium text-rose-700">
              <ShieldAlert className="size-4" />
              Cette entreprise s’est opposée à la prospection : aucune analyse ni action n’est possible.
            </p>
          ) : (
            <>
              {!a ? (
                <Button variant="accent" loading={analyzing} onClick={() => analyze(false)} data-testid="run-analysis">
                  <Sparkles className="size-4" />
                  Lancer l’analyse complète
                </Button>
              ) : (
                <Button variant="secondary" loading={analyzing} onClick={() => analyze(true)}>
                  <RefreshCw className="size-4" />
                  Actualiser l’analyse
                </Button>
              )}
              <Button variant={d.prospect ? 'secondary' : 'primary'} disabled={!!d.prospect} onClick={() => act(() => ensureProspect(), 'Ajouté au CRM.')} data-testid="add-crm">
                <Plus className="size-4" />
                {d.prospect ? 'Dans le CRM' : 'Ajouter au CRM'}
              </Button>
              <Button variant="secondary" onClick={() => act(() => ensureProspect({ favorite: !d.prospect?.favorite }), d.prospect?.favorite ? 'Retiré des favoris.' : 'Ajouté aux favoris.')} aria-pressed={!!d.prospect?.favorite} data-testid="favorite">
                <Star className={cx('size-4', d.prospect?.favorite && 'fill-amber-400 text-amber-500')} />
                Favori
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  act(async () => {
                    const id = await ensureProspect();
                    await api(`/api/prospects/${id}`, { method: 'PATCH', body: { contacted: true } });
                  }, 'Marqué comme contacté.')
                }
                data-testid="mark-contacted"
              >
                <PhoneCall className="size-4" />
                Marquer contacté
              </Button>
              <Link href={a ? `/app/messages?siren=${c.siren}` : '#'} onClick={(e) => !a && (e.preventDefault(), toast('Analysez d’abord l’entreprise pour un message personnalisé.', 'info'))} className={buttonClass('secondary')} data-testid="generate-message">
                <MessageSquareText className="size-4" />
                Générer un message
              </Link>
              <Button
                variant="secondary"
                onClick={async () => {
                  setListOpen(true);
                  setLists((await api<{ lists: { id: string; name: string }[] }>('/api/lists').catch(() => ({ lists: [] }))).lists);
                }}
              >
                <ListPlus className="size-4" />
                Liste
              </Button>
              {a && (
                <>
                  <a href={`/api/companies/${c.siren}/export?format=csv`} className={buttonClass('ghost')} onClick={(e) => e.currentTarget.dataset.clicked = '1'} data-testid="export-csv">
                    <Download className="size-4" />
                    CSV
                  </a>
                  <a href={`/api/companies/${c.siren}/export?format=json`} className={buttonClass('ghost')}>
                    JSON
                  </a>
                </>
              )}
            </>
          )}
        </div>
        {!a && !d.blocked && <p className="mt-3 text-xs text-slate-500">L’analyse recherche le site web, l’audite, consulte le BODACC{places === null ? '' : ' et Google'} puis calcule le score. Elle décompte 1 prospect de votre quota mensuel (une seule fois par mois pour une même entreprise).</p>}
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          {/* Analyse */}
          <Card>
            <CardHeader icon={<Sparkles className="size-4" />} title="Analyse" subtitle={a ? `Réalisée le ${fmt(a.analyzedAt)} · ${a.aiUsed ? 'rédigée par IA à partir des faits collectés' : 'rédigée à partir des faits collectés'}` : 'Lancez l’analyse pour obtenir le diagnostic complet.'} />
            {a ? (
              <div className="space-y-5 p-5">
                <p className="text-[15px] leading-relaxed text-night-800" data-testid="summary">
                  {a.insights.summary}
                </p>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Points forts</h3>
                    <ul className="space-y-1.5 text-sm text-night-800">{a.insights.strengths.length ? a.insights.strengths.map((s) => <li key={s}>• {s}</li>) : <li className="text-slate-400">Aucun point fort identifié à partir des données disponibles.</li>}</ul>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">Points faibles</h3>
                    <ul className="space-y-1.5 text-sm text-night-800">{a.insights.weaknesses.length ? a.insights.weaknesses.map((s) => <li key={s}>• {s}</li>) : <li className="text-slate-400">Aucune faiblesse constatée dans les données disponibles{w?.findings ? '' : ' (site non audité)'}.</li>}</ul>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-electric-700">Opportunités et prestations susceptibles de l’intéresser</h3>
                  {a.insights.opportunities.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                      {a.insights.opportunities.map((o) => (
                        <li key={o.service} className="rounded-xl border border-line bg-slate-50/60 p-3">
                          <p className="text-sm font-semibold text-night-900">{o.service}</p>
                          <p className="mt-0.5 text-xs text-slate-600">{o.reason}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">Aucune opportunité évidente détectée.</p>
                  )}
                </div>
                <div className="rounded-xl bg-electric-50 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-electric-700">Pourquoi prospecter (ou non)</h3>
                  <p className="mt-1 text-sm text-night-800">{a.insights.rationale}</p>
                </div>
                {a.insights.caveats.length > 0 && (
                  <ul className="space-y-1 text-xs text-slate-500">
                    {a.insights.caveats.map((x) => (
                      <li key={x} className="flex gap-1.5">
                        <AlertTriangle className="mt-px size-3 shrink-0" />
                        {x}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState icon={<Sparkles className="size-5" />} title="Pas encore analysée">
                  Seules les données d’identification sont affichées. L’analyse ajoute le site web, les réseaux, les signaux et les recommandations.
                </EmptyState>
              </div>
            )}
          </Card>

          {/* Site web */}
          {a && (
            <Card>
              <CardHeader
                icon={<Globe className="size-4" />}
                title="Présence digitale"
                subtitle={w?.verification}
                action={
                  w?.url && w.findings ? (
                    <Button variant="secondary" size="sm" onClick={shareAudit} loading={sharing} data-testid="share-audit" title="Créer un rapport d’audit public à joindre à votre message">
                      {!sharing && <Share2 className="size-3.5" />}
                      Partager l’audit
                    </Button>
                  ) : undefined
                }
              />
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 p-5 md:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge tone={w?.status === 'verified' ? 'success' : w?.status === 'probable' ? 'warning' : 'neutral'}>{w?.status === 'verified' ? 'Site vérifié' : w?.status === 'probable' ? 'Site probable' : w?.status === 'blocked' ? 'Analyse refusée (robots.txt)' : w?.status === 'unreachable' ? 'Analyse impossible' : 'Aucun site trouvé'}</Badge>
                    {w?.quality != null && <span className="text-xs text-slate-500">Qualité technique : {w.quality}/100</span>}
                  </div>
                  {w?.findings ? (
                    <ul>
                      <Check ok={w.https} label="Connexion sécurisée (HTTPS)" />
                      <Check ok={w.mobileViewport} label="Adapté au mobile" />
                      <Check ok={!!w.title && w.title.length >= 10} label="Titre de page" detail={w.title} />
                      <Check ok={!!w.metaDescription} label="Description pour les moteurs" />
                      <Check ok={!!w.h1} label="Titre principal (H1)" />
                      <Check ok={w.openGraph} label="Aperçu de partage (Open Graph)" />
                      <Check ok={(w.analytics || []).length > 0} label="Mesure d’audience" detail={(w.analytics || []).join(', ') || null} />
                      <Check ok={w.lastContentDate ? Date.now() - new Date(w.lastContentDate).getTime() < 365 * 86400000 : null} label="Contenu récent" detail={w.lastContentDate ? `Dernier contenu : ${fmt(w.lastContentDate)} (${w.lastContentSource})` : 'Date de publication non mesurable'} />
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">{w?.status === 'not_found' ? `Domaines essayés : ${(w.candidatesTried || []).join(', ') || 'aucun'}.` : 'Aucune donnée.'}</p>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Réseaux sociaux reliés au site</p>
                  {w?.socials && Object.keys(w.socials).length ? (
                    <ul className="space-y-1.5">
                      {Object.entries(w.socials).map(([k, url]) => (
                        <li key={k}>
                          <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 font-medium text-electric-700 hover:underline">
                            {k.charAt(0).toUpperCase() + k.slice(1)}
                            <ExternalLink className="size-3" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">Aucun trouvé sur le site.</p>
                  )}
                  <p className="text-xs text-slate-500">L’activité des comptes (fréquence de publication) n’est pas mesurée sans connecteur dédié.</p>
                  {w?.cms && <p className="text-xs text-slate-500">Technologie détectée : {w.cms}</p>}
                  {places?.matched && (
                    <div className="rounded-lg border border-line p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fiche Google</p>
                      <p className="mt-1">{places.rating != null ? `${String(places.rating).replace('.', ',')}/5 sur ${places.reviews ?? 0} avis` : 'Pas de note'}</p>
                      <p className="text-xs text-slate-500">Correspondance {places.matchConfidence}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Signaux */}
          {a && (
            <Card>
              <CardHeader icon={<Flag className="size-4" />} title="Signaux détectés" subtitle="Annonces officielles (BODACC) des 24 derniers mois" />
              <ul className="divide-y divide-line">
                {!signals.length && <li className="px-5 py-4 text-sm text-slate-500">Aucune annonce publiée sur la période.</li>}
                {signals.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <p className={cx('font-medium', s.kind === 'risk' ? 'text-rose-700' : 'text-night-900')}>
                        {s.kind === 'risk' && <AlertTriangle className="mr-1 inline size-3.5" />}
                        {s.label}
                      </p>
                      {s.detail && <p className="text-xs text-slate-500">{s.detail}</p>}
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-500">
                      {fmt(s.date)}
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="block font-medium text-electric-700 hover:underline">
                          Voir l’annonce
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Détail du score" subtitle={a ? 'Critères pondérés, paramétrables dans Paramètres' : 'Score préliminaire : site non analysé'} />
            <div className="p-5">
              <ScoreBreakdown score={score} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Coordonnées professionnelles" subtitle={`Dernière vérification : ${fmt(a?.analyzedAt || c.source.fetchedAt)}`} />
            <dl className="divide-y divide-line px-5">
              <Row label="Adresse">
                <span className="inline-flex gap-1.5">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  {c.localAddress || c.address || NR}
                </span>
              </Row>
              <Row label="Site web">{w?.url ? <a href={w.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-electric-700 hover:underline">{host}</a> : w?.status === 'not_found' ? 'Non trouvé automatiquement (à confirmer)' : w ? 'Non analysé' : NR}</Row>
              <Row label="Téléphone">{phone ? <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-slate-400" />{phone}</span> : NR}</Row>
              <Row label="E-mail public">
                {emails.length ? (
                  <ul className="space-y-1">
                    {emails.map((e) => (
                      <li key={e.address} className="inline-flex flex-wrap items-center gap-1.5">
                        <Mail className="size-3.5 text-slate-400" />
                        {e.address}
                        {e.kind === 'nominative' && <Badge tone="warning" title="Adresse liée à une personne : donnée personnelle, à utiliser avec mesure">nominative</Badge>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  NR
                )}
              </Row>
            </dl>
            <p className="px-5 pb-4 text-xs text-slate-500">Sources : {[c.source.name, w?.url && 'site web de l’entreprise', places?.matched && 'Google Places', signals.length && 'BODACC'].filter(Boolean).join(', ')}.</p>
          </Card>

          <Card>
            <CardHeader title="Identité de l’entreprise" />
            <dl className="divide-y divide-line px-5">
              <Row label="Dénomination">{c.name}</Row>
              {c.tradeNames.length > 0 && <Row label="Enseigne(s)">{c.tradeNames.join(', ')}</Row>}
              <Row label="SIREN / SIRET">{`${c.siren}${c.siret ? ` / ${c.siret}` : ''}`}</Row>
              <Row label="Forme">{c.legalForm}</Row>
              <Row label="Activité (NAF)">{c.naf ? `${c.naf} · ${c.nafLabel || ''}` : null}</Row>
              <Row label="Création">{fmt(c.createdOn)}</Row>
              <Row label="Effectif">{c.employeesLabel ? `${c.employeesLabel}${c.employeesYear ? ` (${c.employeesYear})` : ''}` : null}</Row>
              <Row label="Établissements">{c.establishments}</Row>
              <Row label="Chiffre d’affaires">{(c.finances?.revenue ?? 0) > 0 ? `${c.finances!.revenue!.toLocaleString('fr-FR')} € (${c.finances!.year})` : null}</Row>
              <Row label="Dirigeant(s)">{c.directors.length ? c.directors.map((x) => `${x.name}${x.role ? ` (${x.role})` : ''}`).join(', ') : null}</Row>
              {c.labels.length > 0 && <Row label="Labels">{c.labels.join(', ')}</Row>}
            </dl>
            <p className="px-5 pb-4 text-xs text-slate-500">
              <a href={c.source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-electric-700 hover:underline">
                Fiche officielle (annuaire des entreprises)
              </a>
            </p>
          </Card>

          {/* CRM */}
          <Card>
            <CardHeader icon={<StickyNote className="size-4" />} title="Suivi commercial" />
            <div className="space-y-4 p-5">
              {d.prospect ? (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                  <Field label="Statut" htmlFor="status">
                    <Select id="status" value={d.prospect.status} onChange={(e) => act(() => api(`/api/prospects/${d.prospect!.id}`, { method: 'PATCH', body: { status: e.target.value } }), 'Statut mis à jour.')} data-testid="status">
                      {Object.entries(STATUS_LABELS).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Relance" htmlFor="followup">
                    <Input id="followup" type="date" value={d.prospect.next_followup_at || ''} onChange={(e) => act(() => api(`/api/prospects/${d.prospect!.id}`, { method: 'PATCH', body: { nextFollowupAt: e.target.value || null } }), 'Relance enregistrée.')} />
                  </Field>
                  <p className="text-xs text-slate-500 sm:col-span-2">Dernier contact : {fmt(d.prospect.last_contact_at) || 'aucun'}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Ajoutez l’entreprise au CRM pour suivre vos échanges. Écrire une note l’ajoute automatiquement.</p>
              )}
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  act(async () => {
                    const id = d.prospect?.id || (await ensureProspect());
                    await api(`/api/prospects/${id}/interactions`, { body: { kind: noteKind, content: note } });
                    setNote('');
                  }, 'Note ajoutée.');
                }}
              >
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note, un compte rendu d’appel…" aria-label="Note" data-testid="note-input" />
                <div className="flex gap-2">
                  <Select value={noteKind} onChange={(e) => setNoteKind(e.target.value)} aria-label="Type" className="max-w-40">
                    <option value="note">Note</option>
                    <option value="appel">Appel</option>
                    <option value="email">E-mail</option>
                    <option value="message">Message</option>
                    <option value="rdv">Rendez-vous</option>
                  </Select>
                  <Button type="submit" disabled={!note.trim()} data-testid="add-note">
                    Ajouter
                  </Button>
                </div>
              </form>
              {history.length > 0 && (
                <ol className="space-y-3 border-l-2 border-line pl-4" data-testid="history">
                  {history.map((h) => (
                    <li key={h.id} className="text-sm">
                      <p className="text-xs text-slate-500">
                        {new Date(h.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} · {h.author || 'Système'} · {h.kind}
                      </p>
                      <p className="whitespace-pre-wrap text-night-800">{h.content}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
          <button type="button" onClick={() => setReportOpen(true)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-night-900">
            <Flag className="size-3.5" />
            Signaler une donnée erronée
          </button>
        </div>
      </div>

      <Modal open={listOpen} onClose={() => setListOpen(false)} title="Ajouter à une liste">
        {lists === null ? (
          <Skeleton className="h-20" />
        ) : lists.length ? (
          <ul className="space-y-1">
            {lists.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setListOpen(false);
                    act(() => api(`/api/lists/${l.id}`, { body: { siren } }), `Ajouté à « ${l.name} ».`);
                  }}
                >
                  {l.name}
                  {d.lists.some((x) => x.id === l.id) && <CheckCircle2 className="size-4 text-emerald-600" />}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            Aucune liste. <Link href="/app/listes" className="font-semibold text-electric-700 hover:underline">Créer une liste</Link>
          </p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <Lock className="size-3" />
          Listes incluses à partir de l’offre Pro.
        </p>
      </Modal>
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Signaler une donnée erronée"
        footer={
          <Button
            disabled={report.trim().length < 5}
            onClick={() =>
              act(async () => {
                await api('/api/reports', { body: { kind: 'data_error', siren, message: report } });
                setReportOpen(false);
                setReport('');
              }, 'Merci, votre signalement a été transmis.')
            }
          >
            Envoyer
          </Button>
        }
      >
        <Textarea rows={4} value={report} onChange={(e) => setReport(e.target.value)} placeholder="Quelle information est inexacte ?" aria-label="Description" />
      </Modal>
    </div>
  );
}
