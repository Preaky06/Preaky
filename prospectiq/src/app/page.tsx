import Link from 'next/link';
import { Search, Radar, Gauge, MessageSquareText, KanbanSquare, ListChecks, Download, Users, ShieldCheck, Database, Globe, FileSearch, Check, ArrowRight, Ban } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/site';
import { DemoSearch } from '@/components/demo-search';
import { ScoreBreakdown, CategoryBadge, ConfidenceBadge } from '@/components/score';
import { Badge, Card } from '@/components/ui';
import { buttonClass } from '@/components/styles';
import { PLANS } from '@/lib/plans';
import { scoreCompany } from '@/lib/scoring';
import type { Company, WebsiteAudit, Signal } from '@/lib/connectors/types';

export const revalidate = 86400;

/** Exemple de démonstration : entreprise FICTIVE, notée par le vrai moteur de score. */
function exampleScore() {
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
  return scoreCompany({ company, website, signals, offer: { services: ['site_web', 'reseaux_sociaux'], sectors: ['restauration'], sizes: [] }, now });
}

const FEATURES = [
  { icon: Search, title: 'Recherche avancée', text: 'Région, département, ville, code postal ou rayon autour d’une commune ; secteur, mots-clés, taille, ancienneté, signaux. Tous les filtres se combinent.' },
  { icon: Radar, title: 'Analyse automatique', text: 'Site web retrouvé et vérifié par le SIREN, audit technique (mobile, HTTPS, référencement, fraîcheur du contenu), annonces légales récentes.' },
  { icon: Gauge, title: 'Score explicable', text: 'Une note de 0 à 100 détaillée critère par critère, avec ses raisons et un niveau de confiance. Pondérations ajustables.' },
  { icon: MessageSquareText, title: 'Messages personnalisés', text: 'E-mail, LinkedIn, Instagram ou message court, en 5 tons. L’accroche s’appuie sur une observation réelle, jamais sur une relation inventée.' },
  { icon: KanbanSquare, title: 'Mini-CRM intégré', text: 'Statuts, notes, historique, date de relance, vue tableau et Kanban. Chaque entreprise n’y figure qu’une fois.' },
  { icon: ListChecks, title: 'Listes et recherches sauvegardées', text: 'Relancez une recherche pour voir les nouvelles entreprises, comparez deux recherches, regroupez vos prospects par campagne.' },
  { icon: Download, title: 'Export CSV', text: 'Exportez votre CRM ou une fiche entreprise vers votre tableur ou votre outil de prospection.' },
  { icon: Users, title: 'Travail en équipe', text: 'Jusqu’à 5 utilisateurs partagent le même portefeuille, les mêmes listes et les mêmes paramètres.' },
];

const FAQ = [
  ['D’où viennent les données ?', 'Des registres publics officiels : le répertoire SIRENE de l’Insee et le Registre national des entreprises, via l’API Recherche d’entreprises de l’État, et le BODACC pour les annonces légales. ProspectIQ analyse ensuite le site web public de l’entreprise, en respectant ses règles d’accès (robots.txt).'],
  ['Le score est-il une probabilité de signer un client ?', 'Non. Il mesure un potentiel d’opportunité commerciale à partir des données disponibles : besoin détecté, pertinence pour vos services, opportunité digitale, signaux récents et qualité des données. Chaque point est justifié, et un niveau de confiance indique la part du score fondée sur des faits constatés.'],
  ['Que se passe-t-il quand une information manque ?', 'Elle est affichée « Non renseigné ». ProspectIQ ne complète jamais un trou par une supposition présentée comme un fait : une estimation est toujours étiquetée comme telle.'],
  ['Collectez-vous des données personnelles ?', 'Le minimum. Seuls les dirigeants publiés au registre (nom et fonction) et les coordonnées professionnelles affichées publiquement par l’entreprise sont repris. Les entrepreneurs ayant demandé à ne pas être démarchés (mention « opposition » du répertoire SIRENE) sont automatiquement exclus, et toute personne peut demander la suppression de ses données.'],
  ['Analysez-vous Instagram, LinkedIn ou Google ?', 'ProspectIQ détecte les liens vers les réseaux sociaux publiés sur le site de l’entreprise. Il ne collecte pas le contenu des réseaux sociaux, ce que leurs conditions d’utilisation interdisent. La note et les avis Google peuvent être ajoutés si l’instance est connectée à l’API officielle Google Places.'],
  ['Qu’est-ce qu’un « prospect » dans les quotas ?', 'Une entreprise dont vous lancez l’analyse complète, comptée une seule fois par mois. Les recherches, l’affichage des résultats et la relance d’une analyse déjà faite sont illimités.'],
  ['Puis-je résilier à tout moment ?', 'Oui, sans engagement, depuis la page Abonnement. Votre offre reste active jusqu’à la fin de la période payée, puis votre compte repasse en offre Découverte gratuite.'],
  ['Les messages sont-ils envoyés automatiquement ?', 'Non. ProspectIQ rédige, vous relisez et envoyez depuis votre propre messagerie. Vous restez responsable du respect des règles de prospection (droit d’opposition, mention de désinscription en e-mail).'],
];

