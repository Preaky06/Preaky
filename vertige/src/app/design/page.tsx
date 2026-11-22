import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { CounterDemo } from "@/components/design/CounterDemo";
import { ButtonLink } from "@/components/ui/Button";
import { PriceCard } from "@/components/ui/PriceCard";
import { ConfidenceBadge, DemoBadge, PriceStamp } from "@/components/ui/PriceStamp";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { TierPill } from "@/components/ui/TierPill";
import { toCardItem } from "@/lib/card-item";
import { contrast } from "@/lib/contrast";
import { getHeroItems } from "@/lib/data/items";
import { formatPrice } from "@/lib/format";
import { TIERS } from "@/lib/tiers";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

const BG = "#EEF3FA";
const WHITE = "#FFFFFF";

const BASE = [
  { name: "Fond", token: "bg", hex: BG },
  { name: "Surface", token: "surface", hex: WHITE },
  { name: "Texte principal", token: "ink", hex: "#0B1220" },
  { name: "Texte secondaire", token: "muted", hex: "#566079" },
  { name: "Bleu VERTIGE", token: "brand", hex: "#0B6BCB" },
  { name: "Or", token: "gold", hex: "#F5C542" },
];

function Ratio({ fg, bg }: { fg: string; bg: string }) {
  const r = contrast(fg, bg);
  return (
    <span className={r >= 4.5 ? "text-ink" : "font-bold text-tier-6"}>
      {r.toFixed(2)}:1 {r >= 4.5 ? "✓" : "✗"}
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <h2 id={id} className="text-[28px] font-extrabold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function DesignPage() {
  const items = await getHeroItems();
  const samples = TIERS.map((t) => items.find((i) => i.tier === t.id)).filter((i) => i !== undefined);

  return (
    <div className="relative z-10 mx-auto flex max-w-[1120px] flex-col gap-16 px-5 pb-24 pt-28">
      <header className="flex flex-col gap-3">
        <p className="text-small font-semibold uppercase tracking-[0.2em] text-muted">Design system</p>
        <h1 className="text-title-1 font-extrabold tracking-tight">Le système VERTIGE</h1>
        <p className="max-w-2xl text-lg text-muted">
          Clair, bleu et blanc. Jetons dans <code className="num text-ink">globals.css</code>, paliers dans{" "}
          <code className="num text-ink">lib/tiers.ts</code>.
        </p>
      </header>

      <Section id="identite" title="Identité">
        <div className="panel flex flex-col items-center gap-6 p-10">
          <Logo className="text-[clamp(7rem,22vw,16rem)]" />
          <p className="text-xl font-semibold text-muted">Du centime au milliard. Tout a un prix.</p>
          <p className="text-small text-muted">
            Police provisoire : Six Caps (OFL), en attendant la police définitive de la référence.
          </p>
        </div>
      </Section>

      <Section id="couleurs" title="Couleurs">
        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BASE.map((c) => (
            <li key={c.token} className="panel overflow-hidden">
              <span className="block h-20 border-b border-line" style={{ background: c.hex }} />
              <div className="flex flex-col gap-1 p-4 text-small">
                <span className="font-semibold">{c.name}</span>
                <span className="num text-muted">{c.hex}</span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="paliers" title="Les 7 paliers">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <li key={t.id} data-tier={t.id} className="panel flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <span className="font-display text-[40px] uppercase leading-none text-(--tier)">{t.name}</span>
                <span className="size-8 rounded-full" style={{ background: t.color }} />
              </div>
              <p className="text-small text-muted">
                {t.colorName} · <span className="num">{t.color}</span> · {t.short}
              </p>
              <dl className="num grid grid-cols-[auto_1fr] gap-x-3 text-[12px] text-muted">
                <dt>blanc sur palier</dt>
                <dd>
                  <Ratio fg={WHITE} bg={t.color} />
                </dd>
                <dt>palier sur fond</dt>
                <dd>
                  <Ratio fg={t.color} bg={BG} />
                </dd>
              </dl>
              <div className="flex flex-wrap gap-2">
                <TierPill tier={t.id} />
                <TierPill tier={t.id} variant="solid" showIndex />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="typo" title="Typographie">
        <div className="panel flex flex-col gap-6 overflow-hidden p-6">
          <div>
            <p className="text-small text-muted">Affichage · Six Caps (logo, noms de paliers)</p>
            <p className="font-display text-[clamp(5rem,14vw,10rem)] uppercase leading-[0.9]">Démesure</p>
          </div>
          <div>
            <p className="text-small text-muted">Titres et interface · Inter Tight 800 / 600 / 400 — 96 / 72 / 48 / 16 / 13</p>
            <p className="text-title-1 font-extrabold tracking-tight">Tout a un prix.</p>
            <p className="text-title-3 font-extrabold tracking-tight">Les prix</p>
            <p className="text-body">Avec ce prix, tu t&apos;offres quelques siècles de streaming.</p>
            <p className="text-small text-muted">Prix neuf en magasin · nov. 2026 · fiabilité C</p>
          </div>
          <div>
            <p className="text-small text-muted">Prix · Inter Tight chiffres tabulaires · compteurs : JetBrains Mono</p>
            <p className="price text-[clamp(48px,9vw,96px)] font-extrabold leading-none text-brand">{formatPrice(1.9e9)}</p>
            <p className="price text-2xl font-bold">{[0.00004, 1299, 4.2e6, 1.9e9, 1.1e14].map((v) => formatPrice(v)).join("  ·  ")}</p>
          </div>
        </div>
      </Section>

      <Section id="cartes" title="Cartes d'objet">
        <ul className="flex flex-wrap gap-6">
          {samples.map((item) => (
            <li key={item.id}>
              <PriceCard item={toCardItem(item)} />
            </li>
          ))}
        </ul>
        <div className="max-w-sm">
          <CardSkeleton />
        </div>
      </Section>

      <Section id="compteur" title="Compteur à rouleaux">
        <CounterDemo />
      </Section>

      <Section id="elements" title="Badges et boutons">
        <div className="panel flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <ConfidenceBadge level="A" />
            <ConfidenceBadge level="B" />
            <ConfidenceBadge level="C" />
            <DemoBadge />
          </div>
          <PriceStamp price={{ price_type: "auction_record", observed_at: "2017-11-01", confidence: "B", unit: "piece" }} />
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/">Principal</ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Secondaire
            </ButtonLink>
            <span data-tier="6">
              <ButtonLink href="/" variant="tier">
                Palier
              </ButtonLink>
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </Section>
    </div>
  );
}
