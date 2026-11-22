// Bulles — version arcade du « Trail Making Test » : éclater les bulles dans l'ordre.
// Niveau 7+ : on alterne chiffres et lettres (1, A, 2, B…), ce qui sollicite la flexibilité.
import { clamp, fmtPct } from '../util.js';
import { setupCanvas, loop, pointer, FX, glossyBall, label, BALL_COLORS } from '../engine.js';

const LETTERS = 'ABCDEFGHIJ';

export default {
  id: 'bubbles',
  domain: 'concentration',
  kind: 'arcade',
  world: 'w-bubbles',
  name: 'Bulles',
  tagline: 'Éclate-les dans l’ordre, le plus vite possible.',
  trains: 'Vitesse de traitement, attention, flexibilité',
  rule: 'Touche les bulles dans l’ordre : 1, 2, 3… Enchaîne vite pour faire des combos. Plus tard, alterne chiffres et lettres : 1, A, 2, B…',
  short: '1, 2, 3… éclate-les dans l’ordre !',
  duration: '1 min',
  unit: n => (n <= 1 ? 'point' : 'points'),
  tip: {
    title: 'Repère la suivante en avance',
    text: 'Pendant que ton doigt touche une bulle, tes yeux cherchent déjà la suivante. Ce chevauchement fait gagner beaucoup de temps.',
    life: 'Cuisine, rangement, conduite : prépare l’étape d’après pendant que tu termines celle en cours.',
  },

  async play({ stage, level, rng, zen, scope, hud, sfx, buzz }) {
    const DURATION = 60;
    const BOARDS_ZEN = 4;
    const alt = level >= 7;
    const maxN = alt ? 14 : 16;
    let n = clamp(4 + level, 5, maxN);
    const drift = level >= 4 ? 8 + level * 2.5 : 0;
    const fx = new FX();
    let bubbles = [];
    let next = 0;
    let score = 0;
    let combo = 0;
    let bestCombo = 0;
    let lastHit = -9;
    let pops = 0;
    let errors = 0;
    let boards = 0;
    let boardErrors = 0;
    let idle = 0;
    let t = 0;
    let penalty = 0;
    let between = false;
    let over = false;
    let finish;
    const done = new Promise(r => { finish = r; });
    const deco = Array.from({ length: 22 }, () => ({ x: rng.next(), y: rng.next(), r: 2 + rng.next() * 5, v: 0.01 + rng.next() * 0.03 }));

    // Après les déclarations : setupCanvas appelle déjà le rappel de redimensionnement.
    const view = setupCanvas(stage, scope, () => keepInside());

    const labelOf = i => (alt ? (i % 2 === 0 ? String(i / 2 + 1) : LETTERS[(i - 1) / 2]) : String(i + 1));

    function placeBoard() {
      const { W, H } = view;
      let r = clamp(Math.min(W, H) / (Math.sqrt(n) * 3.05), 24, 46);
      for (let attempt = 0; attempt < 40; attempt++) {
        const list = [];
        for (let i = 0; i < n; i++) {
          for (let k = 0; k < 250; k++) {
            const x = r + 8 + rng.next() * (W - 2 * r - 16);
            const y = r + 8 + rng.next() * (H - 2 * r - 16);
            if (list.every(b => Math.hypot(b.x - x, b.y - y) > b.r + r + 10)) {
              const a = rng.next() * Math.PI * 2;
              list.push({ x, y, r, i, text: labelOf(i), color: BALL_COLORS[i % BALL_COLORS.length], vx: Math.cos(a) * drift, vy: Math.sin(a) * drift, born: t + i * 0.025, popped: false, wob: 0 });
              break;
            }
          }
        }
        if (list.length === n) { bubbles = list; break; }
        r *= 0.93;
      }
      next = 0;
      idle = 0;
      boardErrors = 0;
      between = false;
    }

    function keepInside() {
      for (const b of bubbles) {
        b.x = clamp(b.x, b.r, view.W - b.r);
        b.y = clamp(b.y, b.r, view.H - b.r);
      }
    }

    function end() {
      if (over) return;
      over = true;
      finish();
    }

    function boardClear() {
      boards++;
      const perfect = boardErrors === 0;
      const bonus = perfect ? 80 : 50;
      score += bonus;
      hud.score(score);
      fx.text(view.W / 2, view.H / 2, perfect ? `PARFAIT ! +${bonus}` : `BRAVO ! +${bonus}`, { size: 34, color: '#FFD23F', life: 1.1 });
      fx.burst(view.W / 2, view.H / 2, ['#FFD23F', '#FF4F9A', '#3DB4FF', '#fff'], 46, { speed: 460, size: 6 });
      sfx.win();
      buzz([10, 30, 10]);
      if (perfect) n = Math.min(n + 1, maxN);
      if (zen && boards >= BOARDS_ZEN) { scope.timeout(end, 700); return; }
      between = true;
      scope.timeout(placeBoard, 650);
    }

    function hitAt(p) {
      let best = null;
      let bd = Infinity;
      for (const b of bubbles) {
        if (b.popped) continue;
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < b.r + 10 && d < bd) { best = b; bd = d; }
      }
      return best;
    }

    pointer(scope, view.canvas, {
      down(p) {
        if (over || between) return;
        const b = hitAt(p);
        if (!b) return;
        if (b.i === next) {
          b.popped = true;
          combo = t - lastHit < 1.4 ? combo + 1 : 1;
          lastHit = t;
          bestCombo = Math.max(bestCombo, combo);
          const mult = Math.min(5, 1 + Math.floor((combo - 1) / 3));
          const pts = 10 * mult;
          score += pts;
          pops++;
          idle = 0;
          hud.score(score);
          fx.burst(b.x, b.y, [b.color[1], b.color[0], '#fff'], 18, { speed: 320, size: 5 });
          fx.ring(b.x, b.y, '#fff', b.r * 0.7, b.r * 2.1, 0.4, 5);
          fx.text(b.x, b.y - b.r * 0.4, `+${pts}`, { color: mult > 1 ? '#FFD23F' : '#fff', size: 22 });
          if (combo >= 3 && combo % 3 === 0) fx.text(view.W / 2, view.H * 0.16, `COMBO ×${mult}`, { size: 34, color: '#FFD23F', life: 1 });
          sfx.pop(next);
          buzz(8);
          next++;
          if (next >= n) boardClear();
        } else {
          errors++;
          boardErrors++;
          combo = 0;
          b.wob = 0.45;
          fx.shake(7);
          if (!zen) penalty += 1.5;
          fx.text(b.x, b.y - b.r, zen ? 'Pas celle-là' : '−1,5 s', { color: '#FFB4B4', size: 20 });
          sfx.bad();
          buzz([20, 30, 20]);
          hud.flash('bad');
        }
      },
    });

    hud.label(alt ? 'Alterne : 1, A, 2, B, 3, C…' : 'Dans l’ordre : 1, 2, 3…');
    hud.score(0);
    placeBoard();

    loop(scope, dt => {
      const { g, W, H } = view;
      if (!over) {
        t += dt;
        idle += dt;
        if (zen) hud.progress((boards + next / n) / BOARDS_ZEN);
        else {
          const used = t + penalty;
          hud.progress(used / DURATION);
          if (used >= DURATION) end();
        }
      }
      // Dérive + rebonds
      for (const b of bubbles) {
        if (b.popped) continue;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
        if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
        if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
        if (b.wob > 0) b.wob -= dt;
      }
      if (drift) {
        for (let i = 0; i < bubbles.length; i++) {
          const a = bubbles[i];
          if (a.popped) continue;
          for (let j = i + 1; j < bubbles.length; j++) {
            const c = bubbles[j];
            if (c.popped) continue;
            const dx = c.x - a.x;
            const dy = c.y - a.y;
            const d = Math.hypot(dx, dy) || 1;
            const min = a.r + c.r + 4;
            if (d < min) {
              const nx = dx / d;
              const ny = dy / d;
              const push = (min - d) / 2;
              a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
              [a.vx, c.vx] = [c.vx, a.vx];
              [a.vy, c.vy] = [c.vy, a.vy];
            }
          }
        }
      }
      fx.update(dt);

      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.07)';
      for (const d of deco) {
        d.y -= d.v * dt;
        if (d.y < -0.05) d.y = 1.05;
        g.beginPath();
        g.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
        g.fill();
      }
      const [ox, oy] = fx.offset();
      g.save();
      g.translate(ox, oy);
      const hint = idle > (zen ? 2.5 : 4);
      for (const b of bubbles) {
        if (b.popped) continue;
        const age = t - b.born;
        if (age < 0) continue;
        const k = Math.min(1, age / 0.28);
        const s = k < 1 ? 1.70158 * Math.pow(k - 1, 3) + 2.70158 * Math.pow(k - 1, 2) + 1 : 1;
        const r = b.r * Math.max(0.05, s);
        const wx = b.wob > 0 ? Math.sin(b.wob * 60) * 5 : 0;
        glossyBall(g, b.x + wx, b.y, r, b.color);
        label(g, b.text, b.x + wx, b.y, Math.round(r * 0.9));
        if (hint && b.i === next) {
          const pulse = (Math.sin(t * 7) + 1) / 2;
          g.strokeStyle = `rgba(255,255,255,${0.35 + pulse * 0.5})`;
          g.lineWidth = 4;
          g.beginPath();
          g.arc(b.x, b.y, r + 8 + pulse * 6, 0, Math.PI * 2);
          g.stroke();
        }
      }
      fx.draw(g);
      g.restore();
    });

    await done;
    hud.progress(1);
    const total = pops + errors;
    const acc = total ? pops / total : 0;
    const ppm = (pops / Math.max(1, zen ? t : DURATION)) * 60;
    let nextLevel = level;
    if (zen) { if (acc >= 0.9 && ppm >= 25) nextLevel++; else if (acc < 0.7) nextLevel--; }
    else if (boards >= 2 && acc >= 0.9) nextLevel++;
    else if (boards === 0 || acc < 0.7) nextLevel--;

    return {
      score,
      accuracy: acc,
      nextLevel: clamp(nextLevel, 1, 20),
      stats: [
        ['Bulles éclatées', String(pops)],
        ['Précision', fmtPct(acc)],
        ['Plateaux terminés', String(boards)],
        ['Meilleur combo', `×${bestCombo}`],
      ],
    };
  },
};
