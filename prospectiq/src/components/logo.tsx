import Link from 'next/link';
import { cx } from './styles';

/**
 * Identité Pro Spectre : « Pro » en blanc dans un bloc violet, « Spectre », puis un point violet.
 * Icône seule : un œil (rond blanc, pupille noire) sur fond noir.
 */
export const BRAND_VIOLET = '#7C3AED';
/** Variante plus claire du violet, pour le point sur fond sombre (meilleur contraste). */
export const BRAND_VIOLET_LIGHT = '#8B5CF6';

/** Œil de l'icône : un rond blanc et une pupille noire, tournée vers le haut à droite (« on regarde »). */
export const EYE = { cx: 20, cy: 20, r: 12, pupil: { cx: 23.6, cy: 16.8, r: 5 } } as const;

/** Icône carrée (onglet, application, petits formats) : œil blanc à pupille noire sur fond noir. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={cx('shrink-0', className)}>
      <rect width="40" height="40" rx="10" fill="#0a0a0a" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" fill="none" stroke="#ffffff" strokeOpacity="0.14" />
      <circle cx={EYE.cx} cy={EYE.cy} r={EYE.r} fill="#ffffff" />
      <circle cx={EYE.pupil.cx} cy={EYE.pupil.cy} r={EYE.pupil.r} fill="#0a0a0a" />
    </svg>
  );
}

/** Logotype complet. La taille suit la taille de police (classes text-…). */
export function Wordmark({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={cx('font-display inline-flex items-end leading-none font-extrabold tracking-[-0.035em] whitespace-nowrap', dark ? 'text-white' : 'text-night-900', className)} aria-label="Pro Spectre">
      <span aria-hidden="true" className="mr-[0.07em] inline-flex h-[1.22em] translate-y-[0.12em] items-center rounded-[0.24em] px-[0.16em] text-[0.84em] text-white" style={{ background: BRAND_VIOLET }}>
        Pro
      </span>
      <span aria-hidden="true">Spectre</span>
      <span aria-hidden="true" className="mb-[0.02em] ml-[0.06em] inline-block size-[0.22em] shrink-0 rounded-full" style={{ background: dark ? BRAND_VIOLET_LIGHT : BRAND_VIOLET }} />
    </span>
  );
}

export function Logo({ dark = false, href = '/', size = 'md' }: { dark?: boolean; href?: string; size?: 'md' | 'lg' }) {
  return (
    <Link href={href} className="group inline-flex items-center pb-[0.12em] transition-transform duration-300 hover:-translate-y-px" aria-label="Pro Spectre, accueil">
      <Wordmark dark={dark} className={size === 'lg' ? 'text-[26px]' : 'text-[21px]'} />
    </Link>
  );
}
