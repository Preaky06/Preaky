// Composants d'interface partagés.
import { h, frag, dayKey, weekDays } from './util.js';
import { icon, gameIconHTML, GEM } from './icons.js';
import { avatarSVG } from './avatar.js';
import { illus } from './illus.js';
import * as store from './store.js';
import { DOMAINS } from './content.js';

export const PCOLORS = ['#FF5B1F', '#3DB4FF', '#FF4F9A', '#5FC434'];

export const avatarEl = (av, size = 48, mood = null, cls = '') => h('span', { class: `av ${cls}`, html: avatarSVG(av, { size, mood }) });

export function gemPill(amount, cls = '') {
  return h('span', { class: `gem-pill ${cls}` }, h('b', { class: 'gem-n' }, String(amount)), frag(GEM));
}

export function gameBadge(game, size = '') {
  return h('span', { class: `gbadge ${size} d-${game.domain}`, html: gameIconHTML(game.id) || '' });
}

export function gameArt(game, cls = 'card-art') {
  return h('span', { class: cls, html: illus(game.id) });
}

export function domainChip(domainId) {
  return h('span', { class: `chip d-${domainId}` }, h('span', { class: 'dot' }), DOMAINS[domainId].name);
}

export function levelBar(pl, { compact = false } = {}) {
  const li = store.levelInfo(pl.xp);
  return h('div', { class: `lvl ${compact ? 'compact' : ''}` },
    h('span', { class: 'lvl-n' }, `Niveau ${li.level}`),
    h('span', { class: 'lvl-track' }, h('i', { style: `width:${Math.round(li.frac * 100)}%` })),
    !compact && h('span', { class: 'lvl-xp' }, `${pl.xp - li.cur} / ${li.next - li.cur} XP`));
}

// En-tête des onglets : avatar, prénom, niveau, gemmes.
export function topHeader(pl, { onAvatar, onGems } = {}) {
  const li = store.levelInfo(pl.xp);
  return h('header', { class: 'top' },
    h('button', { class: 'top-av', type: 'button', 'aria-label': 'Mon profil', onClick: onAvatar }, avatarEl(pl.avatar, 50)),
    h('div', { class: 'top-id' },
      h('p', { class: 'top-name' }, pl.name),
      h('p', { class: 'top-lvl' }, `Niveau ${li.level}`, h('span', { class: 'top-bar' }, h('i', { style: `width:${Math.round(li.frac * 100)}%` })))),
    h('button', { class: 'top-gems', type: 'button', 'aria-label': `${pl.coins} gemmes, ouvrir la boutique`, onClick: onGems }, gemPill(pl.coins, 'big')));
}

// Carte « série » : 5 jours autour d'aujourd'hui, avec la récompense de chaque jour.
export function streakCard(pl, { onClaim, onPlay }) {
  const n = store.streak(pl);
  const today = new Date();
  const days = [-2, -1, 0, 1, 2].map(off => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + off, 12);
    const k = dayKey(d);
    const done = off < 0 ? store.activeOn(k, pl) : off === 0 ? !!pl.claims[k] : false;
    const dayName = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d.getDay()];
    return h('li', { class: `sk-day${off === 0 ? ' today' : ''}${done ? ' done' : ''}${off > 0 ? ' future' : ''}${off < 0 && !done ? ' missed' : ''}` },
      h('span', { class: 'sk-gem', html: done && off < 0 ? '' : GEM }), done && off < 0 ? icon('check', 'ic sk-check') : null,
      h('span', { class: 'sk-label' }, off === 0 ? 'Auj.' : dayName));
  });
  const claimable = store.canClaim(pl);
  const claimed = !!pl.claims[dayKey()];
  const reward = store.dailyReward(n);
  const btn = claimable
    ? h('button', { class: 'btn btn-white btn-block', type: 'button', onClick: onClaim }, 'Récupérer ', h('b', {}, `${reward}`), frag(GEM))
    : claimed
      ? h('button', { class: 'btn btn-white btn-block', type: 'button', disabled: true }, icon('check'), 'Récompense du jour récupérée')
      : h('button', { class: 'btn btn-white btn-block', type: 'button', onClick: onPlay }, icon('play'), `Joue une partie pour gagner ${reward}`, frag(GEM));
  return h('section', { class: 'streak' },
    h('div', { class: 'streak-head' },
      h('span', { class: 'streak-flame', html: icon('flame').outerHTML }),
      h('h2', { class: 'streak-title' }, n ? `${n} jour${n > 1 ? 's' : ''} de série !` : 'Lance ta série !'),
      h('span', { class: 'streak-note' }, 'Un jour de repos ne la casse pas')),
    h('ol', { class: 'sk-days' }, days),
    btn);
}

