import Link from 'next/link';
import { Lock, Smartphone, Search, Share2, Clock, Code2, BarChart3, FileText, Gauge, CalendarClock, ArrowUpRight, ArrowDown, Send, ShieldCheck } from 'lucide-react';
import { SiteHeader, SiteFooter, PublicPage } from '@/components/site';
import { DotPill, MonoTag, SectionHead, ctaClass } from '@/components/landing/kit';
import { AuditForm } from './form';

export const metadata = {
  title: 'Audit de site web gratuit',
  description: 'Analysez gratuitement un site web en moins de 30 secondes : HTTPS, mobile, référencement, réseaux sociaux, fraîcheur du contenu. Rapport partageable avec recommandations, sans inscription.',
  alternates: { canonical: '/outils/audit-site' },
};

const CHECKS = [
  [Lock, 'Sécurité HTTPS', 'Connexion chiffrée et absence d’alerte « Non sécurisé ».'],
  [Smartphone, 'Adaptation mobile', 'Présence de la balise d’affichage mobile.'],
  [Search, 'Référencement de base', 'Titre, meta description, titre principal (H1).'],
  [Share2, 'Aperçu de partage', 'Balises Open Graph pour LinkedIn, WhatsApp, Facebook.'],
  [Code2, 'Données structurées', 'Informations lisibles par Google (JSON-LD).'],
  [Clock, 'Temps de réponse', 'Durée de réponse de la page d’accueil.'],
  [CalendarClock, 'Fraîcheur', 'Date du dernier contenu publié, copyright.'],
  [BarChart3, 'Mesure d’audience', 'Outil de statistiques détecté ou non.'],
] as const;

const FAQ = [
  ['L’audit est-il vraiment gratuit ?', 'Oui, sans inscription. Pour éviter les abus, le nombre d’audits par heure est limité, et un même site n’est analysé qu’une fois par jour : relancer l’audit dans la journée affiche le rapport déjà produit.'],
  ['Que regarde exactement l’audit ?', 'La page d’accueil publique du site, telle qu’un visiteur la reçoit : sécurité, adaptation mobile, balises de référencement, aperçu de partage, données structurées, réseaux sociaux reliés, fraîcheur et temps de réponse. Il ne mesure ni le trafic ni le positionnement dans Google.'],
  ['Le site audité est-il prévenu ?', 'Notre robot s’identifie (ProSpectre-Analyse) et respecte le fichier robots.txt : si le site refuse les robots, l’audit n’a pas lieu. Le rapport ne contient ni téléphone ni adresse e-mail.'],
  ['Je suis une agence : puis-je envoyer le rapport à un prospect ?', 'C’est fait pour. Chaque rapport a un lien privé, non référencé par les moteurs, que vous pouvez joindre à votre message. Dans l’application, le rapport se génère directement depuis la fiche de l’entreprise.'],
];

export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
  return (
    <PublicPage>
      <SiteHeader />
      <main id="contenu" className="overflow-x-clip">
        <section className="relative isolate px-4 pt-14 pb-10 sm:px-6 lg:pt-20">
          <div className="halo-duo pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[36rem]" aria-hidden="true" />
          <div className="stagger mx-auto max-w-3xl text-center">
            <div className="flex justify-center">
              <DotPill>Outil gratuit · sans inscription</DotPill>
            </div>
            <h1 className="font-display mt-8 text-[2.6rem] leading-[1.04] font-semibold tracking-[-0.05em] text-balance sm:text-[3.9rem]">
              Audit de site web
              <span className="text-brand block">gratuit.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600">Sécurité, mobile, référencement, réseaux sociaux, fraîcheur : un diagnostic clair en moins de 30 secondes, avec les actions à mener.</p>
            <div className="mx-auto mt-9 max-w-2xl text-left">
              <AuditForm />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHead kicker="audit" title="Ce que l’audit" accent="vérifie." center />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CHECKS.map(([Icon, t, d]) => (
              <div key={t} className="hairline rounded-[24px] border border-white bg-white p-5 shadow-float ring-1 ring-night-900/[0.05]">
                <span className="grid size-10 place-items-center rounded-full bg-violet-50 text-brand-violet ring-1 ring-violet-100">
                  <Icon className="size-5" />
                </span>
                <p className="mt-4 font-semibold">{t}</p>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              [Gauge, 'Une note sur 100', 'Calculée à partir des constats, du plus important au plus mineur.'],
              [FileText, 'Des recommandations', 'Pour chaque point : pourquoi c’est important et comment le corriger.'],
              [ShieldCheck, 'Un robot respectueux', 'Identifié, il respecte robots.txt et ne conserve aucune coordonnée.'],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Gauge;
              return (
                <div key={t as string} className="flex gap-3 rounded-[24px] border border-dashed border-violet-300/70 bg-white/50 p-5">
                  <I className="mt-0.5 size-5 shrink-0 text-brand-violet" />
                  <div>
                    <p className="font-semibold">{t as string}</p>
                    <p className="mt-1 text-sm text-slate-600">{d as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="island relative isolate mx-auto grid max-w-6xl items-center gap-8 overflow-hidden rounded-[2.5rem] p-8 text-white sm:p-12 lg:grid-cols-[1.2fr_1fr]">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
            <div>
              <MonoTag dark>Agences et indépendants</MonoTag>
              <h2 className="font-display mt-4 text-[1.9rem] leading-[1.06] font-semibold tracking-[-0.045em] sm:text-[2.3rem]">Ouvrez la conversation avec un diagnostic, plutôt qu’une promesse.</h2>
              <p className="mt-4 text-slate-300">Pro Spectre trouve les entreprises de votre zone dont le site a besoin de vous, rédige le message d’approche et génère le rapport à joindre. Le Radar vous signale chaque matin les nouvelles créations et cessions.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/inscription" className={ctaClass('light', 'lg')}>
                  Essayer gratuitement
                  <ArrowUpRight className="size-4" />
                </Link>
                <Link href="/#radar" className={ctaClass('outline-dark', 'lg')}>
                  Découvrir le Radar
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Send className="size-4 text-violet-300" />
                Exemple d’approche (entreprise fictive)
              </p>
              <p className="mt-3 leading-relaxed text-slate-300">« Bonjour, en préparant notre échange j’ai fait analyser le site du Bistrot Exemple : il n’est pas encore en HTTPS et s’affiche mal sur mobile. Le rapport détaillé est ici : [lien du rapport]. Je peux vous montrer en 15 minutes comment corriger ces deux points. »</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 [&>div]:mt-10">
          <SectionHead kicker="faq" title="Questions" accent="fréquentes." />
          <div className="mt-6 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-white bg-white px-5 py-4 shadow-float ring-1 ring-night-900/[0.05] open:ring-violet-200 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] border-night-900/80 transition-transform duration-200 group-open:rotate-180 group-open:border-brand-violet group-open:bg-brand-violet group-open:text-white" aria-hidden="true">
                    <ArrowDown className="size-3.5" strokeWidth={2.5} />
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </main>
      <SiteFooter />
    </PublicPage>
  );
}
