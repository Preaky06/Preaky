"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { PriceCard } from "@/components/ui/PriceCard";
import { normalize, type CardItem } from "@/lib/card-item";
import { formatInt, formatPrice } from "@/lib/format";
import { altitudeOf, LOG_MIN } from "@/lib/scale";
import { TIERS, type TierId } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const MIN = LOG_MIN;
const MAX = 14.1; // le PIB mondial dépasse légèrement 10¹⁴
const STEP = 0.05;
const GAP = 0.25; // écart minimal entre les deux poignées (≈ ×1,8)

type Range = [number, number];
const FULL: Range = [MIN, MAX];
const tierRange = (id: TierId): Range => {
  const t = TIERS[id - 1];
  return [id === 1 ? MIN : t.logMin, id === 7 ? MAX : t.logMax];
};
const same = (a: Range, b: Range) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
/** Borne haute lisible : au-delà de 10¹⁴ €, « 100 000 Md€ et plus ». */
const formatHi = (log: number) => (log >= 14 ? "100 000 Md€ et plus" : formatPrice(10 ** log));
const pct = (log: number) => `${(altitudeOf(Math.min(log, 14)) * 100).toFixed(2)}%`;

/**
 * Sélection par fourchette de prix : puces (un palier = une fourchette), double curseur
 * logarithmique pour affiner, recherche, puis carrousel des objets aux prix voisins.
 */
export function PriceRangeExplorer({ items }: { items: CardItem[] }) {
  const [range, setRange] = useState<Range>(tierRange(3));
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const results = useMemo(() => {
    const q = normalize(deferredQuery);
    return items.filter((i) => i.log >= range[0] && i.log < range[1] + 1e-9 && (!q || normalize(i.name).includes(q)));
  }, [items, range, deferredQuery]);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const start = el.scrollLeft < 8;
    const end = el.scrollLeft + el.clientWidth > el.scrollWidth - 8;
    // Nouvel objet seulement si l'état change : évite une cascade de rendus en saisie rapide.
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  // Revenir au début du carrousel quand la sélection change.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (el.scrollLeft > 0) el.scrollTo({ left: 0 });
    // Mise à jour différée d'une frame : un setState synchrone ici, après chaque frappe
    // clavier sur le curseur, enchaînait des rendus synchrones (erreur React #185).
    const id = requestAnimationFrame(updateEdges);
    return () => cancelAnimationFrame(id);
  }, [results, updateEdges]);

  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduced ? "auto" : "smooth" });
  };

  const setLo = (v: number) => setRange(([, hi]) => [Math.min(v, hi - GAP), hi]);
  const setHi = (v: number) => setRange(([lo]) => [lo, Math.max(v, lo + GAP)]);
  const activeTier = TIERS.find((t) => same(range, tierRange(t.id)))?.id ?? null;
  const isAll = same(range, FULL);

  return (
    <div className="panel flex flex-col gap-6 p-5 sm:p-8">
      {/* En-tête : titre + recherche */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="prix-titre" className="text-[28px] font-extrabold leading-none tracking-tight sm:text-[34px]">
            Les prix
          </h2>
          <p className="mt-1 text-muted">Choisis une fourchette : les objets au prix voisin s&apos;affichent côte à côte.</p>
        </div>
        <label className="flex h-12 w-full items-center gap-2 rounded-full bg-elevated px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand sm:w-72">
          <Search aria-hidden="true" strokeWidth={1.75} className="size-5 text-muted" />
          <span className="sr-only">Chercher un objet</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un objet…"
            className="h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
          />
        </label>
      </div>

      {/* Puces de fourchette */}
      <div role="group" aria-label="Fourchettes de prix" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          aria-pressed={isAll}
          onClick={() => setRange(FULL)}
          className={cn(
            "h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors",
            isAll ? "bg-ink text-white" : "bg-elevated text-ink ring-1 ring-line hover:ring-line-strong",
          )}
        >
          Tout
        </button>
        {TIERS.map((t) => {
          const on = activeTier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => setRange(tierRange(t.id))}
              data-tier={t.id}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors",
                on ? "bg-(--tier) text-white" : "bg-elevated text-ink ring-1 ring-line hover:ring-line-strong",
              )}
            >
              <span aria-hidden="true" className={cn("size-2 rounded-full", on ? "bg-white" : "bg-(--tier)")} />
              {t.short}
              <span className="sr-only"> ({t.name})</span>
            </button>
          );
        })}
      </div>

      {/* Double curseur logarithmique */}
      <div className="flex flex-col gap-3">
        <p className="flex flex-wrap items-baseline justify-between gap-2 text-[15px]">
          <span>
            Entre <strong className="price font-bold">{formatPrice(10 ** range[0])}</strong> et{" "}
            <strong className="price font-bold">{formatHi(range[1])}</strong>
          </span>
          <span className="text-muted" aria-live="polite">
            {formatInt(results.length)} objet{results.length > 1 ? "s" : ""}
          </span>
        </p>
        <div className="relative h-8">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-line">
            {TIERS.map((t) => (
              <span
                key={t.id}
                className="absolute inset-y-0"
                style={{ left: pct(t.logMin), width: `calc(${pct(t.logMax)} - ${pct(t.logMin)})`, background: t.color, opacity: 0.25 }}
              />
            ))}
            <span
              className="absolute inset-y-0 rounded-full bg-ink"
              style={{ left: pct(range[0]), width: `calc(${pct(range[1])} - ${pct(range[0])})` }}
            />
          </div>
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={range[0]}
            onChange={(e) => setLo(Number(e.target.value))}
            aria-label="Prix minimum"
            aria-valuetext={formatPrice(10 ** range[0])}
            className="range-thumb absolute inset-0 h-8 w-full"
          />
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={range[1]}
            onChange={(e) => setHi(Number(e.target.value))}
            aria-label="Prix maximum"
            aria-valuetext={formatHi(range[1])}
            className="range-thumb absolute inset-0 h-8 w-full"
          />
        </div>
        <div className="flex justify-between text-[12px] text-muted" aria-hidden="true">
          <span>0,00001 €</span>
          <span>1 €</span>
          <span>1 M€</span>
          <span>100 000 Md€</span>
        </div>
      </div>

      {/* Carrousel */}
      {results.length ? (
        <ul
          ref={trackRef}
          onScroll={updateEdges}
          aria-label="Objets dans la fourchette"
          className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8"
        >
          {results.map((item) => (
            <li key={item.slug} className="snap-start">
              <PriceCard item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-[20px] font-bold">Rien dans cette fourchette.</p>
          <p className="text-muted">Même pas un grain de riz. Élargis la fourchette ou change de recherche.</p>
          <button
            type="button"
            onClick={() => {
              setRange(FULL);
              setQuery("");
            }}
            className="mt-2 h-11 rounded-full bg-ink px-5 font-semibold text-white"
          >
            Tout afficher
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <a href="/explorer" className="text-[15px] font-semibold text-ink underline-offset-4 hover:underline">
            Tout voir dans l&apos;Explorer →
          </a>
          <a href="#ascension" className="text-[15px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
            L&apos;Ascension ↓
          </a>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={edges.start}
            className="flex h-11 items-center gap-1 rounded-full px-3 font-semibold text-ink disabled:opacity-35"
          >
            <ChevronLeft aria-hidden="true" strokeWidth={2} className="size-5" /> Préc.
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={edges.end}
            className="flex h-11 items-center gap-1 rounded-full px-3 font-semibold text-ink disabled:opacity-35"
          >
            Suiv. <ChevronRight aria-hidden="true" strokeWidth={2} className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
