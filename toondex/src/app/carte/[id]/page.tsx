import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { CraftButton } from "@/components/CraftButton";
import { getCurrentUser } from "@/lib/auth";
import { RARITIES, TYPES, WORKS, WORKS_BY_RARITY, cardNumber, countryNames, getWork } from "@/lib/catalogue";
import { getOwned } from "@/lib/collection";
import { CRAFT_COST, GOLD_ODDS, LAST_SLOT_ODDS, PACK_SIZE, SHARDS_PER_DUPLICATE, SLOT_ODDS } from "@/lib/rules";
import { Wobble } from "@/components/Wobble";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const work = getWork((await params).id);
  return { title: work ? work.title : "Carte introuvable" };
}

/** Chance d'obtenir cette carte précise dans un paquet (approximation : tirages indépendants). */
function chancePerPack(rarity: keyof typeof SLOT_ODDS): number {
  const n = WORKS_BY_RARITY[rarity].length;
  const p = SLOT_ODDS[rarity] / 1000 / n;
  const pLast = LAST_SLOT_ODDS[rarity] / 1000 / n;
  return 1 - Math.pow(1 - p, PACK_SIZE - 1) * (1 - pLast);
}

function oneIn(p: number): string {
  return `1 chance sur ${Math.round(1 / p).toLocaleString("fr-FR")}`;
}

export default async function CardPage({ params }: Params) {
  const work = getWork((await params).id);
  if (!work) notFound();

  const user = await getCurrentUser();
  const owned = user ? (await getOwned(user.id))[work.id] : undefined;
  const p = chancePerPack(work.rarity);
  const prev = WORKS[work.num - 2];
  const next = WORKS[work.num];

  return (
    <>
      <nav className="crumbs" aria-label="Fil d’Ariane">
        <Link href="/catalogue" className="link">
          Catalogue
        </Link>
        <span aria-hidden="true"> / </span>
        <span>#{cardNumber(work.num)}</span>
      </nav>

      <section className="detail">
        <div className="detail__card">
          <Card work={work} gold={!!owned && owned.gold > 0} headingLevel="h2" className={user && !owned ? "card--locked" : ""} />
        </div>
        <div className="detail__info">
          <span className="type-chip" style={{ background: TYPES[work.type].color }}>
            {TYPES[work.type].label} · #{cardNumber(work.num)}
          </span>
          <h1 className="detail__title">
            <Wobble text={work.title} />
          </h1>
          <dl className="facts">
            <div>
              <dt>Première diffusion ou sortie</dt>
              <dd>{work.year}</dd>
            </div>
            <div>
              <dt>Pays</dt>
              <dd>{countryNames(work.countries)}</dd>
            </div>
            <div>
              <dt>Genres</dt>
              <dd>{work.genres}</dd>
            </div>
            <div>
              <dt>Rareté</dt>
              <dd>
                <span className={`rarity rarity--${work.rarity}`}>{RARITIES[work.rarity].label}</span>
              </dd>
            </div>
            <div>
              <dt>Chance par paquet</dt>
              <dd>
                {oneIn(p)} · version or : {oneIn(p / GOLD_ODDS)}
              </dd>
            </div>
            <div>
              <dt>Doublon</dt>
              <dd>+{SHARDS_PER_DUPLICATE[work.rarity]} éclats</dd>
            </div>
          </dl>

          {user ? (
            owned ? (
              <p className="owned-box">
                Dans ta collection : <strong>{owned.copies}</strong> exemplaire{owned.copies > 1 ? "s" : ""}
                {owned.gold > 0 ? (
                  <>
                    {" "}
                    et <strong className="gold-text">{owned.gold} version{owned.gold > 1 ? "s" : ""} or</strong>
                  </>
                ) : null}
                .
              </p>
            ) : (
              <div className="owned-box">
                <p>Tu n’as pas encore cette carte. Tu as {user.shards} éclats.</p>
                <CraftButton workId={work.id} cost={CRAFT_COST[work.rarity]} canAfford={user.shards >= CRAFT_COST[work.rarity]} />
              </div>
            )
          ) : (
            <p className="owned-box">
              <Link href={`/connexion?next=/carte/${work.id}`} className="link">
                Connecte-toi
              </Link>{" "}
              pour savoir si elle est dans ta collection.
            </p>
          )}

          <div className="detail__nav">
            {prev ? (
              <Link href={`/carte/${prev.id}`} className="btn btn--ghost btn--sm">
                ← #{cardNumber(prev.num)}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/carte/${next.id}`} className="btn btn--ghost btn--sm">
                #{cardNumber(next.num)} →
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
