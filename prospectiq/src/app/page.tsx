import Link from 'next/link';
import {
  Search, ListChecks, Download, Users, ShieldCheck, Database, Globe, FileText, Check, X, ArrowRight, ArrowUpRight, ArrowDown, Ban, Lock, Cookie,
  FileSearch, Scale, CreditCard, KeyRound, Fingerprint, MapPin, BadgeCheck, Building2, Landmark, Newspaper,
} from 'lucide-react';
import { SiteHeader, SiteFooter, PublicPage } from '@/components/site';
import { DemoSearch } from '@/components/demo-search';
import { HeroVisual } from '@/components/landing/hero-visual';
import { ScoreLab } from '@/components/landing/score-lab';
import { CountUp } from '@/components/landing/count-up';
import { Kicker, MonoTag, DotPill, SectionHead, ctaClass } from '@/components/landing/kit';
import { STATUSES } from '@/lib/status';
import { RadarSection } from '@/components/landing/radar-section';
import { AuditForm } from './outils/audit-site/form';
import { PLANS } from '@/lib/plans';
import { scoreCompany } from '@/lib/scoring';
import { bodaccPulse } from '@/lib/pulse';
import { env } from '@/lib/env';
import type { Company, WebsiteAudit, Signal } from '@/lib/connectors/types';

// Les chiffres BODACC sont rafraîchis au plus toutes les heures.
export const revalidate = 3600;

/** Exemple de démonstration : entreprise FICTIVE, notée par le vrai moteur de score. */
function exampleInput() {
  const now = new Date();
  const created = new Date(now.getFullYear(), now.getMonth() - 7, 12).toISOString().slice(0, 10);
  const company: Company = {
    siren: '000000000', siret: null, name: 'BISTROT EXEMPLE', tradeNames: ['Le Bistrot Exemple'], naf: '56.10A', nafLabel: 'Restauration traditionnelle', section: 'I', sectorId: 'restauration',
    legalForm: 'SAS', category: 'PME', employeesRange: '03', employeesLabel: '6 à 9 salariés', employeesYear: String(now.getFullYear() - 1), createdOn: created, active: true, establishments: 1,
    address: null, postalCode: null, city: 'Ville fictive', department: null, region: null, lat: null, lon: null, localAddress: null, finances: null, directors: [], labels: [], optOut: false, isIndividual: false,
    updatedAt: created, source: { name: 'Exemple', url: '', fetchedAt: now.toISOString() }, demo: true,
  };
  const website: WebsiteAudit = {
    status: 'verified', url: 'http://exemple.invalid', verification: 'Exemple', checkedAt: now.toISOString(), https: false, mobileViewport: false, socials: {}, analytics: [], booking: false, phones: ['00 00 00 00 00'],
    copyrightYear: now.getFullYear() - 4, quality: 30,
    findings: [
      { id: 'no_https', label: 'Le site n’est pas servi en HTTPS (connexion non sécurisée).', severity: 'important', services: ['site_web', 'seo'] },
      { id: 'no_viewport', label: 'Aucune balise d’adaptation mobile (viewport) détectée.', severity: 'important', services: ['site_web'] },
      { id: 'no_booking', label: 'Pas de réservation en ligne détectée.', severity: 'mineur', services: ['site_web', 'crm'] },
      { id: 'no_socials', label: 'Aucun lien vers des réseaux sociaux sur la page d’accueil.', severity: 'mineur', services: ['reseaux_sociaux'] },
    ],
  };
  const signals: Signal[] = [{ id: 'x', label: 'Immatriculation publiée au BODACC', kind: 'opportunity', date: created, source: 'BODACC', verified: true }];
  return { company, website, signals, offer: { services: ['site_web', 'reseaux_sociaux'], sectors: ['restauration'], sizes: [] }, now: now.toISOString() };
}

const SOURCES = [
  { producer: 'Insee', name: 'Répertoire SIRENE', detail: 'Identité, activité, effectif, établissements' },
  { producer: 'INPI', name: 'Registre national des entreprises', detail: 'Dirigeants, forme juridique, comptes publiés' },
  { producer: 'DILA', name: 'BODACC', detail: 'Créations, cessions, modifications, procédures' },
  { producer: 'Etalab', name: 'API Découpage administratif', detail: 'Communes, codes postaux, rayons de recherche' },
];

