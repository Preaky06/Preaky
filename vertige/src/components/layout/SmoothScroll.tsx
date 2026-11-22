"use client";

import { useEffect } from "react";
import "lenis/dist/lenis.css";
import { setLenis } from "@/lib/lenis";
import { hasFinePointer, prefersReducedMotion } from "@/lib/motion-prefs";

/**
 * Lenis pour le défilement fluide — desktop uniquement.
 * Sur mobile (tactile) on garde le défilement natif : Lenis y provoque des saccades.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    import("lenis").then(({ default: Lenis }) => {
      if (disposed) return;
      const lenis = new Lenis({ autoRaf: true, lerp: 0.1, wheelMultiplier: 1 });
      setLenis(lenis);
      destroy = () => {
        setLenis(null);
        lenis.destroy();
      };
    });
    return () => {
      disposed = true;
      destroy?.();
    };
  }, []);
  return null;
}
