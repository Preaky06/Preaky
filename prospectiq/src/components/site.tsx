import Link from 'next/link';
import { Logo } from './logo';
import { buttonClass } from './styles';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Navigation principale">
          <Link href="/#fonctionnalites" className="hover:text-night-900">Fonctionnalités</Link>
          <Link href="/#scoring" className="hover:text-night-900">Scoring</Link>
          <Link href="/#tarifs" className="hover:text-night-900">Tarifs</Link>
          <Link href="/#faq" className="hover:text-night-900">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/connexion" className={buttonClass('ghost', 'sm')}>
            Connexion
          </Link>
          <Link href="/inscription" className={buttonClass('primary', 'sm')}>
            Essai gratuit
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-slate-500">Prospection B2B à partir de données publiques officielles françaises.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Produit</p>
          <Link href="/#fonctionnalites" className="block text-slate-600 hover:text-night-900">Fonctionnalités</Link>
          <Link href="/#tarifs" className="block text-slate-600 hover:text-night-900">Tarifs</Link>
          <Link href="/inscription" className="block text-slate-600 hover:text-night-900">Créer un compte</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Légal</p>
          <Link href="/mentions-legales" className="block text-slate-600 hover:text-night-900">Mentions légales</Link>
          <Link href="/cgu" className="block text-slate-600 hover:text-night-900">Conditions d’utilisation</Link>
          <Link href="/confidentialite" className="block text-slate-600 hover:text-night-900">Politique de confidentialité</Link>
          <Link href="/opposition" className="block text-slate-600 hover:text-night-900">Opposition / suppression de données</Link>
        </div>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} ProspectIQ</p>
    </footer>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : {updated}</p>
        <div className="legal mt-8 space-y-4 text-[15px] leading-relaxed text-night-800 [&_a]:font-medium [&_a]:text-electric-700 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-night-900 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
