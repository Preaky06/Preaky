"use client";

import { useEffect, useState } from "react";
import { RollingCounter } from "@/components/ui/RollingCounter";
import { priceFullParts } from "@/lib/format";
import { lerp, LOG_MIN } from "@/lib/scale";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const END = 0.00004; // le grain de riz
const MAX = 99_999_999_999_999;
const LOG_TOP = Math.log10(MAX);
const LOG_END = Math.log10(END);
const DELAY = 700; // laisse l'écran d'accueil apparaître
const UP = 2500;
const HOLD = 260;
const DOWN = 1100;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Compteur d'accueil : 0,00001 € → 99 999 999 999 999 € en 2,5 s (interpolation log),
 * puis redescente et arrêt sur 0,00004 €. Le rendu serveur affiche directement la valeur finale.
 */
export function HeroCounter({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const [eur, setEur] = useState(END);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now() + DELAY;
    const step = (now: number) => {
      const t = now - t0;
      let log: number;
      if (t < 0) log = LOG_MIN;
      else if (t < UP) log = lerp(LOG_MIN, LOG_TOP, easeInOutCubic(t / UP));
      else if (t < UP + HOLD) log = LOG_TOP;
      else if (t < UP + HOLD + DOWN) log = lerp(LOG_TOP, LOG_END, easeOutCubic((t - UP - HOLD) / DOWN));
      else {
        setEur(END);
        return;
      }
      setEur(Math.min(10 ** log, MAX));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const { number, suffix } = priceFullParts(eur);
  return <RollingCounter value={number} suffix={suffix} className={className} label="0,00004 €" />;
}
