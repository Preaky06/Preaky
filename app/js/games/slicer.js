// Tranche-Nombres — calcul mental + inhibition : trancher d'un geste les nombres qui respectent
// la règle, éviter les autres. La règle change toutes les 20 secondes.
import { clamp, fmtPct } from '../util.js';
import { setupCanvas, loop, pointer, FX, glossyBall, label, FONT } from '../engine.js';

const COLORS = [
  ['#FFE0C7', '#FF7A2E', '#C2420A'],
  ['#FFD0E6', '#FF4F9A', '#B21A5C'],
  ['#D8FFB0', '#6CCB2F', '#2F7D0E'],
  ['#C8F1FF', '#3DB4FF', '#126DB4'],
  ['#E4D6FF', '#8E6CFF', '#4B26C2'],
  ['#FFF4AE', '#FFC21A', '#B97F00'],
];

// Chaque règle sait fabriquer un élément valide ou invalide.
function makeRule(rng, level) {
  const num = (lo, hi, test, want) => {
    for (let k = 0; k < 200; k++) {
      const v = rng.int(lo, hi);
      if (test(v) === want) return { label: String(v), value: v };
    }
    return { label: String(lo), value: lo };
  };
  const pool = [];
  if (level <= 3) {
    pool.push(
      () => ({ text: 'Tranche les nombres PAIRS', make: good => num(1, 20, v => v % 2 === 0, good) }),
      () => ({ text: 'Tranche les nombres IMPAIRS', make: good => num(1, 20, v => v % 2 === 1, good) }),
      () => ({ text: 'Tranche ceux plus GRANDS que 10', make: good => num(1, 20, v => v > 10, good) }),
    );
  } else if (level <= 7) {
    pool.push(
      () => { const m = rng.pick([3, 4, 5]); return { text: `Tranche les MULTIPLES de ${m}`, make: good => num(2, m * 12, v => v % m === 0, good) }; },
      () => { const k = rng.pick([25, 40, 50]); return { text: `Tranche ceux plus GRANDS que ${k}`, make: good => num(k - 20, k + 20, v => v > k, good) }; },
      () => ({ text: 'Tranche les nombres PAIRS', make: good => num(11, 99, v => v % 2 === 0, good) }),
    );
  } else if (level <= 12) {
    pool.push(() => {
      const T = rng.int(10, 20);
      return {
        text: `Tranche les calculs qui font ${T}`,
        make: good => {
          const target = good ? T : T + rng.pick([-3, -2, -1, 1, 2, 3]);
          if (rng.chance(0.6)) { const a = rng.int(1, target - 1); return { label: `${a}+${target - a}`, value: target }; }
          const b = rng.int(1, 9); return { label: `${target + b}−${b}`, value: target };
        },
      };
    });
    pool.push(() => { const m = rng.pick([6, 7, 8, 9]); return { text: `Tranche les MULTIPLES de ${m}`, make: good => num(6, m * 10, v => v % m === 0, good) }; });
  } else {
    pool.push(() => {
      const T = rng.pick([12, 18, 24, 30, 36]);
      const pairs = [];
      for (let a = 2; a <= 9; a++) if (T % a === 0 && T / a <= 12) pairs.push([a, T / a]);
      return {
        text: `Tranche les calculs qui font ${T}`,
        make: good => {
          const target = good ? T : T + rng.pick([-2, -1, 1, 2, 6, -6]);
          const r = rng.next();
          if (good && r < 0.5 && pairs.length) { const [a, b] = rng.pick(pairs); return { label: `${a}×${b}`, value: T }; }
          if (!good && r < 0.5) { const [a, b] = rng.pick(pairs.length ? pairs : [[3, 4]]); const w = rng.chance(0.5) ? [a + 1, b] : [a, b - 1]; return { label: `${w[0]}×${w[1]}`, value: w[0] * w[1] }; }
          if (r < 0.8) { const a = rng.int(2, target - 2); return { label: `${a}+${target - a}`, value: target }; }
          const b = rng.int(2, 12); return { label: `${target + b}−${b}`, value: target };
        },
      };
    });
  }
  return rng.pick(pool)();
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const L = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export default {
  id: 'slicer',
  domain: 'logique',
  kind: 'arcade',
  world: 'w-ocean',
  name: 'Tranche-Nombres',
  tagline: 'Tranche les bons nombres d’un coup de doigt.',
  trains: 'Calcul mental, contrôle des réflexes',
  rule: 'Des nombres volent. Glisse ton doigt pour trancher ceux qui respectent la règle affichée, et évite les autres. La règle change en cours de partie !',
  short: 'Glisse pour trancher. Lis bien la règle !',
  duration: '1 min',
  unit: n => (n <= 1 ? 'point' : 'points'),
  tip: {
    title: 'Décide avant de bouger',
    text: 'Lis le nombre, vérifie la règle, puis tranche. Un geste lancé trop tôt est difficile à arrêter : c’est justement ce réflexe que le jeu entraîne.',
    life: 'Avant d’envoyer un message énervé ou de cliquer « Acheter », une seconde de vérification évite bien des regrets.',
  },

  async play({ stage, level, rng, zen, scope, hud, sfx, buzz }) {
    const DURATION = 60;
    const ZEN_ITEMS = 40;
    const RULE_EVERY = 20;
    const fx = new FX();
    let items = [];
    let halves = [];
    let blade = [];
    let down = false;
    let swipeHits = 0;
    let t = 0;
    let nextSpawn = 0.6;
    let launched = 0;
    let score = 0;
    let combo = 0;
    let bestCombo = 0;
    let lives = 3;
    let good = 0;
    let bad = 0;
    let missed = 0;
    let rule = makeRule(rng, level);
    let ruleAt = 0;
    let over = false;
    let finish;
    const done = new Promise(r => { finish = r; });
    const view = setupCanvas(stage, scope);

    const G = () => view.H * 1.25;
    const interval = zen ? 1.45 : clamp(1.15 - level * 0.04, 0.55, 1.15);
    hud.label(rule.text);
    hud.score(0);
    if (!zen) hud.lives(lives, 3);

    function end() { if (!over) { over = true; scope.timeout(finish, 600); } }

    function launch() {
      const { W, H } = view;
      const r = clamp(Math.min(W, H) * 0.085, 26, 40);
      const x0 = W * (0.15 + rng.next() * 0.7);
      const apex = H * (0.12 + rng.next() * 0.3);
      const vy = -Math.sqrt(2 * G() * (H + r - apex));
      const flight = (2 * -vy) / G();
      const xEnd = W * (0.15 + rng.next() * 0.7);
      const isGood = rng.next() < 0.47;
      const it = rule.make(isGood);
      items.push({ x: x0, y: H + r, vx: (xEnd - x0) / flight, vy, r, ...it, good: isGood, color: COLORS[rng.int(0, COLORS.length - 1)], rot: 0, vr: (rng.next() - 0.5) * 2.5, sliced: false });
      launched++;
    }

    function slice(it, ang) {
      it.sliced = true;
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      for (const side of [1, -1]) halves.push({ x: it.x, y: it.y, vx: it.vx + nx * 140 * side, vy: it.vy - 60 + ny * 140 * side, r: it.r, ang, side, rot: 0, vr: side * 4, color: it.color, t: 0, label: it.label });
      fx.burst(it.x, it.y, [it.color[1], it.color[0]], 16, { speed: 260, size: 4.5, gravity: 700 });
      if (it.good) {
        good++;
        swipeHits++;
        combo++;
        bestCombo = Math.max(bestCombo, combo);
        const mult = Math.min(5, 1 + Math.floor(combo / 4));
        const pts = 10 * mult;
        score += pts;
        fx.text(it.x, it.y - it.r, `+${pts}`, { color: mult > 1 ? '#FFD23F' : '#fff', size: 22 });
        if (swipeHits === 2) { score += 10; fx.text(view.W / 2, view.H * 0.3, 'DOUBLE ! +10', { size: 32, color: '#FFD23F' }); }
        if (swipeHits === 3) { score += 25; fx.text(view.W / 2, view.H * 0.3, 'TRIPLE ! +25', { size: 36, color: '#FF9ED2' }); }
        sfx.slice();
        buzz(10);
      } else {
        bad++;
        combo = 0;
        fx.shake(10, 0.35);
        fx.text(it.x, it.y - it.r, '✗', { color: '#FF6B6B', size: 46, life: 0.8 });
        fx.ring(it.x, it.y, '#FF6B6B', it.r, it.r * 2.6, 0.5, 6);
        sfx.bad();
        buzz([30, 40, 30]);
        hud.flash('bad');
        if (zen) score = Math.max(0, score - 5);
        else { lives--; hud.lives(lives, 3); if (lives <= 0) end(); }
      }
      hud.score(score);
    }

    function cut(ax, ay, bx, by) {
      const ang = Math.atan2(by - ay, bx - ax);
      for (const it of items) {
        if (!it.sliced && segDist(it.x, it.y, ax, ay, bx, by) < it.r) slice(it, ang);
      }
    }

    pointer(scope, view.canvas, {
      down(p) {
        if (over) return;
        down = true;
        swipeHits = 0;
        blade = [{ x: p.x, y: p.y, t }];
        for (const it of items) if (!it.sliced && Math.hypot(it.x - p.x, it.y - p.y) < it.r) slice(it, -0.6);
      },
      move(p) {
        if (!down || over) return;
        const last = blade[blade.length - 1];
        if (last && Math.hypot(p.x - last.x, p.y - last.y) < 2) return;
        if (last) cut(last.x, last.y, p.x, p.y);
        blade.push({ x: p.x, y: p.y, t });
        if (blade.length > 40) blade.shift();
      },
      up() { down = false; },
    });

    loop(scope, dt => {
      const { g, W, H } = view;
      if (!over) {
        t += dt;
        if (zen) hud.progress(launched / ZEN_ITEMS);
        else { hud.progress(t / DURATION); if (t >= DURATION) end(); }
        if (t - ruleAt >= RULE_EVERY && (!zen || launched < ZEN_ITEMS - 4)) {
          rule = makeRule(rng, level);
          ruleAt = t;
          hud.label(rule.text);
          hud.flash('rule');
          fx.text(W / 2, H * 0.45, 'NOUVELLE RÈGLE !', { size: 30, color: '#FFD23F', life: 1.3, rise: 30 });
          sfx.whoosh();
          nextSpawn = t + 1.4; // le temps de lire
        }
        const canLaunch = zen ? launched < ZEN_ITEMS : true;
        if (canLaunch && t >= nextSpawn) {
          const burst = level >= 5 && rng.next() < 0.3 ? rng.int(2, 3) : 1;
          for (let k = 0; k < burst; k++) launch();
          nextSpawn = t + interval * (0.75 + rng.next() * 0.5);
        }
        if (zen && launched >= ZEN_ITEMS && items.every(it => it.sliced)) end();
      }
      for (const it of items) {
        it.vy += G() * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.vr * dt;
        if (!it.sliced && it.vy > 0 && it.y > H + it.r) {
          it.sliced = true;
          if (it.good && !over) {
            missed++;
            combo = 0;
            fx.text(clamp(it.x, 40, W - 40), H - 30, 'raté', { color: 'rgba(255,255,255,.7)', size: 18, rise: 20 });
          }
        }
      }
      items = items.filter(it => !it.sliced || false);
      for (const hf of halves) { hf.t += dt; hf.vy += G() * dt; hf.x += hf.vx * dt; hf.y += hf.vy * dt; hf.rot += hf.vr * dt; }
      halves = halves.filter(hf => hf.y < H + 80 && hf.t < 3);
      fx.update(dt);
      blade = blade.filter(b => t - b.t < 0.14);

      g.clearRect(0, 0, W, H);
      const [ox, oy] = fx.offset();
      g.save();
      g.translate(ox, oy);
      for (const hf of halves) {
        g.save();
        g.translate(hf.x, hf.y);
        g.rotate(hf.ang + hf.rot);
        g.beginPath();
        if (hf.side > 0) g.arc(0, 0, hf.r, Math.PI, Math.PI * 2);
        else g.arc(0, 0, hf.r, 0, Math.PI);
        g.closePath();
        g.clip();
        g.rotate(-(hf.ang + hf.rot));
        glossyBall(g, 0, 0, hf.r, hf.color);
        g.restore();
        g.save();
        g.translate(hf.x, hf.y);
        g.rotate(hf.ang + hf.rot);
        g.fillStyle = 'rgba(255,240,220,.85)';
        g.fillRect(-hf.r, -1.5, hf.r * 2, 3);
        g.restore();
      }
      for (const it of items) {
        g.save();
        g.translate(it.x, it.y);
        g.rotate(Math.sin(it.rot) * 0.25);
        glossyBall(g, 0, 0, it.r, it.color);
        label(g, it.label, 0, 0, Math.round(it.r * (it.label.length > 3 ? 0.55 : it.label.length > 2 ? 0.68 : 0.82)));
        g.restore();
      }
      // Lame
      if (blade.length > 1) {
        g.lineCap = 'round';
        g.lineJoin = 'round';
        for (const [w, c] of [[14, 'rgba(160,230,255,.25)'], [5, 'rgba(255,255,255,.95)']]) {
          g.strokeStyle = c;
          g.lineWidth = w;
          g.beginPath();
          blade.forEach((b, i) => (i ? g.lineTo(b.x, b.y) : g.moveTo(b.x, b.y)));
          g.stroke();
        }
      }
      fx.draw(g);
      g.restore();
      g.font = `12px ${FONT}`;
    });

    await done;
    hud.progress(1);
    const total = good + bad + missed;
    const acc = total ? good / total : 0;
    let nextLevel = level;
    if (acc >= 0.85 && good >= 14) nextLevel++;
    else if (acc < 0.6) nextLevel--;
    return {
      score,
      accuracy: acc,
      nextLevel: clamp(nextLevel, 1, 20),
      stats: [
        ['Bonnes tranches', String(good)],
        ['Mauvaises tranches', String(bad)],
        ['Bons nombres ratés', String(missed)],
        ['Précision', fmtPct(acc)],
        ['Meilleur combo', `×${bestCombo}`],
      ],
    };
  },
};
