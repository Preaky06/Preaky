import { CONFIDENCE_LABEL, PRICE_TYPE_LABEL, UNIT_LABEL } from "@/lib/labels";
import { formatObservedAt } from "@/lib/format";
import type { Confidence, ItemStatus, Price } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONF_CLASS: Record<Confidence, string> = {
  A: "text-conf-a border-[color-mix(in_oklab,var(--color-conf-a)_45%,transparent)]",
  B: "text-conf-b border-[color-mix(in_oklab,var(--color-conf-b)_45%,transparent)]",
  C: "text-conf-c border-[color-mix(in_oklab,var(--color-conf-c)_45%,transparent)]",
};

export function ConfidenceBadge({ level, compact = false }: { level: Confidence; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-small leading-tight",
        CONF_CLASS[level],
      )}
      title={`Fiabilité ${level} : ${CONFIDENCE_LABEL[level]}`}
    >
      <span className="num">{level}</span>
      {compact ? <span className="sr-only">{CONFIDENCE_LABEL[level]}</span> : <span>{CONFIDENCE_LABEL[level]}</span>}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full border border-dashed border-line-strong px-2 py-0.5 text-small leading-tight text-muted uppercase tracking-[0.12em]"
      title="Donnée de démonstration, non sourcée"
    >
      Démo
    </span>
  );
}

/**
 * Règle d'or : aucun prix affiché sans son type, sa date et son badge de fiabilité.
 * Ce composant accompagne chaque prix de l'interface.
 */
export function PriceStamp({
  price,
  status,
  compact = false,
  className,
}: {
  price: Pick<Price, "price_type" | "observed_at" | "confidence" | "unit">;
  status?: ItemStatus;
  compact?: boolean;
  className?: string;
}) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1.5 text-small text-muted", className)}>
      <span>
        {PRICE_TYPE_LABEL[price.price_type]}
        {price.unit !== "piece" && <span> · {UNIT_LABEL[price.unit]}</span>}
      </span>
      <span aria-hidden="true">·</span>
      <time dateTime={price.observed_at}>{formatObservedAt(price.observed_at)}</time>
      <ConfidenceBadge level={price.confidence} compact={compact} />
      {status === "demo" && <DemoBadge />}
    </p>
  );
}
