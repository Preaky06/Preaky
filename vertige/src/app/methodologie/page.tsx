import type { Metadata } from "next";
import { CorrectionForm } from "@/components/methodology/CorrectionForm";
import { ConfidenceBadge } from "@/components/ui/PriceStamp";
import { TierPill } from "@/components/ui/TierPill";
import { getAllItems, getCatalogStats } from "@/lib/data/items";
import { formatInt } from "@/lib/format";
import { CONFIDENCE_LABEL, PRICE_TYPE_LABEL } from "@/lib/labels";
import { TIERS } from "@/lib/tiers";
import type { PriceType } from "@/lib/types";

export const metadata: Metadata = {
  title: "Méthodologie",
  description: "Types de prix, fiabilité, sources, conversion des devises et limites de VERTIGE.",
};

const DEFINITIONS: Record<PriceType, string> = {
  retail_new: "Prix public d'un produit neuf, tel qu'affiché en magasin ou sur le site du fabricant.",
  retail_used: "Prix d'un objet de seconde main, y compris une vente privée entre particuliers ou collectionneurs.",
  auction_record: "Prix d'adjudication lors d'une vente aux enchères publique, frais de l'acheteur compris quand ils sont connus.",
  estimate: "Valeur estimée, faute de prix de vente : valorisation d'entreprise, coût total d'un événement, valeur théorique.",
  production_cost: "Ce que coûte la fabrication d'une unité, hors marge de vente.",
  project_budget: "Budget engagé pour un projet : construction, programme spatial ou militaire, film.",
  market_cap: "Valeur en bourse (nombre d'actions × cours), ou prix d'un rachat d'entreprise.",
  commodity_spot: "Cours au comptant d'une matière première ou d'un actif coté, à une date donnée.",
  rental: "Prix d'une location sur une durée (mois, an).",
  service_fee: "Tarif d'un service : consultation, transport, abonnement, lancement de fusée.",
  insured_value: "Valeur déclarée à un assureur, pour un objet qui n'est pas à vendre.",
};

const LIMITS = [
  "Les 350 prix actuels sont des données de démonstration écrites à la main, sans source : tous portent la fiabilité C.",
  "Les conversions en euros de la démo utilisent des moyennes annuelles approximatives, pas le taux du jour du relevé.",
  "Comparer des types de prix différents (un budget de projet et un prix en magasin) donne un ordre de grandeur, pas une équivalence exacte.",
  "Les prix des actifs cotés (bitcoin, capitalisations, or) bougent chaque jour ; la valeur affichée est celle d'une date.",
  "Les illustrations 3D sont génériques : un même avion représente plusieurs modèles.",
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="panel flex flex-col gap-4 p-6 sm:p-8">
      <h2 id={id} className="text-[24px] font-extrabold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function MethodologiePage() {
  const [items, stats] = await Promise.all([getAllItems(), getCatalogStats()]);
  return (
    <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-24 pt-28 sm:px-5">
      <header className="flex flex-col gap-3">
        <h1 className="text-title-2 font-extrabold tracking-tight">Méthodologie</h1>
        <p className="text-lg text-muted">
          D&apos;où viennent les prix, ce qu&apos;ils mesurent et ce qu&apos;ils ne disent pas. État actuel : {formatInt(stats.count)} prix de
          démonstration.
        </p>
      </header>

      <Section id="echelle" title="Une seule échelle, sept paliers">
        <p>
          Tous les prix sont convertis en euros et placés sur une échelle logarithmique, de 10⁻⁵ € à 10¹⁴ € : chaque graduation multiplie le prix par
          dix. Sept paliers découpent cette échelle.
        </p>
        <ul className="flex flex-col gap-2">
          {TIERS.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3">
              <TierPill tier={t.id} showIndex />
              <span className="text-[15px] text-muted">{t.range}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="types" title="Les types de prix">
        <dl className="flex flex-col gap-3">
          {(Object.keys(DEFINITIONS) as PriceType[]).map((t) => (
            <div key={t}>
              <dt className="font-bold">{PRICE_TYPE_LABEL[t]}</dt>
              <dd className="text-muted">{DEFINITIONS[t]}</dd>
            </div>
          ))}
        </dl>
        <p className="text-small text-muted">
          Un objet « inestimable » (la Joconde) n&apos;apparaît que par sa valeur d&apos;assurance ou une estimation, clairement étiquetée.
        </p>
      </Section>

      <Section id="fiabilite" title="La fiabilité">
        <ul className="flex flex-col gap-3">
          {(["A", "B", "C"] as const).map((c) => (
            <li key={c} className="flex flex-wrap items-center gap-3">
              <ConfidenceBadge level={c} />
              <span className="text-muted">
                {c === "A" && "Le prix vient directement de celui qui le fixe : fabricant, maison de ventes, budget officiel."}
                {c === "B" && "Le prix est rapporté par une source secondaire fiable : presse économique, base de données reconnue."}
                {c === "C" && `${CONFIDENCE_LABEL.C} : ordre de grandeur ou donnée de démonstration.`}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="sources" title="Les sources et leur mise à jour">
        <p>Aucune source n&apos;est encore branchée : les prix actuels servent à construire et tester le site. Les prochaines étapes :</p>
        <ul className="list-disc pl-5 text-muted">
          <li>Prix de l&apos;alimentation relevés en magasin (Open Food Facts Prices, licence ODbL, attribution visible).</li>
          <li>Prix et coûts publiés dans Wikidata, vérifiés avant import.</li>
          <li>Records d&apos;enchères et listes « les plus chers » saisis à la main, avec leur source.</li>
          <li>Propositions de la communauté, modérées avant publication.</li>
        </ul>
        <p className="text-muted">Recalcul chaque nuit : rang, percentile, palier et histogramme.</p>
      </Section>

      <Section id="devises" title="La conversion des devises">
        <p>
          Chaque prix garde sa devise d&apos;origine, affichée à côté du montant en euros. La conversion utilise le taux de référence de la Banque
          centrale européenne au jour du relevé. La démonstration actuelle utilise des moyennes annuelles approximatives.
        </p>
      </Section>

      <Section id="limites" title="Les limites connues">
        <ul className="list-disc pl-5 text-muted">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Section>

      <Section id="corriger" title="Signaler une erreur">
        <CorrectionForm items={items.map((i) => ({ slug: i.slug, name: i.name_fr }))} />
      </Section>
    </div>
  );
}
