"use client";

import { useEffect, useState } from "react";
import { subscribeWikiImage } from "@/lib/wiki-images";

function initials(name: string): string {
  const words = name.split(/[\s’'-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

type Props = {
  name: string;
  /** Image déjà connue (AniList, ou Wikipédia récupérée à l'avance). */
  image?: string;
  /** Titre de l'article Wikipédia à interroger quand l'image n'est pas connue. */
  wiki?: string;
  hidden?: boolean;
};

/** Image réelle du personnage. Pendant la recherche (ou en cas d'échec), ses initiales. */
export function CardImage({ name, image, wiki, hidden = false }: Props) {
  const [found, setFound] = useState<string | null>(null);

  useEffect(() => {
    if (image || !wiki) return;
    return subscribeWikiImage(wiki, setFound);
  }, [image, wiki]);

  const src = image ?? found;
  if (!src) {
    return (
      <span className="card__placeholder" aria-hidden="true">
        {initials(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`card__photo${hidden ? " card__photo--hidden" : ""}`}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
