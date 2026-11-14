// Composants d'interface partagés (sans framework).
import config from './config.mjs';
import { planName } from './plans.mjs';

/** Crée un élément : h('div', { class: 'x', onclick }, enfant, 'texte') */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const svg = (paths, size = 18, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;

export const ICONS = {
  check: (s) => svg('<path d="M20 6 9 17l-5-5"/>', s),
  x: (s) => svg('<path d="M18 6 6 18M6 6l12 12"/>', s),
  up: (s) => svg('<path d="m18 15-6-6-6 6"/>', s),
  down: (s) => svg('<path d="m6 9 6 6 6-6"/>', s),
  left: (s) => svg('<path d="m15 18-6-6 6-6"/>', s),
  right: (s) => svg('<path d="m9 18 6-6-6-6"/>', s),
  rotL: (s) => svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>', s),
  rotR: (s) => svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>', s),
  trash: (s) => svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>', s),
  plus: (s) => svg('<path d="M12 5v14M5 12h14"/>', s),
  download: (s) => svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>', s),
  upload: (s) => svg('<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>', s),
  lock: (s) => svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', s),
  sparkle: (s) => svg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>', s),
  file: (s) => svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>', s),
  refresh: (s) => svg('<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>', s),
  grip: (s) => svg('<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>', s),
};

export const icon = (name, size) => {
  const span = document.createElement('span');
  span.style.display = 'contents';
  span.innerHTML = ICONS[name](size);
  return span.firstElementChild;
};

export function iconButton(name, label, onclick, extraClass = '') {
  const b = h('button', { type: 'button', class: `icon-btn ${extraClass}`.trim(), title: label, 'aria-label': label, onclick });
  b.append(icon(name, 16));
  return b;
}

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: i === 0 ? 0 : 1 })} ${units[i]}`;
}

// ── Toasts ──
export function toast(message, { type = 'info', timeout = 4500 } = {}) {
  const host = document.querySelector('.toasts') || document.body.appendChild(h('div', { class: 'toasts', 'aria-live': 'polite' }));
  const el = h('div', { class: `toast ${type}`, role: type === 'err' ? 'alert' : 'status' });
  if (type === 'ok') el.append(icon('check', 18));
  el.append(h('span', {}, message));
  host.append(el);
  setTimeout(() => el.remove(), timeout);
  return el;
}

// ── Modales ──
export function modal(build, { onClose } = {}) {
  const dlg = h('dialog', { class: 'modal' });
  const close = () => dlg.close();
  dlg.addEventListener('close', () => {
    dlg.remove();
    onClose?.();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
  });
  const closeBtn = iconButton('x', 'Fermer', close, 'modal-close');
  dlg.append(closeBtn, ...[].concat(build(close)));
  document.body.append(dlg);
  dlg.showModal();
  return { dialog: dlg, close };
}

/** Fenêtre « passer au plan supérieur ». */
export function paywall({ reason, requiredPlan } = {}) {
  const id = requiredPlan || Object.keys(config.plans)[1];
  const plan = config.plans[id];
  const perks = (plan?.features || []).slice(0, 4);
  return modal((close) => [
    h(
      'div',
      { class: 'modal-body' },
      h('div', { class: 'paywall-icon', html: ICONS.sparkle(26) }),
      h('h2', {}, `Passez à ${planName(id)}`),
      h('p', {}, reason || `Cette fonctionnalité est incluse dans le plan ${planName(id)}.`),
      plan?.price?.monthly ? h('p', { class: 'muted small' }, `À partir de ${plan.price.monthly} € / mois, sans engagement.`) : null,
      h('ul', { class: 'paywall-perks' }, perks.map((p) => h('li', { html: `${ICONS.check(17)}<span></span>` }, p))),
    ),
    h(
      'div',
      { class: 'modal-actions' },
      h('a', { class: 'btn btn-ghost', href: '/compte' }, 'J’ai une licence'),
      h('a', { class: 'btn btn-accent', href: `/tarifs?plan=${id}` }, 'Voir les tarifs'),
    ),
  ]);
}

// ── Fichiers ──
export function matchesAccept(file, accept) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  return accept.split(',').some((rule) => {
    rule = rule.trim().toLowerCase();
    if (!rule) return false;
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return file.type.startsWith(rule.slice(0, -1));
    return file.type === rule;
  });
}

export function pickFiles({ accept, multiple }) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept, multiple, style: { display: 'none' } });
    input.addEventListener('change', () => {
      resolve([...input.files]);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}

export function createDropzone({ accept, multiple, title, hint, limitsText, onFiles }) {
  const input = h('input', { type: 'file', accept, multiple, tabindex: '-1', 'aria-hidden': 'true' });
  const zone = h(
    'div',
    { class: 'dropzone', role: 'button', tabindex: '0', 'aria-label': title },
    input,
    h('div', { class: 'dz-icon', html: ICONS.upload(28) }),
    h('h2', {}, title),
    h('p', {}, hint),
    h('span', { class: 'btn btn-primary' }, multiple ? 'Choisir des fichiers' : 'Choisir un fichier'),
    limitsText ? h('p', { class: 'dz-limits' }, limitsText) : null,
  );
  const emit = (files) => {
    const valid = files.filter((f) => matchesAccept(f, accept));
    if (files.length && !valid.length) {
      toast('Format de fichier non pris en charge par cet outil.', { type: 'err' });
      return;
    }
    if (valid.length < files.length) toast(`${files.length - valid.length} fichier(s) ignoré(s) : format non pris en charge.`);
    if (valid.length) onFiles(multiple ? valid : valid.slice(0, 1));
  };
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => {
    emit([...input.files]);
    input.value = '';
  });
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('over');
    emit([...(e.dataTransfer?.files || [])]);
  });
  return zone;
}

/** Permet de déposer des fichiers n'importe où sur la page. Retourne une fonction de nettoyage. */
export function pageDrop({ accept, onFiles }) {
  let depth = 0;
  let overlay = null;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  const enter = (e) => {
    if (!hasFiles(e)) return;
    depth++;
    if (!overlay) overlay = document.body.appendChild(h('div', { class: 'drop-overlay' }, 'Déposez pour ajouter'));
  };
  const leave = () => {
    depth = Math.max(0, depth - 1);
    if (!depth && overlay) {
      overlay.remove();
      overlay = null;
    }
  };
  const over = (e) => {
    if (hasFiles(e)) e.preventDefault();
  };
  const drop = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    overlay?.remove();
    overlay = null;
    const files = [...e.dataTransfer.files].filter((f) => matchesAccept(f, accept));
    if (files.length) onFiles(files);
    else toast('Format de fichier non pris en charge par cet outil.', { type: 'err' });
  };
  window.addEventListener('dragenter', enter);
  window.addEventListener('dragleave', leave);
  window.addEventListener('dragover', over);
  window.addEventListener('drop', drop);
  return () => {
    window.removeEventListener('dragenter', enter);
    window.removeEventListener('dragleave', leave);
    window.removeEventListener('dragover', over);
    window.removeEventListener('drop', drop);
    overlay?.remove();
  };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename, style: { display: 'none' } });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── Progression ──
export function progressView(label = 'Traitement en cours…') {
  const bar = h('i');
  const text = h('span', {}, label);
  const pct = h('span', {}, '');
  const el = h('div', { class: 'progress', role: 'status' }, h('div', { class: 'progress-bar' }, bar), h('div', { class: 'progress-label' }, text, pct));
  return {
    el,
    set(fraction, message) {
      const p = Math.max(0, Math.min(1, fraction));
      bar.style.width = `${(p * 100).toFixed(1)}%`;
      pct.textContent = `${Math.round(p * 100)} %`;
      if (message) text.textContent = message;
    },
  };
}

/** Écran de résultat avec téléchargement. */
export function resultView({ title = 'C’est prêt !', text, stats = [], blob, filename, onRestart, extra = [] }) {
  const download = () => downloadBlob(blob, filename);
  const el = h(
    'div',
    { class: 'result' },
    h('div', { class: 'r-icon', html: ICONS.check(34) }),
    h('h2', {}, title),
    text ? h('p', {}, text) : null,
    stats.length ? h('div', { class: 'stat-row' }, stats.map((s) => h('div', { class: 'stat' }, h('b', {}, s.value), s.label))) : null,
    h(
      'div',
      { class: 'r-actions' },
      blob ? h('button', { type: 'button', class: 'btn btn-accent btn-lg', onclick: download, 'data-testid': 'download' }, icon('download', 18), `Télécharger ${filename}`) : null,
      ...extra,
      onRestart ? h('button', { type: 'button', class: 'btn btn-ghost btn-lg', onclick: onRestart }, 'Recommencer') : null,
    ),
    h('p', { class: 'small muted' }, 'Traité sur votre appareil. Rien n’a été envoyé sur Internet.'),
  );
  if (blob) setTimeout(download, 50);
  return el;
}

/** Tri par glisser-déposer : souris partout, tactile via [data-drag-handle]. */
export function makeSortable(container, { itemSelector, onMove }) {
  container.addEventListener('pointerdown', (e) => {
    const item = e.target.closest(itemSelector);
    if (!item || !container.contains(item) || e.button !== 0) return;
    if (e.target.closest('button, input, select, a, textarea, label')) return;
    const handle = e.target.closest('[data-drag-handle]');
    if (e.pointerType === 'touch' && !handle) return;
    if (e.pointerType === 'mouse') e.preventDefault();
    const items = () => [...container.querySelectorAll(itemSelector)];
    const from = items().indexOf(item);
    const sx = e.clientX;
    const sy = e.clientY;
    let started = false;
    let target = null;
    let after = false;
    const clear = () => container.querySelectorAll('.drop-before, .drop-after').forEach((el) => el.classList.remove('drop-before', 'drop-after'));
    const move = (ev) => {
      if (!started) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        started = true;
        item.classList.add('dragging');
      }
      ev.preventDefault();
      clear();
      let best = null;
      let bestD = Infinity;
      for (const el of items()) {
        if (el === item) continue;
        const r = el.getBoundingClientRect();
        const d = Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2));
        if (d < bestD) {
          bestD = d;
          best = el;
        }
      }
      target = best;
      if (best) {
        const r = best.getBoundingClientRect();
        after = ev.clientX > r.left + r.width / 2;
        best.classList.add(after ? 'drop-after' : 'drop-before');
      }
      if (ev.clientY < 70) window.scrollBy(0, -14);
      else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      item.classList.remove('dragging');
      clear();
      if (!started) return;
      const stop = (ce) => {
        ce.stopPropagation();
        ce.preventDefault();
      };
      container.addEventListener('click', stop, { capture: true, once: true });
      setTimeout(() => container.removeEventListener('click', stop, { capture: true }), 0);
      if (!target) return;
      let to = items().indexOf(target) + (after ? 1 : 0);
      if (from < to) to -= 1;
      if (to !== from) onMove(from, to);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
}

export function moveItem(list, from, to) {
  const [x] = list.splice(from, 1);
  list.splice(to, 0, x);
  return list;
}

/** Champ radio segmenté. options : [[valeur, libellé], …] */
export function segmented(name, options, value, onChange, { wrap = false } = {}) {
  const el = h('div', { class: `segmented${wrap ? ' wrap' : ''}`, role: 'radiogroup' });
  for (const [v, label] of options) {
    const input = h('input', { type: 'radio', name, value: v, checked: String(v) === String(value) });
    input.addEventListener('change', () => input.checked && onChange(v));
    el.append(h('label', {}, input, label));
  }
  return el;
}

export function field(label, control, help) {
  const id = `f-${Math.random().toString(36).slice(2, 8)}`;
  const ctl = control instanceof Node ? control : h('span', {}, control);
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(ctl.tagName)) ctl.id = id;
  return h('div', { class: 'field' }, h('label', { for: id }, label), ctl, help ? h('p', { class: 'help' }, help) : null);
}

export function errorMessage(err) {
  return err?.userMessage || 'Une erreur est survenue pendant le traitement. Le fichier est peut-être endommagé.';
}

/** Remplace le contenu d'un élément en ignorant les valeurs vides (null, undefined, false). */
export function put(el, ...children) {
  el.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}
