import Link from 'next/link';
import {
  Search, Radar, Gauge, MessageSquareText, KanbanSquare, ListChecks, Download, Users, ShieldCheck, Database, Globe, FileText, Check, X, ArrowRight, Ban, Lock, Cookie,
  FileSearch, Scale, CreditCard, KeyRound, Fingerprint, Target, Sparkles, Send, MapPin, Activity, BadgeCheck, ScanSearch,
} from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/site';
import { DemoSearch } from '@/components/demo-search';
import { HeroVisual } from '@/components/landing/hero-visual';
import { ScoreLab } from '@/components/landing/score-lab';
import { ScoreRing } from '@/components/landing/score-ring';
import { CountUp } from '@/components/landing/count-up';
import { HeroBeams } from '@/components/landing/hero-beams';
import { BrandStory } from '@/components/landing/brand-story';
import { BrandMark } from '@/components/logo';
import { RadarSection } from '@/components/landing/radar-section';
import { AuditForm } from './outils/audit-site/form';
import { buttonClass } from '@/components/styles';
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

const fmtDay = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null);

function SectionTitle({ eyebrow, title, children, center = false, dark = false }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; center?: boolean; dark?: boolean }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className={`inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase ${dark ? 'text-electric-300' : 'text-electric-600'} ${center ? 'justify-center' : ''}`}>
        <span className="bg-spectrum h-[3px] w-5 rounded-full" />
        {eyebrow}
      </p>
      <h2 className={`font-display mt-4 text-[1.8rem] leading-[1.16] font-semibold tracking-[-0.02em] text-balance sm:text-[2.35rem] ${dark ? 'text-white' : 'text-night-900'}`}>{title}</h2>
      {children && <p className={`mt-4 text-[17px] leading-relaxed text-pretty ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{children}</p>}
    </div>
  );
}

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
    <>
      <SiteHeader dark />
      <main id="contenu" className="overflow-x-clip">
        {/* ------------------------------------------------------------ Hero */}
        <section className="relative isolate overflow-hidden bg-night-950 text-white">
          <div className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
          <HeroBeams />
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[38rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.38),transparent)]" />
          <div className="pointer-events-none absolute right-[-10rem] bottom-[-14rem] -z-10 h-[30rem] w-[40rem] rounded-full bg-[radial-gradient(closest-side,rgba(52,211,153,0.14),transparent)]" />

          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-x-12 gap-y-16 px-4 pt-14 pb-32 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:pt-20 lg:pb-40">
            <div className="stagger">
              <p className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-1 pr-3.5 pl-1 text-xs font-medium text-slate-200">
                <BrandMark size={22} className="rounded-[6px]" />
                <span className="font-display font-semibold tracking-[-0.02em] whitespace-nowrap text-white">Pro Spectre</span>
                <span className="h-3 w-px bg-white/20" />
                <span className="animate-pulse-dot size-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span className="whitespace-nowrap">
                  <span className="max-sm:hidden">Registres officiels </span>SIRENE · RNE · BODACC
                </span>
              </p>
              <h1 className="font-display mt-7 text-[2.3rem] leading-[1.06] font-semibold tracking-[-0.025em] text-balance sm:text-[3.3rem] lg:text-[3.7rem]">
                Les bons prospects. <span className="text-gradient font-serif text-[1.12em] font-normal tracking-[-0.01em] italic">Au bon moment.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-slate-300">Identifiez les entreprises à fort potentiel commercial grâce à l’analyse intelligente de leurs activités et de leur présence digitale.</p>
              <div className="mt-9">
                <DemoSearch />
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
                {['Gratuit, sans carte bancaire', 'Sans engagement', 'Aucune donnée inventée'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="grid size-4 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/outils/audit-site" className="group mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white">
                <ScanSearch className="size-4 text-cyan-300" />
                Ou auditez gratuitement le site d’un prospect
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="lg:pt-14">
              <HeroVisual score={example} />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- Pouls BODACC */}
        <section className="relative z-10 mx-auto -mt-20 max-w-6xl px-4 sm:px-6">
          <div className="reveal overflow-hidden rounded-3xl border border-line bg-white shadow-lift">
            {pulse ? (
              <div className="grid lg:grid-cols-[1fr_2.6fr]">
                <div className="border-b border-line bg-gradient-to-br from-electric-50 to-white p-6 lg:border-r lg:border-b-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-night-900">
                    <span className="animate-pulse-dot size-2 rounded-full bg-emerald-500" />
                    En direct du BODACC
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Annonces légales publiées ces 7 derniers jours. Autant d’entreprises qui changent, et d’occasions de les contacter au bon moment.
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Source : <a href={pulse.sourceUrl} className="font-medium text-electric-700 hover:underline" rel="noopener">DILA, bodacc.fr</a>
                    {pulse.lastPublication && <> · dernière parution le {fmtDay(pulse.lastPublication)}</>}
                  </p>
                </div>
                <dl className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
                  {[
                    { n: pulse.creations, label: 'Créations', hint: 'Identité, site, outils : tout est à construire.', icon: Sparkles, tone: 'text-electric-600 bg-electric-50' },
                    { n: pulse.sales, label: 'Ventes et cessions', hint: 'Un nouveau propriétaire revoit souvent ses prestataires.', icon: KanbanSquare, tone: 'text-emerald-700 bg-emerald-50' },
                    { n: pulse.changes, label: 'Modifications', hint: 'Dirigeant, nom, adresse ou activité qui change.', icon: Activity, tone: 'text-sky-700 bg-sky-50' },
                    { n: pulse.insolvencies, label: 'Procédures', hint: 'Procédures collectives : signalées et pénalisées dans le score.', icon: ShieldCheck, tone: 'text-rose-700 bg-rose-50' },
                  ].map(({ n, label, hint, icon: Icon, tone }) => (
                    <div key={label} className="p-5 sm:p-6">
                      <dt className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                        <span className={`grid size-6 place-items-center rounded-md ${tone}`}>
                          <Icon className="size-3.5" />
                        </span>
                        {label}
                      </dt>
                      <dd className="font-display mt-2 text-[1.65rem] font-semibold tracking-[-0.025em] tabular-nums text-night-900">
                        <CountUp value={n} />
                      </dd>
                      <dd className="mt-1 text-xs leading-snug text-slate-500">{hint}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4 p-6">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-4 text-electric-600" />
                  Créations, cessions, changements de dirigeant : Pro Spectre suit les annonces légales du BODACC pour vous signaler le bon moment.
                </p>
                <a href="https://www.bodacc.fr/" className="text-sm font-semibold text-electric-700 hover:underline" rel="noopener">
                  bodacc.fr
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------ Sources */}
        <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
          <p className="text-center text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">Construit sur des sources publiques que vous pouvez vérifier</p>
          <div className="reveal mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SOURCES.map((s) => (
              <div key={s.name} className="flex items-start gap-3 rounded-2xl border border-line bg-white/70 p-4">
                <span className="grid h-8 min-w-12 place-items-center rounded-lg bg-night-900 px-2 text-[11px] font-bold tracking-wide text-white">{s.producer}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------- Pourquoi ce nom */}
        <BrandStory />

        {/* ------------------------------------------------------- Radar */}
        <RadarSection />

        {/* ------------------------------------------------ Comment ça marche */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionTitle eyebrow="Comment ça marche" title="De la liste brute au rendez-vous, en trois gestes" center>
            Pro Spectre fait le travail de recherche et de qualification. Vous gardez la main sur le contact.
          </SectionTitle>
          <div className="relative mt-14">
          <div className="pointer-events-none absolute top-[3rem] right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-electric-100 via-electric-400 to-emerald-300 lg:block" />
          <ol className="relative grid gap-6 lg:grid-cols-3">
            {[
              {
                n: '01', icon: Target, title: 'Ciblez', text: 'Zone, secteur, taille, ancienneté, signaux : Pro Spectre interroge le registre officiel et écarte les entreprises fermées ou opposées à la prospection.',
                visual: (
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
                    {['Restauration', 'Lyon 2e + 5 km', 'Créée il y a moins de 2 ans', '6 à 49 salariés'].map((c) => (
                      <span key={c} className="rounded-full bg-electric-50 px-2.5 py-1 text-electric-700">{c}</span>
                    ))}
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-rose-700"><Ban className="size-3" /> Opposition SIRENE exclue</span>
                  </div>
                ),
              },
              {
                n: '02', icon: Radar, title: 'Qualifiez', text: 'Site web, annonces légales, maturité digitale : le score explicable vous dit qui contacter en premier, et pourquoi.',
                visual: (
                  <div className="space-y-2">
                    {[86, 71, 54].map((v, i) => (
                      <div key={v} className="flex items-center gap-2.5 text-xs">
                        <span className="w-16 text-slate-500">Prospect {String.fromCharCode(65 + i)}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <span className={`block h-full rounded-full ${i === 0 ? 'bg-electric-500' : i === 1 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${v}%` }} />
                        </span>
                        <b className="w-6 text-right tabular-nums">{v}</b>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                n: '03', icon: Send, title: 'Contactez', text: 'Un message qui s’appuie sur un fait réel, puis un suivi dans le CRM jusqu’au rendez-vous.',
                visual: (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">À contacter</span>
                    <ArrowRight className="size-3 text-slate-300" />
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">Contacté</span>
                    <ArrowRight className="size-3 text-slate-300" />
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Rendez-vous</span>
                  </div>
                ),
              },
            ].map(({ n, icon: Icon, title, text, visual }) => (
              <li key={n} className="reveal relative flex flex-col rounded-3xl border border-line bg-white p-6 shadow-card transition-shadow hover:shadow-lift">
                <div className="flex items-center gap-3">
                  <span className="relative grid size-12 place-items-center rounded-2xl bg-night-900 text-white shadow-lift">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-400">{n}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-slate-600">{text}</p>
                <div className="mt-5 rounded-2xl border border-line bg-canvas/70 p-4">{visual}</div>
              </li>
            ))}
          </ol>
          </div>
        </section>

        {/* ------------------------------------------------ Fonctionnalités */}
        <section id="fonctionnalites" className="relative border-y border-line bg-white py-24">
          <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,#000,transparent_40%)]" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle eyebrow="Fonctionnalités" title="Tout le cycle de prospection, au même endroit">
              De la recherche d’entreprises au rendez-vous obtenu, sans jongler entre un annuaire, un tableur et une messagerie.
            </SectionTitle>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              <article className="reveal group grid gap-6 rounded-3xl border border-line bg-gradient-to-br from-white to-electric-50/60 p-7 shadow-card sm:grid-cols-[1fr_1fr] lg:col-span-2">
                <div>
                  <span className="grid size-11 place-items-center rounded-xl bg-electric-600 text-white shadow-glow">
                    <Radar className="size-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">Analyse automatique</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">Site web retrouvé et rattaché par le SIREN, audit technique, annonces légales récentes. Les constats alimentent le score et les messages.</p>
                </div>
                <ul className="space-y-2 self-center rounded-2xl border border-line bg-white p-4 text-sm shadow-card">
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
                      <span className={`grid size-5 place-items-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                      </span>
                    </li>
                  ))}
                  <li className="pt-1 text-[11px] text-slate-400">Exemple de constats sur une entreprise fictive</li>
                </ul>
              </article>

              <article className="reveal flex flex-col rounded-3xl border border-line bg-night-900 p-7 text-white shadow-lift">
                <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-electric-300">
                  <Gauge className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">Score explicable</h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-slate-300">Une note de 0 à 100, détaillée critère par critère, avec ses raisons et un niveau de confiance.</p>
                <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white p-3 text-night-900">
                  <ScoreRing value={example.total} category={example.category.id} size={64} stroke={6} />
                  <div className="text-xs">
                    <p className="font-semibold">{example.category.label}</p>
                    <p className="text-slate-500">Confiance {example.confidence}</p>
                  </div>
                </div>
              </article>

              <article className="reveal flex flex-col rounded-3xl border border-line bg-white p-7 shadow-card">
                <span className="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
                  <MessageSquareText className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">Messages personnalisés</h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-slate-600">E-mail, LinkedIn, Instagram ou message court, en 5 tons. L’accroche cite une observation réelle, jamais une relation inventée.</p>
                <div className="mt-5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  {['E-mail', 'LinkedIn', 'Instagram', 'Message court'].map((c) => (
                    <span key={c} className="rounded-full border border-line px-2.5 py-1 text-slate-600">{c}</span>
                  ))}
                </div>
              </article>

              <article className="reveal grid gap-6 rounded-3xl border border-line bg-white p-7 shadow-card sm:grid-cols-[0.9fr_1.1fr] lg:col-span-2">
                <div>
                  <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                    <KanbanSquare className="size-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">Mini-CRM intégré</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">Sept statuts, notes, historique, date de relance, vue tableau et Kanban. Chaque entreprise n’y figure qu’une fois.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 self-center text-[11px]">
                  {[
                    ['À contacter', 'bg-slate-400', 3],
                    ['Contacté', 'bg-sky-500', 2],
                    ['Rendez-vous', 'bg-emerald-500', 1],
                  ].map(([label, dot, count]) => (
                    <div key={label as string} className="rounded-xl bg-canvas p-2">
                      <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-600">
                        <span className={`size-1.5 rounded-full ${dot}`} />
                        {label as string}
                      </p>
                      <div className="space-y-1.5">
                        {Array.from({ length: count as number }).map((_, i) => (
                          <div key={i} className="rounded-lg border border-line bg-white p-2 shadow-sm">
                            <span className="block h-1.5 w-3/4 rounded-full bg-slate-200" />
                            <span className="mt-1.5 block h-1.5 w-1/2 rounded-full bg-slate-100" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              {[
                { icon: Search, title: 'Recherche avancée', text: 'Région, département, ville, code postal ou rayon ; secteur, mots-clés, taille, ancienneté, signaux. Tous les filtres se combinent.' },
                { icon: ListChecks, title: 'Listes et recherches sauvegardées', text: 'Relancez une recherche pour voir les nouvelles entreprises, comparez deux recherches, regroupez vos prospects par campagne.' },
                { icon: Users, title: 'Export et travail en équipe', text: 'Export CSV de votre CRM. Jusqu’à 5 utilisateurs partagent le même portefeuille, les mêmes listes et les mêmes paramètres.' },
              ].map(({ icon: Icon, title, text }) => (
                <article key={title} className="reveal rounded-3xl border border-line bg-white p-7 shadow-card transition-shadow hover:shadow-lift">
                  <span className="grid size-11 place-items-center rounded-xl bg-electric-50 text-electric-600">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- Score */}
        <section id="score" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionTitle eyebrow="Score explicable" title="Un score que vous pouvez expliquer, et régler">
              Cinq critères pondérés (30, 25, 20, 15 et 10 % par défaut), ajustables selon votre activité. Chaque point attribué est justifié et étiqueté « constaté » ou « estimé ».
            </SectionTitle>
            <p className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-card">
              <BadgeCheck className="size-4 text-emerald-600" />
              Calcul identique à celui de l’application
            </p>
          </div>
          <div className="reveal mt-12">
            <ScoreLab input={input} />
          </div>
        </section>

        {/* ---------------------------------------------------- Confiance */}
        <section id="confiance" className="relative isolate overflow-hidden bg-night-950 py-24 text-white">
          <div className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
          <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.3),transparent)]" />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionTitle eyebrow="Confiance" title={<>La confiance, <span className="text-gradient font-serif font-normal italic">ça se vérifie.</span></>} dark>
                Ce que Pro Spectre fait des données, ce qu’il s’interdit, et comment le contrôler vous-même.
              </SectionTitle>
              <Link href="/confiance" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                Centre de confiance
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {TRUST.map(({ icon: Icon, title, text, check }) => (
                <article key={title} className="reveal flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.07]">
                  <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-electric-500/30 to-emerald-400/20 text-electric-200 ring-1 ring-white/10">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">{text}</p>
                  <p className="mt-5 flex items-start gap-2 border-t border-white/10 pt-4 text-xs text-emerald-200/90">
                    <Check className="mt-px size-3.5 shrink-0" strokeWidth={3} />
                    {check}
                  </p>
                </article>
              ))}
            </div>

            <div className="reveal mt-6 grid gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-[auto_1fr] md:items-center md:p-8">
              <p className="flex items-center gap-3 text-lg font-semibold">
                <span className="grid size-10 place-items-center rounded-xl bg-rose-500/15 text-rose-300">
                  <Ban className="size-5" />
                </span>
                Ce que Pro Spectre
                <br className="hidden md:block" /> ne fait pas
              </p>
              <ul className="grid gap-x-8 gap-y-2.5 text-sm text-slate-300 sm:grid-cols-2">
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
        </section>

        {/* ------------------------------------------------ Audit gratuit */}
        <section className="px-4 pt-24 sm:px-6">
          <div className="reveal relative isolate mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2rem] bg-night-900 p-7 text-white sm:p-10 lg:grid-cols-[1fr_1.15fr]">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
            <div className="pointer-events-none absolute -right-20 -bottom-24 -z-10 h-72 w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(6,182,212,0.35),transparent)]" />
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-300/20">
                <ScanSearch className="size-3.5" /> Outil gratuit, sans inscription
              </p>
              <h2 className="font-display mt-4 text-[1.7rem] leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[2.1rem]">Auditez n’importe quel site en 30 secondes.</h2>
              <p className="mt-3 text-slate-300">Sécurité, mobile, référencement, réseaux sociaux, fraîcheur : un rapport clair, avec les actions à mener, à envoyer à votre prospect.</p>
            </div>
            <AuditForm />
          </div>
        </section>

        {/* ------------------------------------------------------ Tarifs */}
        <section id="tarifs" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionTitle eyebrow="Tarifs" title="Des tarifs simples, sans engagement" center>
            Commencez gratuitement. Passez à une offre payante quand la prospection devient régulière.
          </SectionTitle>
          <div className="mt-14 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4">
            {Object.values(PLANS).map((p) => {
              const featured = p.id === 'pro';
              return (
                <div key={p.id} className={`reveal flex flex-col rounded-3xl p-7 ${featured ? 'ring-gradient text-white shadow-glow lg:-my-3 lg:py-10' : 'border border-line bg-white shadow-card'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold tracking-[-0.03em]">{p.name}</h3>
                    {featured && <span className="rounded-full bg-electric-500/20 px-2.5 py-0.5 text-xs font-semibold text-electric-200 ring-1 ring-electric-400/40">Recommandé</span>}
                  </div>
                  <p className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-display text-[2.5rem] font-semibold tracking-[-0.03em] tabular-nums">{p.price} €</span>
                    <span className={`text-sm ${featured ? 'text-slate-400' : 'text-slate-500'}`}>{p.price ? 'HT / mois' : 'pour toujours'}</span>
                  </p>
                  <p className={`mt-1 text-sm ${featured ? 'text-slate-300' : 'text-slate-500'}`}>{p.audience}</p>
                  <ul className={`mt-6 flex-1 space-y-3 border-t pt-6 text-sm ${featured ? 'border-white/10 text-slate-200' : 'border-line text-slate-700'}`}>
                    {p.pitch.map((x) => (
                      <li key={x} className="flex gap-2.5">
                        <Check className={`mt-0.5 size-4 shrink-0 ${featured ? 'text-emerald-300' : 'text-electric-600'}`} strokeWidth={2.5} />
                        {x}
                      </li>
                    ))}
                  </ul>
                  <Link href="/inscription" className={`${buttonClass(featured ? 'accent' : p.price ? 'primary' : 'secondary', 'md')} mt-7 w-full`}>
                    {p.price ? `Choisir ${p.name}` : 'Commencer gratuitement'}
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="reveal mt-10 grid gap-3 rounded-3xl border border-line bg-white p-5 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [ShieldCheck, 'Offre gratuite sans carte bancaire'],
              [Lock, 'Paiement sécurisé par Stripe'],
              [FileText, 'Factures téléchargeables'],
              [CreditCard, 'Résiliation en ligne, sans engagement'],
            ].map(([Icon, t]) => {
              const I = Icon as typeof Lock;
              return (
                <p key={t as string} className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                    <I className="size-4" />
                  </span>
                  {t as string}
                </p>
              );
            })}
          </div>
        </section>

        {/* --------------------------------------------------------- FAQ */}
        <section id="faq" className="border-t border-line bg-white py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <SectionTitle eyebrow="FAQ" title="Questions fréquentes">
                Les réponses courtes aux questions qu’on nous pose avant de s’inscrire.
              </SectionTitle>
              <div className="mt-8 rounded-2xl bg-canvas p-5 text-sm">
                <p className="font-semibold">Une autre question ?</p>
                <p className="mt-1 text-slate-600">
                  {contactEmail ? (
                    <>
                      Écrivez-nous à{' '}
                      <a href={`mailto:${contactEmail}`} className="font-semibold text-electric-700 hover:underline">
                        {contactEmail}
                      </a>
                      .
                    </>
                  ) : (
                    <>
                      Le{' '}
                      <Link href="/confiance" className="font-semibold text-electric-700 hover:underline">
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
                <details key={q} className="group rounded-2xl border border-line bg-white px-5 py-4 transition-colors open:border-electric-200 open:bg-electric-50/40 open:shadow-card [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition-transform group-open:rotate-45 group-open:bg-electric-600 group-open:text-white">+</span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- Appel final */}
        <section className="px-4 py-20 sm:px-6">
          <div className="reveal relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-night-900 px-6 py-16 text-center text-white sm:px-12">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
            <div className="pointer-events-none absolute -bottom-40 left-1/2 -z-10 h-80 w-[50rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.5),transparent)]" />
            <BrandMark size={56} className="mx-auto mb-7 rounded-[15px] shadow-glow" />
            <h2 className="font-display mx-auto max-w-3xl text-[1.9rem] leading-[1.14] font-semibold tracking-[-0.025em] text-balance sm:text-[2.8rem]">
              Vos prochains clients sont <span className="text-gradient font-serif font-normal italic">déjà immatriculés.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">Trouvez-les, comprenez leurs besoins, contactez-les avec un vrai motif.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/inscription" className={buttonClass('accent', 'lg')}>
                Trouver mes prospects
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/connexion" className="inline-flex h-12 items-center rounded-lg border border-white/20 px-6 text-[15px] font-semibold text-white hover:bg-white/10">
                Se connecter
              </Link>
            </div>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
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
    </>
  );
}
