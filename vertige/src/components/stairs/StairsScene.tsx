"use client";

import { ArrowDown } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { RollingCounter } from "@/components/ui/RollingCounter";
import type { CardItem } from "@/lib/card-item";
import { formatInt, formatPrice, priceParts } from "@/lib/format";
import { scrollToElement } from "@/lib/lenis";
import { prefersReducedMotion } from "@/lib/motion-prefs";
import { clamp, lerp } from "@/lib/scale";
import { getTier, TIER_COUNT, type TierId } from "@/lib/tiers";
import {
  ARROW,
  BBOX,
  BLOCKS,
  FOCUS,
  LENGTH_AT_STEP,
  OBJECT_BASE,
  LABEL,
  OBJECT_SIZE,
  PATH_D,
  PATH_LENGTH,
  SHADOW,
  STEPS,
  type Pt,
} from "./geometry";

export interface StairStep {
  item: CardItem;
  label: string;
}

// Chronologie du scroll (0 → 1 sur toute la hauteur de la section)
const P0 = 0.05; // fin de l'intro : le ruban atteint la 1re marche
const P1 = 0.84; // 7e marche atteinte, puis la caméra recule
const ZOOM = 1.9;
const ZOOM_END = 0.72; // vue d'ensemble finale, escalier calé en bas pour libérer le haut
const smooth = (t: number) => t * t * (3 - 2 * t);

interface Frame {
  viewBox: string;
  pathLength: number;
  u: number; // position continue sur les marches (0 → 6)
  arrow: number; // opacité de la flèche finale
  intro: number; // 1 → 0 : titre d'accueil
  outro: number; // 0 → 1 : appel à l'action final
}

function frameAt(p: number, endZoom = ZOOM_END): Frame {
  const u = clamp((p - P0) / (P1 - P0), 0, 1) * (STEPS - 1);
  const lo = Math.floor(u);
  const hi = Math.min(lo + 1, STEPS - 1);
  const f = smooth(u - lo);
  let focus: Pt = { x: lerp(FOCUS[lo].x, FOCUS[hi].x, f), y: lerp(FOCUS[lo].y, FOCUS[hi].y, f) };
  let k = ZOOM;
  const out = smooth(clamp((p - P1) / (1 - P1 - 0.04), 0, 1));
  if (out > 0) {
    k = lerp(ZOOM, endZoom, out);
    // Bas de l'escalier aligné sur le bas du cadre : le texte final occupe le haut.
    const end = { x: BBOX.x + BBOX.w / 2, y: BBOX.y + BBOX.h - BBOX.h / endZoom / 2 };
    focus = { x: lerp(focus.x, end.x, out), y: lerp(focus.y, end.y, out) };
  }
  const vw = BBOX.w / k;
  const vh = BBOX.h / k;
  const intro = clamp(1 - (p - 0.015) / 0.06, 0, 1);
  // Pendant l'intro, l'escalier est décalé vers le bas pour laisser la place au titre.
  const cy = focus.y - vh * 0.17 * intro;
  const pathLength =
    p < P0 ? lerp(0, LENGTH_AT_STEP[0], p / P0) : lerp(LENGTH_AT_STEP[lo], LENGTH_AT_STEP[hi], u - lo);
  return {
    viewBox: `${(focus.x - vw / 2).toFixed(1)} ${(cy - vh / 2).toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`,
    pathLength,
    u,
    arrow: clamp((p - P1) / 0.05, 0, 1),
    intro,
    outro: clamp((p - 0.9) / 0.06, 0, 1),
  };
}

