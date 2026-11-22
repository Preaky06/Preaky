// Golf des angles — mini-golf physique : viser au lance-pierre, anticiper les rebonds.
// De 1 à 4 joueurs sur le même téléphone. Parcours court (3 trous) ou complet (9 trous).
import { clamp, h } from '../util.js';
import { setupCanvas, loop, pointer, FX, FONT } from '../engine.js';

// Coordonnées dans un terrain de 100 × 160 unités (portrait).
const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
export const HOLES = [
  { name: 'Échauffement', par: 2, tee: [50, 132], cup: [50, 32], walls: rect(20, 12, 80, 150) },
  { name: 'Le coude', par: 3, tee: [32, 135], cup: [72, 34], walls: [[12, 150], [52, 150], [52, 62], [88, 62], [88, 12], [12, 12]] },
  { name: 'Le pilier', par: 3, tee: [50, 135], cup: [50, 30], walls: rect(15, 12, 85, 150), bumpers: [[50, 84, 10]] },
  { name: 'Zigzag', par: 3, tee: [24, 138], cup: [76, 30], walls: rect(12, 12, 88, 150), blocks: [rect(12, 100, 60, 108), rect(40, 56, 88, 64)] },
  { name: 'Bac à sable', par: 2, tee: [50, 135], cup: [50, 30], walls: rect(22, 12, 78, 150), sand: [rect(36, 70, 64, 98)] },
  { name: 'Le flipper', par: 3, tee: [50, 138], cup: [50, 30], walls: [[50, 10], [88, 40], [88, 150], [12, 150], [12, 40]], bumpers: [[32, 72, 7], [68, 72, 7], [50, 100, 8]] },
  { name: 'L’étang', par: 3, tee: [50, 136], cup: [50, 30], walls: rect(10, 12, 90, 150), water: [rect(24, 60, 76, 104)] },
  { name: 'Le moulin', par: 2, tee: [50, 136], cup: [50, 30], walls: rect(18, 12, 82, 150), spinners: [{ x: 50, y: 82, len: 46, speed: 1.6 }] },
  { name: 'Le diamant', par: 3, tee: [50, 136], cup: [50, 26], walls: [[50, 8], [92, 60], [50, 152], [8, 60]], blocks: [[[50, 70], [62, 90], [38, 90]]], bumpers: [[30, 60, 5], [70, 60, 5]] },
];
const SHORT = [0, 2, 7];
const BALL_R = 2.2;
const CUP_R = 3.4;
const VMAX = 175;
const MAX_STROKES = 8;

const inPoly = (x, y, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const edges = poly => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);

function closest(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return [ax + dx * t, ay + dy * t];
}

// Rayon contre segment : distance le long du rayon, ou Infinity.
function raySeg(ox, oy, dx, dy, [ax, ay], [bx, by]) {
  const ex = bx - ax;
  const ey = by - ay;
  const den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-9) return [Infinity];
  const t = ((ax - ox) * ey - (ay - oy) * ex) / den;
  const u = ((ax - ox) * dy - (ay - oy) * dx) / den;
  if (t > 0.01 && u >= 0 && u <= 1) {
    let nx = -ey;
    let ny = ex;
    const L = Math.hypot(nx, ny) || 1;
    nx /= L; ny /= L;
    if (nx * dx + ny * dy > 0) { nx = -nx; ny = -ny; }
    return [t, nx, ny];
  }
  return [Infinity];
}

