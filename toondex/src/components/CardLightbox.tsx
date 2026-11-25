"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Card, CardBack } from "@/components/Card";
import { CardViewer } from "@/components/CardViewer";
import type { CardDef } from "@/lib/cards-meta";

type Props = {
  cards: CardDef[];
  /** Cartes pas encore obtenues : elles restent floues, même en grand. */
  mystery: string[];
  children: ReactNode;
};

/**
 * Grille du catalogue : un clic ouvre la carte seule, en grand, à faire pivoter (glisser, clic,
 * flèches du clavier). Un clic à côté ou Échap la referme. Sans JavaScript, le lien mène à la fiche.
 */
export function CardLightbox({ cards, mystery, children }: Props) {
  const [card, setCard] = useState<CardDef | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const hidden = card ? mystery.includes(card.id) : false;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (card && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>(".viewer__stage")?.focus();
    }
    if (!card && d.open) d.close();
  }, [card]);

  // Phase de capture : on passe avant le lien de Next, qui sinon ouvrirait la fiche.
  function onClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((e.target as Element).closest("dialog")) return;
    const link = (e.target as Element).closest<HTMLAnchorElement>("a[data-card]");
    const hit = link && cards.find((c) => c.id === link.dataset.card);
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    setCard(hit);
  }

  return (
    <div onClickCapture={onClickCapture}>
      {children}
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={card ? (hidden ? "Carte mystère" : card.name) : "Carte"}
        onClose={() => setCard(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setCard(null);
        }}
      >
        {card && (
          <>
            <button type="button" className="lightbox__close" onClick={() => setCard(null)} aria-label="Fermer">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <CardViewer
              key={card.id}
              bare
              label={hidden ? "Carte mystère" : card.name}
              front={<Card card={card} mystery={hidden} width="100%" />}
              back={<CardBack />}
            />
          </>
        )}
      </dialog>
    </div>
  );
}