const TRUST = [
  { icon: FileSearch, title: 'Chaque fait cite sa source', text: 'Registre, annonce légale ou page du site : la fiche entreprise indique d’où vient chaque information et à quelle date.', check: 'Les annonces renvoient au texte publié au BODACC.' },
  { icon: Scale, title: 'Rien n’est inventé', text: 'Une information absente s’affiche « Non renseigné ». Une estimation est toujours étiquetée comme telle, jamais présentée comme un fait.', check: 'Le détail du score indique « Constaté », « Estimé » ou « Non évalué ».' },
  { icon: Fingerprint, title: 'Opposition respectée', text: 'Les entreprises inscrites en opposition au répertoire SIRENE sont exclues de toutes les recherches. Toute personne peut demander l’effacement en ligne.', check: 'Formulaire d’opposition accessible sans compte.' },
  { icon: CreditCard, title: 'Paiement Stripe', text: 'Votre numéro de carte ne transite jamais par nos serveurs. Factures, changement d’offre et résiliation depuis votre espace.', check: 'La page de paiement est hébergée par Stripe.' },
  { icon: KeyRound, title: 'Compte protégé', text: 'Mots de passe hachés (scrypt), session en cookie HttpOnly, protection CSRF, limitation des tentatives, données cloisonnées par organisation.', check: 'Export et suppression du compte en libre-service.' },
  { icon: Cookie, title: 'Aucun pistage', text: 'Un seul cookie : votre session. Ni mesure d’audience, ni publicité, ni police chargée depuis un service tiers.', check: 'Aucun bandeau cookies, car il n’y a rien à accepter.' },
];

const FAQ = [
  ['D’où viennent les données ?', 'Des registres publics officiels : le répertoire SIRENE de l’Insee et le Registre national des entreprises, via l’API Recherche d’entreprises de l’État, et le BODACC pour les annonces légales. Pro Spectre analyse ensuite le site web public de l’entreprise, en respectant ses règles d’accès (robots.txt).'],
  ['Le score est-il une probabilité de signer un client ?', 'Non. Il mesure un potentiel d’opportunité commerciale à partir des données disponibles : besoin détecté, pertinence pour vos services, opportunité digitale, signaux récents et qualité des données. Chaque point est justifié, et un niveau de confiance indique la part du score fondée sur des faits constatés.'],
  ['Que se passe-t-il quand une information manque ?', 'Elle est affichée « Non renseigné ». Pro Spectre ne complète jamais un trou par une supposition présentée comme un fait : une estimation est toujours étiquetée comme telle.'],
  ['Collectez-vous des données personnelles ?', 'Le minimum. Seuls les dirigeants publiés au registre (nom et fonction) et les coordonnées professionnelles affichées publiquement par l’entreprise sont repris. Les entrepreneurs ayant demandé à ne pas être démarchés (mention « opposition » du répertoire SIRENE) sont automatiquement exclus, et toute personne peut demander la suppression de ses données.'],
  ['Analysez-vous Instagram, LinkedIn ou Google ?', 'Pro Spectre détecte les liens vers les réseaux sociaux publiés sur le site de l’entreprise. Il ne collecte pas le contenu des réseaux sociaux, ce que leurs conditions d’utilisation interdisent. La note et les avis Google peuvent être ajoutés si l’instance est connectée à l’API officielle Google Places.'],
  ['Qu’est-ce qu’un « prospect » dans les quotas ?', 'Une entreprise dont vous lancez l’analyse complète, comptée une seule fois par mois. Les recherches, l’affichage des résultats et la relance d’une analyse déjà faite sont illimités.'],
  ['Puis-je résilier à tout moment ?', 'Oui, sans engagement, depuis la page Abonnement. Votre offre reste active jusqu’à la fin de la période payée, puis votre compte repasse en offre Découverte gratuite.'],
  ['Comment fonctionne le Radar ?', 'Chaque matin, Pro Spectre lit les annonces officielles du BODACC publiées dans les zones de vos alertes (créations, immatriculations, cessions, modifications), vérifie chaque entreprise dans le répertoire SIRENE (secteur, activité, opposition au démarchage) et vous signale celles qui correspondent. Il surveille aussi les entreprises de votre CRM : changement de dirigeant, déménagement, procédure collective. Vous recevez un résumé par e-mail, chaque jour ou chaque semaine.'],
  ['Puis-je surveiller mes clients ?', 'Oui. Ajoutez-les au CRM avec le statut « Client » : si une procédure collective est publiée à leur sujet, le Radar vous prévient, ce qui vous permet de sécuriser les factures en cours.'],
  ['Les messages sont-ils envoyés automatiquement ?', 'Non. Pro Spectre rédige, vous relisez et envoyez depuis votre propre messagerie. Vous restez responsable du respect des règles de prospection (droit d’opposition, mention de désinscription en e-mail).'],
];

