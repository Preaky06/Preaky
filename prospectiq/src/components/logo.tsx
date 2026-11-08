import Link from 'next/link';
import { cx } from './styles';

/**
 * Identité Pro Spectre : « Pro » en blanc dans un bloc violet, « Spectre », puis un point violet.
 */
export const BRAND_VIOLET = '#7C3AED';
/** Variante plus claire du violet, pour le point sur fond sombre (meilleur contraste). */
export const BRAND_VIOLET_LIGHT = '#8B5CF6';

/** « P » géométrique tracé en chemin (lisible en 16 px, sans dépendre d'une police). */
export const P_PATH = 'M11 8.5h8.6a7.6 7.6 0 0 1 0 15.2H17.2v7.8H11zM17.2 13.9v4.4h2.2a2.2 2.2 0 0 0 0-4.4z';

/** Icône carrée (onglet, application, petits formats) : bloc violet, « P » blanc et son point. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={cx('shrink-0', className)}>
      <rect width="40" height="40" rx="10" fill={BRAND_VIOLET} />
      <path d={P_PATH} fill="#ffffff" fillRule="evenodd" />
      <circle cx="30.2" cy="28.4" r="3.1" fill="#ffffff" />
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
    <Link href={href} className="group inline-flex items-center pb-[0.12em] transition-transform duration-300 hover:-translate-y-px" aria-label="Pro Spectre — accueil">
      <Wordmark dark={dark} className={size === 'lg' ? 'text-[26px]' : 'text-[21px]'} />
    </Link>
  );
}
