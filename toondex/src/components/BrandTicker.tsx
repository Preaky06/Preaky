/* eslint-disable @next/next/no-img-element */

const TICKER = ["Séries", "Anime", "Disney", "Pixar", "Cartoon Network", "Nickelodeon", "Adult Swim", "Disney Channel", "Films d’animation", "Super-héros", "Netflix", "Ghibli"];

/** Ruban qui fait défiler les univers du catalogue, en bas des bandeaux jaunes. */
export function BrandTicker() {
  return (
    <div className="brand-hero__ticker" aria-hidden="true">
      <div className="brand-hero__track">
        {[...TICKER, ...TICKER].map((t, i) => (
          <span key={i}>
            {t}
            <img src="/3d/etoile.webp" alt="" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Objets 3D qui flottent dans les bandeaux jaunes. */
export function BrandFloats() {
  return (
    <>
      <img className="brand-hero__float brand-hero__float--popcorn" src="/3d/popcorn.webp" alt="" aria-hidden="true" />
      <img className="brand-hero__float brand-hero__float--clap" src="/3d/clap.webp" alt="" aria-hidden="true" />
      <img className="brand-hero__float brand-hero__float--star" src="/3d/etoile.webp" alt="" aria-hidden="true" />
      <img className="brand-hero__float brand-hero__float--gem" src="/3d/gemme.webp" alt="" aria-hidden="true" />
    </>
  );
}
