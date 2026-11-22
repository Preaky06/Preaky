import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { formatInt } from "@/lib/format";
import { HeroCounter } from "./HeroCounter";
import { StartButton } from "./StartButton";

/** Écran d'accueil plein écran. */
export function Hero({ count }: { count: number }) {
  return (
    <section
      aria-labelledby="hero-title"
      data-tier="7"
      className="relative z-10 flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-24 text-center"
    >
      <div aria-hidden="true" className="halo left-1/2 top-[38%] size-[70vmin] -translate-x-1/2 -translate-y-1/2" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_35%,rgb(244_241_234/0.05),transparent_70%)]"
      />

      <h1 id="hero-title" className="relative">
        <Logo size="xl" className="text-[clamp(4.25rem,19vw,15rem)]" />
      </h1>
      <p className="rise relative mt-4 font-serif text-[clamp(1.35rem,3.6vw,2.25rem)] leading-tight text-ink/90" style={{ "--d": 120 } as React.CSSProperties}>
        Du centime au milliard. <em className="text-(--tier) not-italic">Tout a un prix.</em>
      </p>

      <div className="rise relative mt-10 flex flex-col items-center gap-2" style={{ "--d": 300 } as React.CSSProperties}>
        <span className="text-small uppercase tracking-[0.24em] text-muted">Altitude de départ</span>
        <HeroCounter className="text-[clamp(1.4rem,6.2vw,4.5rem)] text-ink" />
      </div>

      <div className="rise relative mt-10 flex flex-col items-center gap-3 sm:flex-row" style={{ "--d": 450 } as React.CSSProperties}>
        <StartButton />
        <ButtonLink href="/explorer" variant="ghost">
          Explorer les {formatInt(count)} prix
        </ButtonLink>
      </div>

      <a
        href="#palier-poussiere"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-small text-muted"
      >
        <span>19 ordres de grandeur</span>
        <span className="sr-only">: aller au premier palier</span>
        <ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-5 animate-[vg-bob_2.4s_ease-in-out_infinite]" />
      </a>
    </section>
  );
}
