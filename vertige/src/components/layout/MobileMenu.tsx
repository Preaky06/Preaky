"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useState } from "react";

export function MobileMenu({ links }: { links: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const id = useId();

  // Fermer à la navigation et quand la route est masquée (Activity).
  useLayoutEffect(() => () => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full text-ink"
      >
        {open ? <X aria-hidden="true" strokeWidth={1.5} /> : <Menu aria-hidden="true" strokeWidth={1.5} />}
        <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
      </button>
      <div
        id={id}
        hidden={!open}
        className="glass fixed inset-x-3 top-[60px] rounded-[20px] p-2 shadow-2xl"
      >
        <ul className="flex flex-col">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === l.href ? "page" : undefined}
                className="flex min-h-12 items-center rounded-xl px-4 text-ink aria-[current=page]:bg-white/5"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
