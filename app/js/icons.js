import { frag } from './util.js';

const S = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;

const ICONS = {
  back: S('<path d="M15 5l-7 7 7 7"/>'),
  chevR: S('<path d="m9 5 7 7-7 7"/>'),
  chev: S('<path d="m6 9 6 6 6-6"/>'),
  close: S('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: S('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  settings: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  more: S('<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>'),
  undo: S('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  erase: S('<path d="M20 20H9L4 15a2 2 0 0 1 0-2.8L13.2 3a2 2 0 0 1 2.8 0l4 4a2 2 0 0 1 0 2.8L11 19"/><path d="m8.5 8.5 7 7"/>'),
  pencil: S('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  hint: S('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>'),
  square: S('<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/>'),
  cross: S('<path d="M6 6l12 12M18 6 6 18"/>'),
  refresh: S('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4.5V11h-6.5"/>'),
  play: S('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'),
  clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  book: S('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>'),
  info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>'),
  trash: S('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/>'),
  install: S('<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/>'),
  // Pictogrammes des casse-têtes
  sudoku: S('<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/><path d="M6.4 5.9v1.3M11.4 11.2l1.2-.6v2.8" stroke-width="1.6"/>'),
  logimage: S('<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17"/><rect x="9.2" y="3.5" width="5.6" height="5.7" fill="currentColor" stroke="none"/><rect x="3.5" y="9.2" width="17" height="5.6" fill="currentColor" stroke="none"/><rect x="9.2" y="14.8" width="5.6" height="5.7" fill="currentColor" stroke="none"/>'),
  mots: S('<path d="M4 7h4M4 12h7M4 17h5"/><circle cx="16" cy="13" r="4"/><path d="m19 16 2.5 2.5"/>'),
  taquin: S('<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5"/><path d="M14 17h5.5M17.5 15l2 2-2 2"/>'),
  hanoi: S('<path d="M3 20h18M6.5 20V8M12 20V8M17.5 20V8"/><rect x="2.8" y="16.5" width="7.4" height="2.5" rx="1.2" fill="currentColor" stroke="none"/><rect x="3.8" y="13.5" width="5.4" height="2.5" rx="1.2" fill="currentColor" stroke="none"/><rect x="14.8" y="16.5" width="5.4" height="2.5" rx="1.2" fill="currentColor" stroke="none"/>'),
  bulb: S('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/><path d="M12 7v3"/>'),
  lock: S('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2"/>'),
};

export const iconHTML = name => ICONS[name] || '';
export function icon(name, cls = 'ic') {
  const el = frag(ICONS[name]);
  el.classList.add(...cls.split(/\s+/).filter(Boolean));
  return el;
}