// Titre : l'action, puis les événements des registres officiels que Pro Spectre détecte (BODACC).
const HEADLINE = 'Contactez les entreprises au moment où elles'.split(' ');
const HEADLINE_SIGNALS = ['ouvrent.', 'sont rachetées.', 'changent de dirigeant.', 'déménagent.'];

const fmtDay = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null);

const SOURCE_ICONS = [
  { icon: Building2, tint: 'from-violet-500 to-violet-700' },
  { icon: Landmark, tint: 'from-indigo-500 to-indigo-700' },
  { icon: Newspaper, tint: 'from-sky-500 to-cyan-600' },
  { icon: MapPin, tint: 'from-emerald-500 to-teal-600' },
];

/** Carte claire des pages publiques : blanche, liseré dégradé, ombre flottante. */
const card = 'hairline rounded-[28px] border border-white bg-white shadow-float ring-1 ring-night-900/[0.05]';

export default async function Home() {
  const input = exampleInput();
  const example = scoreCompany({ ...input, now: new Date(input.now) });
  const pulse = await bodaccPulse();
  const contactEmail = env.legal.email;
  const base = env.appUrl.replace(/\/$/, '');
  // Données structurées : éditeur, logiciel et offres réelles, FAQ. Aucune note ni avis (il n'y en a pas).
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Pro Spectre', url: base, logo: `${base}/icon-192.png`, ...(contactEmail ? { email: contactEmail } : {}) },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Pro Spectre',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'fr-FR',
      description: 'Prospection B2B à partir des registres officiels français : recherche d’entreprises, score explicable, Radar quotidien des annonces légales, messages et CRM.',
      offers: Object.values(PLANS).map((p) => ({ '@type': 'Offer', name: p.name, price: p.price, priceCurrency: 'EUR', description: p.audience })),
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];

  return (
    <PublicPage>
      <SiteHeader />
      <main id="contenu" className="overflow-x-clip">
        {/* ------------------------------------------------------------ Hero */}
        <section className="relative isolate px-4 pt-14 sm:px-6 lg:pt-20">
          <div className="halo-duo pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[44rem]" aria-hidden="true" />
          <div className="stagger mx-auto max-w-4xl text-center">
            <div className="flex justify-center">
              {pulse ? (
                <a href="#pouls" className="group inline-flex max-w-full items-center gap-2.5 rounded-2xl border border-white bg-white/85 px-3.5 py-2 text-left text-[12.5px] leading-snug sm:rounded-full sm:py-1.5 sm:text-[13px] text-slate-600 shadow-float ring-1 ring-night-900/[0.05] transition-colors hover:text-night-900">
                  <span className="animate-pulse-dot size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span>
                    <span className="font-mono text-[11px] font-medium tracking-[0.1em] text-night-900 uppercase">BODACC, 7 derniers jours :</span>{' '}
                    <b className="font-semibold text-night-900 tabular-nums">{pulse.creations.toLocaleString('fr-FR')}</b> créations et immatriculations publiées
                  </span>
                  <ArrowDown className="size-3.5 shrink-0 text-brand-violet transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
                </a>
              ) : (
                <DotPill>Données SIRENE, RNE et BODACC</DotPill>
              )}
            </div>
            <h1 className="font-display mt-8 text-[2.45rem] leading-[1.06] font-semibold tracking-[-0.05em] text-night-900 sm:text-[3.6rem] lg:text-[4.3rem]">
              <span className="block text-balance">
                {HEADLINE.map((w, i) => (
                  <span key={i}>
                    <span className="word-rise" style={{ animationDelay: `${0.12 + i * 0.07}s` }}>
                      {w}
                    </span>{' '}
                  </span>
                ))}
              </span>
              {/* Les vrais signaux repérés dans les annonces officielles, l'un après l'autre */}
              <span className="word-cycle mt-1" aria-hidden="true">
                {HEADLINE_SIGNALS.map((w) => (
                  <span key={w} className="signal-word text-brand">
                    {w}
                  </span>
                ))}
              </span>
              <span className="sr-only">ouvrent, sont rachetées, changent de dirigeant ou déménagent.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-[17px] leading-relaxed text-pretty text-slate-600 sm:text-[19px]">Identifiez les entreprises à fort potentiel commercial grâce à l’analyse intelligente de leurs activités et de leur présence digitale.</p>
            <div className="mx-auto mt-9 max-w-2xl">
              <DemoSearch />
            </div>
            <p className="mt-6 text-sm text-slate-500">
              ou{' '}
              <Link href="/outils/audit-site" className="font-medium text-night-900 underline decoration-night-900/25 underline-offset-4 transition-colors hover:decoration-brand-violet">
                auditez gratuitement le site d’un prospect
              </Link>{' '}
              · offre Découverte gratuite, sans carte bancaire
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl text-center">
            <p className="text-sm text-slate-500">Construit sur des sources publiques que vous pouvez vérifier</p>
            <ul className="mt-5 flex flex-wrap justify-center gap-3">
              {SOURCES.map((src, i) => {
                const { icon: Icon, tint } = SOURCE_ICONS[i];
                return (
                  <li key={src.name} className="flex items-center gap-3 rounded-full border border-white bg-white/85 py-1.5 pr-5 pl-1.5 text-left shadow-float ring-1 ring-night-900/[0.05]" title={src.detail}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${tint} text-white ring-2 ring-white`}>
                      <Icon className="size-4" />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-sm font-semibold text-night-900">{src.name}</span>
                      <span className="block font-mono text-[10.5px] tracking-[0.08em] text-slate-500 uppercase">{src.producer}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mx-auto mt-16 max-w-6xl">
            <HeroVisual score={example} />
          </div>
        </section>

        {/* ------------------------------------------------- Pouls BODACC */}
        <section id="pouls" className="mx-auto max-w-6xl scroll-mt-28 px-4 pt-16 sm:px-6">
          <div className="reveal ring-duo overflow-hidden rounded-[28px] shadow-float">
            {pulse ? (
              <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[1fr_2.6fr]">
                <div className="border-b border-line bg-gradient-to-br from-violet-50/80 to-white p-6 lg:border-r lg:border-b-0">
                  <p className="flex items-center gap-2 font-mono text-[11.5px] font-medium tracking-[0.14em] text-night-900 uppercase">
                    <span className="animate-pulse-dot size-2 rounded-full bg-emerald-500" />
                    En direct · BODACC
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">Annonces légales publiées ces 7 derniers jours. Autant d’entreprises qui changent, et d’occasions de les contacter au bon moment.</p>
                  <p className="mt-3 text-xs text-slate-500">
                    Source :{' '}
                    <a href={pulse.sourceUrl} className="font-medium text-brand-violet hover:underline" rel="noopener">
                      DILA, bodacc.fr
                    </a>
                    {pulse.lastPublication && <> · dernière parution le {fmtDay(pulse.lastPublication)}</>}
                  </p>
                </div>
                <dl className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
                  {[
                    { n: pulse.creations, label: 'Créations', hint: 'Identité, site, outils : tout est à construire.', color: '#8b5cf6' },
                    { n: pulse.sales, label: 'Ventes et cessions', hint: 'Un nouveau propriétaire revoit souvent ses prestataires.', color: '#6366f1' },
                    { n: pulse.changes, label: 'Modifications', hint: 'Dirigeant, nom, adresse ou activité qui change.', color: '#06b6d4' },
                    { n: pulse.insolvencies, label: 'Procédures', hint: 'Procédures collectives : signalées et pénalisées dans le score.', color: '#e11d48' },
                  ].map(({ n, label, hint, color }) => (
                    <div key={label} className="p-5 sm:p-6">
                      <dt className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                        <span className="size-2 rounded-full" style={{ background: color }} />
                        {label}
                      </dt>
                      <dd className="font-display mt-2 text-[2rem] leading-none font-semibold tracking-[-0.05em] tabular-nums text-night-900">
                        <CountUp value={n} />
                      </dd>
                      <dd className="mt-2 text-xs leading-snug text-slate-500">{hint}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4 p-6">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-4 shrink-0 text-brand-violet" />
                  Créations, cessions, changements de dirigeant : Pro Spectre suit les annonces légales du BODACC pour vous signaler le bon moment.
                </p>
                <a href="https://www.bodacc.fr/" className="text-sm font-semibold text-brand-violet hover:underline" rel="noopener">
                  bodacc.fr
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------- Radar */}
        <RadarSection />

        {/* ------------------------------------------------ Comment ça marche */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHead kicker="méthode" title="De la liste brute" accent="au rendez-vous." center>
            Pro Spectre fait le travail de recherche et de qualification. <b>Vous gardez la main sur le contact.</b>
          </SectionHead>
          <ol className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
            {[
              {
                n: '1.', title: 'Ciblez.', text: 'Zone, secteur, taille, ancienneté, signaux : Pro Spectre interroge le registre officiel et écarte les entreprises fermées ou opposées à la prospection.',
                visual: (
                  <div className="flex flex-wrap gap-1.5 text-[11.5px] font-medium">
                    {['Restauration', 'Lyon 2e + 5 km', 'Créée il y a moins de 2 ans', '6 à 49 salariés'].map((c) => (
                      <span key={c} className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-violet-700">{c}</span>
                    ))}
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-rose-700"><Ban className="size-3" /> Opposition SIRENE exclue</span>
                  </div>
                ),
              },
              {
                n: '2.', title: 'Qualifiez.', text: 'Site web, annonces légales, maturité digitale : le score explicable vous dit qui contacter en premier, et pourquoi.',
                visual: (
                  <div className="space-y-2.5 font-mono text-[11.5px]">
                    {[86, 71, 54].map((v, i) => (
                      <div key={v} className="flex items-center gap-3">
                        <span className="w-20 text-slate-500">prospect {String.fromCharCode(97 + i)}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <span className="block h-full rounded-full" style={{ width: `${v}%`, background: i === 0 ? '#7c3aed' : i === 1 ? '#6366f1' : '#94a3b8' }} />
                        </span>
                        <b className={`w-6 text-right tabular-nums ${i === 0 ? 'text-brand-violet' : 'text-night-800'}`}>{v}</b>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                n: '3.', title: 'Contactez.', text: 'Un message qui s’appuie sur un fait réel, puis un suivi dans le CRM jusqu’au rendez-vous.',
                visual: (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold whitespace-nowrap">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">À contacter</span>
                    <ArrowRight className="size-3 text-slate-300" />
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">Contacté</span>
                    <ArrowRight className="size-3 text-slate-300" />
                    <span className="rounded-full bg-violet-600 px-2.5 py-1 text-white">Rendez-vous</span>
                  </div>
                ),
              },
            ].map(({ n, title, text, visual }) => (
              <li key={n} className={`reveal ${card} flex flex-col p-7`}>
                <div className="flex min-h-28 items-center rounded-2xl border border-line bg-paper/70 p-4">{visual}</div>
                <span className="mt-7 grid size-14 place-items-center rounded-full bg-violet-50 font-mono text-xl font-medium text-brand-violet ring-1 ring-violet-200">{n}</span>
                <h3 className="font-display mt-5 text-[1.6rem] leading-tight font-semibold tracking-[-0.04em]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------------ Fonctionnalités */}
        <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-6 lg:grid-cols-[1.2fr_1fr]">
            <SectionHead kicker="fonctionnalités" title="Tout le cycle de prospection," accent="au même endroit." />
            <p className="text-[17px] leading-relaxed text-slate-600 lg:pb-2">De la recherche d’entreprises au rendez-vous obtenu, sans jongler entre un annuaire, un tableur et une messagerie.</p>
          </div>

          <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
            <article className={`reveal ${card} card-tint grid gap-6 p-7 sm:grid-cols-[1fr_1fr] lg:col-span-2`}>
              <div>
                <MonoTag>Analyse automatique</MonoTag>
                <h3 className="font-display mt-4 text-[1.6rem] leading-tight font-semibold tracking-[-0.04em]">Le site, les annonces, les faits.</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Site web retrouvé et rattaché par le SIREN, audit technique, annonces légales récentes. Les constats alimentent le score et les messages.</p>
              </div>
              <ul className="space-y-2.5 self-center rounded-2xl border border-line bg-white p-4 text-sm shadow-float">
                {[
                  ['Site rattaché par le SIREN', true],
                  ['Connexion sécurisée (HTTPS)', false],
                  ['Adapté au mobile', false],
                  ['Référencement de base', true],
                  ['Réservation en ligne', false],
                  ['Contenu récent', true],
                ].map(([l, ok]) => (
                  <li key={l as string} className="flex items-center justify-between gap-3">
                    <span className="text-slate-700">{l as string}</span>
                    <span className={`grid size-5 place-items-center rounded-full ${ok ? 'bg-violet-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                      {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                    </span>
                  </li>
                ))}
                <li className="pt-1 text-[11px] text-slate-400">Exemple de constats sur une entreprise fictive</li>
              </ul>
            </article>

            <article className="reveal island relative flex flex-col overflow-hidden rounded-[28px] p-7 text-white shadow-pop">
              <MonoTag dark>Score explicable</MonoTag>
              <h3 className="font-display mt-4 text-[1.6rem] leading-tight font-semibold tracking-[-0.04em]">Une note, et ses raisons.</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-300">De 0 à 100, détaillée critère par critère, avec un niveau de confiance. Les pondérations se règlent selon votre activité.</p>
              <a href="#score" className={`${ctaClass('light')} mt-6 self-start`}>
                Essayer le calcul
                <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
              </a>
            </article>

            <article className={`reveal ${card} flex flex-col p-7`}>
              <MonoTag>Messages</MonoTag>
              <h3 className="font-display mt-4 text-[1.4rem] leading-tight font-semibold tracking-[-0.04em]">Une accroche fondée sur un fait.</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-600">E-mail, LinkedIn, Instagram ou message court, en 5 tons. Jamais une relation inventée.</p>
              <div className="mt-5 flex flex-wrap gap-1.5 text-[11.5px] font-medium">
                {['E-mail', 'LinkedIn', 'Instagram', 'Message court'].map((c) => (
                  <span key={c} className="rounded-full border border-line bg-white px-2.5 py-1 text-slate-600">{c}</span>
                ))}
              </div>
            </article>

            <article className={`reveal ${card} grid gap-6 p-7 sm:grid-cols-[0.9fr_1.1fr] lg:col-span-2`}>
              <div>
                <MonoTag>Mini-CRM</MonoTag>
                <h3 className="font-display mt-4 text-[1.4rem] leading-tight font-semibold tracking-[-0.04em]">Chaque entreprise, une seule fois.</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Sept statuts, notes, historique, date de relance, vue tableau et Kanban.</p>
              </div>
              <div className="self-center">
                <p className="text-xs font-medium text-slate-500">Les sept statuts du suivi</p>
                <ol className="mt-3 flex flex-wrap gap-1.5 text-[12.5px] font-medium">
                  {STATUSES.map((st, i) => (
                    <li key={st.id} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${st.id === 'rdv' || st.id === 'client' ? 'border-violet-200 bg-violet-50 text-violet-700' : st.id === 'non_interesse' ? 'border-line bg-white text-slate-500' : 'border-line bg-white text-night-800'}`}>
                      <span className="font-mono text-[10.5px] text-slate-400">{i + 1}</span>
                      {st.label}
                    </li>
                  ))}
                </ol>
              </div>
            </article>

            {[
              { icon: Search, tag: 'Recherche', title: 'Tous les filtres se combinent.', text: 'Région, département, ville, code postal ou rayon ; secteur, mots-clés, taille, ancienneté, signaux.' },
              { icon: ListChecks, tag: 'Listes', title: 'Relancez, comparez, regroupez.', text: 'Relancez une recherche pour voir les nouvelles entreprises, comparez deux recherches, classez par campagne.' },
              { icon: Users, tag: 'Équipe', title: 'Jusqu’à 5 utilisateurs.', text: 'Export CSV de votre CRM. Un même portefeuille, les mêmes listes et les mêmes paramètres pour toute l’équipe.' },
            ].map(({ icon: Icon, tag, title, text }) => (
              <article key={title} className={`reveal ${card} p-7`}>
                <div className="flex items-center justify-between">
                  <MonoTag>{tag}</MonoTag>
                  <span className="grid size-9 place-items-center rounded-full bg-violet-50 text-brand-violet ring-1 ring-violet-100">
                    <Icon className="size-4" />
                  </span>
                </div>
                <h3 className="font-display mt-4 text-[1.3rem] leading-tight font-semibold tracking-[-0.04em]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- Score */}
        <section id="score" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHead kicker="score" title="Un score que vous pouvez expliquer," accent="et régler.">
              Cinq critères pondérés (30, 25, 20, 15 et 10 % par défaut), ajustables selon votre activité. <b>Chaque point attribué est justifié</b> et étiqueté « constaté » ou « estimé ».
            </SectionHead>
            <p className="flex items-center gap-2 rounded-full border border-white bg-white/85 px-4 py-2 font-mono text-[11px] tracking-[0.08em] text-night-800 uppercase shadow-float">
              <BadgeCheck className="size-4 text-emerald-600" />
              Calcul identique à l’application
            </p>
          </div>
          <div className="reveal mt-12">
            <ScoreLab input={input} />
          </div>
        </section>

        {/* ---------------------------------------------------- Confiance */}
        <section id="confiance" className="px-3 sm:px-4">
          <div className="island relative isolate mx-auto max-w-[90rem] overflow-hidden rounded-[2.5rem] px-4 py-20 text-white sm:rounded-[3rem] sm:px-6 lg:py-28">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
            <div className="mx-auto max-w-6xl">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <SectionHead kicker="confiance" title="La confiance," accent="ça se vérifie." dark>
                  Ce que Pro Spectre fait des données, ce qu’il s’interdit, et comment le contrôler vous-même.
                </SectionHead>
                <Link href="/confiance" className={ctaClass('light')}>
                  Centre de confiance
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
                </Link>
              </div>

              <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 lg:grid-cols-3">
                {TRUST.map(({ icon: Icon, title, text, check }) => (
                  <article key={title} className="reveal flex flex-col rounded-[24px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur transition-colors hover:border-violet-300/30 hover:bg-white/[0.07]">
                    <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/30 text-violet-100 ring-1 ring-white/15">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="font-display mt-5 text-lg font-semibold tracking-[-0.03em]">{title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">{text}</p>
                    <p className="mt-5 flex items-start gap-2 border-t border-white/10 pt-4 text-xs text-emerald-200/90">
                      <Check className="mt-px size-3.5 shrink-0" strokeWidth={3} />
                      {check}
                    </p>
                  </article>
                ))}
              </div>

              <div className="reveal mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 rounded-[24px] border border-dashed border-white/20 p-6 md:grid-cols-[auto_1fr] md:items-center md:p-8">
                <div>
                  <MonoTag dark>Interdits</MonoTag>
                  <p className="font-display mt-3 text-xl font-semibold tracking-[-0.03em]">
                    Ce que Pro Spectre
                    <br className="hidden md:block" /> ne fait pas
                  </p>
                </div>
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-2.5 text-sm text-slate-300 sm:grid-cols-2">
                  {[
                    'Aucune collecte du contenu des réseaux sociaux',
                    'Aucun contournement de protection ; robots.txt respecté',
                    'Aucune entreprise en opposition SIRENE dans les résultats',
                    'Aucun message prétendant un échange qui n’a pas eu lieu',
                    'Aucune revente de données à des tiers',
                    'Aucun envoi automatique de messages en votre nom',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <X className="mt-0.5 size-4 shrink-0 text-rose-300" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Audit gratuit */}
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <div className="reveal grid grid-cols-[minmax(0,1fr)] items-center gap-10 rounded-[28px] border border-dashed border-violet-300/80 bg-white/55 p-6 backdrop-blur sm:p-10 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <MonoTag>Outil gratuit, sans inscription</MonoTag>
              <h2 className="font-display mt-4 text-[2rem] leading-[1.05] font-semibold tracking-[-0.045em] sm:text-[2.5rem]">
                Auditez n’importe quel site <span className="text-brand">en 30 secondes.</span>
              </h2>
              <p className="mt-4 text-slate-600">Sécurité, mobile, référencement, réseaux sociaux, fraîcheur : un rapport clair, avec les actions à mener, à envoyer à votre prospect.</p>
            </div>
            <AuditForm />
          </div>
        </section>

        {/* ------------------------------------------------------ Tarifs */}
        <section id="tarifs" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHead kicker="tarifs" title="Des tarifs simples," accent="sans engagement." center>
            Commencez gratuitement. <b>Passez à une offre payante quand la prospection devient régulière.</b>
          </SectionHead>
          <div className="mt-14 grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4">
            {Object.values(PLANS).map((p) => {
              const featured = p.id === 'pro';
              return (
                <div key={p.id} className={`reveal flex flex-col rounded-[24px] p-7 ${featured ? 'island text-white shadow-[0_30px_70px_-30px_rgba(124,58,237,0.7)] ring-1 ring-violet-400/40' : 'border border-white bg-white shadow-float ring-1 ring-night-900/[0.05]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-xl font-semibold tracking-[-0.04em]">{p.name}</h3>
                    {featured && <span className="rounded-full bg-brand-violet px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.1em] text-white">RECOMMANDÉ</span>}
                  </div>
                  <p className={`mt-1.5 text-sm ${featured ? 'text-slate-300' : 'text-slate-500'}`}>{p.audience}</p>
                  <p className="mt-6 flex items-baseline gap-1.5">
                    <span className="font-display text-[2.6rem] leading-none font-semibold tracking-[-0.05em] tabular-nums">{p.price} €</span>
                    <span className={`text-sm ${featured ? 'text-slate-400' : 'text-slate-500'}`}>{p.price ? 'HT / mois' : 'pour toujours'}</span>
                  </p>
                  <Link href="/inscription" className={`${ctaClass(p.price ? 'brand' : 'outline')} mt-6 w-full px-3`}>
                    {p.price ? `Choisir ${p.name}` : 'Commencer gratuitement'}
                    {p.price > 0 && <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />}
                  </Link>
                  <ul className={`mt-6 flex-1 space-y-3 rounded-2xl p-4 text-sm ${featured ? 'bg-white/[0.06] text-slate-200' : 'bg-paper/80 text-slate-700'}`}>
                    {p.pitch.map((x) => (
                      <li key={x} className="flex gap-2.5">
                        <Check className={`mt-0.5 size-4 shrink-0 ${featured ? 'text-violet-300' : 'text-brand-violet'}`} strokeWidth={2.5} />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="reveal mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-slate-600">
            {[
              [ShieldCheck, 'Offre gratuite sans carte bancaire'],
              [Lock, 'Paiement sécurisé par Stripe'],
              [FileText, 'Factures téléchargeables'],
              [CreditCard, 'Résiliation en ligne, sans engagement'],
            ].map(([Icon, t]) => {
              const I = Icon as typeof Lock;
              return (
                <p key={t as string} className="flex items-center gap-2">
                  <I className="size-4 text-brand-violet" />
                  {t as string}
                </p>
              );
            })}
          </div>
        </section>

        {/* --------------------------------------------------------- FAQ */}
        <section id="faq" className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-6xl gap-12 px-4 pb-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHead kicker="faq" title="Vos questions," accent="nos réponses.">
              La version courte de tout ce qui précède.
            </SectionHead>
            <div className="mt-8 rounded-2xl border border-white bg-white/70 p-5 text-sm shadow-float">
              <p className="font-semibold">Une autre question ?</p>
              <p className="mt-1 text-slate-600">
                {contactEmail ? (
                  <>
                    Écrivez-nous à{' '}
                    <a href={`mailto:${contactEmail}`} className="font-semibold text-brand-violet hover:underline">
                      {contactEmail}
                    </a>
                    .
                  </>
                ) : (
                  <>
                    Le{' '}
                    <Link href="/confiance" className="font-semibold text-brand-violet hover:underline">
                      centre de confiance
                    </Link>{' '}
                    détaille les sources, la sécurité et le traitement des données.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-white bg-white px-5 py-4 shadow-float ring-1 ring-night-900/[0.05] transition-shadow open:ring-violet-200 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-night-900">
                  {q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] border-night-900/80 text-night-900 transition-transform duration-200 group-open:rotate-180 group-open:border-brand-violet group-open:bg-brand-violet group-open:text-white" aria-hidden="true">
                    <ArrowDown className="size-3.5" strokeWidth={2.5} />
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------- Appel final */}
        <section className="px-3 pb-16 sm:px-4">
          <div
            className="reveal relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] px-6 py-20 text-center text-white sm:px-12 lg:py-24"
            style={{ background: 'radial-gradient(55% 90% at 0% 15%, rgba(124,58,237,0.7), transparent 70%), radial-gradient(55% 90% at 100% 85%, rgba(37,99,235,0.7), transparent 70%), #0a0d24' }}
          >
            <Kicker label="démarrer" dark center />
            <h2 className="font-display mx-auto mt-6 max-w-4xl text-[2.2rem] leading-[1.04] font-semibold tracking-[-0.045em] text-balance sm:text-[3.4rem]">
              <span className="block text-white/55">Vos prochains clients sont déjà immatriculés.</span>
              <span className="block">Pro Spectre les trouve.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-slate-300">Trouvez-les, comprenez leurs besoins, contactez-les avec un vrai motif.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/inscription" className={ctaClass('light', 'lg')}>
                Trouver mes prospects
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
              </Link>
              <Link href="/connexion" className={ctaClass('outline-dark', 'lg')}>
                Se connecter
              </Link>
            </div>
            <p className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-[11px] tracking-[0.08em] text-slate-400 uppercase">
              <span className="inline-flex items-center gap-1.5"><Database className="size-3.5" /> Données officielles</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> Toute la France</span>
              <span className="inline-flex items-center gap-1.5"><Globe className="size-3.5" /> Aucune installation</span>
              <span className="inline-flex items-center gap-1.5"><Download className="size-3.5" /> Export CSV</span>
            </p>
          </div>
        </section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      </main>
      <SiteFooter />
    </PublicPage>
  );
}
