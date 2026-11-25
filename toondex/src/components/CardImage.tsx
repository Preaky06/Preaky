"use client";

import { useEffect, useState } from "react";

function initials(name: string): string {
  const words = name.split(/[\s’'-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

/**
 * Image réelle du personnage. Un échec de chargement (réseau lent, source saturée) donne lieu à une
 * seconde tentative ; si elle échoue aussi, ses initiales prennent la place.
 */
export function CardImage({ name, image, hidden = false }: { name: string; image: string; hidden?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    const t = window.setTimeout(() => {
      setWaiting(false);
      setAttempt(1);
    }, 1500);
    return () => window.clearTimeout(t);
  }, [waiting]);

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
      key={attempt}
      className={`card__photo${hidden ? " card__photo--hidden" : ""}`}
      src={image}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => (attempt === 0 ? setWaiting(true) : setFailed(true))}
    />
  );
}
