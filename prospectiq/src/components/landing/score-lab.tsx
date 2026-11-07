'use client';
// Démonstration interactive du score : l'entreprise est FICTIVE, le calcul est celui du vrai moteur.
import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { scoreCompany, DEFAULT_WEIGHTS, CRITERIA_LABELS, type ScoreInput, type Weights } from '@/lib/scoring';
import { ScoreBreakdown, CategoryBadge, ConfidenceBadge } from '../score';
import { Badge } from '../ui';
import { ScoreRing } from './score-ring';

type Input = Omit<ScoreInput, 'now' | 'weights'> & { now: string };

export function ScoreLab({ input }: { input: Input }) {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const score = useMemo(() => scoreCompany({ ...input, now: new Date(input.now), weights }), [input, weights]);
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const changed = (Object.keys(weights) as (keyof Weights)[]).some((k) => weights[k] !== DEFAULT_WEIGHTS[k]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex flex-col rounded-3xl border border-line bg-white p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">Vos pondérations</p>
          <button type="button" onClick={() => setWeights(DEFAULT_WEIGHTS)} disabled={!changed} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-electric-700 hover:bg-electric-50 disabled:opacity-40">
            <RotateCcw className="size-3.5" />
            Réinitialiser
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">Déplacez les curseurs : le score se recalcule avec le moteur réel. Le total est ramené à 100.</p>
        <div className="mt-5 space-y-5">
          {(Object.keys(CRITERIA_LABELS) as (keyof Weights)[]).map((k) => (
            <label key={k} className="block">
              <span className="mb-2 flex items-baseline justify-between text-sm">
                <span className="font-medium text-night-800">{CRITERIA_LABELS[k]}</span>
                <span className="tabular-nums font-semibold text-night-900">{sum ? Math.round((weights[k] * 100) / sum) : 0} %</span>
              </span>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={weights[k]}
                onChange={(e) => setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-electric-600"
                aria-label={`Pondération : ${CRITERIA_LABELS[k]}`}
              />
            </label>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
          {[
            ['80 – 100', 'Priorité élevée', 'bg-electric-500'],
            ['60 – 79', 'Prospect intéressant', 'bg-emerald-500'],
            ['40 – 59', 'Potentiel modéré', 'bg-amber-500'],
            ['0 – 39', 'Faible priorité', 'bg-slate-400'],
          ].map(([r, l, c]) => (
            <p key={r} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className={`size-2 rounded-full ${c}`} />
              <b className="tabular-nums">{r}</b>
              <span className="text-slate-600">{l}</span>
            </p>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-night-900 p-5 text-sm text-slate-300 lg:mt-auto">
          <p className="font-semibold text-white">Comment lire chaque critère</p>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed">
            <li>
              <span className="mr-1.5 rounded bg-emerald-400/15 px-1.5 py-px text-[10px] font-semibold tracking-wide text-emerald-300 uppercase">Constaté</span>
              fondé sur un fait observé (registre, annonce, site).
            </li>
            <li>
              <span className="mr-1.5 rounded bg-amber-400/15 px-1.5 py-px text-[10px] font-semibold tracking-wide text-amber-300 uppercase">Estimé</span>
              déduit d’indices ; pèse moins dans le niveau de confiance.
            </li>
            <li>
              <span className="mr-1.5 rounded bg-white/10 px-1.5 py-px text-[10px] font-semibold tracking-wide text-slate-300 uppercase">Non évalué</span>
              donnée indisponible, jamais remplacée par une supposition.
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-white p-6 shadow-lift" data-testid="score-example">
        <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <Badge tone="warning">Exemple illustratif · entreprise fictive</Badge>
            <p className="mt-3 text-lg font-semibold">Le Bistrot Exemple</p>
            <p className="text-sm text-slate-500">Restaurant créé il y a 7 mois · 6 à 9 salariés · évalué pour une agence web</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <CategoryBadge category={score.category} />
              <ConfidenceBadge confidence={score.confidence} />
            </div>
          </div>
          <ScoreRing value={score.total} category={score.category.id} size={104} stroke={9} />
        </div>
        <div className="mt-6">
          <ScoreBreakdown score={score} />
        </div>
      </div>
    </div>
  );
}
