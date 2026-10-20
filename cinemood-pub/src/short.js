/* CinéMood — version courte (19 s) du motion design vectoriel.
   Les scènes sont celles de mograph.js, rejouées en accéléré par morceaux : chaque scène dure un
   nombre entier de quarts de seconde (les coupes tombent sur la musique) et, à l'intérieur, les
   passages de texte clé vont moins vite que les transitions. Les affiches sont des images
   (catalogue fictif généré par ugc/posters.mjs). Le Duo saute ; la gratuité passe dans le plan final. */
'use strict';

const SDUR = 19;
/* d : durée à l'écran ; p : morceaux [début, fin (temps de mograph.js), vitesse relative] */
const SCENES = [
  { d: 2.5, fn: sA, p: [[0, 2.3, 2.0], [2.3, 4.3, 1.7], [4.3, 4.95, 1.6]] },
  { d: 2.5, fn: sB, p: [[4.95, 6.35, 1.3], [6.35, 7.4, 1.6], [7.4, 8.1, 1.4], [8.1, 8.75, 1.3]] },
  { d: 2.0, fn: sC, p: [[8.75, 12.9, 2.0]] },
  { d: 2.5, fn: sD, p: [[12.9, 13.3, 1.6], [13.3, 18.2, 2.8], [18.2, 19.2, 1.8]] },
  { d: 2.0, fn: sE, p: [[19.2, 23.8, 2.1]] },
  { d: 2.25, fn: sF, p: [[23.8, 26.9, 2.0], [26.9, 27.35, 3.0], [27.35, 28.55, 1.8]] },
  { d: 2.5, fn: sG, p: [[28.55, 31.0, 2.2], [31.0, 32.8, 1.3]] },
  { d: 2.75, fn: sI, p: [[36.9, 40.6, 1.4]] },
];
const PIECES = [];
(() => {
  let t = 0;
  SCENES.forEach((sc, si) => {
    const nat = sc.p.reduce((a, [A, B, v]) => a + (B - A) / v, 0);
    for (const [A, B, v] of sc.p) { const d = (((B - A) / v) * sc.d) / nat; PIECES.push({ a: t, b: t + d, A, B, fn: sc.fn, si }); t += d; }
  });
})();
function pieceAt(t) { for (const p of PIECES) if (t < p.b) return p; return PIECES[PIECES.length - 1]; }
/* temps de mograph.js pour l'instant t de la version courte ; une sous-image ne franchit jamais une coupe */
function warpT(tk, tc) {
  const pc = pieceAt(tc), pk = pieceAt(tk), p = pk.si === pc.si ? pk : pc;
  return { T: p.A + ((clamp(tk, p.a, p.b - 1e-6) - p.a) / (p.b - p.a)) * (p.B - p.A), fn: p.fn };
}
function shortBlurAt(t) {
  const mb = motionBlurAt(warpT(t, t).T);
  return { n: Math.max(8, mb.n), shutter: 0.55 };
}
function shortFx(t) {
  const fx = fxAt(warpT(t, t).T);
  fx.fade = Math.max(1 - t / 0.08, prog(t, SDUR - 0.35, SDUR));
  return fx;
}
