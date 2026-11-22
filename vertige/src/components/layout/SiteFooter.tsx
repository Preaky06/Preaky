import Link from "next/link";
import { VMark } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line px-5 py-10 text-small text-muted lg:pl-[216px]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <VMark className="size-4 text-ink" stroke={7} />
          VERTIGE — l&apos;encyclopédie visuelle de tout ce qui a un prix.
        </p>
        <p>
          Version de démonstration : les prix affichés sont des ordres de grandeur non sourcés.{" "}
          <Link href="/methodologie" className="text-ink underline underline-offset-4">
            Méthodologie
          </Link>
        </p>
      </div>
    </footer>
  );
}
