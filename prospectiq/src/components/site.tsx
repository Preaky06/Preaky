import Link from 'next/link';
import { ShieldCheck, Lock, Cookie, ArrowUpRight } from 'lucide-react';
import { Logo, Wordmark } from './logo';
import { SiteNav } from './site-nav';
import { Kicker } from './landing/kit';

/** En-tête flottant en pilule, commun à toutes les pages publiques. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <a href="#contenu" className="sr-only rounded-lg bg-brand-violet px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50">
        Aller au contenu
      </a>
      <div className="relative mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 rounded-full border border-white bg-white/80 pr-1.5 pl-4 text-night-900 min-[360px]:pr-2 min-[360px]:pl-5 shadow-float ring-1 ring-night-900/[0.06] backdrop-blur-xl">
        <Logo />
        <div className="flex items-center gap-1.5 lg:contents">
          <SiteNav />
          <div className="flex items-center gap-1.5 max-lg:order-first">
            <Link href="/connexion" className="inline-flex h-10 items-center rounded-full border border-night-900/10 bg-white px-4 text-sm font-medium whitespace-nowrap transition-colors hover:border-night-900/25 max-sm:hidden">
              Connexion
            </Link>
            <Link href="/inscription" className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-violet px-3.5 text-sm min-[360px]:px-4 font-semibold whitespace-nowrap text-white shadow-brand transition-colors hover:bg-violet-700">
              Essai gratuit
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-px group-hover:-translate-y-px max-[359px]:hidden" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Enveloppe des pages publiques : papier pointillé clair. */
export function PublicPage({ children }: { children: React.ReactNode }) {
  return <div className="paper-dots min-h-dvh">{children}</div>;
}

export function SiteFooter() {
  return (
    <footer className="island relative overflow-hidden rounded-t-[2.5rem] text-slate-400 sm:rounded-t-[3.5rem]">
      <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-6xl gap-10 px-4 pt-20 pb-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
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

export function LegalPage({ title, updated, kicker = 'informations légales', children }: { title: string; updated: string; kicker?: string; children: React.ReactNode }) {
  return (
    <PublicPage>
      <SiteHeader />
      <main id="contenu" className="relative isolate mx-auto max-w-3xl px-4 pt-14 pb-24 sm:px-6">
        <div className="halo-duo pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[28rem]" aria-hidden="true" />
        <Kicker label={kicker} />
        <h1 className="font-display mt-5 text-[2.3rem] leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-[3rem]">{title}</h1>
        <p className="mt-4 font-mono text-[11.5px] font-medium tracking-[0.14em] text-slate-500 uppercase">[ Mise à jour : {updated} ]</p>
        <div className="legal mt-10 rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-10 space-y-4 text-[15px] leading-relaxed text-night-800 [&_a]:font-medium [&_a]:text-electric-700 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-night-900 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">{children}</div>
      </main>
      <SiteFooter />
    </PublicPage>
  );
}