/** Le dessin SVG : statique, mémorisé (le scroll ne le re-rend jamais, il écrit dans le DOM). */
const StairsSvg = memo(function StairsSvg({
  steps,
  initial,
  svgRef,
  pathRef,
  arrowRef,
}: {
  steps: StairStep[];
  initial: Frame;
  svgRef: React.RefObject<SVGSVGElement | null>;
  pathRef: React.RefObject<SVGPathElement | null>;
  arrowRef: React.RefObject<SVGGElement | null>;
}) {
  return (
    <svg
      ref={svgRef}
      viewBox={initial.viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 size-full"
      aria-hidden="true"
    >
      <polygon points={SHADOW} fill="#05468a" opacity="0.28" />
      {BLOCKS.map((b) => (
        <g key={b.i}>
          <polygon points={b.side} fill="#8DB9EC" />
          <polygon points={b.front} fill="#D3E5F9" />
          <polygon points={b.top} fill="#FFFFFF" />
        </g>
      ))}
      {/* Tracé complet (discret) puis ruban doré qui progresse */}
      <path d={PATH_D} fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="16" strokeLinejoin="round" />
      <path
        ref={pathRef}
        d={PATH_D}
        fill="none"
        stroke="#F5C542"
        strokeWidth="16"
        strokeLinejoin="round"
        strokeDasharray={PATH_LENGTH}
        strokeDashoffset={PATH_LENGTH - initial.pathLength}
      />
      <g ref={arrowRef} style={{ opacity: initial.arrow }}>
        <path d={ARROW.d} stroke="#F5C542" strokeWidth="16" fill="none" />
        <polygon points={ARROW.head} fill="#F5C542" />
      </g>
      {steps.map((s, i) => {
        const base = OBJECT_BASE[i];
        const labelX = base.x - LABEL.gap - LABEL.w;
        const labelY = base.y - 78;
        return (
          <g key={s.item.slug} className="stair-step" data-step={i} data-on={i <= initial.u + 0.5 ? "" : undefined}>
            <ellipse cx={base.x} cy={base.y + 4} rx={38} ry={11} fill="#0752A0" opacity="0.18" />
            {s.item.image &&
              (s.item.imageKind === "photo" || s.item.imageKind === "emblem" ? (
                // Photo encadrée : carré blanc arrondi, image recadrée dedans
                <g>
                  <clipPath id={`marche-${i}`}>
                    <rect x={base.x - OBJECT_SIZE * 0.4} y={base.y - OBJECT_SIZE * 0.86} width={OBJECT_SIZE * 0.8} height={OBJECT_SIZE * 0.8} rx={OBJECT_SIZE * 0.18} />
                  </clipPath>
                  <rect
                    x={base.x - OBJECT_SIZE * 0.4 - 4}
                    y={base.y - OBJECT_SIZE * 0.86 - 4}
                    width={OBJECT_SIZE * 0.8 + 8}
                    height={OBJECT_SIZE * 0.8 + 8}
                    rx={OBJECT_SIZE * 0.18 + 4}
                    fill="#FFFFFF"
                  />
                  <image
                    href={s.item.image}
                    x={base.x - OBJECT_SIZE * 0.4}
                    y={base.y - OBJECT_SIZE * 0.86}
                    width={OBJECT_SIZE * 0.8}
                    height={OBJECT_SIZE * 0.8}
                    preserveAspectRatio={s.item.imageKind === "emblem" ? "xMidYMid meet" : "xMidYMid slice"}
                    clipPath={`url(#marche-${i})`}
                    data-fallback={s.item.fallback ?? undefined}
                  />
                </g>
              ) : (
                <image
                  href={s.item.image}
                  x={base.x - OBJECT_SIZE / 2}
                  y={base.y - OBJECT_SIZE + 10}
                  width={OBJECT_SIZE}
                  height={OBJECT_SIZE}
                  data-fallback={s.item.fallback ?? undefined}
                />
              ))}
            <g transform={`translate(${labelX.toFixed(1)} ${labelY.toFixed(1)})`}>
              <rect x="3" y="6" width="232" height="68" rx="20" fill="#05468a" opacity="0.18" />
              <rect width="232" height="68" rx="20" fill="#FFFFFF" />
              <circle cx="20" cy="22" r="5" fill={getTier(s.item.tier).color} />
              <text x="32" y="27" fontSize="15" fill="#566079" style={{ fontFamily: "var(--font-sans)" }}>
                {s.label}
              </text>
              <text
                x="16"
                y="56"
                fontSize="26"
                fontWeight="800"
                fill="#0B1220"
                style={{ fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
              >
                {formatPrice(s.item.priceEur)}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
});

/**
 * Accueil : un escalier isométrique blanc à reliefs bleus. En défilant, la caméra gravit
 * les 7 marches (une par palier), un objet apparaît sur chacune et son prix grimpe.
 * Le scroll écrit directement dans le SVG (viewBox, tracé) : aucun rendu React par frame
 * hormis le compteur.
 */
export function StairsScene({ steps, count }: { steps: StairStep[]; count: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const arrowRef = useRef<SVGGElement>(null);
  const [initial] = useState(() => frameAt(0));
  const [u, setU] = useState(0);
  const [phase, setPhase] = useState<"intro" | "steps" | "outro">("intro");

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    let raf = 0;
    let lastU = -1;
    let lastPhase = "";

    const apply = (fr: Frame) => {
      svgRef.current?.setAttribute("viewBox", fr.viewBox);
      if (pathRef.current) pathRef.current.style.strokeDashoffset = String(PATH_LENGTH - fr.pathLength);
      if (arrowRef.current) arrowRef.current.style.opacity = String(fr.arrow);
      stage.style.setProperty("--intro", fr.intro.toFixed(3));
      stage.style.setProperty("--outro", fr.outro.toFixed(3));
      svgRef.current?.querySelectorAll<SVGGElement>(".stair-step").forEach((g, i) => {
        if (i <= fr.u + 0.5) g.dataset.on = "";
        else delete g.dataset.on;
      });
      const rounded = Math.round(fr.u * 100) / 100;
      if (rounded !== lastU) {
        lastU = rounded;
        setU(rounded);
      }
      const ph = fr.outro > 0.5 ? "outro" : fr.intro > 0.5 ? "intro" : "steps";
      if (ph !== lastPhase) {
        lastPhase = ph;
        setPhase(ph);
      }
    };

    if (prefersReducedMotion()) {
      // Mouvement réduit : vue d'ensemble fixe, toutes les marches visibles.
      // Escalier plus petit, calé en bas, sous le titre.
      const fr = frameAt(1, 0.5);
      apply({ ...fr, intro: 1, outro: 0 });
      return;
    }

    const update = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      apply(frameAt(p));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const lo = Math.floor(u);
  const hi = Math.min(lo + 1, STEPS - 1);
  const logPrice = lerp(steps[lo].item.log, steps[hi].item.log, u - lo);
  const { number, suffix } = priceParts(10 ** logPrice);
  const current = steps[Math.round(u)];
  const tier = getTier(current.item.tier as TierId);
  const first = steps[0].item;
  const last = steps[STEPS - 1].item;

  const goNext = () => {
    const next = document.getElementById("prix");
    if (next) scrollToElement(next, { offset: -90 });
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="accueil-titre"
      className="relative h-[520svh] bg-brand motion-reduce:h-auto"
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-svh min-h-[560px] overflow-hidden motion-reduce:relative"
        style={{ "--intro": 1, "--outro": 0 } as React.CSSProperties}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_45%,#0b6bcb_0%,#0b6bcb_45%,#0752a0_100%)]"
        />
        <StairsSvg steps={steps} initial={initial} svgRef={svgRef} pathRef={pathRef} arrowRef={arrowRef} />
        {/* Voile derrière le titre et le texte final : lisibilité garantie au-dessus des marches blanches */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[62%] bg-[linear-gradient(to_bottom,#0b6bcb_0%,#0b6bcb_55%,rgb(11_107_203/0)_100%)]"
          style={{ opacity: "max(var(--intro), var(--outro))" }}
        />

        {/* Titre d'accueil (référence : grand titre centré, pastille au-dessus, bouton noir) */}
        <div
          data-phase={phase}
          className="absolute inset-x-0 top-0 flex flex-col items-center px-5 pt-28 text-center text-white sm:pt-32 [&:not([data-phase=intro])]:pointer-events-none"
          style={{ opacity: "var(--intro)", transform: "translate3d(0, calc((1 - var(--intro)) * -40px), 0)" }}
        >
          <p className="glass-dark flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-[14px]">
            <span className="flex -space-x-2" aria-hidden="true">
              {[steps[0], steps[3], steps[6]].map((s) =>
                s.item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={s.item.slug}
                    src={s.item.image}
                    alt=""
                    width={28}
                    height={28}
                    data-fallback={s.item.fallback ?? undefined}
                    className={s.item.imageKind === "photo" ? "size-7 rounded-full bg-white object-cover" : "size-7 rounded-full bg-white object-contain p-0.5"}
                  />
                ) : null,
              )}
            </span>
            {formatInt(count)} objets, du grain de riz au PIB mondial
          </p>
          <h1 id="accueil-titre" className="mt-5 text-[clamp(2.75rem,8vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
            Tout a un prix.
          </h1>
          <p className="mt-4 max-w-md text-[clamp(1rem,2.2vw,1.25rem)] text-white">
            Du centime au milliard. Monte l&apos;escalier : à chaque marche, le prix grimpe.
          </p>
          <button
            type="button"
            tabIndex={phase === "intro" ? 0 : -1}
            onClick={() => scrollToElement(stageRef.current!, { offset: window.innerHeight * 0.9 })}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white"
          >
            Commencer à monter
            <ArrowDown aria-hidden="true" strokeWidth={2} className="size-4" />
          </button>
        </div>

        {/* Légende de la marche courante */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[88px] flex justify-center px-3"
          style={{ opacity: "calc((1 - var(--intro)) * (1 - var(--outro)))" }}
        >
          <p className="glass-dark flex flex-col items-center rounded-[22px] px-5 py-2.5 text-center text-white">
            <span className="text-[12px] font-semibold uppercase tracking-[0.22em]">
              Marche {Math.round(u) + 1} sur {STEPS}
            </span>
            <span className="text-[clamp(1.25rem,3vw,1.75rem)] font-extrabold leading-tight tracking-tight">
              Palier {tier.name} <span className="font-semibold">· {tier.short}</span>
            </span>
          </p>
        </div>

        {/* Fin : appel à l'action */}
        <div
          data-phase={phase}
          className="absolute inset-x-0 top-[96px] flex flex-col items-center gap-3 px-5 text-center text-white [&:not([data-phase=outro])]:pointer-events-none [&:not([data-phase=outro])]:invisible"
          style={{ opacity: "var(--outro)" }}
        >
          <p className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-none tracking-tight">
            ×{(last.priceEur / first.priceEur / 1e18).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} milliards de milliards
          </p>
          <p className="max-w-md text-[clamp(1rem,2vw,1.15rem)]">
            entre {steps[0].label.toLowerCase()} et {steps[STEPS - 1].label.charAt(0).toLowerCase() + steps[STEPS - 1].label.slice(1)}.
            VERTIGE range tout ce qui a un prix sur cette échelle.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={goNext} className="h-12 rounded-full bg-white px-6 font-semibold text-ink">
              Explorer les prix
            </button>
            <a href="#ascension" className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-white ring-1 ring-white/60">
              Faire l&apos;Ascension complète
            </a>
          </div>
        </div>

        {/* Pastille de chiffres (référence : bandeau en verre en bas de l'écran) */}
        <div className="absolute inset-x-0 bottom-5 flex justify-center px-3">
          <dl className="glass-dark flex items-stretch rounded-[28px] px-2 py-3 text-white sm:px-4">
            <div className="flex min-w-[9.5rem] flex-col items-center px-3 sm:px-5">
              <dt className="order-2 text-[12px] text-white sm:text-[13px]">Prix de la marche</dt>
              <dd className="order-1 text-[clamp(1.15rem,3vw,1.75rem)] leading-tight">
                <RollingCounter value={number} suffix={suffix} stagger={0} />
              </dd>
            </div>
            <div className="flex flex-col items-center border-l border-white/20 px-3 sm:px-5">
              <dt className="order-2 text-[12px] text-white sm:text-[13px]">Palier</dt>
              <dd className="order-1 text-[clamp(1.15rem,3vw,1.75rem)] font-bold leading-tight">
                {Math.round(u) + 1}/{TIER_COUNT}
              </dd>
            </div>
            <div className="hidden flex-col items-center border-l border-white/20 px-5 sm:flex">
              <dt className="order-2 text-[13px] text-white">Objets</dt>
              <dd className="order-1 text-[1.75rem] font-bold leading-tight">{formatInt(count)}</dd>
            </div>
            <div className="hidden flex-col items-center border-l border-white/20 px-5 sm:flex">
              <dt className="order-2 text-[13px] text-white">Ordres de grandeur</dt>
              <dd className="order-1 text-[1.75rem] font-bold leading-tight">19</dd>
            </div>
          </dl>
        </div>

        {/* Version texte de l'escalier pour les lecteurs d'écran */}
        <ol className="sr-only" aria-label="Les 7 marches de l'escalier">
          {steps.map((s, i) => (
            <li key={s.item.slug}>
              Marche {i + 1}, palier {getTier(s.item.tier).name} : {s.label}, {formatPrice(s.item.priceEur)}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
