import type { ReactNode } from "react";

/* eslint-disable @next/next/no-img-element */

type Props = {
  /** Étiquettes posées sur le bandeau. */
  tags: [string, string];
  /** Bas du bandeau : texte et bouton. */
  children: ReactNode;
  compact?: boolean;
};

/** Bandeau de marque : le mot TOONDEX en très grand, la mascotte 3D posée par-dessus les lettres. */
export function BrandHero({ tags, children, compact = false }: Props) {
  return (
    <section className={`brand-hero${compact ? " brand-hero--compact" : ""}`} aria-labelledby="brand-word">
      <div className="brand-hero__stage">
        <h1 id="brand-word" className="brand-hero__word">
          ToonDex
        </h1>
        <img className="brand-hero__mascot" src="/3d/popcorn.webp" alt="" aria-hidden="true" />
        <img className="brand-hero__float brand-hero__float--clap" src="/3d/clap.webp" alt="" aria-hidden="true" />
        <img className="brand-hero__float brand-hero__float--camera" src="/3d/camera.webp" alt="" aria-hidden="true" />
        <span className="brand-hero__tag brand-hero__tag--a">{tags[0]}</span>
        <span className="brand-hero__tag brand-hero__tag--b">{tags[1]}</span>
      </div>
      <div className="brand-hero__bottom">{children}</div>
    </section>
  );
}
