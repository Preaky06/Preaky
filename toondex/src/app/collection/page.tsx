import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, MissingCard } from "@/components/Card";
import { CraftButton } from "@/components/CraftButton";
import { Filters, parseFilters } from "@/components/Filters";
import { getCurrentUser } from "@/lib/auth";
import { RARITIES, RARITY_ORDER, WORKS } from "@/lib/catalogue";
import { getOwned } from "@/lib/collection";
import { CRAFT_COST } from "@/lib/rules";
import { Wobble } from "@/components/Wobble";

export const metadata: Metadata = { title: "Ma collection" };

const VIEWS = [
  { value: undefined, label: "Toutes" },
  { value: "possedees", label: "Possédées" },
  { value: "manquantes", label: "Manquantes" },
];

export default async function CollectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/collection");

  const values = parseFilters(await searchParams);
  const owned = await getOwned(user.id);
  const ownedCount = Object.keys(owned).length;
  const progress = Math.round((ownedCount / WORKS.length) * 100);

  const list = WORKS.filter((w) => {
    if (values.type && w.type !== values.type) return false;
    if (values.rarete && w.rarity !== values.rarete) return false;
    if (values.vue === "possedees" && !owned[w.id]) return false;
    if (values.vue === "manquantes" && owned[w.id]) return false;
    return true;
  });

  return (
    <>
      <section className="page-head">
        <div>
          <h1 className="page-title">
            <Wobble text="Ma collection" />
          </h1>
          <p className="muted">
            {ownedCount} cartes sur {WORKS.length} · {progress} %
          </p>
        </div>
        <div className="page-head__side">
          <span className="shards shards--lg">
            <span className="shards__gem" aria-hidden="true" />
            {user.shards} éclats
          </span>
        </div>
      </section>

      <ul className="rarity-progress" aria-label="Progression par rareté">
        {RARITY_ORDER.map((r) => {
          const total = WORKS.filter((w) => w.rarity === r).length;
          const have = WORKS.filter((w) => w.rarity === r && owned[w.id]).length;
          return (
            <li key={r}>
              <span className={`rarity rarity--${r}`}>{RARITIES[r].label}</span>
              <span className="rarity-progress__count">
                {have}/{total}
              </span>
            </li>
          );
        })}
      </ul>

      <Filters base="/collection" values={values} views={VIEWS} />

      {list.length === 0 ? (
        <p className="empty">
          Aucune carte ici pour l’instant.{" "}
          {ownedCount === 0 && (
            <Link href="/" className="link">
              Ouvre ton premier paquet
            </Link>
          )}
        </p>
      ) : (
        <ul className="card-grid">
          {list.map((w) => {
            const mine = owned[w.id];
            if (mine) {
              return (
                <li key={w.id} className="card-grid__item">
                  <Link href={`/carte/${w.id}`} className="card-link">
                    <Card work={w} gold={mine.gold > 0} />
                  </Link>
                  <span className="card-grid__info">
                    {mine.copies > 0 && <span>×{mine.copies}</span>}
                    {mine.gold > 0 && <span className="gold-text">Or ×{mine.gold}</span>}
                  </span>
                </li>
              );
            }
            const cost = CRAFT_COST[w.rarity];
            return (
              <li key={w.id} className="card-grid__item">
                <Link href={`/carte/${w.id}`} className="card-link" aria-label={`${w.title}, carte manquante`}>
                  <MissingCard work={w} />
                </Link>
                <CraftButton workId={w.id} cost={cost} canAfford={user.shards >= cost} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
