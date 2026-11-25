import Link from "next/link";
import { BrandHero } from "@/components/BrandHero";
import { ArrowIcon } from "@/components/Icons";
import { OddsTable } from "@/components/OddsTable";
import { Pack3D, PackScene } from "@/components/Pack3D";
import { PackOpener } from "@/components/PackOpener";
import { RarityTiers } from "@/components/RarityTiers";
import { getCurrentUser } from "@/lib/auth";
import { CARDS, RARITY_ORDER, WORK_COUNT, getCard, type CardDef } from "@/lib/catalogue";
import { getOwned, getPackSets, getTodayPack } from "@/lib/collection";

/* eslint-disable @next/next/no-img-element */

const DEFAULT_SHOWCASE = ["walter-white", "satoru-gojo"];

function todayLabel(): string {
  const text = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(),
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function showcaseFrom(ids: string[]): CardDef[] {
  return ids.map((id) => getCard(id)).filter((c): c is CardDef => !!c);
}

const FEATURES = [
  { icon: "/3d/gift.webp", title: "Un paquet par jour", text: "5 cartes tirées au hasard, la dernière au moins rare. Nouveau paquet à minuit." },
  { icon: "/3d/etincelle.webp", title: "Des ouvertures à la hauteur", text: "Chaque rareté a son animation. Plus la carte est rare, plus le moment dure." },
  { icon: "/3d/trophy.webp", title: "Des séries à compléter", text: "Réunis tous les personnages d’une œuvre et gagne un bonus d’éclats." },
  { icon: "/3d/gemme.webp", title: "Rien ne se perd", text: "Un doublon devient des éclats. Avec assez d’éclats, tu fabriques la carte qui te manque." },
];

function Rules() {
  return (
    <>
      <section className="section">
        <ul className="features">
          {FEATURES.map((f) => (
            <li key={f.title} className="feature">
              <img className="feature__icon" src={f.icon} alt="" />
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="section">
        <div className="section__head">
          <div>
            <h2 className="section-title">Six niveaux de rareté</h2>
            <p>
              Commune sans effet, rare à reflet, épique pailletée, légendaire et mythique en pleine illustration avec reflets
              arc-en-ciel. La secrète, tout en or, peut sortir à n’importe quel niveau.
            </p>
          </div>
          <Link href="/catalogue" className="btn btn--ghost">
            Voir le catalogue
            <ArrowIcon />
          </Link>
        </div>
        <RarityTiers />
      </section>
      <section className="section">
        <div className="section__head">
          <div>
            <h2 className="section-title">Les chances</h2>
            <p>Les quatre premières cartes suivent ces chances. La cinquième est toujours rare ou mieux.</p>
          </div>
        </div>
        <div className="panel">
          <OddsTable />
        </div>
      </section>
    </>
  );
}

function Landing() {
  return (
    <>
      <BrandHero tags={[`${CARDS.length} personnages`, `${WORK_COUNT} séries, anime et films`]}>
        <p className="brand-hero__lead">Les personnages de tes séries, anime et films, en cartes à collectionner.</p>
        <Link href="/inscription" className="btn btn--hero">
          Commencer ma collection
          <ArrowIcon />
        </Link>
      </BrandHero>

      <section className="pack-section" aria-labelledby="pack-title">
        <div className="hero">
          <div className="hero__copy">
            <p className="eyebrow">Paquet du jour</p>
            <h2 id="pack-title" className="hero__title">
              5 cartes, chaque jour
            </h2>
            <p className="hero__lead">
              Walter White, Homer Simpson, Luffy, Dark Vador… Ouvre ton paquet, découvre qui sort, et complète les séries
              de tes œuvres préférées.
            </p>
            <div className="hero__actions">
              <Link href="/inscription" className="btn btn--primary btn--lg">
                Créer mon compte
                <ArrowIcon />
              </Link>
              <Link href="/connexion" className="btn btn--ghost btn--lg">
                Se connecter
              </Link>
            </div>
          </div>
          <PackScene cards={showcaseFrom(DEFAULT_SHOWCASE)} pack={<Pack3D />} />
        </div>
      </section>

      <Rules />
    </>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const [pack, owned] = await Promise.all([getTodayPack(user.id), getOwned(user.id)]);
  const sets = pack ? await getPackSets(user.id, pack) : [];
  const ownedCards = CARDS.filter((c) => owned[c.id]);
  const golds = Object.values(owned).filter((o) => o.gold > 0).length;
  // Derrière le paquet : les deux cartes les plus rares de la collection, sinon deux cartes d'exemple.
  const best = [...ownedCards].sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)).slice(0, 2);
  const showcase = best.length === 2 ? best : showcaseFrom(DEFAULT_SHOWCASE);

  return (
    <>
      <BrandHero compact tags={[todayLabel(), `${ownedCards.length}/${CARDS.length} cartes`]}>
        <p className="brand-hero__lead">
          {pack ? "Ton paquet du jour est ouvert. Le prochain arrive à minuit." : `Salut ${user.pseudo}, ton paquet du jour t’attend.`}
        </p>
        <a href="#paquet" className="btn btn--hero">
          {pack ? "Voir mes cartes" : "Ouvrir mon paquet"}
          <ArrowIcon />
        </a>
      </BrandHero>

      <section className="pack-section" id="paquet" aria-label="Paquet du jour">
        <PackOpener
          initialCards={pack?.cards ?? null}
          initialSets={sets}
          showcase={showcase}
          intro={
            <>
              <p className="eyebrow">{todayLabel()}</p>
              <h2 className="hero__title">Ton paquet du jour</h2>
              <p className="hero__lead">
                5 cartes t’attendent. La cinquième est au moins rare, et chaque carte a une chance sur 250 de sortir en
                secrète, entièrement en or.
              </p>
            </>
          }
          footer={
            <dl className="hero__stats">
              <div>
                <dt>Collection</dt>
                <dd>
                  {ownedCards.length} <small>/ {CARDS.length}</small>
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
      <Rules />
    </>
  );
}
