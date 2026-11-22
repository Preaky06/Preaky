import { ButtonLink } from "@/components/ui/Button";

/** Page réservée à une phase ultérieure : évite les liens morts depuis la navigation. */
export function ComingSoon({ title, phase, children }: { title: string; phase: number; children: React.ReactNode }) {
  return (
    <section className="relative z-10 mx-auto flex min-h-[80svh] max-w-2xl flex-col items-start justify-center gap-6 px-5 pb-16 pt-32">
      <p className="num text-small uppercase tracking-[0.3em] text-muted">Phase {phase} · en construction</p>
      <h1 className="text-title-1 font-extrabold tracking-tight text-ink">{title}</h1>
      <div className="text-lg leading-relaxed text-muted">{children}</div>
      <ButtonLink href="/" variant="ghost">
        Retour à l&apos;Ascension
      </ButtonLink>
    </section>
  );
}
