// Mini moteur 2D pour les jeux d'arcade : canvas net (écrans Retina), boucle « pausable »,
// pointeur, particules, textes flottants, ondes de choc, secousses d'écran.
import { h } from './util.js';

export function setupCanvas(stage, scope, onResize) {
  const canvas = h('canvas', { class: 'cv' });
  stage.append(canvas);
  const g = canvas.getContext('2d');
  const view = { canvas, g, W: 1, H: 1 };
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const changed = Math.abs(r.width - view.W) > 0.5 || Math.abs(r.height - view.H) > 0.5;
    view.W = r.width;
    view.H = r.height;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (changed && onResize) onResize(view.W, view.H);
  };
  fit();
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    scope.offs.push(() => ro.disconnect());
  }
  return view;
}

// dt en secondes, plafonné (onglet en arrière-plan, gros ralentissement…).
export function loop(scope, frame) {
  let last = null;
  scope.raf(now => {
    const dt = last == null ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    frame(dt, now / 1000);
  });
}

export function pointer(scope, canvas, { down, move, up }) {
  const pos = e => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId };
  };
  scope.on(canvas, 'pointerdown', e => {
    if (scope.paused) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (down) down(pos(e), e);
  });
  scope.on(canvas, 'pointermove', e => { if (!scope.paused && move) move(pos(e), e); });
  const end = e => { if (up) up(pos(e), e); };
  scope.on(canvas, 'pointerup', end);
  scope.on(canvas, 'pointercancel', end);
}

export const FONT = '"Titan One", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';

export class FX {
  constructor() {
    this.parts = [];
    this.texts = [];
    this.rings = [];
    this.shakeT = 0;
    this.shakeA = 0;
    this.time = 0;
  }
  burst(x, y, colors, n = 16, { speed = 260, size = 5, gravity = 520, life = 0.8, spread = Math.PI * 2, angle = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.35 + Math.random() * 0.75);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: gravity,
        s: size * (0.6 + Math.random() * 0.8),
        life: life * (0.6 + Math.random() * 0.6),
        t: 0,
        c: Array.isArray(colors) ? colors[i % colors.length] : colors,
      });
    }
  }
  ring(x, y, color, r0 = 8, r1 = 60, life = 0.45, width = 4) {
    this.rings.push({ x, y, color, r0, r1, life, t: 0, width });
  }
  text(x, y, str, { color = '#fff', size = 26, life = 0.9, rise = 60 } = {}) {
    this.texts.push({ x, y, str, color, size, life, t: 0, rise });
  }
  shake(a = 8, d = 0.3) {
    this.shakeA = Math.max(this.shakeA, a);
    this.shakeT = Math.max(this.shakeT, d);
  }
  update(dt) {
    this.time += dt;
    for (const p of this.parts) {
      p.t += dt;
      p.vy += p.g * dt;
      p.vx *= 1 - 1.2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.parts = this.parts.filter(p => p.t < p.life);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter(r => r.t < r.life);
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter(t => t.t < t.life);
    if (this.shakeT > 0) this.shakeT -= dt;
  }
  offset() {
    if (this.shakeT <= 0) return [0, 0];
    const a = this.shakeA * Math.min(1, this.shakeT / 0.3);
    return [(Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a];
  }
  draw(g) {
    for (const r of this.rings) {
      const k = r.t / r.life;
      g.globalAlpha = 1 - k;
      g.strokeStyle = r.color;
      g.lineWidth = r.width * (1 - k * 0.6);
      g.beginPath();
      g.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 2)), 0, Math.PI * 2);
      g.stroke();
    }
    for (const p of this.parts) {
      const k = p.t / p.life;
      g.globalAlpha = 1 - k * k;
      g.fillStyle = p.c;
      g.beginPath();
      g.arc(p.x, p.y, p.s * (1 - k * 0.5), 0, Math.PI * 2);
      g.fill();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.t / t.life;
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.55 : 1.15 - Math.min(0.15, (k - 0.15) * 0.5);
      g.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      g.font = `${Math.round(t.size * pop)}px ${FONT}`;
      g.lineWidth = Math.max(3, t.size / 6);
      g.strokeStyle = 'rgba(20,10,40,.55)';
      g.strokeText(t.str, t.x, t.y - t.rise * (1 - Math.pow(1 - k, 2)));
      g.fillStyle = t.color;
      g.fillText(t.str, t.x, t.y - t.rise * (1 - Math.pow(1 - k, 2)));
    }
    g.globalAlpha = 1;
  }
}

// Sphère brillante (bulles, fruits-nombres…).
export function glossyBall(g, x, y, r, [light, base, dark], { alpha = 1 } = {}) {
  g.globalAlpha = alpha;
  const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  grad.addColorStop(0, light);
  grad.addColorStop(0.6, base);
  grad.addColorStop(1, dark);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.beginPath();
  g.ellipse(x - r * 0.38, y - r * 0.42, r * 0.32, r * 0.18, -0.6, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
}

export function label(g, str, x, y, size, color = '#fff') {
  g.font = `${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = Math.max(2.5, size / 7);
  g.strokeStyle = 'rgba(20,10,40,.35)';
  g.strokeText(str, x, y + 1);
  g.fillStyle = color;
  g.fillText(str, x, y + 1);
}

export const BALL_COLORS = [
  ['#E4D6FF', '#8E6CFF', '#4B26C2'],
  ['#FFD0E6', '#FF4F9A', '#B21A5C'],
  ['#C8F1FF', '#3DB4FF', '#126DB4'],
  ['#FFE0C7', '#FF7A2E', '#C2420A'],
  ['#D8FFB0', '#6CCB2F', '#2F7D0E'],
  ['#FFF4AE', '#FFC21A', '#B97F00'],
  ['#C2FFF0', '#22CFA0', '#0B7F5E'],
];
