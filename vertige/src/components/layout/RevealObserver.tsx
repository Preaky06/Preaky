"use client";

import { useEffect } from "react";

/**
 * Un seul IntersectionObserver pour tous les `.reveal` du document : ajoute `data-in`
 * à l'entrée dans l'écran (une fois). Sans JS, le CSS `@media (scripting: enabled)`
 * ne masque rien : le contenu reste visible.
 */
export function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = "";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    const scan = (root: ParentNode) =>
      root.querySelectorAll<HTMLElement>(".reveal:not([data-in])").forEach((el) => io.observe(el));
    scan(document);
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof HTMLElement && scan(n.parentNode ?? n));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
