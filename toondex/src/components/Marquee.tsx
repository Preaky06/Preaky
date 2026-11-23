import { TYPES, TYPE_ORDER } from "@/lib/catalogue";

/** Bandeau défilant des types de cartes. Immobile si le système demande moins d'animations. */
export function Marquee() {
  const items = [...TYPE_ORDER.map((t) => TYPES[t].short), "5 cartes par jour", "Versions or"];
  const row = (hidden: boolean) => (
    <ul className="marquee__row" aria-hidden={hidden || undefined}>
      {items.map((label) => (
        <li key={label} className="marquee__item">
          <span className="marquee__dot" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee">
      <div className="marquee__track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
