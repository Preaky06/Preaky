import type { CSSProperties } from "react";
import { Card } from "@/components/Card";
import { CARDS_BY_RARITY, RARITIES, RARITY_ORDER, getCard, type CardDef, type Rarity } from "@/lib/catalogue";
import { GOLD_ODDS, SLOT_ODDS, percent } from "@/lib/rules";

/** Personnages mis en avant pour illustrer chaque rareté, dans l'ordre de préférence. */
const PREFERRED = [
  "walter-white",
  "homer-simpson",
  "monkey-d-luffy",
  "rick-sanchez",
  "jon-snow",
  "naruto-uzumaki",
  "eleven",
  "satoru-gojo",
  "tanjiro-kamado",
  "michael-scott",
  "spike-spiegel",
  "anya-forger",
  "dwight-schrute",
  "jake-peralta",
  "clarence",
];

function sample(rarity: Rarity, exclude: Set<string>): CardDef | undefined {
  const pool = CARDS_BY_RARITY[rarity];
  const preferred = PREFERRED.map((id) => getCard(id)).find((c) => c && c.rarity === rarity && !exclude.has(c.id));
  return preferred ?? pool.find((c) => !exclude.has(c.id));
}

/** Les six niveaux de rareté, illustrés chacun par une carte. */
export function RarityTiers({ small = false }: { small?: boolean }) {
  const used = new Set<string>();
  const tiers = RARITY_ORDER.map((r) => {
    const card = sample(r, used);
    if (card) used.add(card.id);
    return { key: r, label: RARITIES[r].label, odds: `${percent(SLOT_ODDS[r])} par carte`, card, gold: false };
  });
  const secret = sample("legendaire", used) ?? sample("epique", used);
  tiers.push({ key: "secrete" as Rarity, label: "Secrète", odds: `1 sur ${GOLD_ODDS}, toute rareté`, card: secret, gold: true });
  return (
    <ul className={`tiers${small ? " tiers--small" : ""}`}>
      {tiers.map((t, i) =>
        t.card ? (
          <li key={t.key} data-reveal="zoom" style={{ "--d": i } as CSSProperties}>
            <Card card={t.card} gold={t.gold} />
            <span className="tiers__label">
              <strong>{t.label}</strong>
              {t.odds}
            </span>
          </li>
        ) : null,
      )}
    </ul>
  );
}
