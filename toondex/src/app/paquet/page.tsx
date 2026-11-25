import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PackOpener } from "@/components/PackOpener";
import { getCurrentUser } from "@/lib/auth";
import { CARDS, RARITY_ORDER, getCard, type CardDef } from "@/lib/catalogue";
import { getOwned, getPackSets, getTodayPack, withDefs } from "@/lib/collection";

export const metadata: Metadata = { title: "Paquet du jour" };

const DEFAULT_SHOWCASE = ["walter-white", "satoru-gojo"];

function todayLabel(): string {
  const text = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(),
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Le paquet du jour : ouverture, révélation carte par carte, puis les séries touchées. */
export default async function PackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/paquet");

  const [pack, owned] = await Promise.all([getTodayPack(user.id), getOwned(user.id)]);
  const sets = pack ? await getPackSets(user.id, pack) : [];
  const ownedCards = CARDS.filter((c) => owned[c.id]);
  const golds = Object.values(owned).filter((o) => o.gold > 0).length;
  // Derrière le paquet : les deux cartes les plus rares de la collection, sinon deux cartes d'exemple.
  const best = [...ownedCards].sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)).slice(0, 2);
  const showcase = best.length === 2 ? best : DEFAULT_SHOWCASE.map((id) => getCard(id)).filter((c): c is CardDef => !!c);

  return (
    <section className="pack-section" aria-label="Paquet du jour">
      <PackOpener
        initialCards={pack ? withDefs(pack.cards) : null}
        initialSets={sets}
        showcase={showcase}
        intro={
          <>
            <p className="eyebrow">{todayLabel()}</p>
            <h1 className="hero__title">Ton paquet du jour</h1>
            <p className="hero__lead">
              Touche le paquet pour l’ouvrir. La cinquième carte est au moins rare, et chaque carte a une chance sur 250 de
              sortir en secrète, entièrement en or.
            </p>
          </>
        }
        footer={
          <dl className="hero__stats">
            <div>
              <dt>Collection</dt>
              <dd>
                {ownedCards.length} <small>/ {CARDS.length.toLocaleString("fr-FR")}</small>
              </dd>
            </div>
            <div>
              <dt>Éclats</dt>
              <dd>{user.shards}</dd>
            </div>
            <div>
              <dt>Secrètes</dt>
              <dd>{golds}</dd>
            </div>
          </dl>
        }
      />
    </section>
  );
}
