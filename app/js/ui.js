// Composants d'interface réutilisés par les onglets et le lecteur de jeux.
import { h, frag, dayKey, weekDays } from './util.js';
import { icon, gameIconHTML, LOGO } from './icons.js';
import * as store from './store.js';
import { DOMAINS } from './content.js';

export function gameBadge(game, size = '') {
  return h('span', { class: `gbadge ${size} d-${game.domain}`, html: gameIconHTML(game.id) });
}

export function domainChip(domainId) {
  return h('span', { class: `chip d-${domainId}` }, h('span', { class: 'dot' }), DOMAINS[domainId].name);
}

export function brandBar() {
  return h('div', { class: 'brand' }, frag(LOGO), h('span', { class: 'brand-name' }, 'Preaky Mind'));
}

export function pageHead(title, sub) {
  return h('header', { class: 'page-head' },
    h('h1', { class: 'display page-title', tabindex: '-1', 'data-focus': '' }, title),
    sub && h('p', { class: 'lead' }, sub));
}

export function tipBlock(tip, { collapsed = false } = {}) {
  const body = [h('p', {}, tip.text), h('p', { class: 'small tip-life' }, h('b', {}, 'Dans la vraie vie : '), tip.life)];
  if (collapsed) {
    return h('details', { class: 'tip' },
      h('summary', { class: 'tip-head' }, icon('bulb'), h('span', { class: 'grow' }, `Astuce : ${tip.title}`), icon('chev', 'ic chev')),
      body);
  }
  return h('div', { class: 'tip' }, h('p', { class: 'tip-head' }, icon('bulb'), `Astuce : ${tip.title}`), body);
}

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function weekStrip() {
  const today = dayKey();
  let active = 0;
  const cells = weekDays().map((d, i) => {
    const k = dayKey(d);
    const on = store.activeOn(k);
    if (on) active++;
    const future = k > today;
    return h('li', { class: `day${on ? ' on' : ''}${k === today ? ' today' : ''}${future ? ' future' : ''}` },
      h('span', { class: 'day-dot' }, on ? icon('check') : ''),
      h('span', { class: 'day-l', 'aria-hidden': 'true' }, DAY_LETTERS[i]),
      h('span', { class: 'sr' }, `${DAY_NAMES[i]} : ${on ? 'joué' : future ? 'à venir' : 'pas joué'}`));
  });
  return { el: h('ol', { class: 'week' }, cells), active };
}

export function weekMessage(active) {
  if (active >= 4) return 'Objectif de la semaine atteint. Le reste, c’est du bonus.';
  const left = 4 - active;
  return `Objectif conseillé : 4 jours par semaine. Encore ${left} jour${left > 1 ? 's' : ''}.`;
}

// Feuille modale en bas d'écran (remplace confirm(), bloqué dans certains contextes).
export function openSheet(parent, { title, text, actions, onDismiss }) {
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey, true); };
  const dismiss = () => { close(); onDismiss && onDismiss(); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); dismiss(); } };
  const back = h('div', { class: 'sheet-backdrop', onClick: e => { if (e.target === back) dismiss(); } },
    h('div', { class: 'sheet', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' },
      h('h2', { class: 'display sheet-title', id: 'sheet-title' }, title),
      text && h('p', { class: 'muted' }, text),
      h('div', { class: 'sheet-actions' }, actions.map(a => h('button', {
        class: `btn btn-block btn-lg ${a.primary ? 'btn-primary' : a.danger ? 'btn-danger' : 'btn-ghost'}`,
        type: 'button',
        onClick: () => { close(); a.onClick && a.onClick(); },
      }, a.label)))));
  parent.append(back);
  document.addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => back.querySelector('.sheet-actions button')?.focus());
  return { close };
}

export function toggle(id, checked, onChange) {
  const b = h('button', { class: 'switch', id, type: 'button', role: 'switch', 'aria-checked': String(!!checked) });
  b.addEventListener('click', () => {
    const v = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(v));
    onChange(v);
  });
  return b;
}

export function segmented(id, options, value, onChange, label, cls = '') {
  const wrap = h('div', { class: `seg ${cls}`, id, role: 'group', 'aria-label': label });
  for (const [v, content, aria] of options) {
    const b = h('button', { type: 'button', 'aria-pressed': String(v === value), 'data-v': v, 'aria-label': aria }, content);
    b.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      onChange(v);
    });
    wrap.append(b);
  }
  return wrap;
}
