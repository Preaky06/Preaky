"use client";

import Image from "next/image";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { RollingCounter } from "@/components/ui/RollingCounter";
import type { CardItem } from "@/lib/card-item";
import { priceParts } from "@/lib/format";
import { lowerFirst } from "@/lib/names";
import { cn } from "@/lib/utils";

const DAILY_ROUNDS = 10;
const BEST_KEY = "vertige:meilleure-serie";

/** Générateur pseudo-aléatoire déterministe (même défi pour tout le monde le même jour). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);

/** Écart de prix visé à la manche n : de ×100 au début à ×1,2 ensuite (en log10). */
const targetGap = (round: number) => Math.max(Math.log10(1.2), 2 * (1 - round / 14));

function makePair(items: CardItem[], round: number, rnd: () => number): [CardItem, CardItem] {
  const gap = targetGap(round);
  for (let k = 0; k < 400; k++) {
    const x = items[Math.floor(rnd() * items.length)];
    const candidates = items.filter((y) => {
      const d = Math.abs(y.log - x.log);
      return y.slug !== x.slug && d >= gap * 0.6 && d <= gap * 1.5 && d > 0.01;
    });
    if (candidates.length) {
      const y = candidates[Math.floor(rnd() * candidates.length)];
      return rnd() < 0.5 ? [x, y] : [y, x];
    }
  }
  return [items[0], items[items.length - 1]];
}

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};
const writeBest = (n: number) => {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* stockage indisponible : le meilleur score n'est simplement pas conservé */
  }
};

type Mode = "daily" | "free";
interface Game {
  mode: Mode;
  seed: number;
  dateLabel: string;
  round: number;
  pair: [CardItem, CardItem];
  picked: 0 | 1 | null;
  results: boolean[];
  over: boolean;
}

/** Zéros de même forme que le prix final, pour faire rouler le compteur à la révélation. */
const zeroed = (s: string) => s.replace(/\d/g, "0");

function GameCard({
  item,
  reveal,
  state,
  onPick,
  disabled,
}: {
  item: CardItem;
  reveal: 0 | 1 | 2;
  state: "idle" | "right" | "wrong";
  onPick: () => void;
  disabled: boolean;
}) {
  const { number, suffix } = priceParts(item.priceEur);
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      data-tier={item.tier}
      aria-label={`${item.name}${reveal ? "" : " : choisir comme le plus cher"}`}
      className={cn(
        "price-card group flex min-h-[300px] w-full flex-col items-center justify-end gap-3 p-6 pt-0 text-center transition-transform",
        !disabled && "hover:-translate-y-1",
        state === "right" && "ring-4 ring-tier-3 ring-offset-4 ring-offset-bg",
        state === "wrong" && "ring-4 ring-tier-6 ring-offset-4 ring-offset-bg",
      )}
    >
      {item.image && (
        <Image src={item.image} alt="" width={256} height={256} unoptimized className="-mt-16 size-40 drop-shadow-[0_16px_14px_rgb(11_18_32/0.28)] sm:size-48" />
      )}
      <span className="text-[19px] font-semibold leading-tight">{item.name}</span>
      <span className="card-price min-h-[44px] text-[34px] font-extrabold leading-none">
        {reveal === 0 ? "? €" : <RollingCounter value={reveal === 1 ? zeroed(number) : number} suffix={suffix} stagger={30} />}
      </span>
    </button>
  );
}

