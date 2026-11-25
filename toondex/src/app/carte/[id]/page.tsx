import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Card, CardBack } from "@/components/Card";
import { CardViewer } from "@/components/CardViewer";
import { CardImage } from "@/components/CardImage";
import { CraftButton } from "@/components/CraftButton";
import { getCurrentUser } from "@/lib/auth";
import {
  CARDS,
  CARDS_BY_RARITY,
  RARITIES,
  cardNumber,
  countryNames,
  getCard,
  type Rarity,
} from "@/lib/catalogue";
import { getOwned } from "@/lib/collection";
import { ENERGIES, RARITY_SYMBOL, combatProfile } from "@/lib/combat";
import {
  CRAFT_COST,
  GOLD_ODDS,
  LAST_SLOT_ODDS,
  PACK_SIZE,
  SHARDS_PER_DUPLICATE,
  SLOT_ODDS,
} from "@/lib/rules";
import { cardsOfWork } from "@/lib/sets";

/* eslint-disable @next/next/no-img-element */

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const card = getCard((await params).id);
  if (!card) return { title: "Carte introuvable" };
  const user = await getCurrentUser();
  const owned = user ? (await getOwned(user.id))[card.id] : undefined;
  return {
    title: owned ? `${card.name} · ${card.work.title}` : "Carte mystère",
  };
}

/** Chance d'obtenir cette carte précise dans un paquet (approximation : tirages indépendants). */
function chancePerPack(rarity: Rarity): number {
  const n = CARDS_BY_RARITY[rarity].length;
  const p = SLOT_ODDS[rarity] / 1000 / n;
  const pLast = LAST_SLOT_ODDS[rarity] / 1000 / n;
  return 1 - Math.pow(1 - p, PACK_SIZE - 1) * (1 - pLast);
}

function oneIn(p: number): string {
  return `1 sur ${Math.round(1 / p).toLocaleString("fr-FR")}`;
}

const STATS = [
  { key: "hp", label: "PV", max: 300, color: "#4ADE80" },
  { key: "attack", label: "ATQ", max: 200, color: "#E8563A" },
  { key: "defense", label: "DÉF", max: 200, color: "#3A7FE0" },
  { key: "speed", label: "VIT", max: 200, color: "#F0A81C" },
] as const;

