/* Montage du film (30 s, 120 BPM : 1 temps = 0,5 s, 1 mesure = 2 s)
   0–2      néon « CINÉMA » sous la pluie, qui s'éteint sur le temps
   2–5,6    mur d'affiches qui défile, chrono → « 30 MINUTES »
   5,6–6    plongée dans le creux du « 0 »
   6–7,7    « On part de ton moment » sous le faisceau du projecteur
   7,7–8,3  panoramique vertical : le faisceau descend sur l'écran
   8,3–10   « Ce soir, il te faut quoi ? » puis plongée vers la carte « Rire »
   10–13,7  les 8 humeurs sur une pellicule 35 mm, une image par temps
   13,7–14  l'image « M'évader » redevient la carte 06
   14–17    le parcours en accéléré (poussées latérales), l'écran se replie
   17–18    le catalogue mondial filtré
   18–22    les résultats, puis plongée dans le rouge d'« EXPLIQUÉS »
   22–26    les arguments en aplats
   26–30    CINÉMA devient CINÉMOOD */
'use strict';

/* panoramique vertical entre deux plans (chacun garde son propre fond) */
function tiltDown(x, t, a, b, drawA, drawB) {
  const e = E.inOutCubic(prog(t, a, b));
  const d = H * 1.04;
  x.save();
  x.beginPath(); x.rect(0, -d * e, W, H); x.clip();
  x.translate(0, -d * e);
  drawA(x);
  x.restore();
  x.save();
  x.beginPath(); x.rect(0, d * (1 - e), W, H); x.clip();
  x.translate(0, d * (1 - e));
  drawB(x);
  x.restore();
}

const TIMELINE = [
  { a: 0.0, b: 2.0, fn: (x, lt) => sceneNeonOpen(x, lt) },
  { a: 2.0, b: 6.0, fn: (x, lt) => sceneScroll(x, lt) },
  { a: 6.0, b: 7.7, fn: (x, lt) => sceneTurn(x, lt) },
  { a: 7.7, b: 8.3, fn: (x, lt, t) => tiltDown(x, t, 7.7, 8.3, (c) => sceneTurn(c, t - 6.0), (c) => sceneQuestion(c, t - 8.0, t)) },
  { a: 8.3, b: 10.0, fn: (x, lt, t) => sceneQuestion(x, t - 8.0, t) },
  { a: 10.0, b: 13.7, fn: (x, lt, t) => sceneGate(x, lt, t) },
  { a: 13.7, b: 14.0, fn: (x, lt, t) => sceneGateToUI(x, t) },
  { a: 14.0, b: 17.0, fn: (x, lt, t) => sceneSpeed(x, lt, t) },
  { a: 17.0, b: 18.0, fn: (x, lt, t) => sceneLoading(x, lt, t) },
  { a: 18.0, b: 22.0, fn: (x, lt, t) => sceneResults(x, lt, t) },
  { a: 22.0, b: 26.0, fn: (x, lt, t) => sceneFeatures(x, lt, t) },
  { a: 26.0, b: 30.01, fn: (x, lt, t) => sceneLogo(x, lt, t) },
];

/* flou de mouvement : nombre de sous-images et ouverture d'obturateur (en images) */
function motionBlurAt(t) {
  const win = (a, b) => t >= a && t < b;
  if (win(5.6, 6.0) || win(21.82, 22.0)) return { n: 32, shutter: 1.0 };
  if (win(7.7, 8.3)) return { n: 24, shutter: 1.0 };
  if (win(9.72, 10.0)) return { n: 24, shutter: 1.0 };
  if (win(13.7, 14.0)) return { n: 16, shutter: 0.9 };
  if (t >= 10.0 && t < 13.7) {
    const u = (t - 10.0) % 0.5;
    if (u < PULL + 0.012) return { n: 32, shutter: 1.0 };
    return { n: 1, shutter: 0 };
  }
  if (t >= 14.0 && t < 17.0) {
    const lt = t - 14.0;
    if (lt >= 2.5) return { n: 16, shutter: 1.0 };
    if (lt % 0.5 < 0.17) return { n: 24, shutter: 0.9 };
    return { n: 1, shutter: 0 };
  }
  if (win(2.0, 5.45)) return { n: t > 4.3 ? 4 : 2, shutter: 0.6 };
  if (win(17.0, 17.3) || win(17.6, 18.0) || win(18.0, 18.3)) return { n: 8, shutter: 0.8 };
  if (win(20.5, 21.3)) return { n: 6, shutter: 0.6 };
  for (const a of [22.0, 23.0, 24.0, 25.0]) if (win(a, a + 0.16)) return { n: 16, shutter: 0.9 };
  if (win(25.3, 25.62)) return { n: 8, shutter: 0.8 };
  return { n: 1, shutter: 0 };
}

const IMPACTS = [{ t: 6.0, a: 1.0 }, { t: 18.0, a: 1.4 }, { t: 22.0, a: 0.6 }, { t: 24.0, a: 0.7 }, { t: 26.72, a: 0.7 }];
function fxAt(t) {
  const fx = { letterbox: 0, grain: 0.12, vignette: 0.8, bloom: 0, chroma: 0, shake: { x: 0, y: 0 }, flash: 0, flashCol: [255, 120, 140], fade: 0 };
  // barres 2,39:1 jusqu'à l'ouverture sur « On part de ton moment »
  if (!PORT) fx.letterbox = t < 6.0 ? 1 : 1 - E.inOutCubic(prog(t, 6.0, 6.6));
  // le bloom ne sert qu'aux sources de lumière (néon, étoiles), jamais au texte
  if (t < 2.0 || t >= 26.0) { fx.grain = 0.16; fx.bloom = 0.85; }
  else if (t < 6.0) fx.grain = 0.15;
  else if (t < 8.0) fx.bloom = 0.35;
  else if (t >= 10.0 && t < 14.0) { fx.bloom = (t >= 13.5 ? 0.35 : 0.12); fx.grain = 0.15; fx.vignette = 1.0; }
  else if (t >= 17.0 && t < 18.3) fx.bloom = 0.45;
  else if (t >= 22.0 && t < 26.0) { fx.grain = 0.1; fx.vignette = 0.45; }
  for (const im of IMPACTS) {
    const d = t - im.t;
    if (d >= 0 && d < 0.35) {
      const k = 1 - d / 0.35;
      fx.chroma = Math.max(fx.chroma, 7 * im.a * k * k);
      const s = shake(t, 12 * im.a * k * k, 30, im.t);
      fx.shake.x += s.x; fx.shake.y += s.y;
      if (d < 0.06 && (im.t === 6.0 || im.t === 18.0)) fx.flash = Math.max(fx.flash, 0.35 * im.a * (1 - d / 0.06));
    }
  }
  fx.fade = Math.max(1 - prog(t, 0, 0.12), E.inCubic(prog(t, 29.35, 30)));
  return fx;
}
