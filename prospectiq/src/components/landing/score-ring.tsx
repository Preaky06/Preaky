// Anneau de score (SVG). Sans état : utilisable côté serveur comme côté client.
import { cx } from '../styles';

const COLORS: Record<string, string> = { elevee: '#5146e5', interessant: '#059669', modere: '#d97706', faible: '#64748b', mauvais: '#e11d48' };

export function ScoreRing({ value, category, size = 88, stroke = 8, animate = false, className }: { value: number; category: string; size?: number; stroke?: number; animate?: boolean; className?: string }) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const offset = len * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className={cx('relative grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceef6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={COLORS[category] || COLORS.faible}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={offset}
          className={cx('transition-[stroke-dashoffset,stroke] duration-700 ease-out', animate && 'ring-draw')}
          style={{ '--ring-len': len } as React.CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center leading-none">
        <span>
          <span className="font-display block font-semibold tabular-nums tracking-[-0.02em]" style={{ fontSize: size * 0.27 }}>
            {value}
          </span>
          <span className="block text-[10px] font-medium text-slate-400">/ 100</span>
        </span>
      </span>
    </div>
  );
}
