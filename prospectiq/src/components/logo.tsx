import Link from 'next/link';
import { cx } from './styles';

/**
 * Marque Pro Spectre : cinq faisceaux de signaux (les cinq critères du score, aux couleurs du spectre)
 * convergent vers un point unique, le bon prospect.
 */
export const SPECTRUM = ['#a78bfa', '#818cf8', '#22d3ee', '#34d399', '#fbbf24'] as const;

export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  const rays: [number, string][] = [
    [10.5, SPECTRUM[0]],
    [15.25, SPECTRUM[1]],
    [20, SPECTRUM[2]],
    [24.75, SPECTRUM[3]],
    [29.5, SPECTRUM[4]],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={cx('shrink-0', className)}>
      <rect width="40" height="40" rx="11" fill="#0b1230" />
      <path d="M0 11C0 4.9 4.9 0 11 0h18c6.1 0 11 4.9 11 11v2C26 13 13 21 0 30z" fill="#ffffff" opacity="0.05" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" fill="none" stroke="#ffffff" strokeOpacity="0.12" />
      {rays.map(([y, c]) => (
        <path key={y} d={`M8 ${y} 21.5 20`} stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      ))}
      <path d="M21.5 20H27" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="30.6" cy="20" r="6.2" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.2" />
      <circle cx="30.6" cy="20" r="3.3" fill="#ffffff" />
    </svg>
  );
}

/** Nom de marque composé : « Pro » + « Spectre » en dégradé spectral. */
export function Wordmark({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={cx('font-display font-semibold tracking-[-0.025em] whitespace-nowrap', dark ? 'text-white' : 'text-night-900', className)}>
      Pro <span className={dark ? 'text-spectrum' : 'text-spectrum-deep'}>Spectre</span>
    </span>
  );
}

export function Logo({ dark = false, href = '/', size = 'md' }: { dark?: boolean; href?: string; size?: 'md' | 'lg' }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="Pro Spectre — accueil">
      <BrandMark size={size === 'lg' ? 40 : 32} className="transition-transform duration-300 group-hover:scale-105" />
      <Wordmark dark={dark} className={size === 'lg' ? 'text-[22px]' : 'text-[18px]'} />
    </Link>
  );
}
