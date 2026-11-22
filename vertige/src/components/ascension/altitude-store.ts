import { useSyncExternalStore } from "react";
import { LOG_MIN } from "@/lib/scale";
import type { TierId } from "@/lib/tiers";

/**
 * État de l'Ascension, partagé hors React : le contrôleur de scroll écrit à chaque frame,
 * les composants s'abonnent à une sélection (re-rendu seulement si la sélection change),
 * et les éléments animés (curseur, traînée) lisent l'état dans `onFrame` sans React.
 */
export interface AltitudeState {
  /** log10 du prix courant (interpolé entre deux étages). */
  log: number;
  tier: TierId;
  /** Index (0-based) de l'étage le plus proche du centre de l'écran. */
  floor: number;
  /** false tant que l'écran d'accueil est visible. */
  active: boolean;
}

type Listener = () => void;

let state: AltitudeState = { log: LOG_MIN, tier: 1, floor: 0, active: false };
const listeners = new Set<Listener>();
const frameListeners = new Set<(s: AltitudeState) => void>();
let jumpHandler: ((log: number) => void) | null = null;
let tierJumpHandler: ((tier: TierId) => void) | null = null;

export const altitudeStore = {
  get: () => state,
  set(next: AltitudeState) {
    const changed =
      next.log !== state.log || next.tier !== state.tier || next.floor !== state.floor || next.active !== state.active;
    if (!changed) return;
    state = next;
    frameListeners.forEach((fn) => fn(state));
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  /** Abonnement impératif, appelé à chaque frame qui change l'état (pas de React). */
  onFrame(fn: (s: AltitudeState) => void) {
    frameListeners.add(fn);
    fn(state);
    return () => {
      frameListeners.delete(fn);
    };
  },
  registerJump(toLog: (log: number) => void, toTier: (tier: TierId) => void) {
    jumpHandler = toLog;
    tierJumpHandler = toTier;
    return () => {
      jumpHandler = null;
      tierJumpHandler = null;
    };
  },
  jumpToLog: (log: number) => jumpHandler?.(log),
  jumpToTier: (tier: TierId) => tierJumpHandler?.(tier),
};

const INITIAL: AltitudeState = { log: LOG_MIN, tier: 1, floor: 0, active: false };

/** Sélection réactive. Le sélecteur doit renvoyer une valeur primitive. */
export function useAltitude<T>(selector: (s: AltitudeState) => T): T {
  return useSyncExternalStore(
    altitudeStore.subscribe,
    () => selector(altitudeStore.get()),
    () => selector(INITIAL),
  );
}
