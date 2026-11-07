import Link from 'next/link';
import { Activity, ArrowRight, Check, Database, FileSearch, Fingerprint, KeyRound, Mail, Scale, ServerCog, ShieldCheck, X } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/site';
import { env, features } from '@/lib/env';
import { sourcesStatus } from '@/lib/pulse';

export const metadata = { title: 'Centre de confiance', description: 'Sources de données, méthode de score, données personnelles, sécurité et sous-traitants de Pro Spectre.' };
// État des sources vérifié au plus toutes les 5 minutes.
export const revalidate = 300;

const host = (url: string) => {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
};

const SECTIONS = [
  ['sources', 'Sources'],
  ['methode', 'Méthode'],
  ['donnees', 'Données personnelles'],
  ['securite', 'Sécurité'],
  ['sous-traitants', 'Sous-traitants'],
] as const;

function Section({ id, icon: Icon, title, children }: { id: string; icon: typeof Database; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
      <h2 className="flex items-center gap-3 text-xl font-semibold tracking-tight">
        <span className="grid size-10 place-items-center rounded-xl bg-electric-50 text-electric-600">
          <Icon className="size-5" />
        </span>
        {title}
      </h2>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

const Yes = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2.5">
    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
      <Check className="size-3" strokeWidth={3} />
    </span>
    <span>{children}</span>
  </li>
);
const No = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2.5">
    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700">
      <X className="size-3" strokeWidth={3} />
    </span>
    <span>{children}</span>
  </li>
);

