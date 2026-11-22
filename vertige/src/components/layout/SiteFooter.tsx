import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line bg-surface px-5 py-10 text-small text-muted">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-3">
          <Logo className="text-[30px]" />
          <span>L&apos;encyclopédie visuelle de tout ce qui a un prix.</span>
        </p>
        <div className="flex flex-col gap-1 sm:items-end">
          <p>
            Version de démonstration : prix non sourcés (fiabilité C).{" "}
            <Link href="/methodologie" className="font-medium text-ink underline underline-offset-4">
              Méthodologie
            </Link>
          </p>
          <p>Illustrations 3D : Fluent Emoji, © Microsoft, licence MIT.</p>
        </div>
      </div>
    </footer>
  );
}
