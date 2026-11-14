// Fenêtre produit de l'accueil : une analyse d'entreprise FICTIVE, notée par le vrai moteur de score.
// Animations en CSS uniquement ; tout est lisible à l'arrêt.
import { ShieldCheck, FileText, Send, Lock, Smartphone, Share2, Check, Search, Building2, Globe, Gauge, PenLine } from 'lucide-react';
import type { ScoreResult } from '@/lib/scoring';
import { ScoreRing } from './score-ring';
import { criterionColor } from '@/lib/brand';

const SHORT: Record<string, string> = { need: 'Besoin détecté', relevance: 'Pertinence', digital: 'Opportunité digitale', signals: 'Signaux récents', data: 'Qualité des données' };
const CAT_STYLE: Record<string, string> = {
  elevee: 'bg-violet-50 text-violet-700 ring-violet-100',
  interessant: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  modere: 'bg-amber-50 text-amber-800 ring-amber-100',
  faible: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function HeroVisual({ score }: { score: ScoreResult }) {
  const steps = [
    { icon: Building2, label: 'Entreprise trouvée dans le répertoire', at: 'SIRENE' },
    { icon: Globe, label: 'Site rattaché par le numéro SIREN', at: 'SITE' },
    { icon: FileText, label: 'Annonce d’immatriculation repérée', at: 'BODACC' },
    { icon: Gauge, label: `Score calculé : ${score.total}/100`, at: 'MOTEUR' },
    { icon: PenLine, label: 'Message rédigé, prêt à relire', at: 'À VOUS' },
  ];
  return (
    <figure className="relative mx-auto w-full max-w-6xl select-none" aria-label="Illustration : analyse d’une entreprise fictive par Pro Spectre">
      <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[48px] bg-[radial-gradient(40%_60%_at_15%_30%,rgba(139,92,246,0.18),transparent),radial-gradient(40%_60%_at_90%_70%,rgba(59,130,246,0.16),transparent)] blur-2xl" />
      <div className="ring-duo overflow-hidden rounded-[28px] shadow-[0_40px_90px_-40px_rgb(11_18_48_/_0.35)]">
        {/* Recherche d'exemple */}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-gradient-to-r from-violet-50/90 via-white to-sky-50/90 px-5 py-3.5 text-[13.5px] text-night-800 sm:px-7">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
            <Search className="size-3.5" />
            Exemple de recherche
          </span>
          <span>Restauration à Lyon 2e, créée il y a moins d’un an, site à refaire</span>
        </p>

        <div className="grid grid-cols-[minmax(0,1fr)] bg-white lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          {/* Étapes de l'analyse */}
          <div className="border-line p-5 sm:p-7 lg:border-r">
            <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-slate-500 uppercase">[ Ce que fait l’analyse ]</p>
            <ol className="stagger mt-4 space-y-3">
              {steps.map(({ icon: Icon, label, at }, i) => (
                <li key={label} className="flex items-center gap-3 text-[14px]">
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full ${i < 4 ? 'bg-brand-violet text-white' : 'bg-violet-100 text-brand-violet'}`}>
                    {i < 4 ? <Check className="size-3.5" strokeWidth={3} /> : <Icon className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 leading-snug text-night-800">{label}</span>
                  <span className="shrink-0 font-mono text-[10.5px] tracking-[0.08em] text-slate-400">{at}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-2xl bg-night-900 p-4 text-xs text-white shadow-pop">
              <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Send className="size-3.5 text-violet-300" />
                  Message prêt
                </span>
                <span className="font-mono text-[10px] font-normal tracking-wide text-slate-400">E-MAIL · TON CORDIAL</span>
              </p>
              <p className="mt-1.5 leading-relaxed text-slate-300">« Bonjour, en consultant votre site, j’ai remarqué qu’il n’était pas encore sécurisé (HTTPS)… »</p>
            </div>
          </div>

          {/* Fiche notée */}
          <div className="relative bg-gradient-to-br from-white via-white to-violet-50/70 p-5 sm:p-7">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-float">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white sm:grid" aria-hidden="true">BE</span>
                  <div className="min-w-0">
                    <p className="leading-snug font-semibold">Le Bistrot Exemple</p>
                    <p className="text-xs text-slate-500">Restaurant · 6 à 9 salariés</p>
                    <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${CAT_STYLE[score.category.id]}`}>{score.category.label}</span>
                  </div>
                </div>
                <ScoreRing value={score.total} category={score.category.id} size={76} animate />
              </div>
              <div className="mt-5 space-y-2.5">
                {score.criteria.map((c, i) => (
                  <div key={c.id} className="grid grid-cols-[8.25rem_1fr_2.6rem] items-center gap-3 text-xs">
                    <span className="flex items-center gap-2 leading-tight text-slate-600">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: criterionColor(c.id) }} />
                      {SHORT[c.id] || c.label}
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <span className="grow-x block h-full rounded-full" style={{ width: `${(c.points / Math.max(1, c.weight)) * 100}%`, background: criterionColor(c.id), animationDelay: `${0.3 + i * 0.12}s` }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">
                      {c.points}
                      <span className="font-normal text-slate-400">/{Math.round(c.weight)}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-line pt-4 sm:grid-cols-[auto_1fr]">
                <div>
                  <p className="font-mono text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">Sources</p>
                  <div className="mt-1.5 flex flex-col items-start gap-1.5 text-[11px] font-medium">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                      <ShieldCheck className="size-3" /> Site vérifié (SIREN)
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-violet-700">
                      <FileText className="size-3" /> Immatriculation BODACC
                    </span>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">Constats sur le site</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                      <Lock className="size-3" /> Sans HTTPS
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                      <Smartphone className="size-3" /> Non mobile
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                      <Share2 className="size-3" /> Aucun réseau lié
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <figcaption className="border-t border-line bg-gradient-to-r from-white via-white to-violet-50/80 px-5 py-3.5 text-[13px] text-slate-500 sm:px-7">
          Illustration · entreprise fictive, notée par le vrai moteur de score de Pro Spectre.
        </figcaption>
      </div>
    </figure>
  );
}
