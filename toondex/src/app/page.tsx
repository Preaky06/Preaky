import Link from "next/link";
import { Card } from "@/components/Card";
import { ArrowIcon, Glove, Toono } from "@/components/Cartoon";
import { Countdown } from "@/components/Countdown";
import { Marquee } from "@/components/Marquee";
import { OddsTable } from "@/components/OddsTable";
import { PackOpener } from "@/components/PackOpener";
import { Wobble } from "@/components/Wobble";
import { getCurrentUser } from "@/lib/auth";
import { WORKS, getWork } from "@/lib/catalogue";
import { getOwned, getTodayPack } from "@/lib/collection";
import { POP } from "@/lib/palette";

const SHOWCASE = ["rick-et-morty", "le-voyage-de-chihiro", "dr-stone"];

function todayLabel(): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(),
  );
}

function Landing() {
  return (
    <>
      <section className="panel panel--white hero">
        <Glove className="hero__glove" />
        <div className="hero__text">
          <span className="tag">Paquet du jour · 5 cartes</span>
          <h1 className="hero__title">
            <Wobble text="Collectionne" className="hero__big" />
            <span className="hero__sub">tes séries et tes films, en cartes.</span>
          </h1>
          <p className="hero__lead">
            Chaque jour, un paquet de 5 cartes. Séries, séries animées, anime, films : chaque carte est une œuvre,
            avec son personnage. Plus c’est rare, plus l’ouverture est folle.
          </p>
          <div className="hero__actions">
            <Link href="/inscription" className="btn btn--dark btn--lg">
              Créer mon compte
              <span className="btn__arrow">
                <ArrowIcon />
              </span>
            </Link>
            <Link href="/connexion" className="btn btn--ghost btn--lg">
              J’ai déjà un compte
            </Link>
          </div>
        </div>
        <div className="hero__cards" aria-label="Exemples de cartes">
          {SHOWCASE.map((id, i) => (
            <div key={id} className={`hero__card hero__card--${i}`}>
              <Card work={getWork(id)!} gold={i === 1} />
            </div>
          ))}
        </div>
      </section>

      <Marquee />

      <section className="panel panel--dark how">
        <Toono peek className="peek peek--right" />
        <h2 className="giant">
          <Wobble text="Comment ça marche" colors={POP} />
        </h2>
        <ol className="steps">
          <li className="step step--lilac">
            <span className="step__num">1</span>
            <h3>Un paquet par jour</h3>
            <p>5 cartes tirées parmi {WORKS.length} œuvres. La cinquième est toujours rare ou mieux.</p>
          </li>
          <li className="step step--orange">
            <span className="step__num">2</span>
            <h3>Plus c’est rare, plus ça brille</h3>
            <p>Cinq raretés, de Commune à Mythique, chacune avec sa propre animation d’ouverture.</p>
          </li>
          <li className="step step--lime">
            <span className="step__num">3</span>
            <h3>Doublons en éclats</h3>
            <p>Un doublon devient des éclats. Avec assez d’éclats, tu fabriques la carte qui te manque.</p>
          </li>
        </ol>
      </section>

      <Link href="/catalogue" className="banner">
        <span className="banner__small">Explore tout le</span>
        <Wobble text="Catalogue" className="banner__big" />
        <span className="btn__arrow btn__arrow--lg">
          <ArrowIcon />
        </span>
        <Toono peek className="peek peek--banner" />
      </Link>

      <section className="panel panel--white">
        <h2 className="section-title">
          <Wobble text="Les chances" />
        </h2>
        <OddsTable />
      </section>
    </>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const [pack, owned] = await Promise.all([getTodayPack(user.id), getOwned(user.id)]);
  const ownedCount = Object.keys(owned).length;
  const goldCount = Object.values(owned).filter((o) => o.gold > 0).length;
  const progress = Math.round((ownedCount / WORKS.length) * 100);

  return (
    <>
      <section className="panel panel--dark today">
        <Toono peek className="peek peek--right" />
        <div className="today__head">
          <span className="tag tag--dark">{todayLabel()}</span>
          <h1 className="giant">
            <Wobble text="Paquet du jour" colors={POP} />
          </h1>
          <p className="today__status">
            {pack ? (
              <>
                Déjà ouvert. Prochain paquet dans <Countdown />.
              </>
            ) : (
              "5 cartes t’attendent. Plus la carte est rare, plus son ouverture est spectaculaire."
            )}
          </p>
        </div>
        <PackOpener initialCards={pack?.cards ?? null} />
      </section>

      <section className="stats">
        <div className="stat">
          <span className="stat__label">Ta collection</span>
          <span className="stat__value">
            {ownedCount}
            <span className="stat__of"> / {WORKS.length}</span>
          </span>
          <span className="progress" role="img" aria-label={`${progress} % de la collection`}>
            <span style={{ width: `${progress}%` }} />
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Éclats</span>
          <span className="stat__value">{user.shards}</span>
          <Link href="/collection?vue=manquantes" className="link">
            Fabriquer une carte
          </Link>
        </div>
        <div className="stat">
          <span className="stat__label">Versions or</span>
          <span className="stat__value">{goldCount}</span>
          <span className="muted small">1 chance sur 250 par carte</span>
        </div>
      </section>

      <Link href="/collection" className="banner">
        <span className="banner__small">Voir</span>
        <Wobble text="Ma collection" className="banner__big" />
        <span className="btn__arrow btn__arrow--lg">
          <ArrowIcon />
        </span>
        <Toono peek className="peek peek--banner" />
      </Link>
    </>
  );
}
