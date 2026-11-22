import type { Metadata } from "next";
import { Logo, VMark } from "@/components/brand/Logo";
import { CounterDemo } from "@/components/design/CounterDemo";
import { ButtonLink } from "@/components/ui/Button";
import { ItemCard } from "@/components/ui/ItemCard";
import { Picto } from "@/components/ui/Picto";
import { ConfidenceBadge, DemoBadge, PriceStamp } from "@/components/ui/PriceStamp";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { TierPill } from "@/components/ui/TierPill";
import { contrast, mix } from "@/lib/contrast";
import { getHeroItems } from "@/lib/data/items";
import { formatPrice } from "@/lib/format";
import { TIERS } from "@/lib/tiers";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

const BG = "#07070A";
const SURFACE = "#0F0F14";
const ELEVATED = "#16161D";

const BASE = [
  { name: "Fond", token: "bg", hex: BG },
  { name: "Surface", token: "surface", hex: SURFACE },
  { name: "Surface surélevée", token: "elevated", hex: ELEVATED },
  { name: "Texte principal (ivoire)", token: "ink", hex: "#F4F1EA" },
  { name: "Texte secondaire", token: "muted", hex: "#9A9AA6" },
];

function Ratio({ fg, bg }: { fg: string; bg: string }) {
  const r = contrast(fg, bg);
  return (
    <span className={r >= 4.5 ? "text-ink" : "text-tier-6"}>
      {r.toFixed(2)}:1 {r >= 4.5 ? "✓" : "✗"}
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6 border-t border-line pt-10">
      <h2 id={id} className="font-serif text-title-3">
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
    <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-5 pb-24 pt-28">
      <header className="flex flex-col gap-4">
        <p className="num text-small uppercase tracking-[0.3em] text-muted">Phase 1 · design system</p>
        <h1 className="font-serif text-title-1">Le système VERTIGE</h1>
        <p className="max-w-2xl text-lg text-muted">
          Jetons, typographie et composants de base. Toutes les valeurs viennent de <code className="num text-ink">globals.css</code>{" "}
          (couleurs, échelle typo, rayons, courbe) et de <code className="num text-ink">lib/tiers.ts</code> (paliers).
        </p>
      </header>

      <Section id="identite" title="Identité">
        <div className="card-surface flex flex-col items-center gap-8 p-10">
          <Logo size="xl" className="text-[clamp(4rem,14vw,10rem)]" />
          <p className="font-serif text-2xl text-muted">Du centime au milliard. Tout a un prix.</p>
          <div className="flex flex-wrap items-center gap-8">
            <Logo size="sm" className="text-[17px]" />
            <span className="grid size-16 place-items-center rounded-2xl bg-bg ring-1 ring-line">
              <VMark className="size-9 text-tier-7" stroke={7} title="Favicon : V doré sur noir" />
            </span>
          </div>
        </div>
      </Section>

      <Section id="couleurs" title="Couleurs de base">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {BASE.map((c) => (
            <li key={c.token} className="card-surface overflow-hidden">
              <span className="block h-20 border-b border-line" style={{ background: c.hex }} />
              <div className="flex flex-col gap-1 p-4 text-small">
                <span className="text-ink">{c.name}</span>
                <span className="num text-muted">
                  --color-{c.token} · {c.hex}
                </span>
                {c.token === "ink" || c.token === "muted" ? (
                  <span className="num">
                    sur fond : <Ratio fg={c.hex} bg={BG} />
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-small text-muted">
          Bordures : <span className="num">rgba(255,255,255,0.08)</span> · Verre :{" "}
          <span className="num">rgba(15,15,20,0.6) + blur 16px</span> · Grain SVG fixe 4 %.
        </p>
      </Section>

      <Section id="paliers" title="Les 7 paliers">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <li key={t.id} data-tier={t.id} className={`card-surface flex flex-col gap-3 p-5 ${t.id === 7 ? "iridescent" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="num text-small text-muted">{t.id}/7</span>
                <span className="size-6 rounded-full" style={{ background: t.color, boxShadow: `0 0 18px ${t.color}` }} />
              </div>
              <p className={`font-serif text-3xl ${t.id === 7 ? "text-iridescent" : "text-(--tier)"}`}>{t.name}</p>
              <p className="text-small text-muted">
                {t.colorName} · <span className="num">{t.color}</span>
              </p>
              <p className="text-small text-muted">{t.range}</p>
              <dl className="num grid grid-cols-[auto_1fr] gap-x-3 text-[12px] text-muted">
                <dt>sur fond</dt>
                <dd>
                  <Ratio fg={t.color} bg={BG} />
                </dd>
                <dt>sur surface</dt>
                <dd>
                  <Ratio fg={t.color} bg={ELEVATED} />
                </dd>
                <dt>pastille</dt>
                <dd>
                  <Ratio fg={t.color} bg={mix(t.color, SURFACE, 0.12)} />
                </dd>
                <dt>texte sombre</dt>
                <dd>
                  <Ratio fg={BG} bg={t.color} />
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
        <div className="card-surface flex flex-col gap-6 overflow-hidden p-6">
          <div>
            <p className="text-small text-muted">Instrument Serif · titres 96 / 72 / 48</p>
            <p className="font-serif text-title-1">Démesure</p>
            <p className="font-serif text-title-2">Quotidien</p>
            <p className="font-serif text-title-3">Monnaie</p>
          </div>
          <div>
            <p className="text-small text-muted">Inter Tight · texte 16 / petit 13</p>
            <p className="text-body">Avec ce prix, tu t&apos;offres quelques siècles de streaming. Factuel, punchy, jamais méprisant.</p>
            <p className="text-small text-muted">Prix de détail neuf · nov. 2026 · fiabilité C</p>
          </div>
          <div>
            <p className="text-small text-muted">JetBrains Mono · chiffres tabulaires</p>
            <p className="num text-[clamp(56px,12vw,160px)] leading-none text-tier-7">{formatPrice(1.9e9)}</p>
            <p className="num text-2xl">
              {[0.00004, 1299, 4.2e6, 1.9e9, 1.1e14].map((v) => formatPrice(v)).join("  ·  ")}
            </p>
          </div>
        </div>
      </Section>

      <Section id="espacement" title="Espacements et rayons">
        <div className="card-surface flex flex-wrap items-end gap-6 p-6">
          {[4, 8, 12, 16, 24, 32, 48, 64].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <span className="block bg-tier-4/60" style={{ width: s, height: s }} />
              <span className="num text-[12px] text-muted">{s}</span>
            </div>
          ))}
          <div className="ml-auto flex items-end gap-4">
            <span className="grid h-16 w-24 place-items-center rounded-[20px] border border-line text-[12px] text-muted">20px</span>
            <span className="grid h-10 w-24 place-items-center rounded-full border border-line text-[12px] text-muted">999px</span>
          </div>
        </div>
        <p className="text-small text-muted">Grille de 4 px. Courbe principale : cubic-bezier(0.22, 1, 0.36, 1).</p>
      </Section>

      <Section id="compteur" title="Compteur à rouleaux + altimètre">
        <CounterDemo />
        <p className="text-small text-muted">
          Colonnes 0-9 animées par ressort (raideur 120, amortissement 20), 30 ms de décalage par chiffre de droite à
          gauche. L&apos;altimètre complet (règle verticale sur desktop, barre horizontale sur mobile) vit sur l&apos;Ascension.
        </p>
      </Section>

      <Section id="cartes" title="Cartes">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {samples.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} className="h-full" />
            </li>
          ))}
          <li>
            <CardSkeleton />
          </li>
        </ul>
      </Section>

      <Section id="elements" title="Badges, pictos, boutons">
        <div className="card-surface flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <ConfidenceBadge level="A" />
            <ConfidenceBadge level="B" />
            <ConfidenceBadge level="C" />
            <DemoBadge />
          </div>
          <PriceStamp
            price={{ price_type: "auction_record", observed_at: "2017-11-01", confidence: "B", unit: "piece" }}
          />
          <div className="flex flex-wrap gap-3">
            {samples.map((i) => (
              <Picto key={i.id} subcategory={i.subcategory_id} category={i.category_id} tier={i.tier} size={56} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/">Principal</ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Verre
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
