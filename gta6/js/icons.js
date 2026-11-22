/* Illustrations « 3D » des catégories + icônes d'interface (SVG inline) */
let __uid = 0;
const uid = () => "g" + (++__uid);

function art(name) {
  const u = uid();
  const shadow = `<ellipse cx="60" cy="110" rx="34" ry="5" fill="#000" opacity=".25"/>`;
  const shine = (x, y, w, h, r = 0) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" opacity=".35"/>`;
  switch (name) {
    case "map": return `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf5"/><stop offset="1" stop-color="#d9f3ea"/></linearGradient>
    <linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4efe6"/><stop offset="1" stop-color="#a5dccb"/></linearGradient>
    <radialGradient id="${u}p" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff9fc8"/><stop offset=".6" stop-color="#ff3d8b"/><stop offset="1" stop-color="#c0145c"/></radialGradient>
  </defs>
  ${shadow}
  <g transform="translate(0 6)">
    <polygon points="14,34 42,26 42,94 14,102" fill="url(#${u}a)"/>
    <polygon points="42,26 74,36 74,104 42,94" fill="url(#${u}b)"/>
    <polygon points="74,36 104,28 104,96 74,104" fill="url(#${u}a)"/>
    <path d="M22 84 C34 70, 46 86, 58 70 S 84 62, 96 48" fill="none" stroke="#ff4f9a" stroke-width="3.5" stroke-dasharray="6 5" stroke-linecap="round"/>
    <path d="M18 52 q10 -6 18 2" fill="none" stroke="#2fb8a3" stroke-width="3" opacity=".6"/>
    <path d="M80 80 q8 -8 18 -4" fill="none" stroke="#2fb8a3" stroke-width="3" opacity=".6"/>
  </g>
  <g class="art-float">
    <path d="M78 10 c-12 0 -20 8.5 -20 19.5 c0 14 20 32 20 32 s20 -18 20 -32 C98 18.5 90 10 78 10z" fill="url(#${u}p)"/>
    <circle cx="78" cy="29" r="7.5" fill="#fff"/>
    <ellipse cx="71" cy="18" rx="5" ry="3" fill="#fff" opacity=".5" transform="rotate(-30 71 18)"/>
  </g>
</svg>`;
    case "pad": return `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9d3ff"/></linearGradient>
    <linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2450"/><stop offset="1" stop-color="#14102b"/></linearGradient>
  </defs>
  ${shadow}
  <g class="art-float">
    <path d="M30 38 h60 c14 0 22 12 24 30 c2 18 -2 34 -14 34 c-10 0 -14 -12 -22 -16 h-36 c-8 4 -12 16 -22 16 c-12 0 -16 -16 -14 -34 C8 50 16 38 30 38z" fill="url(#${u}a)"/>
    <path d="M30 38 h60 c10 0 17 6 21 16 c-20 -8 -82 -8 -102 0 c4 -10 11 -16 21 -16z" fill="#fff" opacity=".7"/>
    <rect x="25" y="56" width="22" height="8" rx="3" fill="url(#${u}b)"/>
    <rect x="32" y="49" width="8" height="22" rx="3" fill="url(#${u}b)"/>
    <circle cx="86" cy="52" r="5.5" fill="#2fd3c4"/>
    <circle cx="96" cy="62" r="5.5" fill="#ff4f9a"/>
    <circle cx="76" cy="62" r="5.5" fill="#ffb13d"/>
    <circle cx="86" cy="72" r="5.5" fill="#8b5cf6"/>
    <circle cx="50" cy="80" r="7" fill="url(#${u}b)"/><circle cx="70" cy="80" r="7" fill="url(#${u}b)"/>
  </g>
</svg>`;
    case "car": return `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2e0"/><stop offset=".5" stop-color="#ffd0a8"/><stop offset="1" stop-color="#ff9466"/></linearGradient>
    <linearGradient id="${u}w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8be9ff"/><stop offset="1" stop-color="#2a5bd7"/></linearGradient>
  </defs>
  ${shadow}
  <g class="art-float">
    <path d="M8 76 c0 -8 4 -12 12 -13 l20 -3 l16 -14 c4 -3 8 -4 14 -4 h14 c6 0 10 2 14 6 l10 12 l6 2 c4 1 6 4 6 8 v8 c0 3 -2 5 -5 5 H13 c-3 0 -5 -2 -5 -5z" fill="url(#${u}a)"/>
    <path d="M46 60 l12 -11 c3 -2 6 -3 10 -3 h8 v14z" fill="url(#${u}w)"/>
    <path d="M80 46 h4 c4 0 7 1 9 4 l7 10 h-20z" fill="url(#${u}w)"/>
    <path d="M10 72 h100" stroke="#ff4f9a" stroke-width="3"/>
    ${shine(22, 64, 40, 3, 1.5)}
    <circle cx="32" cy="82" r="12" fill="#1d1830"/><circle cx="32" cy="82" r="5" fill="#cfd3e6"/>
    <circle cx="90" cy="82" r="12" fill="#1d1830"/><circle cx="90" cy="82" r="5" fill="#cfd3e6"/>
    <rect x="104" y="66" width="6" height="4" rx="2" fill="#fff6a8"/>
  </g>
</svg>`;
    case "egg": return `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <radialGradient id="${u}a" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#fff1c4"/><stop offset="1" stop-color="#f7c75d"/></radialGradient>
    <clipPath id="${u}c"><path d="M60 14 c20 0 34 32 34 54 c0 22 -15 36 -34 36 s-34 -14 -34 -36 C26 46 40 14 60 14z"/></clipPath>
  </defs>
  ${shadow}
  <g class="art-float">
    <path d="M60 14 c20 0 34 32 34 54 c0 22 -15 36 -34 36 s-34 -14 -34 -36 C26 46 40 14 60 14z" fill="url(#${u}a)"/>
    <g clip-path="url(#${u}c)">
      <path d="M20 52 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 v8 l-10 -8 l-10 8 l-10 -8 l-10 8 l-10 -8 l-10 8 l-10 -8 l-10 8z" fill="#ff4f9a"/>
      <rect x="20" y="72" width="80" height="7" fill="#2fd3c4"/>
      <circle cx="44" cy="90" r="4" fill="#8b5cf6"/><circle cx="60" cy="92" r="4" fill="#ff8a1f"/><circle cx="76" cy="90" r="4" fill="#8b5cf6"/>
      <circle cx="50" cy="34" r="3.5" fill="#2fd3c4"/><circle cx="68" cy="30" r="3" fill="#ff8a1f"/>
    </g>
    <ellipse cx="47" cy="32" rx="6" ry="11" fill="#fff" opacity=".6" transform="rotate(20 47 32)"/>
  </g>
</svg>`;
    case "cash": return `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <radialGradient id="${u}a" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#d9ffd9"/><stop offset=".6" stop-color="#5fd36b"/><stop offset="1" stop-color="#1e8a3c"/></radialGradient>
    <radialGradient id="${u}c" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff6b0"/><stop offset=".6" stop-color="#ffc928"/><stop offset="1" stop-color="#d98a00"/></radialGradient>
  </defs>
  ${shadow}
  <g class="art-float">
    <path d="M60 36 c26 0 40 22 40 42 c0 18 -14 28 -40 28 s-40 -10 -40 -28 c0 -20 14 -42 40 -42z" fill="url(#${u}a)"/>
    <path d="M46 24 h28 l-6 14 h-16z" fill="#4cbf5c"/>
    <rect x="44" y="34" width="32" height="7" rx="3.5" fill="#1e7a35"/>
    <text x="60" y="88" text-anchor="middle" font-family="Outfit, Arial, sans-serif" font-weight="900" font-size="34" fill="#fff">$</text>
    <ellipse cx="40" cy="62" rx="6" ry="12" fill="#fff" opacity=".35" transform="rotate(25 40 62)"/>
  </g>
  <g class="art-float art-float--late">
    <circle cx="96" cy="34" r="14" fill="url(#${u}c)"/>
    <circle cx="96" cy="34" r="9" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>
  </g>
</svg>`;
    case "safe": return `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6ff"/><stop offset="1" stop-color="#aab4e8"/></linearGradient>
    <radialGradient id="${u}d" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff6b0"/><stop offset=".6" stop-color="#ffc928"/><stop offset="1" stop-color="#d98a00"/></radialGradient>
  </defs>
  ${shadow}
  <g class="art-float">
    <rect x="18" y="18" width="84" height="84" rx="14" fill="url(#${u}a)"/>
    <rect x="26" y="26" width="68" height="68" rx="9" fill="#2b2f8f" opacity=".15"/>
    <circle cx="60" cy="60" r="20" fill="url(#${u}d)"/>
    <circle cx="60" cy="60" r="8" fill="#fff" opacity=".85"/>
    <g stroke="#7a4d00" stroke-width="2.5" stroke-linecap="round">
      <line x1="60" y1="42" x2="60" y2="46"/><line x1="60" y1="74" x2="60" y2="78"/>
      <line x1="42" y1="60" x2="46" y2="60"/><line x1="74" y1="60" x2="78" y2="60"/>
    </g>
    <rect x="86" y="46" width="6" height="28" rx="3" fill="#5d64c9"/>
    ${shine(24, 22, 46, 4, 2)}
  </g>
</svg>`;
    case "trophy": return `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6b0"/><stop offset=".5" stop-color="#ffcb2e"/><stop offset="1" stop-color="#e08900"/></linearGradient>
  </defs>
  ${shadow}
  <g class="art-float">
    <path d="M34 20 h52 v24 c0 16 -12 28 -26 28 s-26 -12 -26 -28z" fill="url(#${u}a)"/>
    <path d="M34 28 h-12 c0 14 6 22 16 24" fill="none" stroke="#ffcb2e" stroke-width="6" stroke-linecap="round"/>
    <path d="M86 28 h12 c0 14 -6 22 -16 24" fill="none" stroke="#ffcb2e" stroke-width="6" stroke-linecap="round"/>
    <rect x="54" y="70" width="12" height="16" fill="#e8a200"/>
    <rect x="38" y="86" width="44" height="14" rx="4" fill="url(#${u}a)"/>
    <path d="M60 30 l4.5 9 l10 1.5 l-7.2 7 l1.7 10 l-9 -4.7 l-9 4.7 l1.7 -10 l-7.2 -7 l10 -1.5z" fill="#fff"/>
    ${shine(40, 24, 8, 26, 4)}
  </g>
</svg>`;
    case "bulb": return `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <radialGradient id="${u}a" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#fff59a"/><stop offset="1" stop-color="#ffc21a"/></radialGradient>
    <radialGradient id="${u}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff59a" stop-opacity=".9"/><stop offset="1" stop-color="#fff59a" stop-opacity="0"/></radialGradient>
  </defs>
  ${shadow}
  <circle cx="60" cy="48" r="44" fill="url(#${u}g)" class="art-pulse"/>
  <g class="art-float">
    <path d="M60 14 c18 0 30 13 30 30 c0 12 -7 19 -12 25 c-3 4 -4 8 -4 12 H46 c0 -4 -1 -8 -4 -12 c-5 -6 -12 -13 -12 -25 c0 -17 12 -30 30 -30z" fill="url(#${u}a)"/>
    <path d="M52 80 v-18 l8 8 l8 -8 v18" fill="none" stroke="#e08900" stroke-width="3" stroke-linejoin="round"/>
    <rect x="45" y="82" width="30" height="8" rx="3" fill="#8b98ff"/>
    <rect x="47" y="90" width="26" height="7" rx="3" fill="#6a76e8"/>
    <rect x="52" y="97" width="16" height="6" rx="3" fill="#4b55c9"/>
    <ellipse cx="48" cy="32" rx="5" ry="10" fill="#fff" opacity=".7" transform="rotate(30 48 32)"/>
  </g>
</svg>`;
    case "people": return `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9b8"/><stop offset="1" stop-color="#f0a77a"/></linearGradient>
    <linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98b64"/><stop offset="1" stop-color="#9c6040"/></linearGradient>
    <linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff4f9a"/><stop offset="1" stop-color="#8f3cff"/></linearGradient>
  </defs>
  ${shadow}
  <g class="art-float art-float--late">
    <path d="M70 104 c0 -20 10 -32 24 -32 s24 12 24 32z" fill="#2fd3c4"/>
    <circle cx="94" cy="54" r="15" fill="url(#${u}b)"/>
    <path d="M78 50 c2 -12 26 -14 31 0 c-6 -4 -24 -5 -31 0z" fill="#2a1a12"/>
  </g>
  <g class="art-float">
    <path d="M10 106 c0 -24 13 -38 32 -38 s32 14 32 38z" fill="url(#${u}s)"/>
    <circle cx="42" cy="44" r="19" fill="url(#${u}a)"/>
    <path d="M22 42 c0 -18 12 -26 22 -26 c12 0 20 8 20 22 c-8 -10 -28 -12 -42 4z" fill="#3a2416"/>
    <rect x="27" y="40" width="13" height="8" rx="3" fill="#1d1830"/><rect x="44" y="40" width="13" height="8" rx="3" fill="#1d1830"/>
    <rect x="39" y="42" width="6" height="2" fill="#1d1830"/>
    <rect x="29" y="41" width="5" height="2" rx="1" fill="#fff" opacity=".6"/>
  </g>
</svg>`;
  }
  return "";
}

