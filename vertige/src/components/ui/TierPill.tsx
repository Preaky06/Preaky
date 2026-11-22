import { getTier, TIER_COUNT, type TierId } from "@/lib/tiers";
import { cn } from "@/lib/utils";

/** Pastille de palier. `solid` : fond plein + texte sombre ; défaut : teinte + texte coloré. */
export function TierPill({
  tier,
  showIndex = false,
  variant = "tint",
  className,
}: {
  tier: TierId;
  showIndex?: boolean;
  variant?: "tint" | "solid";
  className?: string;
}) {
  const t = getTier(tier);
  return (
    <span
      data-tier={tier}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-small font-medium leading-none whitespace-nowrap",
        variant === "solid"
          ? "bg-(--tier) text-white"
          : "border border-[color-mix(in_oklab,var(--tier)_40%,transparent)] bg-[color-mix(in_oklab,var(--tier)_12%,transparent)] text-(--tier)",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", variant === "solid" ? "bg-white" : "bg-(--tier)")}
      />
      {t.name}
      {showIndex && (
        <span className="num text-[0.92em]">
          · {tier}/{TIER_COUNT}
        </span>
      )}
    </span>
  );
}
