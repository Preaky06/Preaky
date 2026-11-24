"use client";

import { useState } from "react";

function initials(name: string): string {
  const words = name.split(/[\s’'-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

/** Image réelle du personnage. Si elle ne se charge pas, ses initiales prennent la place. */
export function CardImage({ name, image, hidden = false }: { name: string; image: string; hidden?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
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
      src={image}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
