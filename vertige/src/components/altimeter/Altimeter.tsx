"use client";

import { useEffect, useRef, useState } from "react";
import { altitudeStore, useAltitude } from "@/components/ascension/altitude-store";
import { RollingCounter } from "@/components/ui/RollingCounter";
import { formatPrice, formatSci, priceParts } from "@/lib/format";
import { altitudeOf, DECADE_TICKS, LOG_MAX, LOG_MIN, logAtAltitude } from "@/lib/scale";
import { getTier, TIER_COUNT, TIERS, tierOf } from "@/lib/tiers";
import { cn } from "@/lib/utils";

export interface AltimeterFloor {
  name: string;
  log: number;
}

const pct = (log: number) => `${(altitudeOf(log) * 100).toFixed(3)}%`;

/** Segments colorés du rail : un par palier, positionnés sur l'échelle log. */
function TierSegments({ axis, lit = false }: { axis: "y" | "x"; lit?: boolean }) {
  return (
    <>
      {TIERS.map((t) => {
        const start = altitudeOf(t.logMin) * 100;
        const size = (altitudeOf(t.logMax) - altitudeOf(t.logMin)) * 100;
        return (
          <span
            key={t.id}
            className="absolute"
            style={
              axis === "y"
                ? { bottom: `${start}%`, height: `${size}%`, left: 0, right: 0, background: t.color, opacity: lit ? 1 : 0.22 }
                : { left: `${start}%`, width: `${size}%`, top: 0, bottom: 0, background: t.color, opacity: lit ? 1 : 0.22 }
            }
          />
        );
      })}
    </>
  );
}

