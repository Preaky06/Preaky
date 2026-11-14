'use client';
// Graphiques légers en SVG/HTML (sans bibliothèque).
// Palette validée (méthode dataviz) : séries 1-3 bleu / orange / aqua ; série unique : violet (rampe validée).
// L'aqua est sous 3:1 de contraste : légende + étiquettes directes + vue tableau obligatoires.
import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from './ui';

export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'] as const;
export const SINGLE = '#6250d6';
const TRACK = '#ecebfb';
const GRID = '#eceef4';

/** Barres horizontales (une seule série, valeurs en clair, survol). */
export function BarList({ items, unit = '' }: { items: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const [hover, setHover] = useState<number | null>(null);
  return (
    <ul className="space-y-2.5" aria-label="Répartition">
      {items.map((it, i) => (
        <li key={it.label} className="group" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="break-words text-night-800">{it.label}</span>
            <span className="tabular-nums font-semibold text-night-900">
              {it.value.toLocaleString('fr-FR')}
              {unit}
            </span>
          </div>
          <div className="relative h-3 rounded-sm" title={`${it.label} : ${it.value.toLocaleString('fr-FR')}${unit}`}>
            <div className="absolute inset-y-0 left-0 rounded-r-[4px] transition-all" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: SINGLE, opacity: hover === null || hover === i ? 1 : 0.55 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Barre de progression d'un ratio sur un maximum (piste de la même teinte). */
export function RatioBar({ value, max, label, className, color }: { value: number; max: number; label: string; className?: string; color?: string }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cx('h-2 rounded-full', className)} style={{ background: TRACK }} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color || SINGLE }} />
    </div>
  );
}

interface Series {
  name: string;
  values: number[];
}

/** Courbes (jusqu'à 3 séries), réticule + infobulle au survol, légende, étiquettes de fin, vue tableau. */
export function LineChart({ labels, series, height = 220, formatLabel = (s: string) => s }: { labels: string[]; series: Series[]; height?: number; formatLabel?: (s: string) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  // Le dessin prend la largeur réelle du conteneur : les textes gardent leur taille (lisibles sur mobile).
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [table]);
  const narrow = W < 480;
  const H = narrow ? Math.round(height * 0.8) : height;
  // Sur petit écran, pas d'étiquettes de fin de courbe : la légende au-dessus nomme déjà les séries.
  const pad = { l: 34, r: narrow ? 14 : 92, t: 12, b: 26 };
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const niceMax = useMemo(() => {
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / step) * step;
  }, [max]);
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, labels.length - 1);
  const y = (v: number) => pad.t + (1 - v / niceMax) * (H - pad.t - pad.b);
  const ticks = [0, niceMax / 2, niceMax];
  const ends = series.map((s, k) => ({ k, y: y(s.values[s.values.length - 1] || 0) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  const endY = new Map(ends.map((e) => [e.k, e.y]));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        {series.map((s, k) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: SERIES[k] }} />
            {s.name}
          </span>
        ))}
        <button type="button" className="ml-auto font-semibold text-electric-700 hover:underline" onClick={() => setTable((t) => !t)}>
          {table ? 'Voir le graphique' : 'Voir le tableau'}
        </button>
      </div>
      {table ? (
        <div className="max-h-64 overflow-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Jour</th>
                {series.map((s) => (
                  <th key={s.name} className="px-3 py-2 text-right font-semibold">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={l} className="border-t border-line">
                  <td className="px-3 py-1.5 text-slate-700">{formatLabel(l)}</td>
                  {series.map((s) => (
                    <td key={s.name} className="px-3 py-1.5 text-right tabular-nums">
                      {s.values[i]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative" ref={box}>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Évolution sur ${labels.length} jours : ${series.map((s) => s.name).join(', ')}`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
                  {t.toLocaleString('fr-FR')}
                </text>
              </g>
            ))}
            {(narrow ? [0, labels.length - 1] : [0, Math.floor((labels.length - 1) / 2), labels.length - 1]).map((i) => (
              <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'} fontSize="11" fill="#64748b">
                {formatLabel(labels[i] || '')}
              </text>
            ))}
            {series.map((s, k) => (
              <g key={s.name}>
                <path d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} fill="none" stroke={SERIES[k]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1] || 0)} r={4} fill={SERIES[k]} stroke="#fff" strokeWidth={2} />
                {!narrow && (
                  <text x={W - pad.r + 10} y={(endY.get(k) || 0) + 4} fontSize="11" fill="#334155">
                    {s.name}
                  </text>
                )}
              </g>
            ))}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#94a3b8" strokeWidth={1} />
                {series.map((s, k) => (
                  <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r={4} fill={SERIES[k]} stroke="#fff" strokeWidth={2} />
                ))}
              </g>
            )}
            <rect
              x={pad.l}
              y={pad.t}
              width={W - pad.l - pad.r}
              height={H - pad.t - pad.b}
              fill="transparent"
              tabIndex={0}
              onMouseMove={(e) => {
                const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                const rel = ((e.clientX - r.left) / r.width) * (labels.length - 1);
                setHover(Math.max(0, Math.min(labels.length - 1, Math.round(rel))));
              }}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(labels.length - 1)}
              onBlur={() => setHover(null)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? labels.length - 1) - 1));
                if (e.key === 'ArrowRight') setHover((h) => Math.min(labels.length - 1, (h ?? 0) + 1));
              }}
            />
          </svg>
          {hover !== null && (
            <div className="pointer-events-none absolute top-1 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-pop" style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% - 70px), calc(100% - 150px))` }}>
              <div className="mb-1 font-semibold text-night-900">{formatLabel(labels[hover])}</div>
              {series.map((s, k) => (
                <div key={s.name} className="flex items-center justify-between gap-4 text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full" style={{ background: SERIES[k] }} />
                    {s.name}
                  </span>
                  <span className="tabular-nums font-semibold text-night-900">{s.values[hover]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
