import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="relative z-10 mx-auto flex min-h-[80svh] max-w-xl flex-col items-center justify-center gap-6 px-5 pt-20 text-center">
      <p className="num text-small uppercase tracking-[0.3em] text-muted">404</p>
      <h1 className="font-serif text-title-2">Cet objet n&apos;a pas de prix.</h1>
      <p className="text-muted">Ni de page, d&apos;ailleurs. Il a peut-être été retiré de l&apos;échelle.</p>
      <ButtonLink href="/" variant="ghost">
        Retour à l&apos;Ascension
      </ButtonLink>
    </section>
  );
}
