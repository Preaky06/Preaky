"use client";

import { useMemo, useState } from "react";
import { PriceCard } from "@/components/ui/PriceCard";
import { Thumb } from "@/components/ui/Thumb";
import type { CardItem } from "@/lib/card-item";
import type { ReferenceUnit } from "@/lib/data/reference-units";
import { formatCountWords, formatPrice } from "@/lib/format";
import { stripArticle } from "@/lib/names";
import { clamp } from "@/lib/scale";
import { cn } from "@/lib/utils";

const LOG_LO = -4;
const LOG_HI = 14.1;

/** Saisie libre : « 1 299,50 », « 2 M », « 1,5 Md », « 300k ». */
function parseAmount(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/[\s\u00a0\u202f€]/g, "").replace(",", ".");
  const m = /^(\d+(?:\.\d+)?)(k|mds?|milliards?|m|millions?)?$/.exec(s);
  if (!m) return null;
  const unit = m[2] ?? "";
  const mult = unit === "k" ? 1e3 : unit.startsWith("md") || unit.startsWith("milliard") ? 1e9 : unit ? 1e6 : 1;
  return Number(m[1]) * mult;
}

/** « Qu'est-ce que je peux m'offrir avec X € ? » */
export function BudgetPlanner({
  items,
  presets,
  references,
}: {
  items: CardItem[];
  presets: { label: string; value: number }[];
  references: ReferenceUnit[];
}) {
  const [amount, setAmount] = useState(1500);
  const [text, setText] = useState("1 500");
  const log = Math.log10(amount);

  const affordable = useMemo(() => items.filter((i) => i.priceEur <= amount), [items, amount]);
  const top = affordable.at(-1) ?? null;
  const below = affordable.slice(-9, -1).reverse();
  const multiples = useMemo(
    () =>
      items
        .filter((i) => i.priceEur <= amount && amount / i.priceEur >= 2)
        .filter((_, k, arr) => k % Math.max(1, Math.floor(arr.length / 5)) === 0)
        .slice(-5)
        .reverse(),
    [items, amount],
  );

  const set = (v: number) => {
    const x = clamp(v, 10 ** LOG_LO, 10 ** LOG_HI);
    setAmount(x);
    setText(x >= 1 ? Math.round(x).toLocaleString("fr-FR") : x.toLocaleString("fr-FR", { maximumSignificantDigits: 3 }));
  };

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="montant" className="panel flex flex-col gap-5 p-6 sm:p-8">
        <h2 id="montant" className="text-[20px] font-extrabold">
          Ton budget
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-small font-semibold text-muted">
            Montant en euros
            <div className="flex h-16 items-center gap-2 rounded-2xl bg-elevated px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
              <input
                inputMode="decimal"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  const v = parseAmount(e.target.value);
                  if (v && v > 0) setAmount(clamp(v, 10 ** LOG_LO, 10 ** LOG_HI));
                }}
                aria-describedby="montant-aide"
                className="price w-56 bg-transparent text-[32px] font-extrabold text-ink outline-none"
              />
              <span className="text-[28px] font-extrabold text-muted">€</span>
            </div>
          </label>
          <p id="montant-aide" className="pb-2 text-small text-muted">
            Accepte « 300k », « 2 M » ou « 1,5 Md ».
          </p>
        </div>
        <label className="flex flex-col gap-2 text-small font-semibold text-muted">
          Ou fais glisser le curseur, de 1 centime à 100 000 milliards
          <input
            type="range"
            min={LOG_LO}
            max={LOG_HI}
            step={0.01}
            value={log}
            onChange={(e) => set(10 ** Number(e.target.value))}
            aria-valuetext={formatPrice(amount)}
            className="w-full accent-brand"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Montants prédéfinis">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={Math.abs(amount - p.value) / p.value < 0.001}
              onClick={() => set(p.value)}
              className={cn(
                "h-10 rounded-full px-4 text-[14px] font-semibold",
                Math.abs(amount - p.value) / p.value < 0.001 ? "bg-ink text-white" : "bg-elevated ring-1 ring-line",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {top ? (
        <>
          <section aria-labelledby="gros-achat" className="panel grid items-center gap-8 p-6 sm:p-8 md:grid-cols-[auto_1fr]">
            <PriceCard item={top} size="lg" />
            <div className="flex flex-col gap-3">
              <h2 id="gros-achat" className="text-small font-semibold uppercase tracking-[0.16em] text-muted">
                Le plus gros achat possible
              </h2>
              <p className="text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-tight tracking-tight">{top.name}</p>
              <p className="text-lg text-muted">
                Il te reste <span className="price font-bold text-ink">{formatPrice(amount - top.priceEur)}</span> après l&apos;achat.
              </p>
            </div>
          </section>

          <section aria-labelledby="equivalences" className="flex flex-col gap-4">
            <h2 id="equivalences" className="text-[22px] font-extrabold">
              Avec {formatPrice(amount)}, tu peux acheter…
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ...references
                  .filter((r) => amount / r.value_eur >= 1)
                  .map((r) => ({ key: r.id, n: amount / r.value_eur, label: r.plural_fr, image: r.image, tier: 3, unit: r.value_eur, href: null })),
                ...multiples.map((m) => ({
                  key: m.slug,
                  n: amount / m.priceEur,
                  label: stripArticle(m.name),
                  image: m.image,
                  tier: m.tier,
                  unit: m.priceEur,
                  href: `/objet/${m.slug}`,
                })),
              ]
                .slice(0, 8)
                .map((row) => {
                  const body = (
                    <>
                      <Thumb src={row.image} tier={row.tier} size={56} />
                      <span className="flex min-w-0 flex-col">
                        <span className="price text-[24px] font-extrabold leading-tight text-brand-deep">{formatCountWords(Math.floor(row.n))} ×</span>
                        <span className="truncate text-[15px]">{row.label}</span>
                        <span className="text-[12px] text-muted">à {formatPrice(row.unit)} l&apos;unité</span>
                      </span>
                    </>
                  );
                  return (
                    <li key={row.key} className="panel">
                      {row.href ? (
                        <a href={row.href} className="flex items-center gap-4 rounded-[inherit] p-3 pr-4 hover:bg-elevated">
                          {body}
                        </a>
                      ) : (
                        <div className="flex items-center gap-4 p-3 pr-4">{body}</div>
                      )}
                    </li>
                  );
                })}
            </ul>
            <p className="text-small text-muted">Prix de référence : valeurs de démonstration (fiabilité C).</p>
          </section>

          {below.length > 0 && (
            <section aria-labelledby="juste-dessous" className="flex flex-col gap-4">
              <h2 id="juste-dessous" className="text-[22px] font-extrabold">
                Juste en dessous de ton budget
              </h2>
              <ul className="no-scrollbar -mx-4 flex snap-x gap-5 overflow-x-auto scroll-px-4 px-4 pb-4">
                {below.map((item) => (
                  <li key={item.slug} className="snap-start">
                    <PriceCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <div className="panel p-8 text-center">
          <p className="text-[22px] font-extrabold">Même pas un grain de riz.</p>
          <p className="mt-2 text-muted">Le moins cher de VERTIGE coûte {formatPrice(items[0]?.priceEur ?? 0)}.</p>
        </div>
      )}
    </div>
  );
}
