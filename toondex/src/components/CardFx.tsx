"use client";

import { useEffect } from "react";

/**
 * Effet « carte holographique » : sous la souris, une carte rare ou mieux s'incline et son reflet
 * suit le pointeur (variables CSS --rx, --ry, --mx, --my, --sx, --sy). Sans souris (écran tactile)
 * ou si le système demande moins d'animations, rien ne bouge : le reflet garde son animation lente.
 */
export function CardFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current: HTMLElement | null = null;
    const props = ["--rx", "--ry", "--mx", "--my", "--sx", "--sy"];

    const reset = () => {
      if (!current) return;
      current.classList.remove("is-tilting");
      for (const p of props) current.style.removeProperty(p);
      current = null;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target instanceof Element ? event.target : null;
      const hit = target?.closest<HTMLElement>(".card--fx") ?? null;
      // Dans la visionneuse 3D, c'est la visionneuse qui oriente la carte et son reflet.
      const card = hit && !hit.closest(".viewer") ? hit : null;
      if (card !== current) reset();
      if (!card) return;
      const box = card.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
      current = card;
      card.classList.add("is-tilting");
      card.style.setProperty("--rx", `${((0.5 - y) * 16).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${((x - 0.5) * 18).toFixed(2)}deg`);
      card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      card.style.setProperty("--sx", `${((1 - x) * 100).toFixed(1)}%`);
      card.style.setProperty("--sy", `${((1 - y) * 100).toFixed(1)}%`);
    };

    const onOut = (event: PointerEvent) => {
      if (!event.relatedTarget) reset();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut);
    window.addEventListener("blur", reset);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("blur", reset);
      reset();
    };
  }, []);
  return null;
}
