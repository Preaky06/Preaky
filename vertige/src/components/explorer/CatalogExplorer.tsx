"use client";

import { BarChart3, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { PriceCard } from "@/components/ui/PriceCard";
import { Thumb } from "@/components/ui/Thumb";
import type { CardItem } from "@/lib/card-item";
import { formatInt, formatPrice } from "@/lib/format";
import { CONFIDENCE_LABEL, PRICE_TYPE_LABEL, regionName } from "@/lib/labels";
import { matchScore } from "@/lib/search";
import { categoryName, isCategory } from "@/lib/taxonomy";
import { getTier, TIERS, type TierId } from "@/lib/tiers";
import type { Confidence, PriceType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PriceHistogram, type LogRange } from "./PriceHistogram";

type Sort = "price-asc" | "price-desc" | "recent" | "random";
type Period = "all" | "2025+" | "2020-2024" | "pre-2020";
const PAGE = 48;

const SORTS: { id: Sort; label: string }[] = [
  { id: "price-asc", label: "Du moins cher au plus cher" },
  { id: "price-desc", label: "Du plus cher au moins cher" },
  { id: "recent", label: "Prix les plus récents" },
  { id: "random", label: "Au hasard" },
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

/**
 * Explorer, version simple : une recherche, une fourchette de prix, une catégorie, un tri.
 * Les filtres avancés (type de prix, pays, année, fiabilité) et l'histogramme sont repliés.
 * L'URL accepte ?palier=1..7, ?categorie=<slug> et ?q=<texte> (liens depuis l'accueil et les fiches).
 */
export function CatalogExplorer({ items }: { items: CardItem[] }) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query);
  const [tier, setTier] = useState<TierId | null>(null);
  const [cat, setCat] = useState("");
  const [types, setTypes] = useState<Set<PriceType>>(new Set());
  const [conf, setConf] = useState<Set<Confidence>>(new Set());
  const [country, setCountry] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [range, setRange] = useState<LogRange>(null);
  const [sort, setSort] = useState<Sort>("price-asc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [shown, setShown] = useState(PAGE);
  const [seed, setSeed] = useState(1);
  const [more, setMore] = useState(false);
  const [histo, setHisto] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  // Garde la fourchette choisie visible dans la rangée de puces (défilement horizontal sur mobile).
  useEffect(() => {
    const row = chipsRef.current;
    const on = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (row && on && row.scrollWidth > row.clientWidth) row.scrollTo({ left: Math.max(0, on.offsetLeft - row.offsetLeft - 16) });
  }, [tier]);

  // Filtres passés dans l'URL (après hydratation : la page reste statique).
  useEffect(() => {
    let p: URLSearchParams;
    try {
      p = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    const t = Number(p.get("palier"));
    const c = p.get("categorie") ?? "";
    const text = p.get("q") ?? "";
    const id = requestAnimationFrame(() => {
      if (t >= 1 && t <= 7) setTier(t as TierId);
      if (isCategory(c)) setCat(c);
      if (text) setQuery(text);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // « / » ou ⌘K / Ctrl+K : focus sur la recherche ; Échap ferme le panneau de filtres.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setMore(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const facets = useMemo(() => {
    const c = new Map<string, number>();
    const t = new Map<PriceType, number>();
    const co = new Map<string, number>();
    const perTier = new Map<TierId, number>();
    for (const i of items) {
      c.set(i.category, (c.get(i.category) ?? 0) + 1);
      t.set(i.priceType, (t.get(i.priceType) ?? 0) + 1);
      perTier.set(i.tier, (perTier.get(i.tier) ?? 0) + 1);
      if (i.country) co.set(i.country, (co.get(i.country) ?? 0) + 1);
    }
    const byCount = <K,>(m: Map<K, number>) => [...m].sort((a, b) => b[1] - a[1]);
    return {
      categories: [...c].sort((a, b) => categoryName(a[0]).localeCompare(categoryName(b[0]), "fr")),
      types: byCount(t),
      countries: [...co].sort((a, b) => regionName(a[0]).localeCompare(regionName(b[0]), "fr")),
      perTier,
    };
  }, [items]);

  // Tous les filtres sauf la plage de l'histogramme : alimente l'histogramme.
  const base = useMemo(() => {
    const scored: { item: CardItem; score: number }[] = [];
    for (const i of items) {
      if (tier && i.tier !== tier) continue;
      if (cat && i.category !== cat) continue;
      if (types.size && !types.has(i.priceType)) continue;
      if (conf.size && !conf.has(i.confidence)) continue;
      if (country && i.country !== country) continue;
      if (!inPeriod(i.observedAt, period)) continue;
      const score = q ? matchScore(`${i.name} ${categoryName(i.category)}`, q) : 1;
      if (score > 0) scored.push({ item: i, score });
    }
    return scored;
  }, [items, tier, cat, types, conf, country, period, q]);

  const results = useMemo(() => {
    const list = base.filter(({ item }) => !range || (item.log >= range[0] && item.log < range[1]));
    const byPrice = (a: CardItem, b: CardItem) => a.priceEur - b.priceEur;
    let hash = seed;
    const rnd = new Map(list.map(({ item }) => [item.slug, (hash = (hash * 16807) % 2147483647) / 2147483647]));
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

  const advanced = types.size + conf.size + (country ? 1 : 0) + (period !== "all" ? 1 : 0);
  const anyFilter = Boolean(query || tier || cat || range || advanced);

  const reset = () => {
    setQuery("");
    setTier(null);
    setCat("");
    setTypes(new Set());
    setConf(new Set());
    setCountry("");
    setPeriod("all");
    setRange(null);
    setShown(PAGE);
  };
  const after = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => {
    fn(...a);
    setShown(PAGE);
  };

  /** Filtres actifs, chacun retirable d'un clic. */
  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(query ? [{ key: "q", label: `« ${query} »`, clear: () => setQuery("") }] : []),
    ...(tier ? [{ key: "t", label: `${getTier(tier).name} · ${getTier(tier).short}`, clear: () => setTier(null) }] : []),
    ...(cat ? [{ key: "c", label: categoryName(cat), clear: () => setCat("") }] : []),
    ...(range
      ? [{ key: "r", label: `De ${formatPrice(10 ** range[0])} à ${formatPrice(10 ** range[1])}`, clear: () => setRange(null) }]
      : []),
    ...[...types].map((t) => ({ key: `ty-${t}`, label: PRICE_TYPE_LABEL[t], clear: () => setTypes((s) => toggle(s, t)) })),
    ...(country ? [{ key: "co", label: regionName(country), clear: () => setCountry("") }] : []),
    ...(period !== "all" ? [{ key: "p", label: PERIODS.find((p) => p.id === period)!.label, clear: () => setPeriod("all") }] : []),
    ...[...conf].map((c) => ({ key: `cf-${c}`, label: `Fiabilité ${c}`, clear: () => setConf((s) => toggle(s, c)) })),
  ];

  const selectCls = "h-11 min-w-0 rounded-full bg-surface pl-4 pr-8 text-[15px] font-medium text-ink ring-1 ring-line";

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Recherche */}
      <label className="flex h-14 items-center gap-3 rounded-full bg-surface px-5 shadow-[0_10px_30px_-18px_rgb(7_82_160/0.5)] ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
        <Search aria-hidden="true" strokeWidth={1.75} className="size-5 text-muted" />
        <span className="sr-only">Chercher un objet</span>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => after(setQuery)(e.target.value)}
          placeholder="Chercher : tesla, baguette, rolex…"
          className="h-full w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
        />
        <kbd className="hidden rounded-md bg-elevated px-2 py-0.5 text-[12px] text-muted ring-1 ring-line sm:block">/</kbd>
      </label>

      {/* 2. Fourchette de prix : un palier = une fourchette */}
      <div ref={chipsRef} role="group" aria-label="Fourchette de prix" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          aria-pressed={tier === null}
          onClick={() => after(setTier)(null)}
          className={cn(
            "flex h-14 shrink-0 flex-col items-start justify-center rounded-2xl px-4 text-left",
            tier === null ? "bg-ink text-white" : "bg-surface text-ink ring-1 ring-line hover:ring-line-strong",
          )}
        >
          <span className="text-[15px] font-bold leading-tight">Tous les prix</span>
          <span className={cn("text-[12px] leading-tight", tier === null ? "text-white" : "text-muted")}>{formatInt(items.length)} objets</span>
        </button>
        {TIERS.map((t) => {
          const on = tier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              data-tier={t.id}
              aria-pressed={on}
              onClick={() => after(setTier)(on ? null : t.id)}
              className={cn(
                "flex h-14 shrink-0 flex-col items-start justify-center rounded-2xl px-4 text-left",
                on ? "bg-(--tier) text-white" : "bg-surface text-ink ring-1 ring-line hover:ring-line-strong",
              )}
            >
              <span className="flex items-center gap-1.5 text-[15px] font-bold leading-tight">
                <span aria-hidden="true" className={cn("size-2 rounded-full", on ? "bg-white" : "bg-(--tier)")} />
                {t.short}
              </span>
              <span className={cn("text-[12px] leading-tight", on ? "text-white" : "text-muted")}>
                {t.name} · {facets.perTier.get(t.id) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Catégorie, tri, plus de filtres, affichage */}
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <label className="sr-only" htmlFor="categorie">
          Catégorie
        </label>
        <select id="categorie" value={cat} onChange={(e) => after(setCat)(e.target.value)} className={cn(selectCls, "col-span-2")}>
          <option value="">Toutes les catégories</option>
          {facets.categories.map(([slug, n]) => (
            <option key={slug} value={slug}>
              {categoryName(slug)} ({n})
            </option>
          ))}
        </select>
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
          className={cn(selectCls, "col-span-2")}
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-haspopup="dialog"
          className="flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-[15px] font-semibold ring-1 ring-line"
        >
          <SlidersHorizontal aria-hidden="true" strokeWidth={1.75} className="size-4" />
          <span className="sm:hidden">Filtres</span>
          <span className="hidden sm:inline">Plus de filtres</span>
          {advanced ? ` (${advanced})` : ""}
        </button>
        <button
          type="button"
          aria-expanded={histo}
          aria-controls="histo"
          onClick={() => setHisto((h) => !h)}
          className={cn(
            "hidden h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold ring-1 sm:flex",
            histo ? "bg-brand-soft text-brand-deep ring-brand/30" : "bg-surface ring-line",
          )}
        >
          <BarChart3 aria-hidden="true" strokeWidth={1.75} className="size-4" />
          Répartition
        </button>
        <div role="group" aria-label="Affichage" className="flex justify-self-end rounded-full bg-surface p-1 ring-1 ring-line sm:ml-auto">
          {(
            [
              ["grid", "Cartes", LayoutGrid],
              ["list", "Liste", List],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn("flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold", view === id && "bg-ink text-white")}
            >
              <Icon aria-hidden="true" strokeWidth={1.75} className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Histogramme replié par défaut */}
      {histo && (
        <section id="histo" aria-labelledby="histo-titre" className="panel flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="histo-titre" className="text-[18px] font-bold">
              Combien d&apos;objets à chaque prix ?
            </h2>
            <p className="text-small text-muted">Une barre = une tranche de prix. Clique ou glisse pour choisir.</p>
          </div>
          <PriceHistogram logs={base.map((b) => b.item.log)} range={range} onChange={after(setRange)} />
        </section>
      )}

      {/* Résultats + filtres actifs */}
      <section aria-labelledby="resultats-titre" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="resultats-titre" className="mr-2 text-[18px] font-bold" aria-live="polite">
            {formatInt(results.length)} objet{results.length > 1 ? "s" : ""}
          </h2>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={after(c.clear)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-brand-soft pl-3 pr-2 text-[14px] font-semibold text-brand-deep"
            >
              {c.label}
              <X aria-hidden="true" strokeWidth={2} className="size-4" />
              <span className="sr-only">(retirer ce filtre)</span>
            </button>
          ))}
          {chips.length > 1 && (
            <button type="button" onClick={reset} className="h-9 px-2 text-[14px] font-semibold text-muted underline underline-offset-2 hover:text-ink">
              Tout effacer
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-[22px] font-extrabold">Rien ne coûte ça. Enfin, rien qu&apos;on connaisse.</p>
            <p className="max-w-md text-muted">Essaie une autre orthographe ou retire un filtre.</p>
            {anyFilter && (
              <button type="button" onClick={reset} className="mt-2 h-11 rounded-full bg-ink px-5 font-semibold text-white">
                Tout réinitialiser
              </button>
            )}
          </div>
        ) : view === "grid" ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] justify-items-center gap-x-3 gap-y-1 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-x-5 sm:gap-y-2">
            {results.slice(0, shown).map((item) => (
              <li key={item.slug}>
                <PriceCard item={item} size="auto" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="panel flex flex-col divide-y divide-line overflow-hidden p-1">
            {results.slice(0, shown).map((item) => (
              <li key={item.slug} data-tier={item.tier}>
                <a href={`/objet/${item.slug}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-elevated sm:gap-4">
                  <Thumb src={item.image} tier={item.tier} size={52} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{item.name}</span>
                    <span className="truncate text-[13px] text-muted">
                      {categoryName(item.category)} · {getTier(item.tier).name}
                    </span>
                  </span>
                  <span className="price shrink-0 text-[17px] font-extrabold text-(--tier) sm:text-[19px]">{formatPrice(item.priceEur)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {shown < results.length && (
          <button type="button" onClick={() => setShown((s) => s + PAGE)} className="h-12 self-center rounded-full bg-ink px-6 font-semibold text-white">
            Afficher {Math.min(PAGE, results.length - shown)} de plus{" "}
            <span className="font-normal text-white/70">(sur {formatInt(results.length - shown)})</span>
          </button>
        )}
      </section>

      {/* Plus de filtres : tiroir à droite (desktop) ou panneau du bas (mobile) */}
      {more && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="plus-filtres">
          <button type="button" aria-label="Fermer les filtres" onClick={() => setMore(false)} className="absolute inset-0 bg-ink/40" />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-[28px] bg-surface animate-[vg-rise_300ms_var(--ease-vertige)_both] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[420px] sm:rounded-l-[28px] sm:rounded-tr-none">
            <div className="flex items-center justify-between p-5 pb-3">
              <p id="plus-filtres" className="text-[20px] font-extrabold">
                Plus de filtres
              </p>
              <button type="button" onClick={() => setMore(false)} className="grid size-10 place-items-center rounded-full ring-1 ring-line" autoFocus>
                <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
                <span className="sr-only">Fermer</span>
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-5 pb-4">
              <fieldset>
                <legend className="text-[16px] font-bold">Type de prix</legend>
                <p className="mb-2 text-small text-muted">D&apos;où vient le chiffre : prix en magasin, enchère, estimation…</p>
                <ul className="flex flex-col gap-0.5">
                  {facets.types.map(([t, n]) => (
                    <li key={t}>
                      <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-2 text-[15px] hover:bg-elevated">
                        <input type="checkbox" checked={types.has(t)} onChange={() => after(setTypes)(toggle(types, t))} className="size-4 accent-brand" />
                        <span className="flex-1">{PRICE_TYPE_LABEL[t]}</span>
                        <span className="text-[13px] tabular-nums text-muted">{n}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              <label className="flex flex-col gap-1">
                <span className="text-[16px] font-bold">Pays du prix</span>
                <select value={country} onChange={(e) => after(setCountry)(e.target.value)} className="h-11 rounded-xl bg-elevated px-3 text-[15px] ring-1 ring-line">
                  <option value="">Tous les pays</option>
                  {facets.countries.map(([c, n]) => (
                    <option key={c} value={c}>
                      {regionName(c)} ({n})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[16px] font-bold">Année du prix</span>
                <select value={period} onChange={(e) => after(setPeriod)(e.target.value as Period)} className="h-11 rounded-xl bg-elevated px-3 text-[15px] ring-1 ring-line">
                  {PERIODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset>
                <legend className="text-[16px] font-bold">Fiabilité</legend>
                <p className="mb-2 text-small text-muted">A : source officielle · B : source secondaire · C : à vérifier.</p>
                <div className="flex flex-wrap gap-2">
                  {(["A", "B", "C"] as Confidence[]).map((c) => (
                    <label key={c} className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-elevated px-3 text-[14px] ring-1 ring-line">
                      <input type="checkbox" checked={conf.has(c)} onChange={() => after(setConf)(toggle(conf, c))} className="size-4 accent-brand" />
                      {c} · {CONFIDENCE_LABEL[c]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="flex gap-2 border-t border-line p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
              {advanced > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTypes(new Set());
                    setConf(new Set());
                    setCountry("");
                    setPeriod("all");
                  }}
                  className="h-12 rounded-full px-4 font-semibold ring-1 ring-line"
                >
                  Effacer
                </button>
              )}
              <button type="button" onClick={() => setMore(false)} className="h-12 flex-1 rounded-full bg-ink font-semibold text-white">
                Voir {formatInt(results.length)} objet{results.length > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
