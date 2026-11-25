import Link from "next/link";
import type { CSSProperties } from "react";
import { BrandHero } from "@/components/BrandHero";
import { Countdown } from "@/components/Countdown";
import { ArrowIcon } from "@/components/Icons";
import { RarityTiers } from "@/components/RarityTiers";
import { getCurrentUser } from "@/lib/auth";
import { CARDS, RARITY_ORDER, WORK_COUNT, getCard, type CardDef } from "@/lib/catalogue";
import { getOwned, getTodayPack } from "@/lib/collection";

/* eslint-disable @next/next/no-img-element */

/** Éventail du bandeau : un anime, un dessin animé en secrète or, une série. */
const HERO_FAN = ["monkey-d-luffy", "homer-simpson", "walter-white"];

function heroCards(ids: string[]) {
  return ids
    .map((id) => getCard(id))
    .filter((c): c is CardDef => !!c)
    .map((card, i) => ({ card, gold: i === 1 }));
}

const STEPS = [
  {
    icon: "/3d/gift.webp",
    title: "Ouvre ton paquet du jour",
    text: "Chaque jour, un paquet de 5 cartes. La dernière est toujours rare ou mieux. Nouveau paquet à minuit.",
  },
  {
    icon: "/3d/etincelle.webp",
    title: "Découvre qui sort",
    text: "Chaque rareté a son animation, et chaque carte peut sortir en secrète, tout en or.",
  },
  {
    icon: "/3d/trophy.webp",
    title: "Complète tes séries",
    text: "Réunis tous les personnages d’une même œuvre pour gagner un bonus d’éclats.",
  },
  {
    icon: "/3d/gemme.webp",
    title: "Fabrique ce qui manque",
    text: "Un doublon devient des éclats. Avec assez d’éclats, tu fabriques la carte qui te manque.",
  },
];

/** Sous le bandeau : le concept en quatre étapes, puis les raretés en petit. */
function Concept() {
  return (
    <>
      <section className="concept" aria-labelledby="concept-title">
        <div className="concept__intro" data-reveal="">
          <p className="eyebrow">Le concept</p>
          <h2 id="concept-title" className="concept__title">
            Les personnages de tes séries, en cartes à collectionner
          </h2>
          <p className="concept__lead">
            {CARDS.length.toLocaleString("fr-FR")} personnages de {WORK_COUNT} séries, anime, films et dessins animés. Chaque
            carte a ses PV, sa classe et ses attaques. Le catalogue garde le mystère : une carte reste floue tant que tu ne
            l’as pas obtenue.
          </p>
        </div>
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="step" data-reveal="" style={{ "--d": i } as CSSProperties}>
              <span className="step__num">{i + 1}</span>
              <img className="step__icon" src={step.icon} alt="" />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rarities" aria-labelledby="rarities-title">
        <div className="rarities__head" data-reveal="">
          <h2 id="rarities-title" className="section-title">
            Sept raretés
          </h2>
          <p>
            Plus une carte est rare, plus son cadre change : de la carte de sport à la matière noire, au bord animé, qui ne
            compte que cinq cartes.
          </p>
        </div>
        <RarityTiers small />
      </section>
    </>
  );
}

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <BrandHero
          cards={heroCards(HERO_FAN)}
          chips={[
            <>
              <b>{CARDS.length.toLocaleString("fr-FR")}</b> personnages
            </>,
            <>
              Nouveau paquet dans{" "}
              <b>
                <Countdown />
              </b>
            </>,
          ]}
        >
          <Link href="/inscription?next=/paquet" className="btn btn--hero">
            Ouvrir mon premier paquet
            <ArrowIcon />
          </Link>
        </BrandHero>
        <Concept />
      </>
    );
  }

  const [pack, owned] = await Promise.all([getTodayPack(user.id), getOwned(user.id)]);
  const ownedCards = CARDS.filter((c) => owned[c.id]);
  // Bandeau : les trois plus belles cartes du joueur (la meilleure au centre), sinon l'éventail par défaut.
  const top3 = [...ownedCards]
    .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || owned[b.id].gold - owned[a.id].gold)
    .slice(0, 3)
    .map((card) => ({ card, gold: owned[card.id].gold > 0 }));
  const fan = top3.length === 3 ? [top3[1], top3[0], top3[2]] : heroCards(HERO_FAN);

  return (
    <>
      <BrandHero
        cards={fan}
        chips={[
          <>
            <b>
              {ownedCards.length}/{CARDS.length.toLocaleString("fr-FR")}
            </b>{" "}
            cartes
          </>,
          <>
            Nouveau paquet dans{" "}
            <b>
              <Countdown />
            </b>
          </>,
        ]}
      >
        <Link href="/paquet" className="btn btn--hero">
          {pack ? "Revoir mon paquet du jour" : "Ouvrir mon paquet du jour"}
          <ArrowIcon />
        </Link>
      </BrandHero>
      <Concept />
    </>
  );
}
