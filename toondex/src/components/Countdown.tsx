"use client";

import { useSyncExternalStore } from "react";

/** Minutes avant minuit, heure de Paris. */
function minutesToParisMidnight(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return 24 * 60 - (get("hour") * 60 + get("minute"));
}

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 20_000);
  return () => window.clearInterval(id);
}

export function Countdown() {
  const minutes = useSyncExternalStore(subscribe, minutesToParisMidnight, () => null);
  if (minutes === null) return <span>…</span>;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return <span>{h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`}</span>;
}