export default {
  id: 'golf',
  domain: 'logique',
  kind: 'party',
  world: 'w-golf',
  name: 'Golf des angles',
  tagline: 'Vise, anticipe le rebond, empoche !',
  trains: 'Vision dans l’espace, anticipation des angles',
  rule: 'Tire en arrière depuis n’importe où, comme un lance-pierre, puis lâche. Plus tu tires loin, plus c’est fort. La ligne pointillée montre le premier rebond.',
  short: 'Tire en arrière, vise, lâche !',
  duration: '3 ou 9 trous',
  unit: n => (n <= 1 ? 'point' : 'points'),
  party: { min: 1, max: 4, options: [['holes', 'Parcours', [[3, 'Court · 3 trous'], [9, 'Complet · 9 trous']], 3]] },
  tip: {
    title: 'L’angle d’arrivée = l’angle de départ',
    text: 'Une balle repart d’un mur avec le même angle qu’à l’arrivée, comme un reflet dans un miroir. Imagine le trou « derrière » le mur et vise son reflet.',
    life: 'Au billard, au foot contre un mur, ou pour placer un miroir qui éclaire un coin sombre.',
  },

  async play({ stage, players, options, scope, hud, sfx, buzz }) {
    const holes = (options?.holes === 9 ? HOLES.map((_, i) => i) : SHORT).map(i => HOLES[i]);
    const fx = new FX();
    const view = setupCanvas(stage, scope);
    const cards = players.map(() => []);
    let hole = null;
    let segs = [];
    let ball = null;
    let aim = null;
    let pl = 0;
    let strokes = 0;
    let moving = false;
    let sinking = 0;
    let lastPos = null;
    let time = 0;
    let onRest = null;
    const trail = [];
    let S = 1;
    let OX = 0;
    let OY = 0;
    const toS = (x, y) => [OX + x * S, OY + y * S];
    const fromS = (x, y) => [(x - OX) / S, (y - OY) / S];

    function fit() {
      S = Math.min(view.W / 100, view.H / 160);
      OX = (view.W - 100 * S) / 2;
      OY = (view.H - 160 * S) / 2;
    }

    function spinnerSegs() {
      return (hole.spinners || []).map(sp => {
        const a = sp.speed * time;
        const dx = (Math.cos(a) * sp.len) / 2;
        const dy = (Math.sin(a) * sp.len) / 2;
        return { a: [sp.x - dx, sp.y - dy], b: [sp.x + dx, sp.y + dy], sp };
      });
    }

    function status() {
      hud.label(`Trou ${holes.indexOf(hole) + 1}/${holes.length} · « ${hole.name} » · par ${hole.par}${players.length > 1 ? ` · ${players[pl].name}` : ''} · ${strokes} coup${strokes > 1 ? 's' : ''}`);
    }

    function step(dt) {
      if (!ball || !moving) return;
      const speed = Math.hypot(ball.vx, ball.vy);
      const n = clamp(Math.ceil((speed * dt) / (BALL_R * 0.5)), 1, 14);
      const h2 = dt / n;
      for (let k = 0; k < n; k++) {
        const sp = Math.hypot(ball.vx, ball.vy);
        if (sp > 0) {
          const inSand = (hole.sand || []).some(p => inPoly(ball.x, ball.y, p));
          const dec = (inSand ? 170 : 40) * h2 + sp * 0.35 * h2;
          const f = Math.max(0, sp - dec) / sp;
          ball.vx *= f;
          ball.vy *= f;
        }
        ball.x += ball.vx * h2;
        ball.y += ball.vy * h2;
        for (const [a, b] of segs) collide(a, b, 0.78);
        for (const s of spinnerSegs()) collide(s.a, s.b, 0.85, s.sp, 1.4);
        for (const bp of hole.bumpers || []) {
          const [cx, cy, r] = bp;
          const dx = ball.x - cx;
          const dy = ball.y - cy;
          const d = Math.hypot(dx, dy);
          if (d < r + BALL_R && d > 0) {
            const nx = dx / d;
            const ny = dy / d;
            ball.x = cx + nx * (r + BALL_R);
            ball.y = cy + ny * (r + BALL_R);
            const vn = ball.vx * nx + ball.vy * ny;
            if (vn < 0) {
              ball.vx -= 2.15 * vn * nx;
              ball.vy -= 2.15 * vn * ny;
              bp.hit = 0.25;
              const [sx, sy] = toS(cx + nx * r, cy + ny * r);
              fx.ring(sx, sy, '#FFD23F', 4, 26, 0.35, 4);
              sfx.boing();
              buzz(10);
            }
          }
        }
        // Trou
        const dx = hole.cup[0] - ball.x;
        const dy = hole.cup[1] - ball.y;
        const d = Math.hypot(dx, dy);
        const v = Math.hypot(ball.vx, ball.vy);
        if (d < CUP_R * 1.7 && v < 60) { ball.vx += dx * 9 * h2; ball.vy += dy * 9 * h2; }
        if (d < CUP_R) {
          if (v < 95) { sink(); return; }
          ball.vx = ball.vx * 0.82 + -dy * 0.6;
          ball.vy = ball.vy * 0.82 + dx * 0.6;
        }
        if ((hole.water || []).some(p => inPoly(ball.x, ball.y, p))) { splash(); return; }
      }
      if (Math.hypot(ball.vx, ball.vy) < 2.2) { ball.vx = 0; ball.vy = 0; moving = false; onRest && onRest('rest'); }
    }

    function collide(a, b, e, sp = null, thick = 0) {
      const [qx, qy] = closest(ball.x, ball.y, a, b);
      const dx = ball.x - qx;
      const dy = ball.y - qy;
      const d = Math.hypot(dx, dy);
      const min = BALL_R + thick;
      if (d >= min || d === 0) return;
      const nx = dx / d;
      const ny = dy / d;
      ball.x = qx + nx * min;
      ball.y = qy + ny * min;
      let cvx = 0;
      let cvy = 0;
      if (sp) { cvx = -sp.speed * (qy - sp.y); cvy = sp.speed * (qx - sp.x); }
      const rvx = ball.vx - cvx;
      const rvy = ball.vy - cvy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        ball.vx = rvx - (1 + e) * vn * nx + cvx;
        ball.vy = rvy - (1 + e) * vn * ny + cvy;
        if (-vn > 25) { sfx.thud(); const [sx, sy] = toS(qx, qy); fx.burst(sx, sy, ['#fff', '#E9DFC9'], 5, { speed: 90, size: 2.5, gravity: 0, life: 0.35 }); }
      }
    }

    function sink() {
      moving = false;
      sinking = 0.0001;
      ball.vx = 0;
      ball.vy = 0;
      const [sx, sy] = toS(hole.cup[0], hole.cup[1]);
      const diff = strokes - hole.par;
      const word = strokes === 1 ? 'TROU EN UN !' : diff <= -2 ? 'EAGLE !' : diff === -1 ? 'BIRDIE !' : diff === 0 ? 'PAR !' : diff === 1 ? 'Bogey' : `+${diff}`;
      fx.text(sx, sy - 30, word, { size: strokes === 1 ? 40 : 32, color: diff <= 0 ? '#FFD23F' : '#fff', life: 1.4 });
      fx.burst(sx, sy, ['#FFD23F', '#fff', '#FF4F9A', '#3DB4FF'], diff <= 0 ? 40 : 18, { speed: 320, size: 4.5 });
      sfx.plop();
      if (diff <= 0) scope.timeout(() => sfx.win(), 200);
      buzz([15, 40, 15]);
      scope.timeout(() => onRest && onRest('sunk'), 1100);
    }

    function splash() {
      moving = false;
      const [sx, sy] = toS(ball.x, ball.y);
      fx.burst(sx, sy, ['#9EDBFF', '#fff', '#3DB4FF'], 26, { speed: 220, size: 4, gravity: 500 });
      fx.ring(sx, sy, '#fff', 4, 34, 0.6, 3);
      fx.text(sx, sy - 20, 'Plouf ! +1', { size: 24, color: '#fff' });
      sfx.splash();
      buzz(30);
      strokes++;
      ball.vx = 0;
      ball.vy = 0;
      ball.hidden = true;
      scope.timeout(() => { ball.x = lastPos[0]; ball.y = lastPos[1]; ball.hidden = false; onRest && onRest('rest'); }, 700);
    }

    pointer(scope, view.canvas, {
      down(p) {
        if (!ball || moving || sinking || ball.hidden || !onRest) return;
        aim = { sx: p.x, sy: p.y, x: p.x, y: p.y };
      },
      move(p) { if (aim) { aim.x = p.x; aim.y = p.y; } },
      up() {
        if (!aim) return;
        const { dir, power } = aimVector();
        aim = null;
        if (power < 0.06) return;
        lastPos = [ball.x, ball.y];
        ball.vx = dir[0] * power * VMAX;
        ball.vy = dir[1] * power * VMAX;
        strokes++;
        moving = true;
        trail.length = 0;
        sfx.thud();
        buzz(12);
        status();
      },
    });

    function aimVector() {
      const dx = aim.sx - aim.x;
      const dy = aim.sy - aim.y;
      const len = Math.hypot(dx, dy);
      const power = clamp(len / (S * 42), 0, 1);
      return { dir: len ? [dx / len, dy / len] : [0, -1], power };
    }

    loop(scope, dt => {
      time += dt;
      fit();
      step(dt);
      if (sinking) sinking = Math.min(1, sinking + dt * 3);
      if (ball && moving) { trail.push([ball.x, ball.y]); if (trail.length > 18) trail.shift(); } else if (trail.length) trail.shift();
      for (const bp of hole?.bumpers || []) if (bp.hit > 0) bp.hit -= dt;
      fx.update(dt);
      draw();
    });

    function polyPath(g, poly) {
      g.beginPath();
      poly.forEach(([x, y], i) => { const [sx, sy] = toS(x, y); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); });
      g.closePath();
    }

    function draw() {
      const { g, W, H } = view;
      g.clearRect(0, 0, W, H);
      if (!hole) return;
      const [ox, oy] = fx.offset();
      g.save();
      g.translate(ox, oy);
      // Ombre du terrain
      g.save();
      g.translate(0, 6);
      polyPath(g, hole.walls);
      g.fillStyle = 'rgba(0,40,0,.35)';
      g.fill();
      g.restore();
      // Gazon + bandes de tonte
      polyPath(g, hole.walls);
      const grad = g.createLinearGradient(0, OY, 0, OY + 160 * S);
      grad.addColorStop(0, '#8EE05A');
      grad.addColorStop(1, '#4DB52A');
      g.fillStyle = grad;
      g.fill();
      g.save();
      polyPath(g, hole.walls);
      g.clip();
      g.fillStyle = 'rgba(255,255,255,.07)';
      for (let y = 0; y < 160; y += 16) { const [, sy] = toS(0, y); g.fillRect(0, sy, W, 8 * S); }
      g.restore();
      // Sable, eau
      for (const p of hole.sand || []) {
        polyPath(g, p);
        g.fillStyle = '#F2D38A';
        g.fill();
        g.save();
        polyPath(g, p);
        g.clip();
        g.fillStyle = 'rgba(180,140,60,.35)';
        for (let i = 0; i < 40; i++) { const [sx, sy] = toS(p[0][0] + ((i * 37) % 100) / 100 * (p[1][0] - p[0][0]), p[0][1] + ((i * 61) % 100) / 100 * (p[2][1] - p[0][1])); g.fillRect(sx, sy, 2, 2); }
        g.restore();
      }
      for (const p of hole.water || []) {
        polyPath(g, p);
        const wg = g.createLinearGradient(0, toS(0, p[0][1])[1], 0, toS(0, p[2][1])[1]);
        wg.addColorStop(0, '#5CC6FF');
        wg.addColorStop(1, '#1B86D6');
        g.fillStyle = wg;
        g.fill();
        g.save();
        polyPath(g, p);
        g.clip();
        g.strokeStyle = 'rgba(255,255,255,.35)';
        g.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const yy = p[0][1] + 6 + i * 7;
          g.beginPath();
          for (let x = p[0][0]; x <= p[1][0]; x += 2) {
            const [sx, sy] = toS(x, yy + Math.sin(x * 0.4 + time * 2 + i) * 1.2);
            if (x === p[0][0]) g.moveTo(sx, sy); else g.lineTo(sx, sy);
          }
          g.stroke();
        }
        g.restore();
      }
      // Trou + drapeau
      const [cx, cy] = toS(...hole.cup);
      g.fillStyle = '#183A0E';
      g.beginPath(); g.ellipse(cx, cy, CUP_R * S, CUP_R * S * 0.85, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.beginPath(); g.ellipse(cx, cy + 1, CUP_R * S * 0.8, CUP_R * S * 0.5, 0, 0, Math.PI * 2); g.fill();
      // Murs
      const wallW = 2.6 * S;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      const wallStroke = poly => {
        g.save(); g.translate(0, 3); polyPath(g, poly); g.strokeStyle = 'rgba(40,20,0,.35)'; g.lineWidth = wallW; g.stroke(); g.restore();
        polyPath(g, poly); g.strokeStyle = '#FFF4E2'; g.lineWidth = wallW; g.stroke();
      };
      wallStroke(hole.walls);
      for (const b of hole.blocks || []) {
        g.save(); g.translate(0, 4); polyPath(g, b); g.fillStyle = 'rgba(40,20,0,.35)'; g.fill(); g.restore();
        polyPath(g, b); g.fillStyle = '#FFB27A'; g.fill(); g.strokeStyle = '#FFF4E2'; g.lineWidth = wallW * 0.6; g.stroke();
      }
      for (const bp of hole.bumpers || []) {
        const [bx, by] = toS(bp[0], bp[1]);
        const r = bp[2] * S * (1 + Math.max(0, bp.hit || 0) * 0.6);
        g.fillStyle = 'rgba(40,20,0,.3)';
        g.beginPath(); g.arc(bx, by + 4, r, 0, Math.PI * 2); g.fill();
        const bg = g.createRadialGradient(bx - r * 0.3, by - r * 0.35, r * 0.1, bx, by, r);
        bg.addColorStop(0, '#FFB0D2'); bg.addColorStop(0.6, '#FF4F9A'); bg.addColorStop(1, '#B21A5C');
        g.fillStyle = bg;
        g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(bx, by, r * 0.62, 0, Math.PI * 2); g.stroke();
      }
      for (const s of spinnerSegs()) {
        const [ax, ay] = toS(...s.a);
        const [bx, by] = toS(...s.b);
        g.strokeStyle = 'rgba(40,20,0,.35)'; g.lineWidth = 3.4 * S;
        g.beginPath(); g.moveTo(ax, ay + 4); g.lineTo(bx, by + 4); g.stroke();
        g.strokeStyle = '#8E6CFF'; g.lineWidth = 3 * S;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
        const [hx, hy] = toS(s.sp.x, s.sp.y);
        g.fillStyle = '#FFD23F';
        g.beginPath(); g.arc(hx, hy, 2.6 * S, 0, Math.PI * 2); g.fill();
      }
      // Drapeau (par-dessus les murs pour rester visible)
      const wave = Math.sin(time * 4) * 2;
      g.strokeStyle = '#fff'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 15 * S); g.stroke();
      g.fillStyle = '#FF4F4F';
      g.beginPath(); g.moveTo(cx, cy - 15 * S); g.quadraticCurveTo(cx + 5 * S, cy - 13.5 * S + wave, cx + 10 * S, cy - 12 * S); g.lineTo(cx, cy - 9 * S); g.closePath(); g.fill();
      // Visée
      if (aim && ball) {
        const { dir, power } = aimVector();
        const [bx, by] = toS(ball.x, ball.y);
        if (power > 0.03) {
          let L = 18 + power * 70;
          let ox2 = ball.x;
          let oy2 = ball.y;
          let [dx, dy] = dir;
          g.setLineDash([2, 7]);
          g.lineCap = 'round';
          for (let bounce = 0; bounce < 2 && L > 0; bounce++) {
            let best = [Infinity];
            for (const [a, b] of segs) { const r = raySeg(ox2, oy2, dx, dy, a, b); if (r[0] < best[0]) best = r; }
            const len = Math.min(L, best[0] - BALL_R);
            const [x1, y1] = toS(ox2, oy2);
            const [x2, y2] = toS(ox2 + dx * len, oy2 + dy * len);
            g.strokeStyle = bounce ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.95)';
            g.lineWidth = 3.5;
            g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
            if (best[0] - BALL_R > L) break;
            ox2 += dx * len;
            oy2 += dy * len;
            const vn = dx * best[1] + dy * best[2];
            dx -= 2 * vn * best[1];
            dy -= 2 * vn * best[2];
            L = (L - len) * 0.7;
          }
          g.setLineDash([]);
          // Jauge de puissance
          const col = power < 0.5 ? '#7ED957' : power < 0.8 ? '#FFD23F' : '#FF5B1F';
          g.strokeStyle = col;
          g.lineWidth = 5;
          g.beginPath(); g.arc(bx, by, 7 * S, -Math.PI / 2, -Math.PI / 2 + power * Math.PI * 2); g.stroke();
        }
      }
      // Balle
      if (ball && !ball.hidden) {
        trail.forEach(([x, y], i) => {
          const [tx, ty] = toS(x, y);
          g.fillStyle = `rgba(255,255,255,${(i / trail.length) * 0.35})`;
          g.beginPath(); g.arc(tx, ty, BALL_R * S * (i / trail.length), 0, Math.PI * 2); g.fill();
        });
        const [bx, by] = sinking ? toS(ball.x + (hole.cup[0] - ball.x) * sinking, ball.y + (hole.cup[1] - ball.y) * sinking) : toS(ball.x, ball.y);
        const r = BALL_R * S * (sinking ? 1 - sinking * 0.7 : 1);
        if (!sinking) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(bx + 1.5, by + 2.5, r, r * 0.8, 0, 0, Math.PI * 2); g.fill(); }
        const bg = g.createRadialGradient(bx - r * 0.35, by - r * 0.4, r * 0.1, bx, by, r);
        bg.addColorStop(0, '#fff'); bg.addColorStop(0.7, '#F1ECE4'); bg.addColorStop(1, '#BDB4A8');
        g.fillStyle = bg;
        g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = players[pl].color || '#FF5B1F';
        g.lineWidth = 2;
        g.beginPath(); g.arc(bx, by, r + 1.5, 0, Math.PI * 2); g.stroke();
      }
      fx.draw(g);
      g.restore();
      g.font = `12px ${FONT}`;
    }

    // Tableau des scores entre deux trous (DOM au-dessus du canvas)
    function scorecard(final) {
      return new Promise(resolve => {
        const rows = players.map((p, i) => {
          const tot = cards[i].reduce((a, b) => a + b, 0);
          const par = holes.slice(0, cards[i].length).reduce((a, hh) => a + hh.par, 0);
          const diff = tot - par;
          return h('tr', {}, h('td', { class: 'gc-player' }, h('span', { class: 'gc-dot', style: `background:${p.color}` }), p.name),
            ...holes.map((_, k) => h('td', {}, cards[i][k] ?? '·')),
            h('td', { class: 'gc-tot' }, `${tot}`, h('small', {}, diff === 0 ? ' (par)' : ` (${diff > 0 ? '+' : ''}${diff})`)));
        });
        const btn = h('button', { class: 'btn btn-primary btn-block btn-lg', type: 'button' }, final ? 'Voir le résultat' : 'Trou suivant');
        const card = h('div', { class: 'golf-card' },
          h('p', { class: 'eyebrow' }, final ? 'Parcours terminé' : `Après le trou ${cards[0].length}`),
          h('div', { class: 'golf-table-wrap' }, h('table', { class: 'golf-table' },
            h('thead', {}, h('tr', {}, h('th', {}, 'Joueur'), ...holes.map((hh, k) => h('th', {}, String(k + 1))), h('th', {}, 'Total'))),
            h('tbody', {}, rows))),
          btn);
        const ov = h('div', { class: 'golf-overlay' }, card);
        stage.append(ov);
        const go = () => { ov.remove(); resolve(); };
        scope.on(btn, 'click', go);
      });
    }

    fit();
    for (let hi = 0; hi < holes.length; hi++) {
      hole = holes[hi];
      hole.bumpers?.forEach(b => { b.hit = 0; });
      segs = [...edges(hole.walls), ...(hole.blocks || []).flatMap(edges)];
      for (pl = 0; pl < players.length; pl++) {
        strokes = 0;
        sinking = 0;
        ball = { x: hole.tee[0], y: hole.tee[1], vx: 0, vy: 0 };
        lastPos = [...hole.tee];
        hud.progress((hi + pl / players.length) / holes.length);
        status();
        if (players.length > 1) fx.text(view.W / 2, view.H * 0.5, `À ${players[pl].name} !`, { size: 30, color: players[pl].color || '#fff', life: 1.2, rise: 20 });
        for (;;) {
          const why = await new Promise(r => { onRest = r; });
          onRest = null;
          if (why === 'sunk') break;
          status();
          if (strokes >= MAX_STROKES) {
            fx.text(view.W / 2, view.H * 0.45, `${MAX_STROKES} coups max : on passe !`, { size: 22, color: '#fff', life: 1.3 });
            await scope.sleep(1200);
            break;
          }
        }
        cards[pl].push(strokes);
        ball = null;
      }
      hud.progress((hi + 1) / holes.length);
      await scorecard(hi === holes.length - 1);
    }

    const totals = cards.map(c => c.reduce((a, b) => a + b, 0));
    const parTotal = holes.reduce((a, hh) => a + hh.par, 0);
    const best = Math.min(...totals);
    const winners = totals.map((t, i) => (t === best ? i : -1)).filter(i => i >= 0);
    // Points (solo) : par = 3, birdie = 4, eagle/trou en un = 5, bogey = 2, +2 = 1.
    const points = cards[0].reduce((a, s, k) => a + clamp(3 - (s - holes[k].par), 0, 5), 0);
    const diff = totals[0] - parTotal;
    return {
      score: points,
      accuracy: clamp(1 - Math.max(0, diff) / (holes.length * 3), 0, 1),
      nextLevel: 1,
      scores: totals,
      par: parTotal,
      lowerIsBetter: true,
      winner: winners.length === 1 ? winners[0] : -1,
      stats: [
        ['Coups', `${totals[0]} (par ${parTotal})`],
        ['Trous joués', String(holes.length)],
        ['Meilleur trou', `${Math.min(...cards[0])} coup${Math.min(...cards[0]) > 1 ? 's' : ''}`],
      ],
    };
  },
};
