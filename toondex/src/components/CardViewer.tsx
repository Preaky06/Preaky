"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

type Props = {
  front: ReactNode;
  back: ReactNode;
  /** Nom de la carte, pour les lecteurs d'écran. */
  label: string;
  /** Sans bouton ni consigne : seulement la carte. */
  bare?: boolean;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * Carte en 3D que l'on fait pivoter : glisser pour la tourner (le reflet suit l'angle), relâcher
 * pour qu'elle se pose sur sa face ou son dos. Bouton « Retourner » et flèches du clavier en plus.
 */
export function CardViewer({ front, back, label, bare = false }: Props) {
  const [angle, setAngle] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const start = useRef<{
    px: number;
    py: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const settle = useCallback(
    (y: number) => setAngle({ x: 0, y: Math.round(y / 180) * 180 }),
    [],
  );

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = {
      px: e.clientX,
      py: e.clientY,
      x: angle.x,
      y: angle.y,
      moved: false,
    };
    setDragging(true);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (Math.abs(dx) + Math.abs(dy) > 3) s.moved = true;
    setAngle({ x: clamp(s.x - dy * 0.35, -28, 28), y: s.y + dx * 0.6 });
  }
  function onPointerUp() {
    if (!start.current) return;
    const { moved } = start.current;
    start.current = null;
    setDragging(false);
    // Un simple clic retourne la carte ; un glissé la pose sur la face la plus proche.
    setAngle((a) =>
      moved
        ? { x: 0, y: Math.round(a.y / 180) * 180 }
        : { x: 0, y: Math.round(a.y / 180) * 180 + 180 },
    );
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.key === "ArrowLeft" ? -30 : 30;
      setAngle((a) => ({ x: 0, y: a.y + step }));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      settle(angle.y + 180);
    }
  }

  // Reflet : sa position suit l'angle de la carte.
  const rad = (angle.y * Math.PI) / 180;
  const mx = 50 + Math.sin(rad) * 48;
  const my = 50 - (angle.x / 28) * 40;
  const showingBack = Math.cos(rad) < 0;
  const style = {
    "--vx": `${angle.x}deg`,
    "--vy": `${angle.y}deg`,
    "--mx": `${mx.toFixed(1)}%`,
    "--my": `${my.toFixed(1)}%`,
    "--sx": `${(100 - mx).toFixed(1)}%`,
    "--sy": `${(100 - my).toFixed(1)}%`,
  } as CSSProperties;

  return (
    <div
      className={`viewer${dragging ? " is-dragging" : ""}${reduced ? " is-reduced" : ""}`}
      style={style}
    >
      <div
        className="viewer__stage"
        role="group"
        tabIndex={0}
        aria-roledescription="carte orientable"
        aria-label={`${label}. ${showingBack ? "Dos de la carte" : "Face de la carte"}. Flèches gauche et droite pour la faire pivoter, Entrée pour la retourner.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className="viewer__card">
          <div className="viewer__face viewer__face--front">{front}</div>
          <div className="viewer__face viewer__face--back">{back}</div>
        </div>
        <span className="viewer__shadow" aria-hidden="true" />
      </div>
      {!bare && (
        <div className="viewer__controls">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => settle(angle.y + 180)}
          >
            <svg
              className="btn__icon"
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M3 8a5 5 0 0 1 8.6-3.5M13 8a5 5 0 0 1-8.6 3.5M11.5 2v2.7H8.8M4.5 14v-2.7h2.7"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {showingBack ? "Voir la face" : "Voir le dos"}
          </button>
          <span className="viewer__hint">
            Fais glisser la carte pour la faire pivoter
          </span>
        </div>
      )}
    </div>
  );
}
