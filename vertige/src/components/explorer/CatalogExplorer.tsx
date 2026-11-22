"use client";

import { LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { PriceCard } from "@/components/ui/PriceCard";
import type { CardItem } from "@/lib/card-item";
import { formatInt, formatObservedAt, formatPrice } from "@/lib/format";
import { CONFIDENCE_LABEL, PRICE_TYPE_LABEL } from "@/lib/labels";
import { matchScore } from "@/lib/search";
import { categoryName } from "@/lib/taxonomy";
import { TIERS, type TierId } from "@/lib/tiers";
import type { Confidence, PriceType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PriceHistogram, type LogRange } from "./PriceHistogram";

type Sort = "price-asc" | "price-desc" | "recent" | "random";
type Period = "all" | "2025+" | "2020-2024" | "pre-2020";
const PAGE = 48;

const SORTS: { id: Sort; label: string }[] = [
  { id: "price-asc", label: "Prix croissant" },
  { id: "price-desc", label: "Prix décroissant" },
  { id: "recent", label: "Relevés récents" },
  { id: "random", label: "Aléatoire" },
];

const PERIODS: { id: Period; label: string }[] = [
  { id: "all", label: "Toutes les années" },
  { id: "2025+", label: "2025 et après" },
  { id: "2020-2024", label: "2020 – 2024" },
  { id: "pre-2020", label: "Avant 2020" },
];

const inPeriod = (date: string, p: Period) => {
  const y = Number(date.slice(0, 4));
  return p === "all" || (p === "2025+" ? y >= 2025 : p === "2020-2024" ? y >= 2020 && y <= 2024 : y < 2020);
};

const toggle = <T,>(set: Set<T>, v: T) => {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
};

/** Catalogue complet (Phase 1 : tri et filtres côté client sur les objets de démo). */
export function CatalogExplorer({ items }: { items: CardItem[] }) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query);
  const [tiers, setTiers] = useState<Set<TierId>>(new Set());
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<PriceType>>(new Set());
  const [conf, setConf] = useState<Set<Confidence>>(new Set());
  const [country, setCountry] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [withImage, setWithImage] = useState(false);
  const [range, setRange] = useState<LogRange>(null);
  const [sort, setSort] = useState<Sort>("price-asc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [shown, setShown] = useState(PAGE);
  const [seed, setSeed] = useState(1);
  const [sheet, setSheet] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // « / » ou ⌘K / Ctrl+K : focus sur la recherche
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setSheet(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const facets = useMemo(() => {
    const c = new Map<string, number>();
    const t = new Map<PriceType, number>();
    const co = new Map<string, number>();
    for (const i of items) {
      c.set(i.category, (c.get(i.category) ?? 0) + 1);
      t.set(i.priceType, (t.get(i.priceType) ?? 0) + 1);
      if (i.country) co.set(i.country, (co.get(i.country) ?? 0) + 1);
    }
    const byCount = <K,>(m: Map<K, number>) => [...m].sort((a, b) => b[1] - a[1]);
    return { categories: byCount(c), types: byCount(t), countries: byCount(co) };
  }, [items]);

  // Tous les filtres sauf la plage de prix : alimente l'histogramme.
  const base = useMemo(() => {
    const scored: { item: CardItem; score: number }[] = [];
    for (const i of items) {
      if (tiers.size && !tiers.has(i.tier)) continue;
      if (cats.size && !cats.has(i.category)) continue;
      if (types.size && !types.has(i.priceType)) continue;
      if (conf.size && !conf.has(i.confidence)) continue;
      if (country && i.country !== country) continue;
      if (!inPeriod(i.observedAt, period)) continue;
      if (withImage && !i.image) continue;
      const score = q ? matchScore(`${i.name} ${categoryName(i.category)}`, q) : 1;
      if (score > 0) scored.push({ item: i, score });
    }
    return scored;
  }, [items, tiers, cats, types, conf, country, period, withImage, q]);

  const results = useMemo(() => {
    const list = base.filter(({ item }) => !range || (item.log >= range[0] && item.log < range[1]));
    const byPrice = (a: CardItem, b: CardItem) => a.priceEur - b.priceEur;
    let hash = seed;
    const rnd = new Map(list.map(({ item }) => [item.slug, ((hash = (hash * 16807) % 2147483647) / 2147483647)]));
    list.sort((a, b) => {
      if (q && b.score !== a.score && sort === "price-asc") return b.score - a.score;
      switch (sort) {
        case "price-desc":
          return -byPrice(a.item, b.item);
        case "recent":
          return b.item.observedAt.localeCompare(a.item.observedAt) || byPrice(a.item, b.item);
        case "random":
          return (rnd.get(a.item.slug) ?? 0) - (rnd.get(b.item.slug) ?? 0);
        default:
          return byPrice(a.item, b.item);
      }
    });
    return list.map((x) => x.item);
  }, [base, range, sort, q, seed]);

  const activeFilters =
    tiers.size + cats.size + types.size + conf.size + (country ? 1 : 0) + (period !== "all" ? 1 : 0) + (withImage ? 1 : 0) + (range ? 1 : 0);

  const reset = () => {
    setTiers(new Set());
    setCats(new Set());
    setTypes(new Set());
    setConf(new Set());
    setCountry("");
    setPeriod("all");
    setWithImage(false);
    setRange(null);
    setQuery("");
  };

  const filters = (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-semibold uppercase tracking-[0.14em] text-muted">Palier</legend>
        <div className="flex flex-wrap gap-2">
          {TIERS.map((t) => {
            const on = tiers.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                data-tier={t.id}
                aria-pressed={on}
                onClick={() => setTiers((s) => toggle(s, t.id))}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-3 text-[13px] font-semibold",
                  on ? "bg-(--tier) text-white" : "bg-elevated text-ink ring-1 ring-line",
                )}
              >
                <span aria-hidden="true" className={cn("size-2 rounded-full", on ? "bg-white" : "bg-(--tier)")} />
                {t.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-small font-semibold uppercase tracking-[0.14em] text-muted">Catégorie</legend>
        <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto pr-1">
          {facets.categories.map(([slug, n]) => (
            <li key={slug}>
              <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-[14px] hover:bg-elevated">
                <input type="checkbox" checked={cats.has(slug)} onChange={() => setCats((s) => toggle(s, slug))} className="size-4 accent-brand" />
                <span className="flex-1">{categoryName(slug)}</span>
                <span className="text-[12px] tabular-nums text-muted">{n}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-small font-semibold uppercase tracking-[0.14em] text-muted">Type de prix</legend>
        <ul className="flex flex-col gap-0.5">
          {facets.types.map(([t, n]) => (
            <li key={t}>
              <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-[14px] hover:bg-elevated">
                <input type="checkbox" checked={types.has(t)} onChange={() => setTypes((s) => toggle(s, t))} className="size-4 accent-brand" />
                <span className="flex-1">{PRICE_TYPE_LABEL[t]}</span>
                <span className="text-[12px] tabular-nums text-muted">{n}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-small font-semibold text-muted">
          Pays
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-10 rounded-xl bg-elevated px-2 text-[14px] font-normal text-ink ring-1 ring-line"
          >
            <option value="">Tous</option>
            {facets.countries.map(([c, n]) => (
              <option key={c} value={c}>
                {c} ({n})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-small font-semibold text-muted">
          Année du relevé
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="h-10 rounded-xl bg-elevated px-2 text-[14px] font-normal text-ink ring-1 ring-line"
          >
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-small font-semibold uppercase tracking-[0.14em] text-muted">Fiabilité</legend>
        <div className="flex flex-wrap gap-2">
          {(["A", "B", "C"] as Confidence[]).map((c) => (
            <label key={c} className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-elevated px-3 text-[13px] ring-1 ring-line">
              <input type="checkbox" checked={conf.has(c)} onChange={() => setConf((s) => toggle(s, c))} className="size-4 accent-brand" />
              {c} · {CONFIDENCE_LABEL[c]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-9 cursor-pointer items-center gap-2 text-[14px]">
        <input type="checkbox" checked={withImage} onChange={(e) => setWithImage(e.target.checked)} className="size-4 accent-brand" />
        Avec image uniquement
      </label>

      {activeFilters > 0 && (
        <button type="button" onClick={reset} className="h-10 self-start rounded-full px-4 text-[14px] font-semibold text-brand-deep ring-1 ring-line">
          Tout effacer
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Recherche */}
      <label className="flex h-14 items-center gap-3 rounded-full bg-surface px-5 shadow-[0_10px_30px_-18px_rgb(7_82_160/0.5)] ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
        <Search aria-hidden="true" strokeWidth={1.75} className="size-5 text-muted" />
        <span className="sr-only">Chercher un objet</span>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
          placeholder="Chercher un objet, une catégorie… (même avec une faute)"
          className="h-full w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
        />
        <kbd className="hidden rounded-md bg-elevated px-2 py-0.5 text-[12px] text-muted ring-1 ring-line sm:block">/</kbd>
      </label>

      {/* Histogramme */}
      <section aria-labelledby="histo-titre" className="panel flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="histo-titre" className="text-[18px] font-bold">
            Répartition des prix
          </h2>
          <p className="text-small text-muted">
            {range ? (
              <>
                De <strong className="price text-ink">{formatPrice(10 ** range[0])}</strong> à{" "}
                <strong className="price text-ink">{formatPrice(10 ** range[1])}</strong> ·{" "}
                <button type="button" onClick={() => setRange(null)} className="font-semibold text-brand-deep underline underline-offset-2">
                  effacer
                </button>
              </>
            ) : (
              "Glisse sur les barres pour choisir une plage de prix."
            )}
          </p>
        </div>
        <PriceHistogram
          logs={base.map((b) => b.item.log)}
          range={range}
          onChange={(r) => {
            setRange(r);
            setShown(PAGE);
          }}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Filtres : colonne sur desktop */}
        <aside aria-label="Filtres" className="panel hidden self-start p-5 lg:block">
          {filters}
        </aside>

        <section aria-labelledby="resultats-titre" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="resultats-titre" className="text-[18px] font-bold" aria-live="polite">
              {formatInt(results.length)} résultat{results.length > 1 ? "s" : ""}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSheet(true)}
                className="flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-[14px] font-semibold ring-1 ring-line lg:hidden"
              >
                <SlidersHorizontal aria-hidden="true" strokeWidth={1.75} className="size-4" />
                Filtres{activeFilters ? ` (${activeFilters})` : ""}
              </button>
              <label className="sr-only" htmlFor="tri">
                Trier
              </label>
              <select
                id="tri"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as Sort);
                  if (e.target.value === "random") setSeed((s) => s + 7);
                }}
                className="h-10 rounded-full bg-surface px-3 text-[14px] ring-1 ring-line"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div role="group" aria-label="Affichage" className="flex rounded-full bg-surface p-1 ring-1 ring-line">
                <button
                  type="button"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                  className={cn("grid size-8 place-items-center rounded-full", view === "grid" && "bg-ink text-white")}
                >
                  <LayoutGrid aria-hidden="true" strokeWidth={1.75} className="size-4" />
                  <span className="sr-only">Grille</span>
                </button>
                <button
                  type="button"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                  className={cn("grid size-8 place-items-center rounded-full", view === "list" && "bg-ink text-white")}
                >
                  <List aria-hidden="true" strokeWidth={1.75} className="size-4" />
                  <span className="sr-only">Liste</span>
                </button>
              </div>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
              <p className="text-[22px] font-extrabold">Rien ne coûte ça. Enfin, rien qu&apos;on connaisse.</p>
              <p className="max-w-md text-muted">
                Aucun objet ne correspond. Essaie une autre orthographe, retire un filtre ou élargis la plage de prix.
              </p>
              <button type="button" onClick={reset} className="mt-2 h-11 rounded-full bg-ink px-5 font-semibold text-white">
                Tout réinitialiser
              </button>
            </div>
          ) : view === "grid" ? (
            <>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] justify-items-center gap-x-5 gap-y-2">
                {results.slice(0, shown).map((item) => (
                  <li key={item.slug}>
                    <PriceCard item={item} />
                  </li>
                ))}
              </ul>
              {shown < results.length && (
                <button
                  type="button"
                  onClick={() => setShown((s) => s + PAGE)}
                  className="h-12 self-center rounded-full bg-ink px-6 font-semibold text-white"
                >
                  Afficher plus ({formatInt(results.length - shown)} restants)
                </button>
              )}
            </>
          ) : (
            <div className="panel overflow-x-auto p-2">
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <thead className="text-[12px] uppercase tracking-[0.1em] text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">Rang</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Objet</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Catégorie</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Prix</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Type</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Relevé</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item) => (
                    <tr key={item.slug} data-tier={item.tier} className="border-t border-line">
                      <td className="px-3 py-2 tabular-nums text-muted">{items.indexOf(item) + 1}</td>
                      <td className="px-3 py-2">
                        <a href={`/objet/${item.slug}`} className="flex items-center gap-2 font-semibold hover:underline">
                          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-(--tier)" />
                          {item.name}
                        </a>
                      </td>
                      <td className="px-3 py-2 text-muted">
                        <a href={`/categorie/${item.category}`} className="hover:underline">
                          {categoryName(item.category)}
                        </a>
                      </td>
                      <td className="price px-3 py-2 text-right font-bold text-(--tier)">{formatPrice(item.priceEur)}</td>
                      <td className="px-3 py-2 text-muted">{PRICE_TYPE_LABEL[item.priceType]}</td>
                      <td className="px-3 py-2 tabular-nums text-muted">{formatObservedAt(item.observedAt)}</td>
                      <td className="px-3 py-2 text-muted">{item.status === "demo" ? `Démo · ${item.confidence}` : item.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Filtres : panneau qui glisse du bas sur mobile */}
      {sheet && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtres">
          <button type="button" aria-label="Fermer les filtres" onClick={() => setSheet(false)} className="absolute inset-0 bg-ink/40" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-[28px] bg-surface p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] animate-[vg-rise_300ms_var(--ease-vertige)_both]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[20px] font-extrabold">Filtres</p>
              <button type="button" onClick={() => setSheet(false)} className="grid size-10 place-items-center rounded-full ring-1 ring-line" autoFocus>
                <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
                <span className="sr-only">Fermer</span>
              </button>
            </div>
            {filters}
            <button type="button" onClick={() => setSheet(false)} className="mt-6 h-12 w-full rounded-full bg-ink font-semibold text-white">
              Voir {formatInt(results.length)} résultat{results.length > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
