import type { CSSProperties } from "react";
import { CardImage } from "@/components/CardImage";
import { RARITIES, type CardDef } from "@/lib/cards-meta";
import { ENERGIES, energyOf } from "@/lib/combat";
import type { PackSet } from "@/lib/pack-types";

const starsOf = (card: CardDef) => RARITIES[card.rarity].rank + 1;

/**
 * Séries touchées par le paquet, façon album à compléter : chaque œuvre montre ses cartes,
 * les nouvelles tombent dans leur case, les doublons affichent leur nombre, les cases vides un « ? ».
 */
export function SetsPanel({ sets, animated }: { sets: PackSet[]; animated: boolean }) {
  if (sets.length === 0) return null;
  return (
    <section className={`sets-wrap${animated ? "" : " is-static"}`} aria-labelledby="sets-title">
      <div className="sets-wrap__head">
        <h2 id="sets-title">Tes séries</h2>
        <p className="muted">Complète toutes les cartes d’une œuvre pour gagner son bonus d’éclats.</p>
      </div>
      <ul className="sets">
        {sets.map((set, i) => (
          <li
            key={set.workId}
            className={`set${set.complete ? " is-complete" : ""}${set.justCompleted ? " is-just-complete" : ""}`}
            style={{ "--i": i } as CSSProperties}
          >
            <div className="set__ribbon">
              <h3 className="set__title">{set.title}</h3>
              <span className="set__count" aria-label={`${set.owned} cartes sur ${set.total}`}>
                {set.owned}/{set.total}
              </span>
            </div>
            <p className="set__reward">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={set.complete ? "/3d/trophy.webp" : "/3d/gift.webp"} alt="" />
              {set.justCompleted ? (
                <span>
                  Série complète ! <strong>+{set.bonus} éclats</strong>
                </span>
              ) : set.complete ? (
                <span>Série complète · bonus reçu</span>
              ) : (
                <span>
                  Bonus de série : <strong>{set.bonus} éclats</strong>
                </span>
              )}
            </p>
            <ul className="set__slots">
              {set.slots.map((slot, j) => {
                const card = slot.card;
                const style = { "--j": j, "--energy": ENERGIES[energyOf(card)].color } as CSSProperties;
                if (!slot.owned) {
                  return (
                    <li key={card.id} className="set__slot is-missing" style={style}>
                      <span className="set__thumb" aria-hidden="true">
                        ?
                      </span>
                      <span className="set__stars" />
                      <span className="set__name">Manquante</span>
                    </li>
                  );
                }
                return (
                  <li
                    key={card.id}
                    className={`set__slot${slot.isNew ? " is-new" : ""}${slot.gold ? " is-gold" : ""}`}
                    style={style}
                  >
                    {slot.isNew && <span className="set__new">Nouveau</span>}
                    <span className="set__thumb">
                      <CardImage name={card.name} image={card.image} />
                    </span>
                    {slot.dup > 0 && <span className="set__dup">+{slot.dup}</span>}
                    <span className="set__stars" aria-label={`${starsOf(card)} étoiles`}>
                      {"★".repeat(starsOf(card))}
                    </span>
                    <span className="set__name">{card.name}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
