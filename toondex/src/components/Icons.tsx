/** Icônes et logo de ToonDex (SVG en ligne, couleurs fixes pour éviter les identifiants en double). */

/**
 * Logo : un diamant taillé (rareté, collection). Facettes en aplats, sans dégradé ni identifiant,
 * pour pouvoir l'afficher plusieurs fois dans la page.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M9 5h14l6.5 7.5L16 29 2.5 12.5z" fill="#2a1f00" />
      <path d="M9.6 6.2 4.4 12.2h7.2z" fill="#ffd25c" />
      <path d="M9.6 6.2h12.8l-2.9 6H12.5z" fill="#fff1b8" />
      <path d="m22.4 6.2 5.2 6h-7.2z" fill="#ffb81f" />
      <path d="M4.4 13.4h7.4L16 26.6z" fill="#ff9f1c" />
      <path d="M12.6 13.4h6.8L16 26.6z" fill="#ffd25c" />
      <path d="M20.2 13.4h7.4L16 26.6z" fill="#e07800" />
      <path d="M26.5 2.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="#ffffff" />
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
