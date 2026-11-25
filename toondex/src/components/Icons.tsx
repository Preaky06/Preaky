/** Icônes et logo de ToonDex (SVG en ligne, couleurs fixes pour éviter les identifiants en double). */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="10" y="3" width="17" height="24" rx="3.5" transform="rotate(12 18.5 15)" fill="#ff8a3c" />
      <rect x="5" y="5" width="17" height="24" rx="3.5" fill="#ffc531" />
      <rect x="5" y="5" width="17" height="24" rx="3.5" fill="none" stroke="#ffffff" strokeOpacity="0.35" />
      <path d="M13.5 11.5l2.6 5-2.6 5-2.6-5z" fill="#2a1f00" />
    </svg>
  );
}

export function ArrowIcon({ className = "btn__icon" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3 8h9.5M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
