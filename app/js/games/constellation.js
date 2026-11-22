// Constellation — blocs de Corsi version ciel étoilé : retenir l'ordre d'allumage des étoiles.
// Niveau 8+ : une manche sur deux se fait à l'envers (mémoire de travail « manipulée »).
import { clamp } from '../util.js';
import { setupCanvas, loop, pointer, FX, label } from '../engine.js';

const NAMES = ['La Casserole', 'Le Petit Renard', 'La Trottinette', 'Le Dragon Paresseux', 'La Théière', 'Le Grand Chat', 'La Fusée', 'Le Croissant', 'La Baleine', 'Le Parapluie', 'Le Hérisson', 'La Guitare', 'Le Cerf-Volant', 'La Tortue Pressée'];

function sparkle(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.34 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  g.closePath();
  g.fill();
}

export default {
  id: 'constellation',
  domain: 'memoire',
  kind: 'arcade',
  world: 'w-night',
  name: 'Constellation',
  tagline: 'Retiens le chemin des étoiles qui s’allument.',
  trains: 'Mémoire de travail visuelle et spatiale',
  rule: 'Des étoiles s’allument une à une et dessinent une constellation. Touche-les ensuite dans le même ordre. Parfois, il faudra le faire à l’envers !',
  short: 'Regarde le dessin, puis refais-le.',
  duration: '≈ 1 min 30',
  unit: n => (n <= 1 ? 'étoile retenue d’affilée' : 'étoiles retenues d’affilée'),
  tip: {
    title: 'Retiens le dessin, pas les points',
    text: 'Ne mémorise pas des positions isolées : vois la forme que trace le chemin (un Z, un toit, un éclair). Une forme se retient bien mieux qu’une liste.',
    life: 'Retenir un trajet en ville, un schéma de déverrouillage, l’endroit où tu t’es garé.',
  },

  async play({ stage, level, rng, zen, scope, hud, sfx, buzz }) {
    const M = level < 4 ? 7 : level < 8 ? 9 : 12;
    const TRIALS = 8;
    const on = zen ? 0.85 : clamp(0.72 - level * 0.018, 0.42, 0.72);
    let span = clamp(level + 1, 2, 12);
    const fx = new FX();

    // Positions normalisées (indépendantes de la taille de l'écran)
    const pts = [];
    const minD = M <= 7 ? 0.24 : M <= 9 ? 0.21 : 0.18;
    for (let k = 0; pts.length < M && k < 5000; k++) {
      const p = { nx: 0.1 + rng.next() * 0.8, ny: 0.1 + rng.next() * 0.8 };
      if (pts.every(q => Math.hypot((q.nx - p.nx) * 1.1, q.ny - p.ny) > minD)) pts.push(p);
    }
    while (pts.length < M) pts.push({ nx: 0.1 + rng.next() * 0.8, ny: 0.1 + rng.next() * 0.8 });
    const stars = pts.map(p => ({ ...p, x: 0, y: 0, glow: 0, red: 0 }));
    const sky = Array.from({ length: 90 }, () => ({ x: rng.next(), y: rng.next(), r: 0.5 + rng.next() * 1.4, ph: rng.next() * 6 }));
    let R = 18;
    const view = setupCanvas(stage, scope, layout);
    function layout(W = view.W, H = view.H) {
      R = clamp(Math.min(W, H) * 0.045, 13, 24);
      for (const s of stars) { s.x = s.nx * W; s.y = s.ny * H; }
    }
    layout();

    let lines = []; // {a, b, p, gold, red}
    let linesAlpha = 1;
    let accept = null;
    let name = null;
    let shooting = null;
    let time = 0;

    pointer(scope, view.canvas, {
      down(p) {
        if (!accept) return;
        let best = -1;
        let bd = Infinity;
        stars.forEach((s, i) => {
          const d = Math.hypot(s.x - p.x, s.y - p.y);
          if (d < Math.max(R * 2.3, 30) && d < bd) { bd = d; best = i; }
        });
        if (best >= 0) accept(best);
      },
    });

    loop(scope, dt => {
      time += dt;
      const { g, W, H } = view;
      fx.update(dt);
      for (const s of stars) { s.glow = Math.max(0, s.glow - dt * 1.6); s.red = Math.max(0, s.red - dt * 1.5); }
      for (const l of lines) l.p = Math.min(1, l.p + dt * 5);
      if (!shooting && rng.next() < dt * 0.12) shooting = { x: rng.next() * W, y: rng.next() * H * 0.4, t: 0 };

      g.clearRect(0, 0, W, H);
      for (const s of sky) {
        g.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.6 + s.ph);
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      if (shooting) {
        shooting.t += dt;
        const k = shooting.t / 0.8;
        const x = shooting.x + k * 220;
        const y = shooting.y + k * 90;
        const grad = g.createLinearGradient(x - 70, y - 28, x, y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, `rgba(255,255,255,${0.8 * (1 - k)})`);
        g.strokeStyle = grad;
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(x - 70, y - 28); g.lineTo(x, y); g.stroke();
        if (k >= 1) shooting = null;
      }
      const [ox, oy] = fx.offset();
      g.save();
      g.translate(ox, oy);
      // Lignes de la constellation
      g.lineCap = 'round';
      for (const l of lines) {
        const A = stars[l.a];
        const B = stars[l.b];
        const x2 = A.x + (B.x - A.x) * l.p;
        const y2 = A.y + (B.y - A.y) * l.p;
        g.globalAlpha = linesAlpha;
        g.strokeStyle = l.red ? 'rgba(255,120,120,.9)' : l.gold ? 'rgba(255,214,90,.95)' : 'rgba(190,220,255,.85)';
        g.lineWidth = l.gold ? 5 : 3.5;
        g.shadowColor = l.red ? '#ff6b6b' : l.gold ? '#FFD23F' : '#8ecbff';
        g.shadowBlur = 14;
        g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(x2, y2); g.stroke();
      }
      g.shadowBlur = 0;
      g.globalAlpha = 1;
      // Étoiles
      for (const s of stars) {
        const tw = 0.85 + 0.15 * Math.sin(time * 3 + s.nx * 20);
        if (s.glow > 0 || s.red > 0) {
          const halo = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * 3.2);
          const c = s.red > 0 ? '255,110,110' : '255,226,122';
          halo.addColorStop(0, `rgba(${c},${0.75 * Math.max(s.glow, s.red)})`);
          halo.addColorStop(1, `rgba(${c},0)`);
          g.fillStyle = halo;
          g.beginPath(); g.arc(s.x, s.y, R * 3.2, 0, Math.PI * 2); g.fill();
        }
        const big = 1 + 0.45 * Math.max(s.glow, s.red);
        g.fillStyle = 'rgba(160,190,255,.18)';
        g.beginPath(); g.arc(s.x, s.y, R * 1.35 * big, 0, Math.PI * 2); g.fill();
        sparkle(g, s.x, s.y, R * tw * big, s.red > 0 ? '#FF9A9A' : s.glow > 0.05 ? '#FFF1B0' : '#FFFFFF');
      }
      if (name) {
        name.t += dt;
        g.globalAlpha = Math.min(1, name.t * 3) * (name.t > 1.2 ? Math.max(0, 1 - (name.t - 1.2) * 3) : 1);
        label(g, name.text, W / 2, H * 0.08 + 6, 22, '#FFE27A');
        g.globalAlpha = 1;
      }
      fx.draw(g);
      g.restore();
    });

    let best = 0;
    let ok = 0;
    for (let t = 0; t < TRIALS; t++) {
      hud.progress(t / TRIALS);
      const backward = level >= 8 && t % 2 === 1;
      hud.label(backward ? `Regarde… puis À L’ENVERS ! (${span} étoiles)` : `Regarde bien… ${span} étoiles`);
      const seq = [];
      for (let k = 0; k < span; k++) {
        let i;
        do { i = rng.int(0, M - 1); } while (seq.length && (i === seq[seq.length - 1] || (span <= M && seq.includes(i))));
        seq.push(i);
      }
      lines = [];
      linesAlpha = 1;
      name = null;
      await scope.sleep(650);
      for (let k = 0; k < seq.length; k++) {
        stars[seq[k]].glow = 1;
        if (k > 0) lines.push({ a: seq[k - 1], b: seq[k], p: 0 });
        fx.ring(stars[seq[k]].x, stars[seq[k]].y, 'rgba(255,230,150,.9)', R, R * 3, 0.5, 3);
        sfx.tick(k);
        await scope.sleep(on * 1000 + (zen ? 280 : 180));
      }
      // Le dessin s'efface avant que le joueur ne le refasse
      for (let k = 0; k < 8; k++) { linesAlpha = 1 - (k + 1) / 8; await scope.sleep(45); }
      lines = [];
      linesAlpha = 1;
      const target = backward ? seq.slice().reverse() : seq;
      hud.label(backward ? 'À toi : en partant de la DERNIÈRE étoile !' : `À toi ! 0 / ${span}`);
      const success = await new Promise(resolve => {
        const tapped = [];
        accept = i => {
          const expected = target[tapped.length];
          if (i === expected) {
            if (tapped.length) lines.push({ a: tapped[tapped.length - 1], b: i, p: 0 });
            tapped.push(i);
            stars[i].glow = 1;
            fx.ring(stars[i].x, stars[i].y, '#fff', R, R * 2.6, 0.35, 3);
            fx.burst(stars[i].x, stars[i].y, ['#FFE27A', '#fff'], 8, { speed: 140, size: 3, gravity: 0, life: 0.5 });
            sfx.tick(tapped.length - 1);
            if (!backward) hud.label(`À toi ! ${tapped.length} / ${span}`);
            if (tapped.length === target.length) { accept = null; resolve(true); }
          } else {
            accept = null;
            stars[i].red = 1;
            resolve(false);
          }
        };
      });

      if (success) {
        ok++;
        best = Math.max(best, span);
        lines.forEach(l => { l.gold = true; });
        name = { text: `« ${NAMES[rng.int(0, NAMES.length - 1)]} »`, t: 0 };
        for (const i of target) fx.burst(stars[i].x, stars[i].y, ['#FFE27A', '#FF9ED2', '#fff'], 10, { speed: 200, size: 3.5, gravity: 120 });
        sfx.good();
        buzz(15);
        hud.flash('good');
        hud.label('Constellation complète !');
        span++;
        await scope.sleep(1300);
      } else {
        fx.shake(9);
        sfx.bad();
        buzz([30, 40, 30]);
        hud.flash('bad');
        hud.label('Raté. Voici le bon chemin :');
        lines = [];
        await scope.sleep(450);
        for (let k = 0; k < target.length; k++) {
          stars[target[k]].glow = 1;
          if (k) lines.push({ a: target[k - 1], b: target[k], p: 0, red: true });
          await scope.sleep(340);
        }
        await scope.sleep(600);
        span = Math.max(2, span - 1);
      }
      lines = [];
    }
    hud.progress(1);

    return {
      score: best,
      accuracy: ok / TRIALS,
      nextLevel: best ? clamp(best - 2, 1, 18) : Math.max(1, level - 1),
      stats: [
        ['Plus longue constellation', `${best} étoile${best > 1 ? 's' : ''}`],
        ['Constellations réussies', `${ok} / ${TRIALS}`],
      ],
    };
  },
};
