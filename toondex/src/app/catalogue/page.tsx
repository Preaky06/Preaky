import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/Card";
import { CardLightbox } from "@/components/CardLightbox";
import { Pagination } from "@/components/Pagination";
import { RarityBar, parseRarity } from "@/components/RarityBar";
import { getCurrentUser } from "@/lib/auth";
import { CARDS, RARITY_ORDER, WORK_COUNT, type Rarity } from "@/lib/catalogue";
import { getOwned, type OwnedMap } from "@/lib/collection";

export const metadata: Metadata = { title: "Catalogue" };

const PAGE_SIZE = 48;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rarete = parseRarity(params.rarete);
  const rawQ = Array.isArray(params.q) ? params.q[0] : params.q;
  const qText = (rawQ ?? "").trim().slice(0, 60);
  const q = normalize(qText);
  const user = await getCurrentUser();
  const owned: OwnedMap = user ? await getOwned(user.id) : {};

  const matches = q
    ? CARDS.filter((c) =>
        normalize(
          `${c.name} ${c.work.title} ${c.work.genres} ${c.work.year} ${c.work.network}`,
        ).includes(q),
      )
    : CARDS;
  const list = rarete ? matches.filter((c) => c.rarity === rarete) : matches;
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const rawPage = Number(
    Array.isArray(params.page) ? params.page[0] : params.page,
  );
  const page = Number.isInteger(rawPage)
    ? Math.min(Math.max(rawPage, 1), pages)
    : 1;
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const keep = { q: qText || undefined, rarete };
  const counts = Object.fromEntries(
    RARITY_ORDER.map((r) => [
      r,
      String(matches.filter((c) => c.rarity === r).length),
    ]),
  ) as Record<Rarity, string>;

  return (
    <>
      <section className="page-head">
        <div>
          <h1 className="page-title">Catalogue</h1>
          <p className="muted">
            {CARDS.length.toLocaleString("fr-FR")} personnages de {WORK_COUNT}{" "}
            œuvres.
            {list.length !== CARDS.length &&
              ` ${list.length.toLocaleString("fr-FR")} correspondent.`}
            {pages > 1 && ` Page ${page} sur ${pages}.`} Les cartes que tu n’as
            pas encore obtenues restent floues.
          </p>
        </div>
        <form className="search" action="/catalogue" role="search">
          {rarete && <input type="hidden" name="rarete" value={rarete} />}
          <label htmlFor="q" className="sr-only">
            Rechercher un personnage ou une œuvre
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={qText}
            placeholder="Personnage, œuvre, chaîne…"
            className="input"
          />
          <button type="submit" className="btn btn--ghost">
            Rechercher
          </button>
        </form>
      </section>

      <RarityBar
        base="/catalogue"
        active={rarete}
        counts={counts}
        total={String(matches.length)}
        keep={{ q: qText || undefined }}
      />

      {list.length === 0 ? (
        <p className="empty">Aucun personnage ne correspond à ta recherche.</p>
      ) : (
        <CardLightbox
          cards={shown}
          mystery={shown.filter((c) => !owned[c.id]).map((c) => c.id)}
        >
          <ul className="card-grid">
            {shown.map((c) => (
              <li key={c.id} className="card-grid__item">
                <Link
                  href={`/carte/${c.id}`}
                  className="card-link"
                  data-card={c.id}
                  aria-label={
                    owned[c.id]
                      ? `${c.name}, voir la carte`
                      : `Carte mystère n°${c.num}, voir la carte`
                  }
                >
                  <Card card={c} mystery={!owned[c.id]} />
                </Link>
                <span className="card-grid__info">
                  {owned[c.id] ? (
                    <span className="owned-yes">{c.name}</span>
                  ) : (
                    <span>Carte mystère</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardLightbox>
      )}
      <Pagination base="/catalogue" page={page} pages={pages} keep={keep} />
    </>
  );
}
