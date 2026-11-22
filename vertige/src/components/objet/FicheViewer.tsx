"use client";

import { useEffect, useState } from "react";
import { toCardItem } from "@/lib/card-item";
import { ObjetFiche, type FicheItem } from "./ObjetFiche";

const readSlug = () => {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return "";
  }
};

/**
 * Aperçu statique : une seule page affiche n'importe quelle fiche selon l'ancre (#slug).
 * Les 1 000 fiches séparées dépasseraient la limite de fichiers d'un aperçu publié.
 */
export function FicheViewer({ items }: { items: FicheItem[] }) {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setSlug(readSlug());
      window.scrollTo(0, 0);
    };
    const id = requestAnimationFrame(sync);
    window.addEventListener("hashchange", sync);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  if (slug === null) return <div className="min-h-svh" />;
  const i = Math.max(
    0,
    items.findIndex((it) => it.slug === slug),
  );
  const item = items[i];
  if (!item) return null;
  return (
    <ObjetFiche
      key={item.slug}
      item={item}
      below={items.slice(Math.max(0, i - 2), i).reverse().map(toCardItem)}
      above={items.slice(i + 1, i + 3).map(toCardItem)}
      count={items.length}
    />
  );
}
