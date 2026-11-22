// Effets globaux : confettis plein écran, compteurs qui défilent.
const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PALETTE = ['#FF5B1F', '#FFD23F', '#FF4F9A', '#3DB4FF', '#7ED957', '#8E6CFF'];

export function confetti({ count = 130, colors = PALETTE, y = 0.35, spread = 1 } = {}) {
  if (reduce()) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.setAttribute('aria-hidden', 'true');
  document.body.append(c);
  const g = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth;
  const H = window.innerHeight;
  c.width = W * dpr;
  c.height = H * dpr;
  g.scale(dpr, dpr);
  const parts = Array.from({ length: count }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2 * spread;
    const v = 380 + Math.random() * 520;
    return {
      x: W / 2 + (Math.random() - 0.5) * 60,
      y: H * y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 14,
      s: 6 + Math.random() * 7,
      c: colors[Math.floor(Math.random() * colors.length)],
      round: Math.random() < 0.3,
    };
  });
  let last = performance.now();
  const t0 = last;
  const frame = now => {
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 900 * dt;
      p.vx *= 1 - 1.6 * dt;
      p.vy *= 1 - 0.9 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.c;
      if (p.round) { g.beginPath(); g.arc(0, 0, p.s / 2, 0, Math.PI * 2); g.fill(); }
      else g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2 * (0.6 + Math.abs(Math.sin(p.r * 2)) * 0.8));
      g.restore();
    }
    if (now - t0 < 3200) requestAnimationFrame(frame);
    else c.remove();
  };
  requestAnimationFrame(frame);
}

export function countUp(el, to, { from = 0, dur = 900, fmt = v => String(Math.round(v)) } = {}) {
  if (reduce() || to === from) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = now => {
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (t < 1) requestAnimationFrame(step);
  };
  el.textContent = fmt(from);
  requestAnimationFrame(step);
}
