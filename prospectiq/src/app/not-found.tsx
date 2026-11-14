// Page introuvable : même habillage que le site public, avec le radar de la marque.
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SiteHeader, SiteFooter, PublicPage } from '@/components/site';
import { Kicker, ctaClass } from '@/components/landing/kit';

export const metadata = { title: 'Page introuvable' };

export default function NotFound() {
  return (
    <PublicPage>
      <SiteHeader />
      <main id="contenu" className="relative isolate overflow-x-clip px-4 pt-16 pb-28 sm:px-6">
        <div className="halo-duo pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[36rem]" aria-hidden="true" />
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Kicker label="erreur 404" />
            <h1 className="font-display mt-5 text-[2.4rem] leading-[1.04] font-semibold tracking-[-0.05em] text-balance sm:text-[3.4rem]">
              Le radar n’a rien trouvé <span className="text-brand block">à cette adresse.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-slate-600">La page demandée n’existe pas ou a été déplacée. Les entreprises, elles, sont toujours là.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className={ctaClass('brand', 'lg')}>
                Retour à l’accueil
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
              </Link>
              <Link href="/outils/audit-site" className={ctaClass('outline', 'lg')}>
                Audit de site gratuit
              </Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[22rem]" aria-hidden="true">
            <div className="absolute inset-0 rounded-full border border-violet-300/50 bg-[radial-gradient(closest-side,rgb(124_58_237_/_0.07),transparent)]" />
            <div className="absolute inset-[16%] rounded-full border border-violet-300/50" />
            <div className="absolute inset-[32%] rounded-full border border-violet-300/60" />
            <div className="absolute top-1/2 left-0 h-px w-full bg-violet-300/30" />
            <div className="absolute top-0 left-1/2 h-full w-px bg-violet-300/30" />
            <div className="radar-sweep absolute inset-0 rounded-full" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display rounded-2xl bg-white/80 px-4 py-2 text-[3.2rem] leading-none font-semibold tracking-[-0.05em] text-night-900 shadow-float backdrop-blur">404</span>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </PublicPage>
  );
}
