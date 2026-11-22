"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion-prefs";

const MAX_STARS = 300;

/**
 * Ciel étoilé du palier Vertige : 300 particules maximum, canvas plein écran,
 * DPR plafonné à 2, en pause quand l'onglet est masqué, absent en mouvement réduit.
 * Les étoiles descendent lentement : c'est le visiteur qui monte.
 */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const count = Math.min(MAX_STARS, Math.round((window.innerWidth * window.innerHeight) / 5200));
    const stars = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.25,
      speed: Math.random() * 0.00012 + 0.00003,
      phase: Math.random() * Math.PI * 2,
      gold: Math.random() < 0.18,
    }));

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.y += s.speed * dt;
        if (s.y > 1) {
          s.y -= 1;
          s.x = Math.random();
        }
        const twinkle = 0.55 + 0.45 * Math.sin(now * 0.0018 + s.phase);
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = s.gold ? "#F5C542" : "#F4F1EA";
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] size-full animate-[vg-fade_800ms_ease_both]"
    />
  );
}
