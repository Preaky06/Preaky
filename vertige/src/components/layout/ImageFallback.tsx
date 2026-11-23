"use client";

import { useEffect } from "react";

/** Remplace une photo indisponible par son illustration 3D (attribut data-fallback). */
function fall(el: Element) {
  const fallback = el.getAttribute("data-fallback");
  if (!fallback) return;
  if (el instanceof HTMLImageElement) {
    if (el.getAttribute("src") === fallback) return;
    el.setAttribute("data-fell", "");
    el.src = fallback;
    el.closest(".thumb")?.removeAttribute("data-kind");
  } else if (el.tagName.toLowerCase() === "image") {
    if (el.getAttribute("href") === fallback) return;
    el.setAttribute("href", fallback);
    el.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }
}

/**
 * Les photos viennent directement de Wikimedia Commons. Si l'une ne charge pas (réseau,
 * hébergeur, page intégrée qui bloque les images externes), l'illustration 3D prend sa place.
 */
export function ImageFallback() {
  useEffect(() => {
    const onError = (e: Event) => {
      if (e.target instanceof Element) fall(e.target);
    };
    document.addEventListener("error", onError, true);
    // Échecs survenus avant l'hydratation
    document.querySelectorAll<HTMLImageElement>("img[data-fallback]").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) fall(img);
    });
    return () => document.removeEventListener("error", onError, true);
  }, []);
  return null;
}