export default async function CardPage({ params }: Params) {
  const card = getCard((await params).id);
  if (!card) notFound();

  const user = await getCurrentUser();
  const ownedMap = user ? await getOwned(user.id) : {};
  const owned = ownedMap[card.id];
  const chance = chancePerPack(card.rarity);
  const prev = CARDS[card.num - 2];
  const next = CARDS[card.num];
  const work = card.work;
  const p = combatProfile(card);
  const energy = ENERGIES[p.energy];
  const weakness = ENERGIES[p.weakness];
  const siblings = cardsOfWork(work.id);
  const back = owned
    ? { href: "/collection", label: "Ma collection" }
    : { href: "/catalogue", label: "Catalogue" };
  // Pas encore obtenue : la carte reste un mystère, comme dans le catalogue.
  const mystery = !owned;

  return (
    <div className="dex" style={{ "--energy": energy.color } as CSSProperties}>
      <article className="dex__panel">
        <div className="dex__hero">
          <div className="dex__bar">
            <Link href={back.href}>← {back.label}</Link>
            <span className="dex__num">
              N°{cardNumber(card.num, card.total)}
            </span>
          </div>
          <div className={`dex__portrait${mystery ? " is-mystery" : ""}`}>
            <CardImage name={card.name} image={card.image} />
          </div>
        </div>

        <div className="dex__body">
          <div>
            <h1 className="dex__name">
              {mystery ? "Carte mystère" : card.name}
            </h1>
            <p className="dex__work">
              {mystery
                ? "Obtiens-la pour la découvrir"
                : `${work.title} · ${work.year}`}
            </p>
          </div>

          <ul className="dex__chips" aria-label="Classe et rareté">
            <li
              className="dex__chip"
              style={{ "--chip": energy.color } as CSSProperties}
            >
              <img src={energy.icon} alt="" />
              {energy.label}
            </li>
            <li
              className={`dex__chip dex__chip--rarity rarity--${card.rarity}`}
            >
              <span aria-hidden="true">{RARITY_SYMBOL[card.rarity]}</span>
              {RARITIES[card.rarity].label}
            </li>
          </ul>

          {mystery ? (
            <p className="dex__locked">
              Son image, ses statistiques et ses attaques se dévoilent quand tu
              l’obtiens : dans un paquet ({oneIn(chance)} par paquet) ou en la
              fabriquant avec tes éclats.
            </p>
          ) : (
            <>
              <dl className="dex__facts">
                <div>
                  <dd>{p.hp}</dd>
                  <dt>Points de vie</dt>
                </div>
                <div>
                  <dd className="dex__fact-icon">
                    <img src={weakness.icon} alt="" />
                    {weakness.label}
                  </dd>
                  <dt>Faiblesse ×2</dt>
                </div>
                <div>
                  <dd>{"✦".repeat(p.retreat)}</dd>
                  <dt>Retraite</dt>
                </div>
              </dl>

              <section className="dex__section" aria-labelledby="stats-title">
                <h2 id="stats-title" className="dex__h">
                  Statistiques
                </h2>
                <ul className="dex__stats">
                  {STATS.map((s) => {
                    const value = p[s.key];
                    return (
                      <li key={s.key}>
                        <span>{s.label}</span>
                        <span
                          className="dex__meter"
                          role="meter"
                          aria-label={s.label}
                          aria-valuenow={value}
                          aria-valuemin={0}
                          aria-valuemax={s.max}
                        >
                          <span
                            style={
                              {
                                width: `${Math.round((value / s.max) * 100)}%`,
                                "--meter": s.color,
                              } as CSSProperties
                            }
                          />
                        </span>
                        <span className="dex__value" aria-hidden="true">
                          {value}
                          <small>/{s.max}</small>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="dex__section" aria-labelledby="atk-title">
                <h2 id="atk-title" className="dex__h">
                  Attaques
                </h2>
                <ul className="dex__attacks">
                  {p.attacks.map((a) => (
                    <li key={a.name}>
                      <span
                        className="dex__cost"
                        aria-label={`Coût : ${a.cost} énergie${a.cost > 1 ? "s" : ""}`}
                      >
                        {Array.from({ length: a.cost }, (_, i) => (
                          <img key={i} src={energy.icon} alt="" />
                        ))}
                      </span>
                      <strong>{a.name}</strong>
                      <span className="dex__dmg">{a.damage}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="dex__section" aria-labelledby="info-title">
                <h2 id="info-title" className="dex__h">
                  Fiche
                </h2>
                <dl className="dex__info">
                  <div>
                    <dt>Œuvre</dt>
                    <dd>
                      {work.title} ({work.year})
                    </dd>
                  </div>
                  {work.network && (
                    <div>
                      <dt>Chaîne ou studio</dt>
                      <dd>{work.network}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Pays</dt>
                    <dd>{countryNames(work.countries)}</dd>
                  </div>
                  <div>
                    <dt>Genres</dt>
                    <dd>{work.genres}</dd>
                  </div>
                  <div>
                    <dt>Série</dt>
                    <dd>
                      {siblings.length} carte{siblings.length > 1 ? "s" : ""}{" "}
                      pour cette œuvre
                      {user &&
                        siblings.length > 1 &&
                        ` · ${siblings.filter((c) => ownedMap[c.id]).length} dans ta collection`}
                    </dd>
                  </div>
                  <div>
                    <dt>Chance par paquet</dt>
                    <dd>
                      {oneIn(chance)} · en or : {oneIn(chance / GOLD_ODDS)}
                    </dd>
                  </div>
                  <div>
                    <dt>Doublon</dt>
                    <dd>+{SHARDS_PER_DUPLICATE[card.rarity]} éclats</dd>
                  </div>
                </dl>
              </section>
            </>
          )}
        </div>
      </article>

      <aside className="dex__side" aria-label="Carte">
        <CardViewer
          label={mystery ? "Carte mystère" : card.name}
          front={
            <Card
              card={card}
              gold={!!owned && owned.gold > 0}
              headingLevel="h2"
              mystery={mystery}
            />
          }
          back={<CardBack />}
        />

        {user ? (
          owned ? (
            <div className="owned-box">
              <p>
                Dans ta collection : <strong>{owned.copies}</strong> exemplaire
                {owned.copies > 1 ? "s" : ""}
                {owned.gold > 0 ? (
                  <>
                    {" "}
                    et{" "}
                    <strong className="gold-text">
                      {owned.gold} version{owned.gold > 1 ? "s" : ""} or
                    </strong>
                  </>
                ) : null}
                .
              </p>
            </div>
          ) : (
            <div className="owned-box">
              <p>Tu n’as pas encore cette carte. Tu as {user.shards} éclats.</p>
              <CraftButton
                cardId={card.id}
                cost={CRAFT_COST[card.rarity]}
                canAfford={user.shards >= CRAFT_COST[card.rarity]}
              />
            </div>
          )
        ) : (
          <div className="owned-box">
            <p>
              <Link href={`/connexion?next=/carte/${card.id}`} className="link">
                Connecte-toi
              </Link>{" "}
              pour l’ajouter à ta collection.
            </p>
          </div>
        )}

        {!mystery && (
          <p className="credit">
            Image :{" "}
            <a
              href={card.source}
              className="link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {card.credit}
            </a>{" "}
            · © ayants droit de l’œuvre
          </p>
        )}

        <div className="detail__nav">
          {prev ? (
            <Link href={`/carte/${prev.id}`} className="btn btn--ghost btn--sm">
              ← N°{cardNumber(prev.num, prev.total)}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/carte/${next.id}`} className="btn btn--ghost btn--sm">
              N°{cardNumber(next.num, next.total)} →
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}
