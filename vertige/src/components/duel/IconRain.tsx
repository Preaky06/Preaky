"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion-prefs";

const CELL = 26;
const SIZE = 22;

/**
 * Pluie d'icônes dessinée sur un seul canvas (500 icônes = 1 élément DOM au lieu de 500).
 * Les icônes tombent et s'empilent en grille ; en mouvement réduit, la grille s'affiche directement.
 */
export function IconRain({ src, count, label }: { src: string; count: number; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = wrap.current;
    const cv = canvas.current;
    if (!box || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let cancelled = false;
    const img = new Image();
    img.src = src;

    const run = () => {
      if (cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = box.clientWidth;
      const cols = Math.max(1, Math.floor(width / CELL));
      const rows = Math.ceil(count / cols);
      const height = rows * CELL;
      const offsetX = (width - Math.min(count, cols) * CELL) / 2;
      cv.width = Math.round(width * dpr);
      cv.height = Math.round(height * dpr);
      cv.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cells = Array.from({ length: count }, (_, i) => ({
        x: offsetX + (i % cols) * CELL + (CELL - SIZE) / 2,
        y: Math.floor(i / cols) * CELL + (CELL - SIZE) / 2,
        delay: Math.min(i * 3, 900) + Math.random() * 120,
      }));

      const drawAll = (t: number) => {
        ctx.clearRect(0, 0, width, height);
        let done = true;
        for (const c of cells) {
          const p = Math.min(1, Math.max(0, (t - c.delay) / 500));
          if (p < 1) done = false;
          if (p <= 0) continue;
          const e = 1 - (1 - p) ** 3;
          ctx.globalAlpha = Math.min(1, p * 2);
          ctx.drawImage(img, c.x, c.y - (1 - e) * (c.y + 40), SIZE, SIZE);
        }
        ctx.globalAlpha = 1;
        return done;
      };

      if (prefersReducedMotion()) {
        drawAll(Infinity);
        return;
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        if (!drawAll(now - t0)) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (img.complete) run();
    else img.onload = run;
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [src, count]);

  return (
    <div ref={wrap} className="w-full max-w-3xl">
      <canvas ref={canvas} role="img" aria-label={label} className="block w-full" />
    </div>
  );
}