export function pageHead(title, sub) {
  return h('header', { class: 'page-head' },
    h('h1', { class: 'page-title', tabindex: '-1', 'data-focus': '' }, title),
    sub && h('p', { class: 'lead' }, sub));
}

export function sectionHead(title, aside) {
  return h('div', { class: 'sec-head' }, h('h2', { class: 'sec-title' }, title), aside || null);
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

export function weekStrip(pl = store.me()) {
  const today = dayKey();
  let active = 0;
  const cells = weekDays().map((d, i) => {
    const k = dayKey(d);
    const on = store.activeOn(k, pl);
    if (on) active++;
    const future = k > today;
    return h('li', { class: `day${on ? ' on' : ''}${k === today ? ' today' : ''}${future ? ' future' : ''}` },
      h('span', { class: 'day-dot' }, on ? icon('check') : ''),
      h('span', { class: 'day-l', 'aria-hidden': 'true' }, DAY_LETTERS[i]),
      h('span', { class: 'sr' }, `${DAY_NAMES[i]} : ${on ? 'joué' : future ? 'à venir' : 'pas joué'}`));
  });
  return { el: h('ol', { class: 'week' }, cells), active };
}

// Feuille modale en bas d'écran (remplace confirm(), bloqué dans certains contextes).
export function openSheet(parent, { title, text, body, actions, onDismiss, art }) {
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey, true); };
  const dismiss = () => { close(); onDismiss && onDismiss(); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); dismiss(); } };
  const back = h('div', { class: 'sheet-backdrop', onClick: e => { if (e.target === back) dismiss(); } },
    h('div', { class: 'sheet', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' },
      art || null,
      h('h2', { class: 'sheet-title', id: 'sheet-title' }, title),
      text && h('p', { class: 'muted' }, text),
      body || null,
      h('div', { class: 'sheet-actions' }, actions.map(a => h('button', {
        class: `btn btn-block btn-lg ${a.primary ? 'btn-primary' : a.danger ? 'btn-danger' : 'btn-ghost'}`,
        type: 'button',
        disabled: a.disabled || false,
        onClick: () => { if (a.keepOpen) { a.onClick && a.onClick(); return; } close(); a.onClick && a.onClick(); },
      }, a.label)))));
  parent.append(back);
  document.addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => back.querySelector('.sheet-actions button:not(:disabled)')?.focus());
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

// Ajout d'un joueur (famille, amis) : prénom + couleur.
export function addPlayerSheet(parent, onDone) {
  const input = h('input', { class: 'input', id: 'new-player', type: 'text', maxlength: '18', placeholder: 'Prénom', autocomplete: 'off' });
  openSheet(parent, {
    title: 'Nouveau joueur',
    text: 'Chacun a son avatar, sa progression, ses gemmes. Le classement de la semaine compare tous les joueurs de ce téléphone.',
    body: h('div', { class: 'field' }, h('label', { class: 'label', for: 'new-player' }, 'Prénom'), input),
    actions: [
      { label: 'Créer le joueur', primary: true, onClick: () => { const pl = store.createPlayer(input.value || ''); onDone && onDone(pl); } },
      { label: 'Annuler' },
    ],
  });
  requestAnimationFrame(() => input.focus());
}
