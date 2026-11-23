/** Éléments décoratifs originaux : gant de dessin animé et mascotte télé « Toono ». */

const INK = "#15161C";

/** Gant blanc qui pointe vers la droite, avec son bras en tuyau. Orienter avec CSS (rotate, scaleX). */
export function Glove({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-60 0 160 64" aria-hidden="true" focusable="false">
      <path d="M-60 32 Q-30 30 4 31" stroke={INK} strokeWidth="9" fill="none" strokeLinecap="round" />
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round" fill="#fff">
        <rect x="2" y="17" width="20" height="30" rx="7" />
        <rect x="19" y="13" width="38" height="38" rx="16" />
        <rect x="44" y="30" width="18" height="10" rx="5" />
        <rect x="42" y="39" width="17" height="10" rx="5" />
        <rect x="45" y="15" width="50" height="14" rx="7" />
        <rect x="30" y="5" width="18" height="13" rx="6.5" transform="rotate(-18 39 11)" />
      </g>
      <path d="M8 24 L8 40 M14 22 L14 42" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Mascotte : une petite télé avec des antennes. `peek` n'affiche que le haut, mains posées sur un bord. */
export function Toono({ className, peek = false }: { className?: string; peek?: boolean }) {
  return (
    <svg className={className} viewBox={peek ? "0 0 160 92" : "0 0 160 170"} aria-hidden="true" focusable="false">
      <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
        <path d="M70 34 L50 6" />
        <path d="M90 34 L112 8" />
      </g>
      <circle cx="49" cy="6" r="6" fill="#FF3D71" stroke={INK} strokeWidth="3" />
      <circle cx="113" cy="8" r="6" fill="#D8F36A" stroke={INK} strokeWidth="3" />
      <rect x="22" y="30" width="116" height="104" rx="26" fill="#FF3D71" stroke={INK} strokeWidth="4" />
      <rect x="34" y="42" width="78" height="70" rx="18" fill="#BFE6FF" stroke={INK} strokeWidth="3.5" />
      <circle cx="125" cy="58" r="5" fill={INK} />
      <circle cx="125" cy="76" r="5" fill={INK} />
      <ellipse cx="60" cy="72" rx="7" ry="9.5" fill={INK} />
      <ellipse cx="86" cy="72" rx="7" ry="9.5" fill={INK} />
      <circle cx="62.5" cy="68" r="2.6" fill="#fff" />
      <circle cx="88.5" cy="68" r="2.6" fill="#fff" />
      <ellipse cx="49" cy="86" rx="6" ry="3.5" fill="#FF8FA3" />
      <ellipse cx="97" cy="86" rx="6" ry="3.5" fill="#FF8FA3" />
      {!peek && <path d="M64 92 Q73 101 82 92" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />}
      {peek ? (
        <g stroke={INK} strokeWidth="3" fill="#fff">
          <rect x="6" y="72" width="38" height="20" rx="10" />
          <rect x="116" y="72" width="38" height="20" rx="10" />
          <path d="M16 74 L16 84 M25 73 L25 84 M34 74 L34 84 M126 74 L126 84 M135 73 L135 84 M144 74 L144 84" strokeWidth="2.2" />
        </g>
      ) : (
        <g stroke={INK} strokeWidth="4" strokeLinecap="round">
          <path d="M58 134 L54 160" />
          <path d="M102 134 L106 160" />
          <path d="M46 162 L60 162" />
          <path d="M100 162 L114 162" />
        </g>
      )}
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4.5 11.5 L11.5 4.5 M6 4.5 H11.5 V10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
