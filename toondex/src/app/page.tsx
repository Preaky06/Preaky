import Link from "next/link";
import { Card } from "@/components/Card";
import { Countdown } from "@/components/Countdown";
import { OddsTable } from "@/components/OddsTable";
import { PackOpener } from "@/components/PackOpener";
import { getCurrentUser } from "@/lib/auth";
import { TYPES, TYPE_ORDER, WORKS, getWork } from "@/lib/catalogue";
import { getOwned, getTodayPack } from "@/lib/collection";

const SHOWCASE = ["clarence", "prison-break", "dr-stone", "inception", "le-voyage-de-chihiro"];

function TypeChips() {
  return (
    <ul className="chips" aria-label="Types de cartes">
      {TYPE_ORDER.map((t) => (
        <li key={t} className="chip">
          <span className="chip__dot" style={{ background: TYPES[t].color }} aria-hidden="true" />
          {TYPES[t].label}
        </li>
      ))}
    </ul>
  );
}

function todayLabel(): string {
  const text = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(),
  );
  return text.toUpperCase();
}

async function Landing() {
  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <span className="kicker">{todayLabel()}</span>
          <h1 className="hero__title">Tes séries et tes films, en cartes.</h1>
          <p className="hero__lead">
            Un paquet de 5 cartes par jour. Chaque carte est une œuvre : série, série animée, anime ou film.
            Complète ta collection, carte après carte.
          </p>
          <div className="hero__actions">
            <Link href="/inscription" className="btn btn--primary btn--lg">
              Créer mon compte
            </Link>
            <Link href="/connexion" className="btn btn--ghost btn--lg">
              J’ai déjà un compte
            </Link>
          </div>
          <TypeChips />
        </div>
        <div className="fan" aria-label="Exemples de cartes">
          {SHOWCASE.map((id, i) => (
            <div
              key={id}
              className="fan__card"
              style={
                {
                  "--x": `${(i - 2) * 92}px`,
                  "--y": `${Math.abs(i - 2) * 22}px`,
                  "--r": `${(i - 2) * 8}deg`,
                  zIndex: 10 - Math.abs(i - 2),
                } as React.CSSProperties
              }
            >
              <Card work={getWork(id)!} gold={i === 4} />
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">Comment ça marche</h2>
        <ol className="steps">
          <li className="step">
            <span className="step__num">1</span>
            <h3>Un paquet par jour</h3>
            <p>5 cartes tirées parmi {WORKS.length} œuvres. La cinquième est toujours rare ou mieux.</p>
          </li>
          <li className="step">
            <span className="step__num">2</span>
            <h3>Plus c’est rare, plus ça brille</h3>
            <p>Cinq raretés, de Commune à Mythique. Chaque rareté a sa propre animation d’ouverture.</p>
          </li>
          <li className="step">
            <span className="step__num">3</span>
            <h3>Doublons en éclats</h3>
            <p>Un doublon devient des éclats. Avec assez d’éclats, tu fabriques la carte qui te manque.</p>
          </li>
        </ol>
      </section>

      <section className="section">
        <h2 className="section__title">Les chances</h2>
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
      <section className="today">
        <div className="today__head">
          <span className="kicker">{todayLabel()}</span>
          <h1 className="today__title">{pack ? "Ton paquet du jour est ouvert" : "Ton paquet du jour t’attend"}</h1>
          <p className="muted">
            {pack ? (
              <>
                Prochain paquet dans <Countdown />.
              </>
            ) : (
              "5 cartes. Plus la carte est rare, plus son ouverture est spectaculaire."
            )}
          </p>
        </div>
        <PackOpener initialCards={pack?.cards ?? null} />
      </section>

      <section className="section">
        <div className="stats">
          <div className="stat">
            <span className="stat__label">Ta collection</span>
            <span className="stat__value">
              {ownedCount} <span className="muted">/ {WORKS.length}</span>
            </span>
            <span className="progress" role="img" aria-label={`${progress} % de la collection`}>
              <span style={{ width: `${progress}%` }} />
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">Éclats</span>
            <span className="stat__value">{user.shards}</span>
            <Link href="/collection?vue=manquantes" className="stat__link">
              Fabriquer une carte
            </Link>
          </div>
          <div className="stat">
            <span className="stat__label">Versions or</span>
            <span className="stat__value">{goldCount}</span>
            <span className="muted small">1 chance sur 250 par carte</span>
          </div>
        </div>
      </section>
    </>
  );
}
