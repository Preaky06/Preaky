"use client";

import { useEffect } from "react";
import { hasFinePointer, prefersReducedMotion } from "@/lib/motion-prefs";

const MAX_TILT = 6; // degrés

/**
 * Inclinaison 3D des cartes `.tilt` par délégation d'événements : un seul écouteur pour
 * toute la page au lieu d'un composant client par carte (150 étages → 0 hydratation dédiée).
 * Effets : inclinaison ≤ 6°, halo qui suit le curseur, soulèvement de 4 px, bordure au palier.
 * Écrit des variables CSS uniquement (transform), aucun rendu React.
 */
export function TiltController() {
  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    let current: HTMLElement | null = null;
    let raf = 0;

    const reset = (el: HTMLElement) => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      delete el.dataset.hover;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const target = (e.target as Element | null)?.closest<HTMLElement>(".tilt") ?? null;
      if (current && current !== target) reset(current);
      current = target;
      if (!target) return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = target.getBoundingClientRect();
        const px = (clientX - r.left) / r.width;
        const py = (clientY - r.top) / r.height;
        target.style.setProperty("--ry", `${((px - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
        target.style.setProperty("--rx", `${((0.5 - py) * 2 * MAX_TILT).toFixed(2)}deg`);
        target.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        target.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        target.dataset.hover = "";
      });
    };
    const onLeave = () => {
      if (current) reset(current);
      current = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return null;
}