function nearestFloor(floors: AltimeterFloor[], log: number) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < floors.length; i++) {
    const d = Math.abs(floors[i].log - log);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function Altimeter({ floors }: { floors: AltimeterFloor[] }) {
  const deskRef = useRef<HTMLElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ alt: number; log: number } | null>(null);

  const active = useAltitude((s) => s.active);
  const tierId = useAltitude((s) => s.tier);
  const floor = useAltitude((s) => s.floor);
  const decade = useAltitude((s) => Math.floor(s.log + 1e-9));
  const priceNumber = useAltitude((s) => priceParts(10 ** s.log).number);
  const priceSuffix = useAltitude((s) => priceParts(10 ** s.log).suffix);
  const sci = useAltitude((s) => formatSci(10 ** s.log));
  const tier = getTier(tierId);
  const current = floors[floor];

  // Curseur et traînée : variables CSS écrites à chaque frame, sans re-rendu React.
  useEffect(
    () =>
      altitudeStore.onFrame((s) => {
        const alt = altitudeOf(s.log).toFixed(5);
        deskRef.current?.style.setProperty("--alt", alt);
        mobileRef.current?.style.setProperty("--alt", alt);
      }),
    [],
  );

  const onRailMove = (e: React.PointerEvent) => {
    const rail = railRef.current;
    if (!rail || e.pointerType !== "mouse") return;
    const r = rail.getBoundingClientRect();
    const alt = 1 - (e.clientY - r.top) / r.height;
    if (alt < 0 || alt > 1) return setHover(null);
    setHover({ alt, log: logAtAltitude(alt) });
  };

  const meterProps = {
    role: "meter" as const,
    "aria-label": "Altimètre de prix",
    "aria-valuemin": LOG_MIN,
    "aria-valuemax": LOG_MAX,
    "aria-valuenow": current ? Number(current.log.toFixed(2)) : LOG_MIN,
    "aria-valuetext": current
      ? `${formatPrice(10 ** current.log)}, ${current.name}, palier ${getTier(tierOf(10 ** current.log)).name} (${tierOf(10 ** current.log)} sur ${TIER_COUNT})`
      : "Début de l'échelle",
  };

  return (
    <>
      {/* ── Desktop : règle verticale fixe à gauche ───────────────────────── */}
      <aside
        ref={deskRef}
        data-tier={tierId}
        data-active={active || undefined}
        aria-label="Altimètre"
        className={cn(
          "fixed bottom-0 left-0 top-14 z-30 hidden w-[216px] flex-col gap-4 pb-5 pl-5 pt-6 lg:flex",
          "transition-[opacity,visibility] duration-500",
          active ? "visible opacity-100" : "invisible opacity-0",
        )}
        style={{ "--alt": 0 } as React.CSSProperties}
      >
        <div
          className="relative flex min-h-0 flex-1 cursor-crosshair"
          onPointerMove={onRailMove}
          onPointerLeave={() => setHover(null)}
          onClick={() => hover && altitudeStore.jumpToLog(hover.log)}
        >
          <div ref={railRef} {...meterProps} className="relative h-full w-3">
            {/* Rail éteint */}
            <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2">
              <TierSegments axis="y" />
            </span>
            {/* Rail allumé sous le curseur */}
            <span
              className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2"
              style={{ clipPath: "inset(calc((1 - var(--alt)) * 100%) 0 0 0)" }}
            >
              <TierSegments axis="y" lit />
            </span>
            {/* Traînée lumineuse */}
            <span
              className="absolute inset-y-0 left-1/2 w-3 origin-bottom rounded-full opacity-40 blur-[6px]"
              style={{
                transform: "translateX(-50%) scaleY(var(--alt))",
                background: "linear-gradient(to top, transparent, var(--tier))",
              }}
            />
            {/* Curseur */}
            <span className="absolute inset-0" style={{ transform: "translateY(calc((1 - var(--alt)) * 100%))" }}>
              <span className="absolute left-1/2 top-0 block size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--tier) shadow-[0_0_0_4px_rgb(7_7_10),0_0_18px_4px_var(--tier)] transition-colors duration-700" />
            </span>
          </div>

          {/* Graduations en puissances de 10 */}
          <ol className="pointer-events-none absolute inset-y-0 left-5 right-0" aria-hidden="true">
            {DECADE_TICKS.map((exp) => {
              const lit = exp <= decade;
              const boundary = TIERS.some((t) => t.logMin === exp);
              return (
                <li
                  key={exp}
                  className={cn(
                    "absolute flex items-center gap-1.5 text-[11px] leading-none transition-colors duration-300",
                    exp % 2 !== 0 && "[@media(max-height:760px)]:hidden",
                    lit ? "text-ink" : "text-muted/60",
                  )}
                  style={{ bottom: pct(exp), transform: "translateY(50%)" }}
                >
                  <span className={cn("h-px bg-current", boundary ? "w-3" : "w-1.5", lit && "bg-(--tier)")} />
                  <span className="tabular-nums">
                    10<sup className="relative -top-[0.45em] ml-px align-baseline text-[0.8em]">{exp < 0 ? `−${-exp}` : exp}</sup>
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Survol : notation scientifique + étage le plus proche */}
          {hover && (
            <div
              className="glass pointer-events-none absolute left-16 z-10 w-[188px] rounded-xl px-3 py-2 text-small"
              style={{ bottom: `${hover.alt * 100}%`, transform: "translateY(50%)" }}
            >
              <p className="num text-ink">{formatSci(10 ** hover.log)}</p>
              <p className="truncate text-muted">≈ {floors[nearestFloor(floors, hover.log)]?.name}</p>
              <p className="text-[11px] text-muted">Cliquer pour y aller</p>
            </div>
          )}
        </div>

        {/* Lecture */}
        <div className="glass mr-3 flex flex-col gap-1 rounded-[20px] p-4">
          <p className="flex items-center justify-between text-small text-muted">
            <span>
              Palier <span className="num text-ink">{tierId}/{TIER_COUNT}</span>
            </span>
            <span className="font-serif text-lg leading-none text-(--tier)">{tier.name}</span>
          </p>
          <RollingCounter value={priceNumber} suffix={priceSuffix} className="text-[26px] text-ink" stagger={0} />
          <p className="num h-4 text-[11px] text-muted">{hover ? sci : ""}</p>
          <p className="truncate text-small text-muted" title={current?.name}>
            {current ? `Étage ${floor + 1} · ${current.name}` : ""}
          </p>
          <div className="mt-2 flex items-center justify-between" role="group" aria-label="Aller à un palier">
            {TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => altitudeStore.jumpToTier(t.id)}
                aria-label={`Aller au palier ${t.id} : ${t.name}`}
                aria-current={t.id === tierId ? "step" : undefined}
                className="grid size-6 place-items-center rounded-full"
              >
                <span
                  className={cn("block rounded-full transition-all duration-300", t.id === tierId ? "size-3" : "size-2 opacity-50")}
                  style={{ background: t.color }}
                />
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Mobile : barre horizontale en haut ───────────────────────────── */}
      <div
        ref={mobileRef}
        data-tier={tierId}
        aria-label="Altimètre"
        role="region"
        className={cn(
          "glass fixed inset-x-0 top-14 z-30 flex h-11 items-center justify-between gap-3 border-x-0 border-t-0 px-4 lg:hidden",
          "transition-[opacity,visibility] duration-500",
          active ? "visible opacity-100" : "invisible opacity-0",
        )}
        style={{ "--alt": 0 } as React.CSSProperties}
      >
        <p className="flex min-w-0 items-baseline gap-2 text-small text-muted">
          <span className="num shrink-0">
            {tierId}/{TIER_COUNT}
          </span>
          <span className="truncate font-serif text-lg leading-none text-(--tier)">{tier.name}</span>
        </p>
        <RollingCounter value={priceNumber} suffix={priceSuffix} className="text-[17px] text-ink" stagger={0} />
        <div {...meterProps} className="absolute inset-x-0 bottom-0 h-[2px] overflow-x-clip">
          <TierSegments axis="x" />
          <span className="absolute inset-0" style={{ clipPath: "inset(0 calc((1 - var(--alt)) * 100%) 0 0)" }}>
            <TierSegments axis="x" lit />
          </span>
          <span className="absolute inset-0" style={{ transform: "translateX(calc(var(--alt) * 100%))" }}>
            <span className="absolute left-0 top-1/2 block size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--tier) shadow-[0_0_12px_2px_var(--tier)]" />
          </span>
        </div>
      </div>
    </>
  );
}
