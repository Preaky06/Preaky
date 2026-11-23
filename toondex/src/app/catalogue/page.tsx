import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Filters, parseFilters } from "@/components/Filters";
import { OddsTable } from "@/components/OddsTable";
import { getCurrentUser } from "@/lib/auth";
import { WORKS } from "@/lib/catalogue";
import { getOwned, type OwnedMap } from "@/lib/collection";

export const metadata: Metadata = { title: "Catalogue" };

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default async function CataloguePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const values = parseFilters(await searchParams);
  const user = await getCurrentUser();
  const owned: OwnedMap = user ? await getOwned(user.id) : {};
  const q = values.q ? normalize(values.q) : "";

  const list = WORKS.filter((w) => {
    if (values.type && w.type !== values.type) return false;
    if (values.rarete && w.rarity !== values.rarete) return false;
    if (q && !normalize(`${w.title} ${w.genres} ${w.year}`).includes(q)) return false;
    return true;
  });

  return (
    <>
      <section className="page-head">
        <div>
          <h1 className="page-title">Catalogue</h1>
          <p className="muted">
            Les {WORKS.length} cartes du jeu. {list.length !== WORKS.length && `${list.length} affichées.`}
          </p>
        </div>
        <form className="search" action="/catalogue" role="search">
          {values.type && <input type="hidden" name="type" value={values.type} />}
          {values.rarete && <input type="hidden" name="rarete" value={values.rarete} />}
          <label htmlFor="q" className="sr-only">
            Rechercher une œuvre
          </label>
          <input id="q" name="q" type="search" defaultValue={values.q} placeholder="Titre, genre, année…" className="input" />
          <button type="submit" className="btn btn--ghost">
            Rechercher
          </button>
        </form>
      </section>

      <Filters base="/catalogue" values={values} />

      {list.length === 0 ? (
        <p className="empty">Aucune œuvre ne correspond à ta recherche.</p>
      ) : (
        <ul className="card-grid">
          {list.map((w) => (
            <li key={w.id} className="card-grid__item">
              <Link href={`/carte/${w.id}`} className="card-link">
                <Card work={w} />
              </Link>
              {user && (
                <span className="card-grid__info">
                  {owned[w.id] ? <span className="owned-yes">Dans ta collection</span> : <span className="muted">Manquante</span>}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="section">
        <h2 className="section__title">Règles et chances</h2>
        <OddsTable />
      </section>
    </>
  );
}
