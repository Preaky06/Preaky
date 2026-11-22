import { cn } from "@/lib/utils";

/**
 * Wordmark VERTIGE en capitales ultra-condensées.
 * Police provisoire : Six Caps (Google Fonts, OFL), la plus proche de la référence
 * fournie. À remplacer par la police définitive dès réception (une seule variable :
 * --font-display dans layout.tsx).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block font-display uppercase leading-[0.85] tracking-[0.02em] text-ink select-none", className)}
    >
      Vertige
    </span>
  );
}