export default function Home() {
  const example = exampleScore();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-night-900 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(99,102,241,0.35),transparent)]" />
          <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 text-center sm:px-6 sm:pt-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
              <ShieldCheck className="size-3.5 text-electric-400" />
              Données officielles françaises · score explicable
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">Les bons prospects. Au bon moment.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-slate-300">Identifiez les entreprises à fort potentiel commercial grâce à l’analyse intelligente de leurs activités et de leur présence digitale.</p>
            <div className="mt-10">
              <DemoSearch />
            </div>
            <p className="mt-6 text-sm text-slate-400">
              Essayez ci-dessus sur de vraies données, sans inscription. <Link href="/inscription" className="font-semibold text-white underline-offset-2 hover:underline">Créer un compte gratuit</Link> · 20 prospects analysés par mois, sans carte bancaire.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ['1', 'Ciblez', 'Choisissez une zone et un secteur. ProspectIQ interroge le registre officiel et écarte les entreprises fermées ou ayant refusé la prospection.'],
              ['2', 'Qualifiez', 'Lancez l’analyse : site web, annonces légales, maturité digitale. Le score vous dit qui contacter en premier, et pourquoi.'],
              ['3', 'Contactez', 'Générez un message qui cite un fait réel sur l’entreprise, puis suivez la conversation dans le CRM jusqu’au rendez-vous.'],
            ].map(([n, t, d]) => (
              <div key={n} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <span className="grid size-9 place-items-center rounded-lg bg-night-900 text-sm font-bold text-white">{n}</span>
                <h2 className="mt-4 text-lg font-semibold">{t}</h2>
                <p className="mt-2 text-[15px] text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="fonctionnalites" className="border-y border-line bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">Tout le cycle de prospection, au même endroit</h2>
            <p className="mt-3 max-w-2xl text-slate-600">De la recherche d’entreprises au rendez-vous obtenu, sans jongler entre un annuaire, un tableur et une messagerie.</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-line p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-electric-50 text-electric-600">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="scoring" className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Un score que vous pouvez expliquer</h2>
            <p className="mt-3 text-slate-600">Cinq critères, pondérés par défaut et ajustables selon votre activité. Chaque point attribué est justifié et étiqueté « constaté » ou « estimé ».</p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {[
                ['Besoin potentiel détecté', '30 %'],
                ['Pertinence pour vos services', '25 %'],
                ['Opportunité digitale', '20 %'],
                ['Signaux commerciaux récents', '15 %'],
                ['Qualité et fraîcheur des données', '10 %'],
              ].map(([l, w]) => (
                <li key={l} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-2.5">
                  {l}
                  <b className="tabular-nums">{w}</b>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
              {[
                ['80 – 100', 'Priorité élevée'],
                ['60 – 79', 'Prospect intéressant'],
                ['40 – 59', 'Potentiel modéré'],
                ['0 – 39', 'Faible priorité'],
              ].map(([r, l]) => (
                <p key={r} className="rounded-lg bg-slate-100 px-3 py-2">
                  <b className="tabular-nums">{r}</b> · {l}
                </p>
              ))}
            </div>
          </div>
          <Card className="p-5" data-testid="score-example">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone="warning">Exemple illustratif · entreprise fictive</Badge>
                <p className="mt-2 text-lg font-semibold">Le Bistrot Exemple</p>
                <p className="text-sm text-slate-500">Restaurant créé il y a 7 mois · 6 à 9 salariés · pour une agence web</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold tabular-nums tracking-tight">
                  {example.total}
                  <span className="text-base font-medium text-slate-400">/100</span>
                </p>
                <div className="mt-1 flex justify-end gap-1">
                  <CategoryBadge category={example.category} />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <ConfidenceBadge confidence={example.confidence} />
            </div>
            <ScoreBreakdown score={example} />
          </Card>
        </section>

        <section className="border-y border-line bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">Des sources que vous pouvez vérifier</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                [Database, 'Registres officiels', 'Répertoire SIRENE (Insee) et Registre national des entreprises, via l’API publique Recherche d’entreprises : identité, activité, effectif, dirigeants, établissements.'],
                [FileSearch, 'Annonces légales', 'BODACC : créations, changements de dirigeant ou d’enseigne, cessions, et procédures collectives (qui font baisser le score).'],
                [Globe, 'Site web public', 'Retrouvé et vérifié par la présence du SIREN sur le site, puis audité en respectant le fichier robots.txt de l’entreprise.'],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof Database;
                return (
                  <div key={t as string} className="rounded-2xl border border-line p-5">
                    <I className="size-5 text-electric-600" />
                    <h3 className="mt-3 font-semibold">{t as string}</h3>
                    <p className="mt-1.5 text-sm text-slate-600">{d as string}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="flex items-center gap-2 font-semibold">
                <Ban className="size-4 text-rose-600" />
                Ce que ProspectIQ ne fait pas
              </p>
              <ul className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <li>Aucune collecte du contenu des réseaux sociaux ni contournement de protections.</li>
                <li>Aucune entreprise ayant refusé la prospection (opposition SIRENE) dans les résultats.</li>
                <li>Aucune donnée inventée : l’inconnu est affiché « Non renseigné ».</li>
                <li>Aucun message prétendant une relation ou un échange qui n’a pas eu lieu.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="tarifs" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Des tarifs simples, sans engagement</h2>
          <p className="mt-3 text-center text-slate-600">Commencez gratuitement. Passez à une offre payante quand la prospection devient régulière.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {Object.values(PLANS).map((p) => (
              <div key={p.id} className={`flex flex-col rounded-2xl border bg-white p-6 shadow-card ${p.id === 'pro' ? 'border-electric-500 ring-2 ring-electric-500' : 'border-line'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  {p.id === 'pro' && <Badge tone="accent">Recommandé</Badge>}
                </div>
                <p className="mt-3">
                  <span className="text-4xl font-bold tracking-tight">{p.price} €</span>
                  <span className="text-sm text-slate-500"> {p.price ? 'HT / mois' : 'pour toujours'}</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  {p.pitch.map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-electric-600" />
                      {x}
                    </li>
                  ))}
                </ul>
                <Link href="/inscription" className={`${buttonClass(p.id === 'pro' ? 'accent' : p.price ? 'primary' : 'secondary')} mt-6 w-full`}>
                  {p.price ? `Choisir ${p.name}` : 'Commencer gratuitement'}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">Les offres payantes se souscrivent depuis l’application après création du compte. Paiement sécurisé par Stripe, factures téléchargeables.</p>
        </section>

        <section id="faq" className="border-t border-line bg-white py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">Questions fréquentes</h2>
            <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {q}
                    <span className="text-xl leading-none text-slate-400 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-night-900 py-16 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight">Vos prochains clients sont déjà immatriculés.</h2>
          <p className="mt-3 text-slate-300">Trouvez-les, comprenez leurs besoins, contactez-les avec un vrai motif.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/inscription" className={buttonClass('accent', 'lg')}>
              Trouver mes prospects
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/connexion" className="inline-flex h-12 items-center rounded-lg border border-white/20 px-6 text-[15px] font-semibold text-white hover:bg-white/10">
              Se connecter
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
