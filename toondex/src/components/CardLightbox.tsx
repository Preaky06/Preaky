"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Card, CardBack } from "@/components/Card";
import { CardViewer } from "@/components/CardViewer";
import { RARITIES, cardNumber, type CardDef } from "@/lib/cards-meta";

/**
 * Grille du catalogue : un clic sur une carte l'ouvre en grand, en 3D, sans quitter la page.
 * Sans JavaScript (ou avec Ctrl/Cmd), le lien mène à la fiche de la carte.
 */
export function CardLightbox({ cards, children }: { cards: CardDef[]; children: ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const card = index === null ? null : cards[index];

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (card && !d.open) d.showModal();
    if (!card && d.open) d.close();
  }, [card]);

  // Phase de capture : on passe avant le lien de Next, qui sinon ouvrirait la fiche.
  function onClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((e.target as Element).closest("dialog")) return;
    const link = (e.target as Element).closest<HTMLAnchorElement>("a[data-card]");
    if (!link) return;
    const i = cards.findIndex((c) => c.id === link.dataset.card);
    if (i < 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIndex(i);
  }

  const go = (step: number) => setIndex((i) => (i === null ? i : (i + step + cards.length) % cards.length));

  return (
    <div onClickCapture={onClickCapture}>
      {children}
      <dialog
        ref={dialog}
        className="lightbox"
        aria-labelledby="lightbox-title"
        onClose={() => setIndex(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIndex(null);
        }}
        onKeyDown={(e) => {
          if ((e.target as Element).closest(".viewer__stage")) return;
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        {card && (
          <div className="lightbox__body">
            <header className="lightbox__head">
              <div>
                <p className="lightbox__num">
                  N°{cardNumber(card.num, card.total)} · <span className={`rarity rarity--${card.rarity}`}>{RARITIES[card.rarity].label}</span>
                </p>
                <h2 id="lightbox-title" className="lightbox__title">
                  {card.name}
                </h2>
                <p className="lightbox__work">
                  {card.work.title} · {card.work.year}
                  {card.work.network ? ` · ${card.work.network}` : ""}
                </p>
              </div>
              <button type="button" className="lightbox__close" onClick={() => setIndex(null)} aria-label="Fermer">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </header>
            <CardViewer key={card.id} label={card.name} front={<Card card={card} width="100%" />} back={<CardBack />} />
            <footer className="lightbox__foot">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => go(-1)} aria-label="Carte précédente">
                ←
              </button>
              <Link href={`/carte/${card.id}`} className="btn btn--primary btn--sm">
                Voir la fiche complète
              </Link>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => go(1)} aria-label="Carte suivante">
                →
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </div>
  );
}
