import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { MobileMenu } from "./MobileMenu";

export const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/#ascension", label: "L'Ascension" },
  { href: "/explorer", label: "Explorer" },
  { href: "/duel", label: "Duel" },
  { href: "/jeu", label: "Jeu" },
  { href: "/budget", label: "Budget" },
  { href: "/methodologie", label: "Méthodologie" },
] as const;

/** Barre de navigation flottante en verre clair. */
export function SiteNav() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-50 px-3">
      <nav
        aria-label="Navigation principale"
        className="glass pointer-events-auto mx-auto flex h-14 max-w-[1120px] items-center justify-between rounded-full pl-5 pr-2"
      >
        <Link href="/" className="flex min-h-11 items-center rounded-full" aria-label="VERTIGE, accueil">
          <Logo className="text-[34px]" />
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.slice(2).map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[14px] font-medium text-muted transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <Link
            href="/#ascension"
            className="hidden min-h-10 items-center rounded-full bg-ink px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-deep sm:inline-flex"
          >
            L&apos;Ascension
          </Link>
          <MobileMenu links={NAV_LINKS} />
        </div>
      </nav>
    </header>
  );
}
