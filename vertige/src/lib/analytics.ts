/**
 * Point d'entrée unique des statistiques (section 10).
 * Phase 1 : émet un CustomEvent "vertige:track" (observable en dev) ; Phase 6 branchera
 * l'outil de mesure ici, sans toucher aux composants.
 */
export type TrackEvent =
  | { name: "tier_reached"; tier: number }
  | { name: "scroll_depth"; floor: number; of: number }
  | { name: "ascension_complete" }
  | { name: "share"; target: string; method: "native" | "clipboard" };

export function track(event: TrackEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("vertige:track", { detail: event }));
}
