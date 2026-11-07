// Illustration animée du produit (entreprise FICTIVE, notée par le vrai moteur de score). CSS uniquement.
import { ShieldCheck, FileText, Send, Lock, Smartphone, Share2 } from 'lucide-react';
import type { ScoreResult } from '@/lib/scoring';
import { ScoreRing } from './score-ring';

const SHORT: Record<string, string> = { need: 'Besoin détecté', relevance: 'Pertinence', digital: 'Opportunité digitale', signals: 'Signaux récents', data: 'Qualité des données' };
const CAT_STYLE: Record<string, string> = {
  elevee: 'bg-electric-50 text-electric-700 ring-electric-100',
  interessant: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  modere: 'bg-amber-50 text-amber-800 ring-amber-100',
  faible: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function HeroVisual({ score }: { score: ScoreResult }) {
  return (
    <figure className="relative mx-auto w-full max-w-[460px] select-none" aria-label="Illustration : fiche d’une entreprise fictive analysée par Pro Spectre">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,rgba(99,102,241,0.45),transparent)] blur-2xl" />

      <div className="animate-float-slow rounded-[26px] border border-white/15 bg-white/[0.06] p-2 shadow-pop backdrop-blur-sm">
        <figcaption className="flex items-center gap-1.5 px-3 pt-1 pb-2.5 text-[11px] text-slate-400">
          <span className="size-2 rounded-full bg-white/20" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="ml-2 truncate">Illustration · entreprise fictive, notée par le vrai moteur de score</span>
        </figcaption>
        <div className="rounded-[20px] bg-white p-5 text-left text-night-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-white">BE</span>
              <div className="min-w-0">
                <p className="truncate font-semibold">Le Bistrot Exemple</p>
                <p className="truncate text-xs text-slate-500">Restaurant · 6 à 9 salariés</p>
                <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${CAT_STYLE[score.category.id]}`}>{score.category.label}</span>
              </div>
            </div>
            <ScoreRing value={score.total} category={score.category.id} size={80} animate />
          </div>

          <div className="mt-5 space-y-2.5">
            {score.criteria.map((c, i) => (
              <div key={c.id} className="grid grid-cols-[7.5rem_1fr_2.6rem] items-center gap-3 text-xs">
                <span className="truncate text-slate-600">{SHORT[c.id] || c.label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span className="grow-x block h-full rounded-full bg-gradient-to-r from-electric-500 to-violet-500" style={{ width: `${(c.points / Math.max(1, c.weight)) * 100}%`, animationDelay: `${0.3 + i * 0.12}s` }} />
                </span>
                <span className="text-right font-semibold tabular-nums">
                  {c.points}
                  <span className="font-normal text-slate-400">/{Math.round(c.weight)}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-[auto_1fr]">
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Sources</p>
              <div className="mt-1.5 flex flex-col items-start gap-1.5 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                  <ShieldCheck className="size-3" /> Site vérifié (SIREN)
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-electric-50 px-2 py-1 text-electric-700">
                  <FileText className="size-3" /> Immatriculation BODACC
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Constats sur le site</p>
              <div className="stagger mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium">
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

      <div className="animate-float relative z-10 mx-auto -mt-6 w-[88%] rounded-xl border border-white/10 bg-night-800/95 p-3 text-xs text-white shadow-pop backdrop-blur sm:-mr-6 sm:ml-auto sm:w-72" style={{ animationDelay: '-1s' }}>
        <p className="flex items-center justify-between font-semibold">
          <span className="flex items-center gap-1.5">
            <Send className="size-3.5 text-electric-300" />
            Message prêt
          </span>
          <span className="text-[10px] font-medium text-slate-400">E-mail · ton cordial</span>
        </p>
        <p className="typing mt-1.5 text-slate-300" style={{ animationDelay: '1.2s' }}>
          « Bonjour, en consultant votre site, j’ai remarqué qu’il n’était pas encore sécurisé (HTTPS)… »
        </p>
      </div>
    </figure>
  );
}
