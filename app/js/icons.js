import { frag } from './util.js';

const S = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;

const ICONS = {
  home: S('<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>'),
  games: S('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><circle cx="16.5" cy="16.5" r="3.6"/>'),
  progress: S('<path d="M4 4v15a1 1 0 0 0 1 1h15"/><path d="m8 14.5 3.5-4 3 2.5L19 7.5"/>'),
  settings: S('<path d="M4 7h10M18 7h2"/><circle cx="16" cy="7" r="2.2"/><path d="M4 17h3M11 17h9"/><circle cx="9" cy="17" r="2.2"/>'),
  close: S('<path d="M6 6l12 12M18 6 6 18"/>'),
  pause: S('<path d="M9 6v12M15 6v12"/>'),
  back: S('<path d="m15 5-7 7 7 7"/>'),
  chev: S('<path d="m6 9 6 6 6-6"/>'),
  check: S('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  play: S('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'),
  duo: S('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.3 2.8-5.2 5.5-5.2s4.9 1.9 5.5 5.2"/><circle cx="17" cy="9" r="2.6"/><path d="M15.6 14.4c2.6-.3 4.5 1.4 4.9 4.6"/>'),
  bulb: S('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>'),
  bolt: S('<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>'),
  leaf: S('<path d="M5 19C5 11 10 6 19 5c0 9-5 14-13 14z"/><path d="M5 19c3-4 6-6.5 9-8"/>'),
  lock: S('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
  backspace: S('<path d="M9 5h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z"/><path d="m12 9.5 5 5M17 9.5l-5 5"/>'),
  refresh: S('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4.5V11h-6.5"/>'),
  up: S('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  down: S('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  equal: S('<path d="M6 9.5h12M6 14.5h12"/>'),
  trophy: S('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>'),
  install: S('<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/>'),
  trash: S('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/>'),
  science: S('<path d="M9.5 3.5h5M10.5 3.5v5.5L5.2 18.2A1.5 1.5 0 0 0 6.5 20.5h11a1.5 1.5 0 0 0 1.3-2.3L13.5 9V3.5"/><path d="M7.5 14.5h9"/>'),
  shop: S('<path d="M5 9h14l-1.2 10.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 9V7.5a3 3 0 0 1 6 0V9"/>'),
  user: S('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-4 3.8-6.2 7.5-6.2s6.7 2.2 7.5 6.2"/>'),
  podium: S('<path d="M9 20V9h6v11M3 20v-6h6M15 20v-8h6v8M2 20h20"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  chevR: S('<path d="m9 5 7 7-7 7"/>'),
  swap: S('<path d="M7 7h12l-3-3M17 17H5l3 3"/>'),
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21C5 15.5 2 12.5 2 8.6 2 5.8 4.2 3.7 6.9 3.7c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 2.7 0 4.9 2.1 4.9 4.9 0 3.9-3 6.9-10 12.4z" fill="currentColor"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12.5 2c.6 3.4 4.8 5.6 4.8 10.6A5.6 5.6 0 0 1 12 18.5a5.2 5.2 0 0 1-5.4-5.2c0-2.4 1.3-4 2.5-5.2.3 1.6 1 2.6 2 3.1-.3-3.6.4-6.4 1.4-9.2z" fill="#FF7A1A"/><path d="M12 22c-2.8 0-4.6-1.9-4.6-4.3 0-2 1.3-3.3 2.5-4.4.2 1.2.8 2 1.6 2.3-.1-2 .5-3.6 1.4-5 1.2 2.4 3.7 3.7 3.7 7 0 2.5-1.9 4.4-4.6 4.4z" fill="#FFC23D"/></svg>',
  arrowL: '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M36 15.5H18.5V7L3.5 20l15 13v-8.5H36z" fill="currentColor"/></svg>',
  arrowR: '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M4 15.5h17.5V7l15 13-15 13v-8.5H4z" fill="currentColor"/></svg>',
};

export const iconHTML = name => ICONS[name];
export function icon(name, cls = 'ic') {
  const el = frag(ICONS[name]);
  el.classList.add(...cls.split(/\s+/).filter(Boolean));
  return el;
}

// Pictogrammes des jeux : trait noir sur la couleur du domaine, façon autocollant.
const G = inner => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

const GAME_ICONS = {
  sequence: G('<rect x="6" y="6" width="10" height="10" rx="3"/><rect x="19" y="6" width="10" height="10" rx="3" fill="currentColor"/><rect x="32" y="6" width="10" height="10" rx="3"/><rect x="6" y="19" width="10" height="10" rx="3"/><rect x="19" y="19" width="10" height="10" rx="3" fill="currentColor"/><rect x="32" y="19" width="10" height="10" rx="3"/><rect x="6" y="32" width="10" height="10" rx="3" fill="currentColor"/><rect x="19" y="32" width="10" height="10" rx="3"/><rect x="32" y="32" width="10" height="10" rx="3"/>'),
  digits: G('<text x="24" y="30" text-anchor="middle" font-family="Titan One, Arial Rounded MT Bold, sans-serif" font-size="19" fill="currentColor" stroke="none">4729</text><path d="M7 37h15M26 37h15"/>'),
  arrows: G('<path d="M4.5 24h8M8 20.5 4.5 24 8 27.5"/><path d="M17 24h14M26 18l6 6-6 6" stroke-width="4"/><path d="M35.5 24h8M39 20.5 35.5 24l3.5 3.5"/>'),
  oddone: G('<circle cx="14" cy="14" r="7"/><circle cx="34" cy="14" r="7"/><circle cx="14" cy="34" r="7"/><path d="M40.6 31.6A7 7 0 1 1 36.4 27.4" stroke-width="3.4"/>'),
  patterns: G('<path d="M5 31 10 19l5 12z"/><path d="M19 20l12 5-12 5z"/><path d="M33 19l5 12 5-12z"/><path d="M10 40h28" stroke-dasharray="3 5"/>'),
  balance: G('<path d="M24 8v31M15 40h18M8 14h32"/><path d="M8 14 3.5 24h9zM40 14l-4.5 10h9z"/><circle cx="24" cy="8" r="2.5" fill="currentColor"/>'),
  bubbles: G('<circle cx="16" cy="30" r="10"/><circle cx="33" cy="17" r="8"/><circle cx="36" cy="36" r="5.5"/><path d="M13 25.5v9M31 14.5q4-1 4 2.5t-4 4h4"/>'),
  constellation: G('<path d="M9 36 19 22l12 6 9-16" stroke-dasharray="1 5"/><path d="m9 31 1.6 3.4 3.6.5-2.6 2.5.6 3.6L9 39.3 5.8 41l.6-3.6-2.6-2.5 3.6-.5z" fill="currentColor"/><path d="m19 17 1.4 3 3.2.5-2.3 2.2.5 3.2L19 24.4l-2.8 1.5.5-3.2-2.3-2.2 3.2-.5z" fill="currentColor"/><path d="m40 7 1.4 3 3.2.5-2.3 2.2.5 3.2L40 14.4l-2.8 1.5.5-3.2-2.3-2.2 3.2-.5z" fill="currentColor"/>'),
  slicer: G('<circle cx="24" cy="26" r="13"/><path d="M6 40 42 8" stroke-width="3.5"/><path d="M21 21.5v9h6"/>'),
  golf: G('<path d="M28 39V7l12 5-12 5"/><ellipse cx="22" cy="40" rx="15" ry="4"/><circle cx="14" cy="31" r="4" fill="currentColor"/>'),
  tug: G('<path d="M4 30c6-6 10 4 16-2s10 4 16-2 8 2 8 2"/><path d="M24 16v14"/><path d="M24 16l9 3-9 3" fill="currentColor"/>'),
  draw: G('<path d="M27 4 13 26h10l-3 18 15-24H25z" fill="currentColor"/>'),
  dots: G('<rect x="9" y="9" width="15" height="15" rx="2" fill="currentColor" stroke="none" opacity=".35"/><path d="M9 9h15v15M24 24h15M9 24v15"/><g fill="currentColor" stroke="none"><circle cx="9" cy="9" r="3"/><circle cx="24" cy="9" r="3"/><circle cx="39" cy="9" r="3"/><circle cx="9" cy="24" r="3"/><circle cx="24" cy="24" r="3"/><circle cx="39" cy="24" r="3"/><circle cx="9" cy="39" r="3"/><circle cx="24" cy="39" r="3"/><circle cx="39" cy="39" r="3"/></g>'),
  duel: G('<circle cx="15" cy="18" r="6"/><circle cx="33" cy="18" r="6"/><path d="M5 40c1-7 5-11 10-11s9 4 10 11M23 40c1-7 5-11 10-11s9 4 10 11"/>'),
};

export const gameIconHTML = id => GAME_ICONS[id];

// Gemme facettée (la monnaie de l'appli).
export const GEM = '<svg class="gem" viewBox="0 0 24 28" aria-hidden="true" focusable="false"><path d="M12 1 22 14 12 27 2 14z" fill="#FFC23D"/><path d="M12 1 22 14H12z" fill="#FFE27A"/><path d="M12 1 2 14h10z" fill="#FFD54F"/><path d="M2 14 12 27V14z" fill="#F2A900"/><path d="M22 14 12 27V14z" fill="#E09400"/><path d="M12 5.5 8.5 12.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".75"/></svg>';

// Logo : les trois encres d'imprimerie (cyan, magenta, jaune) qui se superposent.
export const LOGO = '<svg viewBox="0 0 48 48" class="logo-mark" aria-hidden="true" focusable="false"><circle cx="17.5" cy="19" r="12" style="fill:var(--cyan)"/><circle cx="30.5" cy="19" r="12" style="fill:var(--mag)"/><circle cx="24" cy="30" r="12" style="fill:var(--yel)"/></svg>';
