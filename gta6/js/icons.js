/* Icônes au trait (SVG inline) */
const S = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

const ICON = {
  sun: S(`<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/>`),
  moon: S(`<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>`),
  globe: S(`<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.8 3 4 6 4 9.5s-1.2 6.5-4 9.5c-2.8-3-4-6-4-9.5s1.2-6.5 4-9.5z"/>`),
  chevron: S(`<path d="m6 9 6 6 6-6"/>`, `stroke-width="2.4"`),
  back: S(`<path d="M19 12H5M11 18l-6-6 6-6"/>`, `stroke-width="2.4"`),
  search: S(`<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`),
  check: S(`<path d="m5 12.5 4.5 4.5L19 7.5"/>`, `stroke-width="3"`),
  copy: S(`<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>`),
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>`,
  ext: S(`<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>`),
  pin: S(`<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>`),
  close: S(`<path d="M6 6l12 12M18 6 6 18"/>`, `stroke-width="2.4"`),
  warn: S(`<path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17h.01"/>`),
  info: S(`<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5h.01"/>`),
  bank: S(`<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>`),
  save: S(`<path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>`),
  eye: S(`<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`),
  siren: S(`<path d="M7 18v-6a5 5 0 0 1 10 0v6M5 21h14v-3H5zM12 2v2M4 6l1.5 1.5M20 6l-1.5 1.5"/>`),
  scan: S(`<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/>`),
  stealth: S(`<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-2.6 3.5M6.3 6.3C3.6 8.1 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.3-1"/>`),
  map: S(`<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>`),
  gym: S(`<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>`),
  palm: S(`<path d="M13 22c0-6-1-11-3-14M10 8C8 5 5 5 3 6c3 0 5 1 7 2zM10 8c1-3 4-5 8-4-3 1-5 2-8 4zM10 8c3-1 7 0 9 3-3-1-6-2-9-3zM10 8C7 8 4 10 4 13c2-2 4-4 6-5zM8 22h10"/>`),
  car: S(`<path d="M5 16H3v-4l2-5h11l3 5h2v4h-2M7 16h8"/><circle cx="7" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/>`),
  controller: S(`<path d="M7 7h10a4 4 0 0 1 4 4l.8 5a2.5 2.5 0 0 1-4.3 2L15 15.5H9L6.5 18a2.5 2.5 0 0 1-4.3-2L3 11a4 4 0 0 1 4-4zM7.5 10v4M5.5 12h4M16 11h.01M18 13h.01"/>`),
  egg: S(`<path d="M12 3c3.6 0 6.5 5.4 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.4 8.4 3 12 3z"/><path d="m6.2 11 2.3-1.6 2.3 1.6 2.3-1.6 2.3 1.6 2.3-1.6"/>`),
  dollar: S(`<path d="M12 2.5v19M16.5 6.5c-.8-1.4-2.5-2.2-4.5-2.2-2.6 0-4.5 1.4-4.5 3.5 0 4.9 9.5 2.6 9.5 7.8 0 2.1-2.1 3.6-5 3.6-2.2 0-4.1-.9-5-2.5"/>`),
  safe: S(`<rect x="3" y="3.5" width="18" height="17" rx="2.5"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1.5M12 14.5V16M8 12h1.5M14.5 12H16M6 20.5v1.5M18 20.5v1.5"/>`),
  trophy: S(`<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>`),
  bulb: S(`<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>`),
  users: S(`<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.4 1.9 5 5"/>`),
  star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>`
};

/* Croix directionnelle : touche fléchée */
const ARROW = { U: 0, R: 90, D: 180, L: 270 };
function keycap(dir) {
  return `<span class="key" aria-label="${{ U: "↑", D: "↓", L: "←", R: "→" }[dir]}"><svg viewBox="0 0 24 24" style="transform:rotate(${ARROW[dir]}deg)"><path d="M12 5 5 13h4.5v6h5v-6H19z" fill="currentColor"/></svg></span>`;
}
