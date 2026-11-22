import type Lenis from "lenis";

/** Instance Lenis partagée (null sur mobile / mouvement réduit : défilement natif). */
let instance: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  instance = l;
};
export const getLenis = () => instance;

/** Défile vers un élément, avec Lenis si actif, sinon nativement. */
export function scrollToElement(el: HTMLElement, opts: { offset?: number; immediate?: boolean } = {}) {
  const offset = opts.offset ?? 0;
  if (instance) {
    instance.scrollTo(el, { offset, immediate: opts.immediate, duration: 1.4 });
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = el.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: reduced || opts.immediate ? "auto" : "smooth" });
}

/** Ralentit la molette (palier Vertige). Sans effet en défilement natif. */
export function setWheelMultiplier(m: number) {
  if (instance) instance.options.wheelMultiplier = m;
}
