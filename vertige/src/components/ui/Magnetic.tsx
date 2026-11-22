"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { hasFinePointer, prefersReducedMotion } from "@/lib/motion-prefs";
import { cn } from "@/lib/utils";

const STRENGTH = 0.3;
const RADIUS = 80; // px autour du bord du bouton

/**
 * Effet magnétique : l'élément est attiré vers le curseur (×0,3) dans un rayon de 80 px.
 * Désactivé au toucher et en mouvement réduit. Transform uniquement.
 */
export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;
    let raf = 0;
    let active = false;

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        // Distance au rectangle (0 à l'intérieur)
        const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
        const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
        if (Math.hypot(dx, dy) <= RADIUS) {
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          el.style.transform = `translate3d(${(e.clientX - cx) * STRENGTH}px, ${(e.clientY - cy) * STRENGTH}px, 0)`;
          el.style.transition = "transform 120ms linear";
          active = true;
        } else if (active) {
          el.style.transform = "";
          el.style.transition = "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)";
          active = false;
        }
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      el.style.transform = "";
    };
  }, []);

  return (
    <span ref={ref} className={cn("inline-block will-change-transform", className)}>
      {children}
    </span>
  );
}
