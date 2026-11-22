// Composants d'interface partagés : barre de titre, feuille modale, interrupteur, choix segmenté.
import { h } from './util.js';
import { icon } from './icons.js';

export function topbar({ title, sub, onBack, actions = [] }) {
  return h('header', { class: 'topbar' },
    onBack ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', onClick: onBack }, icon('back')) : null,
    h('div', { class: 'tb-title' },
      h('h1', { tabindex: '-1', 'data-focus': '' }, title),
      sub ? h('p', {}, sub) : null),
    ...actions);
}

export const iconButton = (name, label, onClick) => h('button', { class: 'icon-btn', type: 'button', 'aria-label': label, onClick }, icon(name));

// Feuille modale en bas d'écran (remplace confirm(), bloqué dans certains contextes).
export function openSheet({ title, text, body, actions, onDismiss }) {
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey, true); prev?.focus?.(); };
  const dismiss = () => { close(); onDismiss && onDismiss(); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); dismiss(); } };
  const prev = document.activeElement;
  const back = h('div', { class: 'sheet-backdrop', onClick: e => { if (e.target === back) dismiss(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' },
      h('h2', { class: 'sheet-title', id: 'sheet-title' }, title),
      text ? h('p', { class: 'sheet-text' }, text) : null,
      body || null,
      h('div', { class: 'sheet-actions' }, actions.map(a => h('button', {
        class: `btn ${a.primary ? 'btn-primary' : a.danger ? 'btn-danger' : 'btn-secondary'}`,
        type: 'button',
        onClick: () => { close(); a.onClick && a.onClick(); },
      }, a.label)))));
  document.body.append(back);
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

export function fmtTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')} s`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

export function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
}
