"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Compteur à rouleaux.
 * Chaque chiffre est une colonne 0-9 qui défile verticalement, mue par un ressort
 * (raideur 120, amortissement 20, masse 1), avec 30 ms de décalage par chiffre, de droite à gauche.
 *
 * Le ressort est intégré ici (≈ 40 lignes) plutôt que via Framer Motion : c'est le seul
 * composant animé de la page d'accueil, et cela retire ~35 Ko gzip du JS initial.
 * La transform est écrite directement sur l'élément : aucun rendu React par frame.
 *
 * Reçoit une chaîne déjà formatée ("4,2", "99 999 999") ; les colonnes sont indexées
 * depuis la droite, par chiffre, pour survivre aux changements de séparateurs.
 */

const STIFFNESS = 120;
const DAMPING = 20;
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function DigitColumn({ digit, delay }: { digit: number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const sim = useRef({ x: -digit * 10, v: 0, target: -digit * 10, raf: 0, last: 0 });
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const s = sim.current;
    const step = (now: number) => {
      const dt = Math.min((now - s.last) / 1000, 1 / 30);
      s.last = now;
      // Euler semi-implicite, 4 sous-pas pour la stabilité
      for (let i = 0; i < 4; i++) {
        const h = dt / 4;
        const a = -STIFFNESS * (s.x - s.target) - DAMPING * s.v;
        s.v += a * h;
        s.x += s.v * h;
      }
      if (Math.abs(s.x - s.target) < 0.02 && Math.abs(s.v) < 0.02) {
        s.x = s.target;
        s.v = 0;
        s.raf = 0;
      } else {
        s.raf = requestAnimationFrame(step);
      }
      if (ref.current) ref.current.style.transform = `translate3d(0,${s.x.toFixed(3)}%,0)`;
    };
    const retarget = () => {
      s.target = -digit * 10;
      if (!s.raf) {
        s.last = performance.now();
        s.raf = requestAnimationFrame(step);
      }
    };
    if (delay <= 0) retarget();
    else {
      // On n'annule pas les timers précédents : en mise à jour continue, chaque colonne
      // suit sa cible avec un retard constant au lieu de rester figée.
      const t = setTimeout(() => {
        timers.current.delete(t);
        retarget();
      }, delay);
      timers.current.add(t);
    }
  }, [digit, delay]);

  useEffect(() => {
    const pending = timers.current;
    const s = sim.current;
    return () => {
      pending.forEach(clearTimeout);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, []);

  return (
    <span className="relative inline-block h-[1.15em] w-[1ch] overflow-hidden align-bottom">
      <span
        ref={ref}
        className="absolute inset-x-0 top-0 flex flex-col will-change-transform"
        style={{ transform: `translate3d(0,${-digit * 10}%,0)` }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1.15em] text-center leading-[1.15em]">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

interface Token {
  kind: "digit" | "sep";
  char: string;
  key: string;
  order: number; // rang du chiffre depuis la droite
}

function tokenize(value: string): Token[] {
  const out: Token[] = [];
  let digitIndex = 0;
  let sepIndex = 0;
  for (let i = value.length - 1; i >= 0; i--) {
    const c = value[i];
    if (c >= "0" && c <= "9") {
      out.push({ kind: "digit", char: c, key: `d${digitIndex}`, order: digitIndex });
      digitIndex++;
    } else {
      out.push({ kind: "sep", char: c, key: `s${digitIndex}-${sepIndex++}`, order: digitIndex });
    }
  }
  return out.reverse();
}

export function RollingCounter({
  value,
  suffix,
  stagger = 30,
  className,
  label,
}: {
  value: string;
  suffix?: string;
  /** Décalage par chiffre, en ms (de droite à gauche). */
  stagger?: number;
  className?: string;
  /** Texte lu par les lecteurs d'écran (défaut : valeur + suffixe). */
  label?: string;
}) {
  const reduced = useReducedMotion();
  const text = `${value}${suffix ? ` ${suffix}` : ""}`;

  if (reduced) {
    return (
      <span className={cn("num inline-block whitespace-nowrap", className)}>
        <span key={text} className="inline-block animate-[vg-fade_150ms_ease_both]">
          {text}
        </span>
      </span>
    );
  }

  const tokens = tokenize(value);
  return (
    <span className={cn("num inline-flex items-end whitespace-nowrap leading-[1.15]", className)}>
      <span className="sr-only">{label ?? text}</span>
      <span aria-hidden="true" className="inline-flex items-end">
        {tokens.map((t) =>
          t.kind === "digit" ? (
            <DigitColumn key={t.key} digit={Number(t.char)} delay={t.order * stagger} />
          ) : (
            <span
              key={t.key}
              className={cn("inline-block h-[1.15em] leading-[1.15em]", /\s/.test(t.char) && "w-[0.32em]")}
            >
              {/\s/.test(t.char) ? "" : t.char}
            </span>
          ),
        )}
        {suffix && <span className="ml-[0.28em] inline-block h-[1.15em] leading-[1.15em]">{suffix}</span>}
      </span>
    </span>
  );
}
