"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Apparitions au défilement : chaque élément marqué data-reveal glisse et s'éclaire quand il entre à
 * l'écran (classe is-visible). Le délai se règle avec la variable CSS --d. Sans JavaScript, ou si le
 * système demande moins d'animations, tout est visible tout de suite.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const show = (el: Element) => el.classList.add("is-visible");
    const pending = () => document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible):not([data-watched])");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pending().forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
    );
    const watch = () =>
      pending().forEach((el) => {
        el.dataset.watched = "";
        io.observe(el);
      });
    watch();
    // Contenu ajouté après coup (cartes révélées, séries…) : observé dès son arrivée.
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
