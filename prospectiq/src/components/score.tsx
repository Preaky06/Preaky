'use client';
import { Info, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { Badge, cx } from './ui';
import { RatioBar } from './charts';
import type { ScoreResult } from '@/lib/scoring';
import { criterionColor } from '@/lib/brand';

const CAT_TONE = { elevee: 'accent', interessant: 'success', modere: 'warning', faible: 'neutral' } as const;

export function CategoryBadge({ category }: { category: ScoreResult['category'] | { id: string; label?: string } }) {
  const labels: Record<string, string> = { elevee: 'Priorité élevée', interessant: 'Prospect intéressant', modere: 'Potentiel modéré', faible: 'Faible priorité' };
  return <Badge tone={CAT_TONE[category.id as keyof typeof CAT_TONE] || 'neutral'}>{category.label || labels[category.id] || category.id}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const Icon = confidence === 'élevée' ? ShieldCheck : confidence === 'moyenne' ? ShieldQuestion : ShieldAlert;
  return (
    <Badge tone="neutral" title="Part du score calculée à partir de données constatées (et non estimées)">
      <Icon className="size-3" />
      Confiance {confidence}
    </Badge>
  );
}

/** Score compact pour les listes. */
export function ScorePill({ score, preliminary }: { score: number; preliminary?: boolean }) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center" title={preliminary ? 'Score préliminaire (site non analysé)' : 'Score de potentiel commercial'}>
      <span className="text-xl font-bold tabular-nums text-night-900">{score}</span>
      <RatioBar value={score} max={100} label="Score sur 100" className="mt-1 w-full" />
      {preliminary && <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">prélim.</span>}
    </div>
  );
}

const BASIS = { verified: 'Constaté', estimated: 'Estimé', missing: 'Non évalué' } as const;

export function ScoreBreakdown({ score }: { score: ScoreResult }) {
  return (
    <div className="space-y-4">
      {score.criteria.map((c) => (
        <div key={c.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-night-900">
              <span className="size-2 shrink-0 rounded-full" style={{ background: criterionColor(c.id) }} />
              {c.label}
            </span>
            <span className="text-[13px] tabular-nums text-slate-600">
              <b className="text-night-900">{c.points}</b> / {Math.round(c.weight)}
            </span>
          </div>
          <RatioBar value={c.points} max={Math.max(1, c.weight)} label={c.label} color={criterionColor(c.id)} />
          <div className="mt-1.5 flex flex-wrap items-start gap-x-2 gap-y-1">
            <span className={cx('rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide', c.basis === 'verified' ? 'bg-emerald-50 text-emerald-700' : c.basis === 'estimated' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-500')}>
              {BASIS[c.basis]}
            </span>
            <ul className="flex-1 space-y-0.5 text-xs text-slate-600">
              {c.reasons.slice(0, 3).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
      <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <Info className="mt-px size-3.5 shrink-0" />
        Ce score mesure un potentiel d’opportunité commerciale à partir des données disponibles. Ce n’est pas une probabilité de conversion.
      </p>
    </div>
  );
}
