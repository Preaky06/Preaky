"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/paquet", label: "Paquet du jour" },
  { href: "/collection", label: "Ma collection" },
  { href: "/catalogue", label: "Catalogue" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Navigation principale">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className="nav__link" aria-current={active ? "page" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
