import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { MobileMenu } from "./MobileMenu";

export const NAV_LINKS = [
  { href: "/", label: "L'Ascension" },
  { href: "/explorer", label: "Explorer" },
  { href: "/duel", label: "Duel" },
  { href: "/jeu", label: "Jeu" },
  { href: "/budget", label: "Budget" },
  { href: "/methodologie", label: "Méthodologie" },
] as const;

/** Barre de navigation en verre dépoli. */
export function SiteNav() {
  return (
    <header className="glass fixed inset-x-0 top-0 z-50 h-14 border-x-0 border-t-0">
      <nav aria-label="Navigation principale" className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center rounded-md text-[17px]">
          <Logo size="sm" />
          <span className="sr-only">, retour à l&apos;accueil</span>
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.slice(1).map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[14px] text-muted transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <MobileMenu links={NAV_LINKS} />
      </nav>
    </header>
  );
}
