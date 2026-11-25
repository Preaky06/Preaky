import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DexTile } from "@/components/DexTile";
import { ArrowIcon } from "@/components/Icons";
import { Pack3D } from "@/components/Pack3D";
import { RarityBar, parseRarity } from "@/components/RarityBar";
import { getCurrentUser } from "@/lib/auth";
import { CARDS, RARITY_ORDER, type Rarity } from "@/lib/catalogue";
import { getOwned } from "@/lib/collection";

export const metadata: Metadata = { title: "Ma collection" };

export default async function CollectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/collection");

  const rarete = parseRarity((await searchParams).rarete);
  const owned = await getOwned(user.id);
  // Seules les cartes débloquées apparaissent : la collection commence vide.
  const mine = CARDS.filter((c) => owned[c.id]);
  const list = rarete ? mine.filter((c) => c.rarity === rarete) : mine;
  const progress = Math.round((mine.length / CARDS.length) * 100);
  const counts = Object.fromEntries(
    RARITY_ORDER.map((r) => [r, `${mine.filter((c) => c.rarity === r).length}/${CARDS.filter((c) => c.rarity === r).length}`]),
  ) as Record<Rarity, string>;

  return (
    <>
      <section className="page-head">
        <div>
          <h1 className="page-title">Ma collection</h1>
          <p className="muted">
            {mine.length} carte{mine.length > 1 ? "s" : ""} sur {CARDS.length} · {progress} %
          </p>
        </div>
        <div className="page-head__side">
          <span className="shards shards--lg">
            <span className="shards__gem" aria-hidden="true" />
            {user.shards} éclats
          </span>
          <Link href="/catalogue" className="btn btn--ghost">
            Catalogue
          </Link>
        </div>
      </section>

      <RarityBar base="/collection" active={rarete} counts={counts} total={`${mine.length}/${CARDS.length}`} />

      {mine.length === 0 ? (
        <div className="empty-state">
          <Pack3D />
          <h2>Ta collection est vide</h2>
          <p>Ouvre ton paquet du jour : chaque carte obtenue s’ajoute ici, et ta collection se construit au fil des jours.</p>
          <Link href="/" className="btn btn--primary btn--lg">
            Ouvrir mon paquet
            <ArrowIcon />
          </Link>
        </div>
      ) : list.length === 0 ? (
        <p className="empty">Aucune carte de cette rareté pour l’instant.</p>
      ) : (
        <ul className="dex-grid">
          {list.map((c) => (
            <li key={c.id}>
              <DexTile card={c} copies={owned[c.id].copies} gold={owned[c.id].gold} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
