"use client";

import { useRef, useState } from "react";
import { formatPrice, powerOfTen } from "@/lib/format";
import { tierOf, TIERS } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const START = -5;
const STEP = 0.5; // une demi-décade par barre
const BUCKETS = 39; // 10⁻⁵ → 10¹⁴·⁵

export type LogRange = [number, number] | null;

const bucketOf = (log: number) => Math.min(BUCKETS - 1, Math.max(0, Math.floor((log - START) / STEP)));
const bucketRange = (a: number, b: number): [number, number] => {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return [START + lo * STEP, START + (hi + 1) * STEP];
};

/**
 * Histogramme de la répartition des prix (barres d'une demi-décade, couleur du palier).
 * Glisser sur les barres sélectionne une plage ; clic = une barre, Maj+clic = étendre.
 * Clavier : flèches pour se déplacer, Entrée pour sélectionner, Maj+Entrée pour étendre.
 */
export function PriceHistogram({
  logs,
  range,
  onChange,
}: {
  logs: number[];
  range: LogRange;
  onChange: (r: LogRange) => void;
}) {
  const counts = new Array<number>(BUCKETS).fill(0);
  for (const l of logs) counts[bucketOf(l)]++;
  const max = Math.max(1, ...counts);
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const [focus, setFocus] = useState(0);
  const anchor = useRef<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = (i: number) => {
    if (drag) {
      const [lo, hi] = drag.from <= drag.to ? [drag.from, drag.to] : [drag.to, drag.from];
      return i >= lo && i <= hi;
    }
    if (!range) return false;
    const mid = START + (i + 0.5) * STEP;
    return mid >= range[0] && mid <= range[1];
  };

  const commit = (from: number, to: number) => onChange(bucketRange(from, to));

  const onKey = (e: React.KeyboardEvent, i: number) => {
    let next = i;
    if (e.key === "ArrowRight") next = Math.min(BUCKETS - 1, i + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, i - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = BUCKETS - 1;
    else return;
    e.preventDefault();
    setFocus(next);
    refs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Répartition des prix : sélectionne une plage"
        className="flex h-28 touch-none items-end gap-[2px] select-none"
        onPointerUp={() => {
          if (drag) commit(drag.from, drag.to);
          setDrag(null);
        }}
        onPointerLeave={() => {
          if (drag) commit(drag.from, drag.to);
          setDrag(null);
        }}
      >
        {counts.map((c, i) => {
          const [lo, hi] = bucketRange(i, i);
          const tier = TIERS[tierOf(10 ** (lo + 0.001)) - 1];
          const on = selected(i);
          return (
            <button
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              tabIndex={i === focus ? 0 : -1}
              aria-pressed={on}
              aria-label={`De ${formatPrice(10 ** lo)} à ${formatPrice(10 ** hi)} : ${c} objet${c > 1 ? "s" : ""}`}
              onKeyDown={(e) => {
                onKey(e, i);
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (e.shiftKey && anchor.current !== null) commit(anchor.current, i);
                  else {
                    anchor.current = i;
                    commit(i, i);
                  }
                }
              }}
              onPointerDown={(e) => {
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                setFocus(i);
                if (e.shiftKey && anchor.current !== null) {
                  setDrag({ from: anchor.current, to: i });
                } else {
                  anchor.current = i;
                  setDrag({ from: i, to: i });
                }
              }}
              onPointerEnter={() => drag && setDrag({ ...drag, to: i })}
              className="group relative flex h-full flex-1 items-end rounded-t-[4px] focus-visible:outline-offset-1"
            >
              <span
                className={cn("block w-full rounded-t-[4px] transition-opacity", c === 0 && "bg-line")}
                style={{
                  height: c ? `${Math.max(6, (c / max) * 100)}%` : "3px",
                  background: c ? tier.color : undefined,
                  opacity: range || drag ? (on ? 1 : 0.25) : 0.85,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-muted" aria-hidden="true">
        {[-5, 0, 5, 10, 14].map((e) => (
          <span key={e} className="tabular-nums">
            {powerOfTen(e)} €
          </span>
        ))}
      </div>
    </div>
  );
}
