import { cn } from "@/lib/utils";

/**
 * Le V de VERTIGE : deux traits fins qui s'écartent vers le haut en courbe
 * exponentielle (« la courbe qui explose »), point doré à la pointe.
 */
export function VMark({
  className,
  stroke = 3,
  title,
}: {
  className?: string;
  stroke?: number;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M50 93 C 48.6 60, 40 24, 4 5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path d="M50 93 C 51.4 60, 60 24, 96 5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <circle cx="50" cy="93" r={Math.max(4.5, stroke * 1.6)} fill="#F5C542" />
    </svg>
  );
}

/**
 * Wordmark. `size="sm"` : capitales espacées (0,2em). `size="xl"` : espacement normal.
 * Le V est un SVG calé sur la hauteur de capitale d'Instrument Serif.
 */
export function Logo({ size = "sm", className }: { size?: "sm" | "xl"; className?: string }) {
  const xl = size === "xl";
  return (
    <span
      role="img"
      aria-label="VERTIGE"
      className={cn(
        "inline-flex items-baseline font-serif leading-none text-ink select-none",
        xl ? "tracking-normal" : "tracking-[0.2em]",
        className,
      )}
    >
      <VMark
        stroke={xl ? 2.2 : 6}
        className={cn("shrink-0 self-baseline", xl ? "h-[0.74em] w-[0.8em] translate-y-[0.02em] -mr-[0.03em]" : "h-[0.78em] w-[0.86em] translate-y-[0.06em] mr-[0.12em]")}
      />
      <span aria-hidden="true">ERTIGE</span>
    </span>
  );
}
