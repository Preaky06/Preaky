import { randomInt } from "node:crypto";
import { RARITY_ORDER, WORKS_BY_RARITY, type Rarity, type Work } from "@/lib/catalogue";
import { GOLD_ODDS, SLOT_ODDS, LAST_SLOT_ODDS, PACK_SIZE } from "@/lib/rules";

export type DrawnCard = { workId: string; gold: boolean };

/** Tire une rareté selon une table de poids (en pour mille). */
function drawRarity(odds: Record<Rarity, number>): Rarity {
  const total = RARITY_ORDER.reduce((sum, r) => sum + odds[r], 0);
  let roll = randomInt(total);
  for (const r of RARITY_ORDER) {
    if (roll < odds[r]) return r;
    roll -= odds[r];
  }
  return "commune";
}

function pick(list: Work[]): Work {
  return list[randomInt(list.length)];
}

/** Un paquet : 5 cartes, la dernière est au moins rare. Rangées de la moins rare à la plus rare. */
export function drawPack(): DrawnCard[] {
  const cards: { work: Work; gold: boolean }[] = [];
  for (let slot = 0; slot < PACK_SIZE; slot++) {
    const rarity = drawRarity(slot === PACK_SIZE - 1 ? LAST_SLOT_ODDS : SLOT_ODDS);
    let work = pick(WORKS_BY_RARITY[rarity]);
    // Pas deux fois la même œuvre dans un paquet.
    for (let tries = 0; tries < 10 && cards.some((c) => c.work.id === work.id); tries++) {
      work = pick(WORKS_BY_RARITY[rarity]);
    }
    cards.push({ work, gold: randomInt(GOLD_ODDS) === 0 });
  }
  const rank = (c: { work: Work; gold: boolean }) => RARITY_ORDER.indexOf(c.work.rarity) + (c.gold ? 10 : 0);
  return cards.sort((a, b) => rank(a) - rank(b)).map((c) => ({ workId: c.work.id, gold: c.gold }));
}

/** Date du jour à Paris, au format AAAA-MM-JJ. Le paquet se renouvelle à minuit, heure de Paris. */
export function parisDay(date = new Date()): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