export default async function Page() {
  const status = await sourcesStatus();
  const allOk = status.sources.every((s) => s.ok);
  const checked = new Date(status.checkedAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const l = env.legal;

  const processors = [
    { role: 'Hébergement de l’application', who: l.host, active: true },
    { role: 'Base de données', who: l.dbHost || 'Indiqué dans les mentions légales', active: true },
    { role: 'Paiement et facturation', who: 'Stripe Payments Europe Ltd. (Irlande)', active: features.stripe() },
    { role: 'E-mails transactionnels', who: features.mail() ? `Serveur SMTP ${host(env.smtpUrl) || ''}`.trim() : 'Prestataire SMTP', active: features.mail() },
    { role: 'Rédaction assistée par IA', who: features.ai() ? `${host(env.aiBaseUrl) || 'Fournisseur d’IA'} (modèle ${env.aiModel})` : 'Fournisseur d’IA', active: features.ai() },
    { role: 'Note et avis Google', who: 'Google LLC (API Places)', active: features.places() },
    { role: 'Mesure de performance des sites', who: 'Google LLC (API PageSpeed Insights)', active: features.pagespeed() },
  ];

  return (
    <>
      <SiteHeader />
      <main id="contenu">
        <section className="relative isolate overflow-hidden border-b border-line bg-white">
          <div className="bg-dots pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,#000_30%,transparent_75%)]" />
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-20">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-electric-600 uppercase">Centre de confiance</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Ce que nous faisons des données, <span className="text-gradient-dark font-serif font-normal italic">et comment le vérifier.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-slate-600">D’où viennent les informations, comment le score est calculé, ce qui est conservé et pendant combien de temps, qui intervient dans le traitement. Cette page reflète la configuration réelle du service.</p>
              <nav className="mt-7 flex flex-wrap gap-2 text-sm font-medium" aria-label="Sections">
                {SECTIONS.map(([id, label]) => (
                  <a key={id} href={`#${id}`} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-slate-700 transition-colors hover:border-electric-300 hover:text-electric-700">
                    {label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="rounded-3xl border border-line bg-white p-6 shadow-lift" data-testid="sources-status">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold">
                  <Activity className="size-4 text-electric-600" />
                  État des sources publiques
                </p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${allOk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                  <span className={`size-1.5 rounded-full ${allOk ? 'animate-pulse-dot bg-emerald-500' : 'bg-amber-500'}`} />
                  {allOk ? 'Toutes opérationnelles' : 'Perturbation'}
                </span>
              </div>
              <ul className="mt-5 divide-y divide-line">
                {status.sources.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.producer}</p>
                    </div>
                    <p className={`shrink-0 text-right text-xs font-semibold ${s.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {s.ok ? 'Opérationnelle' : 'Injoignable'}
                      {s.ok && s.latencyMs != null && <span className="block font-normal text-slate-400 tabular-nums">{s.latencyMs} ms</span>}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">Vérification réelle effectuée par le serveur le {checked} (heure de Paris), renouvelée au plus toutes les 5 minutes. Quand une source est injoignable, l’application l’indique au lieu d’afficher des résultats partiels comme complets.</p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-4xl space-y-6 px-4 py-14 sm:px-6">
          <Section id="sources" icon={Database} title="Sources de données">
            <p>Pro Spectre n’achète aucun fichier et ne revend aucune donnée. Les informations proviennent de sources publiques, consultables par tous :</p>
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="bg-canvas text-xs tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Producteur</th>
                    <th className="px-4 py-3 font-semibold">Ce qui en est utilisé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    ['API Recherche d’entreprises', 'https://recherche-entreprises.api.gouv.fr', 'DINUM, données Insee (SIRENE) et INPI (RNE)', 'Identité, activité (NAF), effectif, établissements, dirigeants publiés, comptes publiés, mention d’opposition à la prospection'],
                    ['BODACC', 'https://www.bodacc.fr', 'DILA', 'Annonces de création, vente, modification et procédures collectives, avec leur date et un lien vers l’annonce'],
                    ['API Découpage administratif', 'https://geo.api.gouv.fr', 'Etalab', 'Communes, codes postaux et coordonnées pour les recherches par zone'],
                    ['Site web de l’entreprise', null, 'L’entreprise elle-même', 'Pages publiques uniquement, dans le respect du fichier robots.txt ; rattachement au SIREN quand il figure sur le site'],
                  ].map(([name, url, prod, use]) => (
                    <tr key={name as string} className="align-top">
                      <td className="px-4 py-3 font-medium">
                        {url ? (
                          <a href={url} className="text-electric-700 hover:underline" rel="noopener">
                            {name}
                          </a>
                        ) : (
                          name
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{prod}</td>
                      <td className="px-4 py-3 text-slate-600">{use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-500">Pro Spectre est un service indépendant : il réutilise ces données publiques sans être affilié à leurs producteurs.</p>
            <div id="robot" className="scroll-mt-24 rounded-2xl bg-canvas p-4 text-sm">
              <p className="font-semibold text-night-900">Vous gérez un site et avez vu passer notre robot ?</p>
              <p className="mt-1 text-slate-600">
                Il s’identifie comme <code className="rounded bg-white px-1.5 py-0.5 text-xs">ProSpectre-Analyse/1.0</code>, ne consulte que quelques pages publiques et respecte le fichier robots.txt. Pour exclure votre site de l’analyse, ajoutez à votre robots.txt :
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-night-900 px-3 py-2 text-xs text-slate-100">{'User-agent: ProSpectre-Analyse\nDisallow: /'}</pre>
              <p className="mt-2 text-slate-600">
                Pour faire effacer les données d’une entreprise, utilisez le{' '}
                <Link href="/opposition" className="font-medium text-electric-700 underline">
                  formulaire d’opposition
                </Link>
                .
              </p>
            </div>
          </Section>

          <Section id="methode" icon={Scale} title="Méthode : un score explicable">
            <p>Le score de 0 à 100 combine cinq critères (pondérations par défaut ajustables) : besoin potentiel détecté 30 %, pertinence pour vos services 25 %, opportunité digitale 20 %, signaux commerciaux récents 15 %, qualité et fraîcheur des données 10 %.</p>
            <ul className="space-y-2.5">
              <Yes>Chaque critère affiche ses raisons et sa nature : « Constaté », « Estimé » ou « Non évalué ».</Yes>
              <Yes>Un niveau de confiance indique la part du score fondée sur des faits constatés.</Yes>
              <Yes>Une information absente s’affiche « Non renseigné ». Les opportunités proposées citent le fait qui les justifie.</Yes>
              <Yes>Une procédure collective ou une cessation publiée plafonne le score et déconseille la prospection.</Yes>
              <No>Le score n’est pas une probabilité de signer : il mesure un potentiel d’opportunité à partir des données disponibles.</No>
            </ul>
          </Section>

          <Section id="donnees" icon={Fingerprint} title="Données personnelles (RGPD)">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="font-semibold text-night-900">Ce qui est conservé</p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <Yes>Dirigeants tels que publiés au registre : nom et fonction.</Yes>
                  <Yes>Coordonnées professionnelles génériques affichées par l’entreprise (contact@, accueil@…).</Yes>
                  <Yes>Votre compte, vos recherches sauvegardées et votre CRM, jusqu’à suppression du compte.</Yes>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-night-900">Ce qui ne l’est jamais</p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <No>Date de naissance, adresse personnelle ou donnée sensible.</No>
                  <No>Adresses e-mail nominatives trouvées sur les sites.</No>
                  <No>Entreprises portant la mention d’opposition au répertoire SIRENE.</No>
                </ul>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="bg-canvas text-xs tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Donnée</th>
                    <th className="px-4 py-3 font-semibold">Durée de conservation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-slate-600">
                  {[
                    ['Fiches et analyses d’entreprises', '12 mois sans consultation, sauf si suivies dans un CRM'],
                    ['Recherches non sauvegardées', '6 mois'],
                    ['Sessions de connexion', '30 jours'],
                    ['Journaux techniques des sources', '90 jours'],
                    ['Compte utilisateur', 'Jusqu’à sa suppression (en libre-service)'],
                  ].map(([d, t]) => (
                    <tr key={d}>
                      <td className="px-4 py-3 font-medium text-night-900">{d}</td>
                      <td className="px-4 py-3">{t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Une purge automatique quotidienne applique ces durées. Toute personne peut s’opposer au traitement des données la concernant via le{' '}
              <Link href="/opposition" className="font-medium text-electric-700 underline">
                formulaire d’opposition
              </Link>
              , sans créer de compte : les données sont effacées et l’entreprise exclue durablement. Détails dans la{' '}
              <Link href="/confidentialite" className="font-medium text-electric-700 underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </Section>

          <Section id="securite" icon={KeyRound} title="Sécurité">
            <ul className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
              <Yes>Mots de passe hachés avec scrypt, jamais stockés en clair.</Yes>
              <Yes>Sessions opaques, stockées hachées, cookie HttpOnly et SameSite.</Yes>
              <Yes>Contrôle d’origine des requêtes (protection CSRF).</Yes>
              <Yes>Limitation du nombre de tentatives de connexion et d’appels.</Yes>
              <Yes>Données cloisonnées par organisation, vérifiées à chaque requête.</Yes>
              <Yes>Clés d’API conservées côté serveur, jamais envoyées au navigateur.</Yes>
              <Yes>Analyse des sites protégée contre les requêtes vers des adresses internes.</Yes>
              <Yes>Numéro de carte bancaire traité uniquement par Stripe.</Yes>
            </ul>
            {l.email && (
              <p className="flex items-start gap-2.5 rounded-2xl bg-canvas p-4 text-sm">
                <Mail className="mt-0.5 size-4 shrink-0 text-electric-600" />
                <span>
                  Vous pensez avoir trouvé une faille ? Écrivez à{' '}
                  <a href={`mailto:${l.email}`} className="font-semibold text-electric-700 hover:underline">
                    {l.email}
                  </a>{' '}
                  (voir aussi <a href="/.well-known/security.txt" className="font-medium text-electric-700 hover:underline">security.txt</a>).
                </span>
              </p>
            )}
          </Section>

          <Section id="sous-traitants" icon={ServerCog} title="Sous-traitants">
            <p>Liste générée à partir de la configuration en service : un prestataire « non utilisé » ne reçoit aucune donnée.</p>
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {processors.map((p) => (
                <li key={p.role} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-night-900">{p.role}</p>
                    <p className="text-slate-500">{p.who}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.active ? 'Actif' : 'Non utilisé'}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-slate-500">Les transferts éventuels hors de l’Union européenne sont encadrés par les clauses contractuelles types de la Commission européenne ou le cadre de protection des données UE–États-Unis.</p>
          </Section>

          <div className="relative isolate overflow-hidden rounded-3xl bg-night-900 p-8 text-white">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <ShieldCheck className="size-5 text-emerald-300" />
                  Jugez sur pièces
                </p>
                <p className="mt-1 max-w-lg text-sm text-slate-300">La recherche de démonstration interroge le vrai registre, sans inscription. L’offre Découverte est gratuite et sans carte bancaire.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-semibold hover:bg-white/10">
                  <FileSearch className="size-4" />
                  Tester la démo
                </Link>
                <Link href="/inscription" className="inline-flex h-11 items-center gap-2 rounded-xl bg-electric-600 px-5 text-sm font-semibold hover:bg-electric-700">
                  Créer un compte
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
