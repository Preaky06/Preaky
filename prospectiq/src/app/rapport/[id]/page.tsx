import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, XCircle, Info, ArrowRight, ScanSearch, ExternalLink } from 'lucide-react';
import { SiteHeader, SiteFooter, PublicPage } from '@/components/site';
import { ScoreRing } from '@/components/landing/score-ring';
import { buttonClass } from '@/components/styles';
import { getReport } from '@/lib/site-audit';
import { remedyFor } from '@/lib/audit-remedies';
import { ReportActions } from './print-button';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getReport(id);
  return {
    title: r ? `Audit du site ${r.host}` : 'Rapport introuvable',
    // Rapport privé par lien : jamais indexé.
    robots: { index: false, follow: false },
  };
}

const SEV = { important: 0, mineur: 1, info: 2 } as const;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getReport(id);
  if (!r) notFound();
  const a = r.audit;
  const q = a.quality ?? 0;
  const level = q >= 80 ? { id: 'interessant', label: 'Bon niveau' } : q >= 50 ? { id: 'modere', label: 'À améliorer' } : { id: 'mauvais', label: 'Améliorations prioritaires' };
  const findings = [...(a.findings || [])].sort((x, y) => SEV[x.severity] - SEV[y.severity]);
  const important = findings.filter((f) => f.severity === 'important').length;
  const minor = findings.filter((f) => f.severity === 'mineur').length;
  const year = new Date().getFullYear();
  const fresh = a.lastContentDate ? Date.now() - new Date(a.lastContentDate).getTime() < 365 * 86400000 : a.copyrightYear ? a.copyrightYear >= year - 1 : null;
  const checks: { label: string; ok: boolean | null; detail: string }[] = [
    { label: 'Connexion sécurisée (HTTPS)', ok: !!a.https, detail: a.https ? 'Le site est servi en HTTPS.' : 'Le site est servi en HTTP.' },
    { label: 'Adapté au mobile', ok: !!a.mobileViewport, detail: a.mobileViewport ? 'Balise d’affichage mobile présente.' : 'Balise d’affichage mobile absente.' },
    { label: 'Titre de page', ok: !!a.title && a.title.length >= 10, detail: a.title ? `« ${a.title.slice(0, 90)} »` : 'Absent.' },
    { label: 'Meta description', ok: !!a.metaDescription, detail: a.metaDescription ? `« ${a.metaDescription.slice(0, 120)}${a.metaDescription.length > 120 ? '…' : ''} »` : 'Absente.' },
    { label: 'Titre principal (H1)', ok: !!a.h1, detail: a.h1 ? `« ${a.h1.slice(0, 90)} »` : 'Absent.' },
    { label: 'Aperçu de partage (Open Graph)', ok: !!a.openGraph, detail: a.openGraph ? 'Configuré.' : 'Non configuré.' },
    { label: 'Données structurées', ok: !!a.structuredData, detail: a.structuredData ? 'Présentes (JSON-LD).' : 'Absentes.' },
    { label: 'Réseaux sociaux reliés', ok: Object.keys(a.socials || {}).length > 0, detail: Object.keys(a.socials || {}).length ? Object.keys(a.socials || {}).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : 'Aucun lien trouvé sur l’accueil.' },
    { label: 'Temps de réponse', ok: a.responseMs != null ? a.responseMs <= 3000 : null, detail: a.responseMs != null ? `${(a.responseMs / 1000).toFixed(1).replace('.', ',')} s pour la page d’accueil.` : 'Non mesuré.' },
    { label: 'Contenu récent', ok: fresh, detail: a.lastContentDate ? `Dernier contenu daté du ${new Date(a.lastContentDate).toLocaleDateString('fr-FR')}.` : a.copyrightYear ? `Copyright ${a.copyrightYear}.` : 'Aucune date trouvée.' },
    { label: 'Mesure d’audience', ok: (a.analytics || []).length > 0 ? true : null, detail: (a.analytics || []).length ? (a.analytics || []).join(', ') : 'Aucun outil détecté (information).' },
  ];

  return (
    <PublicPage>
      <SiteHeader />
      <main id="contenu" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11.5px] font-medium tracking-[0.14em] text-slate-500 uppercase">[ Rapport d’audit de site ]</p>
          <ReportActions />
        </div>

        <section className="ring-duo mt-4 grid items-center gap-6 rounded-[28px] p-6 shadow-[0_40px_90px_-40px_rgb(11_18_48_/_0.35)] sm:grid-cols-[1fr_auto] sm:p-8" data-testid="report">
          <div className="min-w-0">
            <h1 className="font-display text-[2.1rem] leading-[1.05] font-semibold tracking-[-0.045em] break-words">{r.host}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Page d’accueil analysée le {fmtDate(a.checkedAt || r.created_at.toISOString())} ·{' '}
              <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-medium text-electric-700 hover:underline">
                ouvrir le site <ExternalLink className="size-3" />
              </a>
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700">{important} point{important > 1 ? 's' : ''} important{important > 1 ? 's' : ''}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">{minor} point{minor > 1 ? 's' : ''} mineur{minor > 1 ? 's' : ''}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">{checks.filter((c) => c.ok).length} contrôle{checks.filter((c) => c.ok).length > 1 ? 's' : ''} réussi{checks.filter((c) => c.ok).length > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="text-center">
            <ScoreRing value={q} category={level.id} size={128} stroke={10} />
            <p className="mt-2 text-sm font-semibold">{level.label}</p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-[1.35rem] font-semibold tracking-[-0.02em]">Points de contrôle</h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4">
                {c.ok === true ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : c.ok === false ? <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600" /> : <Info className="mt-0.5 size-5 shrink-0 text-slate-400" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.label}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500" title={c.detail}>
                    {c.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-[1.35rem] font-semibold tracking-[-0.02em]">Recommandations</h2>
          {findings.length ? (
            <ol className="mt-4 space-y-3" data-testid="recommendations">
              {findings.map((f, i) => {
                const rem = remedyFor(f.id);
                return (
                  <li key={f.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold">
                        <span className="mr-2 font-display text-slate-300">{String(i + 1).padStart(2, '0')}</span>
                        {rem.title}
                      </p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.severity === 'important' ? 'bg-rose-50 text-rose-700' : f.severity === 'mineur' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                        {f.severity === 'important' ? 'Important' : f.severity === 'mineur' ? 'Mineur' : 'Information'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">Constat : {f.label}</p>
                    {rem.why && <p className="mt-2 text-sm text-slate-600">{rem.why}</p>}
                    {rem.how && (
                      <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-sm text-slate-700">
                        <b>À faire :</b> {rem.how}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-4 rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800">Aucun point d’amélioration détecté sur la page d’accueil.</p>
          )}
        </section>

        <section className="mt-10 rounded-2xl bg-canvas p-5 text-xs leading-relaxed text-slate-500">
          <b className="text-slate-700">Méthode.</b> Analyse automatique de la page d’accueil publique uniquement, par le robot ProSpectre-Analyse, dans le respect du fichier robots.txt du site. La note sur 100 diminue selon la gravité des constats (important, mineur, information). Ce rapport ne mesure ni le trafic, ni le positionnement réel dans les moteurs de recherche, ni la qualité des contenus. Il ne contient aucune coordonnée personnelle.
        </section>

        <section className="island relative isolate mt-10 overflow-hidden rounded-[2.5rem] p-7 text-white print:hidden sm:p-9">
          <div className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
          <p className="font-display text-[1.4rem] leading-tight font-semibold tracking-[-0.02em]">Rapport réalisé avec Pro Spectre</p>
          <p className="mt-2 max-w-xl text-sm text-slate-300">Pro Spectre aide les agences et indépendants à trouver les entreprises qui ont besoin de leurs services, au bon moment, à partir des registres officiels.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/outils/audit-site" className={buttonClass('accent', 'md')}>
              <ScanSearch className="size-4" />
              Auditer un autre site
            </Link>
            <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold hover:bg-white/10">
              Découvrir Pro Spectre
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </PublicPage>
  );
}
