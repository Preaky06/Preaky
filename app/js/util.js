// Petits utilitaires partagés : création de DOM, temps « pausable », dates, formats FR.

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}

// Remplace le contenu d'un élément (accepte tableaux, null et false comme h()).
export function mount(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

export function frag(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Facteur d'accélération utilisé uniquement par les tests automatisés.
export const timeScale = () => globalThis.__pmTimeScale || 1;

/**
 * Scope : regroupe minuteurs et écouteurs d'une partie.
 * - pause()/resume() gèlent tous les minuteurs (appel, changement d'appli…)
 * - now() renvoie un temps qui n'avance pas pendant la pause
 * - dispose() coupe tout d'un coup quand on quitte
 */
export class Scope {
  constructor() {
    this.timers = new Set();
    this.offs = [];
    this.paused = false;
    this.dead = false;
    this.pausedAt = 0;
    this.pausedTotal = 0;
  }
  now() {
    const t = performance.now();
    const paused = this.pausedTotal + (this.paused ? t - this.pausedAt : 0);
    return (t - paused) / timeScale();
  }
  timeout(fn, ms) {
    const timer = { remaining: ms * timeScale(), start: performance.now(), id: 0 };
    timer.run = () => { this.timers.delete(timer); if (!this.dead) fn(); };
    if (!this.paused) timer.id = setTimeout(timer.run, timer.remaining);
    this.timers.add(timer);
    return timer;
  }
  clear(timer) {
    if (!timer) return;
    clearTimeout(timer.id);
    this.timers.delete(timer);
  }
  sleep(ms) {
    return new Promise(resolve => this.timeout(resolve, ms));
  }
  raf(fn) {
    const loop = () => {
      if (this.dead) return;
      if (!this.paused) fn(this.now());
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  pause() {
    if (this.paused || this.dead) return;
    this.paused = true;
    this.pausedAt = performance.now();
    for (const t of this.timers) {
      clearTimeout(t.id);
      t.remaining -= this.pausedAt - t.start;
    }
  }
  resume() {
    if (!this.paused || this.dead) return;
    const n = performance.now();
    this.pausedTotal += n - this.pausedAt;
    this.paused = false;
    for (const t of this.timers) {
      t.start = n;
      t.id = setTimeout(t.run, Math.max(0, t.remaining));
    }
  }
  on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this.offs.push(() => target.removeEventListener(type, fn, opts));
  }
  dispose() {
    this.dead = true;
    for (const t of this.timers) clearTimeout(t.id);
    this.timers.clear();
    this.offs.forEach(off => off());
    this.offs = [];
  }
}

// Réaction immédiate au doigt (pointerdown) + clavier (Entrée/Espace) pour l'accessibilité.
export function tap(scope, el, fn) {
  scope.on(el, 'pointerdown', e => {
    if (e.button > 0 || scope.paused) return;
    e.preventDefault();
    fn(e);
  });
  scope.on(el, 'click', e => {
    if (e.detail === 0 && !scope.paused) fn(e);
  });
}

export function dayKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Semaine courante, du lundi au dimanche (usage français).
export function weekDays(d = new Date()) {
  const offset = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset, 12);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12));
}

export function hashStr(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

const NBSP = ' ';
const NNBSP = ' ';
export const fmtPct = r => `${Math.round(r * 100)}${NNBSP}%`;
export const fmtSec = ms => `${(ms / 1000).toFixed(1).replace('.', ',')}${NBSP}s`;
export const fmtNum = n => String(Math.round(n * 10) / 10).replace('.', ',');