/* Icônes d'interface (trait) */
const ICON = {
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.8 3 4 6 4 9.5s-1.2 6.5-4 9.5c-2.8-3-4-6-4-9.5s1.2-6.5 4-9.5z"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>`,
  ext: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17h.01"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5h.01"/></svg>`,
  bank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>`,
  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
  siren: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18v-6a5 5 0 0 1 10 0v6M5 21h14v-3H5zM12 2v2M4 6l1.5 1.5M20 6l-1.5 1.5"/></svg>`,
  scan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>`,
  stealth: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-2.6 3.5M6.3 6.3C3.6 8.1 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.3-1"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>`,
  gym: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>`,
  palm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 22c0-6-1-11-3-14M10 8C8 5 5 5 3 6c3 0 5 1 7 2zM10 8c1-3 4-5 8-4-3 1-5 2-8 4zM10 8c3-1 7 0 9 3-3-1-6-2-9-3zM10 8C7 8 4 10 4 13c2-2 4-4 6-5zM8 22h10"/></svg>`,
  car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16H3v-4l2-5h11l3 5h2v4h-2M7 16h8"/><circle cx="7" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/></svg>`,
  controller: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10a4 4 0 0 1 4 4l.8 5a2.5 2.5 0 0 1-4.3 2L15 15.5H9L6.5 18a2.5 2.5 0 0 1-4.3-2L3 11a4 4 0 0 1 4-4zM7.5 10v4M5.5 12h4M16 11h.01M18 13h.01"/></svg>`
};

/* Croix directionnelle : touche fléchée */
const ARROW = { U: 0, R: 90, D: 180, L: 270 };
function keycap(dir) {
  return `<span class="key" data-dir="${dir}" aria-label="${{U:"↑",D:"↓",L:"←",R:"→"}[dir]}"><svg viewBox="0 0 24 24" style="transform:rotate(${ARROW[dir]}deg)"><path d="M12 5 5 13h4.5v6h5v-6H19z" fill="currentColor"/></svg></span>`;
}
