"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, type ReactNode } from "react";
import { Altimeter, type AltimeterFloor } from "@/components/altimeter/Altimeter";
import { track } from "@/lib/analytics";
import { scrollToElement, setWheelMultiplier } from "@/lib/lenis";
import { LOG_MIN, lerp } from "@/lib/scale";
import { tierOf, type TierId } from "@/lib/tiers";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { altitudeStore, useAltitude } from "./altitude-store";
import { TierBackdrop } from "./TierBackdrop";
import { TierFlash } from "./TierFlash";

const Starfield = dynamic(() => import("./Starfield").then((m) => m.Starfield), { ssr: false });

interface Anchor {
  el: HTMLElement;
  y: number;
  log: number;
  floor: number; // -1 pour une porte de palier
  gateTier: TierId | null;
}

/** Position absolue dans le document, sans les transforms (apparition, inclinaison). */
function absoluteTop(el: HTMLElement) {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}

/**
 * Pilote l'Ascension : mesure les ancres (étages + portes de palier), convertit la position
 * de scroll en altitude de prix (interpolation log entre deux ancres) et publie l'état.
 */
export function AscensionController({ floors, children }: { floors: AltimeterFloor[]; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let anchors: Anchor[] = [];
    let floorAnchors: Anchor[] = [];
    let rootTop = 0;
    let ticking = false;
    let deepest = -1;

    const measure = () => {
      anchors = Array.from(root.querySelectorAll<HTMLElement>("[data-anchor]"), (el) => ({
        el,
        y: absoluteTop(el) + el.offsetHeight / 2,
        log: Number(el.dataset.log),
        floor: el.dataset.floor ? Number(el.dataset.floor) : -1,
        gateTier: el.dataset.gate ? (Number(el.dataset.gate) as TierId) : null,
      }));
      floorAnchors = anchors.filter((a) => a.floor >= 0);
      rootTop = absoluteTop(root);
      update();
    };

    const update = () => {
      ticking = false;
      if (!anchors.length) return;
      const ref = window.scrollY + window.innerHeight * 0.5;
      let log: number;
      const first = anchors[0];
      const last = anchors[anchors.length - 1];
      if (ref <= first.y) log = first.log;
      else if (ref >= last.y) log = last.log;
      else {
        let lo = 0;
        let hi = anchors.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (anchors[mid].y <= ref) lo = mid;
          else hi = mid;
        }
        const a = anchors[lo];
        const b = anchors[hi];
        log = lerp(a.log, b.log, (ref - a.y) / (b.y - a.y));
      }

      let floor = 0;
      if (floorAnchors.length) {
        let lo = 0;
        let hi = floorAnchors.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (floorAnchors[mid].y <= ref) lo = mid;
          else hi = mid;
        }
        floor = Math.abs(floorAnchors[lo].y - ref) <= Math.abs(floorAnchors[hi].y - ref) ? floorAnchors[lo].floor : floorAnchors[hi].floor;
      }

      const active = window.scrollY + window.innerHeight * 0.65 > rootTop;
      altitudeStore.set({ log, tier: active ? tierOf(10 ** log) : 1, floor, active });

      if (active && floor > deepest) {
        deepest = floor;
        if (floor % 10 === 0 || floor === floorAnchors.length - 1) track({ name: "scroll_depth", floor, of: floorAnchors.length });
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    measure();

    const centerOn = (el: HTMLElement) =>
      scrollToElement(el, { offset: -(window.innerHeight / 2 - el.offsetHeight / 2) });

    const unregister = altitudeStore.registerJump(
      (log) => {
        if (!floorAnchors.length) return;
        let best = floorAnchors[0];
        for (const a of floorAnchors) if (Math.abs(a.log - log) < Math.abs(best.log - log)) best = a;
        centerOn(best.el);
      },
      (tier) => {
        const gate = anchors.find((a) => a.gateTier === tier);
        if (gate) centerOn(gate.el);
      },
    );

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      unregister();
      altitudeStore.set({ log: LOG_MIN, tier: 1, floor: 0, active: false });
    };
  }, []);

  return (
    <>
      <TierBackdrop />
      <VertigeEffects />
      <TierFlash />
      <Altimeter floors={floors} />
      <div ref={rootRef} id="ascension" className="relative z-10">
        {children}
      </div>
    </>
  );
}

/** Palier Vertige : ciel étoilé + molette ralentie (sensation d'altitude). */
function VertigeEffects() {
  const tier = useAltitude((s) => s.tier);
  const reduced = useReducedMotion();
  const vertige = tier === 7;

  useEffect(() => {
    setWheelMultiplier(vertige ? 0.6 : 1);
    return () => setWheelMultiplier(1);
  }, [vertige]);

  // Mouvement réduit : pas de particules.
  return vertige && !reduced ? <Starfield /> : null;
}
