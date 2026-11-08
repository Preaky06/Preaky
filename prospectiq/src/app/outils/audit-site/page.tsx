import Link from 'next/link';
import { Lock, Smartphone, Search, Share2, Clock, Code2, BarChart3, FileText, Gauge, CalendarClock, ArrowRight, Send, ShieldCheck } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/site';
import { BrandMark } from '@/components/logo';
import { AuditForm } from './form';
import { buttonClass } from '@/components/styles';

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
    <>
      <SiteHeader dark />
      <main id="contenu">
        <section className="relative isolate overflow-hidden bg-night-950 text-white">
          <div className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[34rem] w-[64rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(6,182,212,0.28),transparent)]" />
          <div className="mx-auto max-w-3xl px-4 pt-16 pb-24 text-center sm:px-6 lg:pt-24">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pr-3.5 pl-1 text-xs font-medium text-slate-200">
              <BrandMark size={22} className="rounded-[6px]" />
              Outil gratuit Pro Spectre
            </p>
            <h1 className="font-display mt-6 text-[2.2rem] leading-[1.08] font-semibold tracking-[-0.025em] text-balance sm:text-[3.2rem]">
              Audit de site web <span className="text-gradient font-serif text-[1.12em] font-normal tracking-normal italic">gratuit.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-300">Sécurité, mobile, référencement, réseaux sociaux, fraîcheur : un diagnostic clair en moins de 30 secondes, avec les actions à mener.</p>
            <div className="mx-auto mt-9 max-w-2xl text-left">
              <AuditForm />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-center text-[1.8rem] font-semibold tracking-[-0.02em]">Ce que l’audit vérifie</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CHECKS.map(([Icon, t, d]) => (
              <div key={t} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
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
                <div key={t as string} className="flex gap-3 rounded-2xl bg-canvas p-5">
                  <I className="mt-0.5 size-5 shrink-0 text-electric-600" />
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
          <div className="relative isolate mx-auto grid max-w-6xl items-center gap-8 overflow-hidden rounded-[2rem] bg-night-900 p-8 text-white sm:p-12 lg:grid-cols-[1.2fr_1fr]">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-electric-300 uppercase">Agences et indépendants</p>
              <h2 className="font-display mt-3 text-[1.7rem] leading-tight font-semibold tracking-[-0.02em]">Ouvrez la conversation avec un diagnostic, plutôt qu’une promesse.</h2>
              <p className="mt-4 text-slate-300">Pro Spectre trouve les entreprises de votre zone dont le site a besoin de vous, rédige le message d’approche et génère le rapport à joindre. Le Radar vous signale chaque matin les nouvelles créations et cessions.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/inscription" className={buttonClass('accent', 'lg')}>
                  Essayer gratuitement
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/#radar" className="inline-flex h-12 items-center rounded-lg border border-white/20 px-6 text-[15px] font-semibold hover:bg-white/10">
                  Découvrir le Radar
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Send className="size-4 text-electric-300" />
                Exemple d’approche (entreprise fictive)
              </p>
              <p className="mt-3 leading-relaxed text-slate-300">« Bonjour, en préparant notre échange j’ai fait analyser le site du Bistrot Exemple : il n’est pas encore en HTTPS et s’affiche mal sur mobile. Le rapport détaillé est ici : [lien du rapport]. Je peux vous montrer en 15 minutes comment corriger ces deux points. »</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
          <h2 className="font-display text-[1.6rem] font-semibold tracking-[-0.02em]">Questions fréquentes</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-line bg-white px-5 py-4 open:shadow-card [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </main>
      <SiteFooter />
    </>
  );
}
