import Link from 'next/link';

export function Logo({ dark = false, href = '/' }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="ProspectIQ — accueil">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill={dark ? '#ffffff' : '#0c1330'} />
        <circle cx="14.5" cy="14.5" r="6.5" fill="none" stroke="#818cf8" strokeWidth="2.6" />
        <path d="m19.5 19.5 5 5" stroke="#818cf8" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="14.5" cy="14.5" r="2.2" fill={dark ? '#0c1330' : '#ffffff'} />
      </svg>
      <span className={`text-[17px] font-bold tracking-tight ${dark ? 'text-white' : 'text-night-900'}`}>
        Prospect<span className={dark ? 'text-electric-400' : 'text-electric-600'}>IQ</span>
      </span>
    </Link>
  );
}
