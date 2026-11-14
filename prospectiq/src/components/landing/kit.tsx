// Briques visuelles des pages publiques : étiquettes de section, titres serrés bicolores,
// mot annoté (cadre de sélection en pointillés), boutons à flèche. Composants serveur, sans état.
import { BrandMark } from '../logo';
import { cx } from '../styles';

/** Étiquette de section : œil de la marque, « pro spectre » en mono, puis la rubrique. */
export function Kicker({ label, dark = false, center = false }: { label: string; dark?: boolean; center?: boolean }) {
  return (
    <p className={cx('flex items-center gap-2.5 text-[13px]', center && 'justify-center', dark ? 'text-slate-400' : 'text-slate-500')}>
      <BrandMark size={20} className="rounded-[5px]" />
      <span className={cx('font-mono text-[12.5px] font-medium tracking-[0.14em]', dark ? 'text-white' : 'text-night-900')}>pro spectre</span>
      <span className={cx('h-3.5 w-px', dark ? 'bg-white/20' : 'bg-night-900/15')} aria-hidden="true" />
      <span className={cx('font-semibold', dark ? 'text-violet-300' : 'text-brand-violet')}>{label}</span>
    </p>
  );
}

const TAG_TONES = {
  violet: 'bg-violet-50 text-violet-700 ring-violet-200/80',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200/80',
  slate: 'bg-white text-night-800 ring-night-900/10',
  dark: 'bg-white/10 text-violet-100 ring-white/15',
} as const;

/** Étiquette de rubrique : pastille colorée, point qui émet une onde, icône facultative. */
export function MonoTag({ children, dark = false, tone = 'violet', icon, className }: { children: React.ReactNode; dark?: boolean; tone?: keyof typeof TAG_TONES; icon?: React.ReactNode; className?: string }) {
  return (
    <p className={cx('inline-flex w-fit max-w-full items-center gap-2 self-start rounded-full px-3 py-1 text-[12.5px] leading-snug font-semibold ring-1 ring-inset', TAG_TONES[dark ? 'dark' : tone], className)}>
      {icon ?? <span className="tag-dot size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      <span>{children}</span>
    </p>
  );
}

/** Pastille mono avec point violet (au-dessus d'un titre principal). */
export function DotPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cx('inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3.5 py-1.5 font-mono text-[11px] font-medium tracking-[0.1em] text-night-800 uppercase shadow-sm backdrop-blur sm:text-[11.5px]', className)}>
      <span className="size-1.5 shrink-0 rounded-full bg-brand-violet shadow-[0_0_0_3px_rgb(124_58_237_/_0.15)]" />
      {children}
    </p>
  );
}

/** Titre de section : ligne principale à l'encre, seconde ligne en dégradé de marque. */
export function SectionHead({
  kicker,
  title,
  accent,
  children,
  center = false,
  dark = false,
  as: Tag = 'h2',
  className,
}: {
  kicker?: string;
  title: React.ReactNode;
  accent?: React.ReactNode;
  children?: React.ReactNode;
  center?: boolean;
  dark?: boolean;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  return (
    <div className={cx(center ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl', className)}>
      {kicker && <Kicker label={kicker} dark={dark} center={center} />}
      <Tag className={cx('font-display mt-5 text-[2.15rem] leading-[1.04] font-semibold tracking-[-0.045em] text-balance sm:text-[2.9rem] lg:text-[3.3rem]', dark ? 'text-white' : 'text-night-900')}>
        {title}
        {accent && (
          <>
            {' '}
            <span className={cx('block', dark ? 'bg-gradient-to-r from-violet-300 via-indigo-300 to-sky-300 bg-clip-text text-transparent' : 'text-brand')}>{accent}</span>
          </>
        )}
      </Tag>
      {children && <p className={cx('mt-5 text-[17px] leading-relaxed text-pretty sm:text-lg', center && 'mx-auto max-w-2xl', dark ? 'text-slate-300 [&_b]:font-medium [&_b]:text-white' : 'text-slate-600 [&_b]:font-medium [&_b]:text-night-900')}>{children}</p>}
    </div>
  );
}

/** Boutons des pages publiques (liens). `brand` violet, `light` blanc sur fond sombre, `outline` contour. */
export function ctaClass(kind: 'brand' | 'light' | 'outline' | 'outline-dark' = 'brand', size: 'md' | 'lg' = 'md') {
  return cx(
    'group inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 active:translate-y-px',
    size === 'md' ? 'h-11 px-5 text-[14.5px]' : 'h-12 px-6 text-[15px]',
    kind === 'brand' && 'bg-brand-violet text-white shadow-brand hover:-translate-y-px hover:bg-violet-700',
    kind === 'light' && 'bg-white text-night-900 shadow-float hover:-translate-y-px hover:bg-violet-50',
    kind === 'outline' && 'border border-night-900/12 bg-white text-night-900 hover:border-night-900/25 hover:bg-white',
    kind === 'outline-dark' && 'border border-white/20 text-white hover:bg-white/10',
  );
}