/** Jeu « Plus ou moins cher ? » : série, difficulté croissante, défi du jour, grille à partager. */
export function HigherLower({ items }: { items: CardItem[] }) {
  const [game, setGame] = useState<Game | null>(null);
  const [reveal, setReveal] = useState<0 | 1 | 2>(0);
  const [best, setBest] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBest(readBest()));
    return () => cancelAnimationFrame(id);
  }, []);

  const start = (mode: Mode) => {
    const now = new Date();
    const iso = now.toISOString().slice(0, 10);
    const seed = mode === "daily" ? hash(`vertige-${iso}`) : Math.floor(Math.random() * 2 ** 31);
    const rnd = mulberry32(seed);
    setReveal(0);
    setGame({
      mode,
      seed,
      dateLabel: now.toLocaleDateString("fr-FR"),
      round: 0,
      pair: makePair(items, 0, rnd),
      picked: null,
      results: [],
      over: false,
    });
  };

  const choose = (i: 0 | 1) => {
    if (!game || game.picked !== null) return;
    const [x, y] = game.pair;
    const correct = i === 0 ? x.priceEur >= y.priceEur : y.priceEur >= x.priceEur;
    const results = [...game.results, correct];
    const streak = results.every(Boolean) ? results.length : 0;
    const over = game.mode === "daily" ? results.length >= DAILY_ROUNDS : !correct;
    setGame({ ...game, picked: i, results, over });
    setReveal(1);
    requestAnimationFrame(() => requestAnimationFrame(() => setReveal(2)));
    if (game.mode === "free" && correct && streak > best) {
      setBest(streak);
      writeBest(streak);
    }
  };

  const next = () => {
    if (!game) return;
    const round = game.round + 1;
    const rnd = mulberry32(game.seed + round * 9973);
    setReveal(0);
    setGame({ ...game, round, pair: makePair(items, round, rnd), picked: null });
  };

  const shareText = () => {
    if (!game) return "";
    const grid = game.results.map((r) => (r ? "🟩" : "🟥")).join("");
    const head =
      game.mode === "daily"
        ? `VERTIGE · Plus ou moins cher ? · Défi du ${game.dateLabel} : ${game.results.filter(Boolean).length}/${DAILY_ROUNDS}`
        : `VERTIGE · Plus ou moins cher ? · Série de ${game.results.filter(Boolean).length}`;
    return `${head}\n${grid}`;
  };

  const share = async () => {
    const text = shareText();
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      }
    } catch {
      /* partage annulé ou indisponible */
    }
  };

  if (!game) {
    return (
      <div className="panel mx-auto flex max-w-xl flex-col items-center gap-5 p-8 text-center">
        <p className="text-[22px] font-extrabold">Deux objets. Lequel coûte le plus cher ?</p>
        <p className="text-muted">L&apos;écart de prix se resserre à chaque bonne réponse : de ×100 au début jusqu&apos;à ×1,2.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => start("daily")} className="h-12 rounded-full bg-ink px-6 font-semibold text-white">
            Défi du jour (10 manches)
          </button>
          <button type="button" onClick={() => start("free")} className="h-12 rounded-full bg-surface px-6 font-semibold ring-1 ring-line">
            Partie libre
          </button>
        </div>
        <p className="text-small text-muted">Meilleure série en partie libre : {best}</p>
      </div>
    );
  }

  const [x, y] = game.pair;
  const winner: 0 | 1 = x.priceEur >= y.priceEur ? 0 : 1;
  const score = game.results.filter(Boolean).length;
  const streak = game.results.every(Boolean) ? game.results.length : 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap items-center justify-center gap-3 text-[14px]">
        <span className="rounded-full bg-surface px-4 py-2 font-semibold ring-1 ring-line">
          {game.mode === "daily" ? `Défi du jour · manche ${Math.min(game.round + 1, DAILY_ROUNDS)}/${DAILY_ROUNDS}` : `Série : ${streak}`}
        </span>
        <span className="rounded-full bg-surface px-4 py-2 font-semibold ring-1 ring-line">Écart visé : ×{(10 ** targetGap(game.round)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span>
        {game.mode === "free" && <span className="rounded-full bg-surface px-4 py-2 font-semibold ring-1 ring-line">Record : {best}</span>}
      </div>

      <p className="text-[22px] font-extrabold" aria-live="polite">
        {game.picked === null ? "Lequel est le plus cher ?" : game.results.at(-1) ? "Bien vu." : "Raté."}
      </p>

      <div className="grid w-full max-w-3xl gap-x-6 gap-y-20 pt-16 sm:grid-cols-2">
        {[x, y].map((item, i) => {
          const state = game.picked === null ? "idle" : i === winner ? "right" : game.picked === i ? "wrong" : "idle";
          return (
            <GameCard
              key={`${game.round}-${item.slug}`}
              item={item}
              reveal={game.picked === null ? 0 : reveal}
              state={state}
              disabled={game.picked !== null}
              onPick={() => choose(i as 0 | 1)}
            />
          );
        })}
      </div>

      {game.picked !== null && (
        <div className="flex flex-col items-center gap-4">
          {game.picked === winner ? (
            <p className="flex items-center gap-2 font-semibold text-tier-3">
              <Check aria-hidden="true" className="size-5" /> Bonne réponse
            </p>
          ) : (
            <p className="flex items-center gap-2 font-semibold text-tier-6">
              <X aria-hidden="true" className="size-5" /> Le plus cher était {lowerFirst([x, y][winner].name)}
            </p>
          )}
          {game.over ? (
            <div className="panel flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-[24px] font-extrabold">
                {game.mode === "daily" ? `${score}/${DAILY_ROUNDS}` : `Série de ${score}`}
              </p>
              <p className="text-[24px] tracking-[0.1em]" aria-label={`${score} bonnes réponses sur ${game.results.length}`}>
                {game.results.map((r) => (r ? "🟩" : "🟥")).join("")}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={share} className="h-11 rounded-full bg-ink px-5 font-semibold text-white">
                  <span aria-live="polite">{copied ? "Résultat copié" : "Partager le résultat"}</span>
                </button>
                <button type="button" onClick={() => start(game.mode === "daily" ? "free" : "free")} className="h-11 rounded-full bg-surface px-5 font-semibold ring-1 ring-line">
                  {game.mode === "daily" ? "Continuer en partie libre" : "Rejouer"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={next} className="h-12 rounded-full bg-ink px-6 font-semibold text-white" autoFocus>
              Manche suivante
            </button>
          )}
        </div>
      )}
    </div>
  );
}
