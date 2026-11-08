import Link from 'next/link';
import { cx } from './styles';

/**
 * Identité Pro Spectre : « Pro » dans un bloc jaune, « Spectre », puis l'œil au point rouge.
 * L'œil (deux croissants autour d'une pupille ajourée) est tracé sans masque, donc sûr à répéter dans une page.
 */
export const BRAND_YELLOW = '#FFE600';
export const BRAND_RED = '#E11D48';
export const EYE_PATH =
  'M2 34C12.1 22.63 26.46 16.05 41.49 14.26A21.5 21.5 0 0 0 41.49 53.74C26.46 51.95 12.1 45.37 2 34ZM98 34C87.9 22.63 73.54 16.05 58.51 14.26A21.5 21.5 0 0 1 58.51 53.74C73.54 51.95 87.9 45.37 98 34Z';

/** L'œil seul (largeur 100, hauteur 58 dans son repère), couleur héritée du texte. */
export function Eye({ className, dot = true }: { className?: string; dot?: boolean }) {
  return (
    <svg viewBox="0 0 100 58" aria-hidden="true" className={cx('shrink-0', className)}>
      <path d={EYE_PATH} fill="currentColor" />
      {dot && <circle cx="93" cy="7" r="6.8" fill={BRAND_RED} />}
    </svg>
  );
}

/** Icône carrée (onglet, application, petits formats) : bloc jaune, œil noir, point rouge. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={cx('shrink-0', className)}>
      <rect width="40" height="40" rx="10" fill={BRAND_YELLOW} />
      <g transform="translate(5 9.5) scale(0.3)">
        <path d={EYE_PATH} fill="#0a0a0a" />
        <circle cx="93" cy="7.5" r="6.5" fill={BRAND_RED} />
      </g>
    </svg>
  );
}

/** Logotype complet. La taille suit la taille de police (classes text-…). */
export function Wordmark({ dark = false, className, eye = true }: { dark?: boolean; className?: string; eye?: boolean }) {
  return (
    <span className={cx('font-display inline-flex items-end leading-none font-extrabold tracking-[-0.035em] whitespace-nowrap', dark ? 'text-white' : 'text-night-900', className)} aria-label="Pro Spectre">
      <span aria-hidden="true" className="mr-[0.07em] inline-flex h-[1.22em] translate-y-[0.12em] items-center rounded-[0.24em] px-[0.16em] text-[0.84em] text-[#0a0a0a]" style={{ background: BRAND_YELLOW }}>
        Pro
      </span>
      <span aria-hidden="true">Spectre</span>
      {eye && <Eye className="mb-[-0.03em] ml-[0.09em] h-[0.66em] w-auto" />}
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
