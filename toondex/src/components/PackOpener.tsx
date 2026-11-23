"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { openPack } from "@/app/actions";
import { Card, CardBack } from "@/components/Card";
import { RARITIES, getWork, type Rarity } from "@/lib/catalogue";
import type { PackCard } from "@/lib/collection";

/** Durée de l'animation d'ouverture selon la rareté (ms). Plus c'est rare, plus c'est long. */
const REVEAL_MS: Record<Rarity, number> = {
  commune: 600,
  rare: 900,
  epique: 1400,
  legendaire: 2000,
  mythique: 2800,
};
const GOLD_EXTRA_MS = 900;

type Phase = "sealed" | "opening" | "tearing" | "dealt";

/** Horloge lue uniquement depuis des gestionnaires d'événements. */
function clock(): number {
  return Date.now();
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function revealDuration(card: PackCard): number {
  if (prefersReducedMotion()) return 250;
  const work = getWork(card.workId)!;
  return REVEAL_MS[work.rarity] + (card.gold ? GOLD_EXTRA_MS : 0);
}

function statusLabel(card: PackCard): string {
  if (card.status === "new-gold") return "Version or !";
  if (card.status === "new") return "Nouvelle !";
  return `Doublon · +${card.shards} éclats`;
}

const SPARKS = Array.from({ length: 12 }, (_, i) => i);

type Props = {
  initialCards: PackCard[] | null;
  /** Aperçu : cartes imposées, sans appel au serveur ni compte. */
  demoCards?: PackCard[];
};

export function PackOpener({ initialCards, demoCards }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(initialCards ? "dealt" : "sealed");
  const [cards, setCards] = useState<PackCard[] | null>(initialCards);
  const [revealed, setRevealed] = useState<boolean[]>(() => (initialCards ?? []).map(() => true));
  const [animated, setAnimated] = useState(!initialCards);
  const [stageFx, setStageFx] = useState<"mythique" | "gold" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [pending, startTransition] = useTransition();
  /** Nombre d'animations de révélation en cours : le bilan attend qu'elles soient finies. */
  const [inFlight, setInFlight] = useState(0);
  const timers = useRef<number[]>([]);
  const busyUntil = useRef(0);
  const revealedIds = useRef(new Set<number>());

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const allRevealed = cards !== null && revealed.length === cards.length && revealed.every(Boolean);
  const settled = allRevealed && inFlight === 0;

  useEffect(() => {
    if (settled && animated && !demoCards) router.refresh();
  }, [settled, animated, demoCards, router]);

  function open() {
    setError(null);
    setPhase("opening");
    startTransition(async () => {
      const result = demoCards
        ? ({ ok: true, pack: { day: "apercu", cards: demoCards }, shards: 0 } as const)
        : await openPack();
      if (!result.ok) {
        setError(result.error);
        if (result.pack) {
          setCards(result.pack.cards);
          setRevealed(result.pack.cards.map(() => true));
          setAnimated(false);
          setPhase("dealt");
        } else {
          setPhase("sealed");
        }
        return;
      }
      setCards(result.pack.cards);
      setRevealed(result.pack.cards.map(() => false));
      setPhase("tearing");
      later(() => setPhase("dealt"), 650);
    });
  }

  function reveal(index: number) {
    if (!cards || revealed[index] || revealedIds.current.has(index)) return;
    revealedIds.current.add(index);
    const card = cards[index];
    const work = getWork(card.workId)!;
    setRevealed((prev) => prev.map((v, i) => (i === index ? true : v)));
    if (work.rarity === "mythique") setStageFx("mythique");
    else if (card.gold) setStageFx("gold");
    const ms = revealDuration(card);
    busyUntil.current = Math.max(busyUntil.current, clock() + ms);
    setInFlight((n) => n + 1);
    later(() => setInFlight((n) => n - 1), ms);
    if (work.rarity === "mythique" || card.gold) later(() => setStageFx(null), ms);
    later(
      () =>
        setAnnounce(
          `${work.title}, ${RARITIES[work.rarity].label.toLowerCase()}${card.gold ? ", version or" : ""}. ${statusLabel(card)}`,
        ),
      Math.min(ms, 1200),
    );
  }

  function revealAll() {
    if (!cards) return;
    let delay = Math.max(0, busyUntil.current - clock());
    cards.forEach((card, i) => {
      if (revealed[i]) return;
      later(() => reveal(i), delay);
      delay += revealDuration(card) + 150;
    });
  }

  const newCount = cards?.filter((c) => c.status !== "dup").length ?? 0;
  const dupCount = cards?.filter((c) => c.status === "dup").length ?? 0;
  const shardTotal = cards?.reduce((sum, c) => sum + c.shards, 0) ?? 0;

  if (phase !== "dealt" || !cards) {
    return (
      <div className="pack-stage">
        <button
          type="button"
          className={`pack${phase === "opening" ? " is-shaking" : ""}${phase === "tearing" ? " is-tearing" : ""}`}
          onClick={open}
          disabled={pending || phase !== "sealed"}
          aria-label="Ouvrir le paquet du jour"
        >
          <span className="pack__inner">
            <span className="pack__sheen" aria-hidden="true" />
            <span className="logo-mark logo-mark--lg" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="pack__name">ToonDex</span>
            <span className="pack__label">Paquet du jour</span>
            <span className="pack__count">5 cartes</span>
          </span>
        </button>
        <button type="button" className="btn btn--primary btn--lg" onClick={open} disabled={pending || phase !== "sealed"}>
          {phase === "sealed" ? "Ouvrir mon paquet" : "Ouverture…"}
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`reveal${animated ? "" : " reveal--static"}`}>
      {stageFx && <div className={`stage-fx stage-fx--${stageFx}`} aria-hidden="true" />}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {error && <p className="notice">{error}</p>}
      <ol className="reveal__row">
        {cards.map((card, i) => {
          const work = getWork(card.workId)!;
          const isOpen = revealed[i];
          return (
            <li key={`${card.workId}-${i}`} className="reveal__item" style={{ "--i": i } as CSSProperties}>
              <button
                type="button"
                className={`slot r-${work.rarity}${card.gold ? " r-gold" : ""}${isOpen ? " is-revealed" : ""}${animated ? "" : " is-static"}`}
                onClick={() => reveal(i)}
                aria-disabled={isOpen}
                aria-label={isOpen ? `Carte ${i + 1} : ${work.title}` : `Révéler la carte ${i + 1}`}
              >
                <span className="slot__fx" aria-hidden="true">
                  <span className="slot__rays" />
                  <span className="slot__ring" />
                  <span className="slot__flash" />
                  {SPARKS.map((s) => (
                    <span key={s} className="slot__spark" style={{ "--a": `${s * 30}deg` } as CSSProperties} />
                  ))}
                </span>
                <span className="slot__lift" aria-hidden="true">
                  <span className="flip">
                    <span className="flip__face flip__face--front">
                      <Card work={work} gold={card.gold} />
                    </span>
                    <span className="flip__face flip__face--back">
                      <CardBack />
                    </span>
                  </span>
                </span>
              </button>
              <span
                className={`slot__status${isOpen ? " is-visible" : ""} status--${card.status}`}
                style={isOpen && animated ? { animationDelay: `${Math.round(revealDuration(card) * 0.75)}ms` } : undefined}
              >
                {isOpen ? statusLabel(card) : `Carte ${i + 1}`}
              </span>
            </li>
          );
        })}
      </ol>

      {settled ? (
        <div className="reveal__summary">
          <p>
            <strong>
              {newCount} nouvelle{newCount > 1 ? "s" : ""} carte{newCount > 1 ? "s" : ""}
            </strong>
            {dupCount > 0 && (
              <>
                {" "}
                · {dupCount} doublon{dupCount > 1 ? "s" : ""} transformé{dupCount > 1 ? "s" : ""} en{" "}
                <strong>{shardTotal} éclats</strong>
              </>
            )}
          </p>
          <Link href="/collection" className="btn btn--primary">
            Voir ma collection
          </Link>
        </div>
      ) : (
        <div className="reveal__summary">
          <p className="muted">{allRevealed ? "…" : "Touche une carte pour la retourner."}</p>
          <button type="button" className="btn btn--ghost" onClick={revealAll} disabled={allRevealed}>
            Tout révéler
          </button>
        </div>
      )}
    </div>
  );
}
