"use client";

import { ArrowLeftRight, Link2, Shuffle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ItemPicker } from "@/components/ui/ItemPicker";
import { IconRain } from "./IconRain";
import { PriceCard } from "@/components/ui/PriceCard";
import type { CardItem } from "@/lib/card-item";
import { formatCountWords, formatPrice, formatRatio } from "@/lib/format";
import { altitudeOf } from "@/lib/scale";
import { stripArticle } from "@/lib/names";
import { getTier } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const RAIN_MAX = 500;

function readParams(): { a?: string; b?: string } {
  try {
    const p = new URLSearchParams(window.location.search);
    return { a: p.get("a") ?? undefined, b: p.get("b") ?? undefined };
  } catch {
    return {};
  }
}

/** Duel : deux objets, un rapport géant, des barres logarithmiques et une pluie d'icônes. */
export function DuelArena({ items, initialA, initialB }: { items: CardItem[]; initialA: string; initialB: string }) {
  const bySlug = useMemo(() => new Map(items.map((i) => [i.slug, i])), [items]);
  const [slugs, setSlugs] = useState<[string, string]>([initialA, initialB]);
  const [copied, setCopied] = useState(false);

  // Lecture de /duel?a=…&b=… après hydratation (la page reste statique).
  useEffect(() => {
    const { a, b } = readParams();
    if (a && b && bySlug.has(a) && bySlug.has(b)) {
      const id = requestAnimationFrame(() => setSlugs([a, b]));
      return () => cancelAnimationFrame(id);
    }
  }, [bySlug]);

  // URL partageable
  useEffect(() => {
    try {
      window.history.replaceState(null, "", `?a=${slugs[0]}&b=${slugs[1]}`);
    } catch {
      /* environnement sans historique modifiable */
    }
  }, [slugs]);

  const a = bySlug.get(slugs[0])!;
  const b = bySlug.get(slugs[1])!;
  const [big, small] = a.priceEur >= b.priceEur ? [a, b] : [b, a];
  const ratio = big.priceEur / small.priceEur;
  const same = a.slug === b.slug;
  const rain = Math.min(Math.round(ratio), RAIN_MAX);

  const random = () => {
    for (let k = 0; k < 50; k++) {
      const x = items[Math.floor(Math.random() * items.length)];
      const y = items[Math.floor(Math.random() * items.length)];
      const r = Math.max(x.priceEur, y.priceEur) / Math.min(x.priceEur, y.priceEur);
      if (x.slug !== y.slug && r > 3 && r < 1e9) {
        setSlugs([x.slug, y.slug]);
        return;
      }
    }
  };

  const share = async () => {
    const url = new URL(`/duel?a=${slugs[0]}&b=${slugs[1]}`, window.location.href).toString();
    const text = `1 ${stripArticle(big.name)} = ${formatCountWords(ratio)} × ${stripArticle(small.name)}`;
    try {
      if (navigator.share) await navigator.share({ title: "Duel VERTIGE", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      }
    } catch {
      /* partage annulé ou indisponible */
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <p className="text-center text-muted">
        Tape un nom dans chaque case, ou essaie un <strong className="font-semibold text-ink">duel aléatoire</strong>.
      </p>
      <div className="grid items-start gap-6 md:grid-cols-[1fr_auto_1fr]">
        {([a, null, b] as const).map((item, col) =>
          item === null ? (
            <div key="vs" className="flex items-center justify-center md:self-center">
              <span className="grid size-16 place-items-center rounded-full bg-ink font-display text-[34px] text-white">VS</span>
            </div>
          ) : (
            <div key={col} className="panel flex flex-col items-center gap-4 p-5">
              <ItemPicker
                items={items}
                label={col === 0 ? "Choisir le premier objet" : "Choisir le second objet"}
                placeholder={col === 0 ? "Premier objet…" : "Second objet…"}
                onPick={(it) => setSlugs((s) => (col === 0 ? [it.slug, s[1]] : [s[0], it.slug]))}
              />
              <PriceCard item={item} />
            </div>
          ),
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={random} className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-white">
          <Shuffle aria-hidden="true" strokeWidth={2} className="size-4" /> Duel aléatoire
        </button>
        <button
          type="button"
          onClick={() => setSlugs(([x, y]) => [y, x])}
          className="flex h-11 items-center gap-2 rounded-full bg-surface px-5 font-semibold ring-1 ring-line"
        >
          <ArrowLeftRight aria-hidden="true" strokeWidth={2} className="size-4" /> Inverser
        </button>
        <button type="button" onClick={share} className="flex h-11 items-center gap-2 rounded-full bg-surface px-5 font-semibold ring-1 ring-line">
          <Link2 aria-hidden="true" strokeWidth={2} className="size-4" />
          <span aria-live="polite">{copied ? "Lien copié" : "Partager ce duel"}</span>
        </button>
      </div>

      <section aria-labelledby="verdict" className="panel flex flex-col items-center gap-6 p-6 text-center sm:p-10">
        {same ? (
          <p id="verdict" className="text-[24px] font-extrabold">
            Choisis deux objets différents.
          </p>
        ) : (
          <>
            <h2 id="verdict" className="flex flex-col items-center gap-1">
              <span className="text-[clamp(1.1rem,2.4vw,1.5rem)] font-semibold text-muted">1 {stripArticle(big.name)} =</span>
              <span data-tier={big.tier} className="price text-[clamp(3rem,10vw,7rem)] font-extrabold leading-none text-(--tier)">
                {formatCountWords(ratio)} ×
              </span>
              <span className="text-[clamp(1.1rem,2.4vw,1.5rem)] font-semibold">{stripArticle(small.name)}</span>
            </h2>
            <p className="text-muted">
              <span className="price font-semibold text-ink">{formatPrice(big.priceEur)}</span> contre{" "}
              <span className="price font-semibold text-ink">{formatPrice(small.priceEur)}</span>
            </p>

            {/* Barres logarithmiques */}
            <div className="flex w-full max-w-2xl flex-col gap-3 text-left" aria-label="Comparaison sur l'échelle logarithmique">
              {[big, small].map((it) => (
                <div key={it.slug} data-tier={it.tier} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-3 text-[14px]">
                    <span className="truncate font-semibold">{it.name}</span>
                    <span className="price shrink-0 font-bold text-(--tier)">{formatPrice(it.priceEur)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full origin-left rounded-full bg-(--tier) transition-transform duration-700 ease-(--ease-vertige)"
                      style={{ transform: `scaleX(${altitudeOf(it.log).toFixed(3)})` }}
                    />
                  </div>
                  <span className="text-[12px] text-muted">Palier {getTier(it.tier).name}</span>
                </div>
              ))}
              <p className="text-[12px] text-muted">
                Barres à l&apos;échelle de VERTIGE : de 0,00001 € tout à gauche à 100 000 milliards d&apos;euros tout à droite.
              </p>
            </div>

            {/* Pluie d'icônes */}
            {small.image && (
              <div className="flex w-full flex-col items-center gap-3">
                <p className="text-small font-semibold text-muted">
                  {ratio > RAIN_MAX
                    ? `En voici ${RAIN_MAX}. Il en faudrait ${formatCountWords(ratio)}.`
                    : `${formatCountWords(Math.max(1, rain))} × ${stripArticle(small.name)}`}
                </p>
                <IconRain
                  key={`${big.slug}-${small.slug}`}
                  src={small.image}
                  count={Math.max(1, rain)}
                  label={`${Math.max(1, rain)} icônes : ${stripArticle(small.name)}`}
                />
                {ratio > RAIN_MAX && (
                  <p className={cn("price text-[20px] font-extrabold")}>
                    … et il en faudrait encore {formatRatio(ratio / RAIN_MAX).replace("×", "× ")} fois plus.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
