import { ButtonLink } from "@/components/ui/Button";
import { formatPrice, formatRatio } from "@/lib/format";
import type { ItemWithPrice } from "@/lib/types";
import { ShareButton } from "./ShareButton";

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Fin du parcours. */
export function AscensionEnd({ first, last }: { first: ItemWithPrice; last: ItemWithPrice }) {
  const ratio = last.price_eur / first.price_eur;
  return (
    <section
      aria-labelledby="fin-titre"
      data-tier="7"
      className="relative flex min-h-svh flex-col items-center justify-center gap-6 px-5 py-24 text-center lg:pl-[216px]"
    >
      <p className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-white">
        Sommet atteint
      </p>
      <h2 id="fin-titre" className="max-w-4xl text-title-2 font-extrabold tracking-tight">
        Tu viens de traverser <span className="text-iridescent">19 ordres de grandeur.</span>
      </h2>
      <p className="max-w-xl text-lg text-muted">
        De {lowerFirst(first.name_fr)} ({formatPrice(first.price_eur)}) à {lowerFirst(last.name_fr)} (
        {formatPrice(last.price_eur)}) : <span className="price font-bold text-ink">{formatRatio(ratio)}</span>.
      </p>
      <nav aria-label="Continuer" className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/duel">Lancer un duel</ButtonLink>
        <ButtonLink href="/jeu" variant="ghost">
          Plus ou moins cher ?
        </ButtonLink>
        <ButtonLink href="/#prix" variant="ghost">
          Explorer les prix
        </ButtonLink>
        <ShareButton title="VERTIGE" text="Du grain de riz au PIB mondial : 19 ordres de grandeur sur une seule échelle." />
      </nav>
      <a href="#accueil-titre" className="mt-8 text-small font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
        Redescendre tout en bas
      </a>
    </section>
  );
}
