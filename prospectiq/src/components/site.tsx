import Link from 'next/link';
import { ShieldCheck, Lock, Cookie } from 'lucide-react';
import { Logo, Wordmark } from './logo';
import { SiteNav } from './site-nav';
import { buttonClass, cx } from './styles';

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  return (
    <header className={cx('sticky top-0 z-40 border-b backdrop-blur-xl', dark ? 'border-white/10 bg-night-950 text-white' : 'border-line/70 bg-white/85 text-night-900')}>
      <a href="#contenu" className="sr-only rounded-lg bg-electric-600 px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50">
        Aller au contenu
      </a>
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo dark={dark} />
        <div className="flex items-center gap-2 md:contents">
          <SiteNav dark={dark} />
          <div className="flex items-center gap-2 max-md:order-first">
            <Link href="/connexion" className={cx(buttonClass('ghost', 'sm'), 'max-md:hidden', dark && 'text-slate-200 hover:bg-white/10 hover:text-white')}>
              Connexion
            </Link>
            <Link href="/inscription" className={cx(dark ? buttonClass('accent', 'sm') : buttonClass('primary', 'sm'), 'rounded-full px-4')}>
              Essai gratuit
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative bg-night-950 text-slate-400">
      <div className="spectrum-line opacity-60" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Logo dark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">Prospection B2B à partir des registres publics officiels français. Chaque information affichée cite sa source.</p>
          <p className="mt-4 max-w-xs text-xs leading-relaxed text-slate-500">Données publiques de l’Insee, de l’INPI, de la DILA et d’Etalab. Pro Spectre est un service indépendant, sans lien avec ces organismes.</p>
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="font-semibold text-white">Produit</p>
          <Link href="/#fonctionnalites" className="block hover:text-white">Fonctionnalités</Link>
          <Link href="/#radar" className="block hover:text-white">Radar</Link>
          <Link href="/#score" className="block hover:text-white">Score explicable</Link>
          <Link href="/outils/audit-site" className="block hover:text-white">Audit de site gratuit</Link>
          <Link href="/#tarifs" className="block hover:text-white">Tarifs</Link>
          <Link href="/inscription" className="block hover:text-white">Créer un compte</Link>
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="font-semibold text-white">Confiance</p>
          <Link href="/confiance" className="block hover:text-white">Centre de confiance</Link>
          <Link href="/confidentialite" className="block hover:text-white">Confidentialité</Link>
          <Link href="/opposition" className="block hover:text-white">Opposition / suppression</Link>
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="font-semibold text-white">Légal</p>
          <Link href="/mentions-legales" className="block hover:text-white">Mentions légales</Link>
          <Link href="/cgu" className="block hover:text-white">Conditions d’utilisation</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 text-xs sm:px-6">
          <p>© {new Date().getFullYear()} Pro Spectre</p>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5" /> Paiement sécurisé par Stripe
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Cookie className="size-3.5" /> Aucun cookie publicitaire
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Droit d’opposition en ligne
            </span>
          </p>
        </div>
      </div>
      <div className="pointer-events-none relative h-[clamp(3.2rem,9.5vw,9.5rem)] overflow-hidden select-none" aria-hidden="true">
        <Wordmark dark className="absolute top-[0.08em] left-1/2 -translate-x-1/2 text-[clamp(3.4rem,11.5vw,11.5rem)] [mask-image:linear-gradient(to_bottom,#000_15%,transparent_95%)] opacity-90" />
      </div>
    </footer>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : {updated}</p>
        <div className="legal mt-8 space-y-4 text-[15px] leading-relaxed text-night-800 [&_a]:font-medium [&_a]:text-electric-700 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-night-900 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
