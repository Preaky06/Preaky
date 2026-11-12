/* CinéMood — pub « UGC », 9:16, format TikTok, calée sur une voix off (ElevenLabs, 24,3 s, posée à 0,25 s).
   Une créatrice fictive (images générées : tex/face1..3.jpg), les plans du vrai site (out/plans-site, lus image
   par image : tex/broll/), sous-titres façon TikTok, chacun aux instants où la voix dit la phrase.
   accroche (elle, agacée, compteur jusqu'à 40:00) → elle montre son téléphone → le vrai site (adresse tapée
   pendant qu'elle la dit, questions, résultat) → elle sourit → carton final.
   Zone sûre TikTok : rien d'important au-dessus de 200 px ni sous 1500 px. S'appuie sur mograph.js. */
'use strict';

/* tous les instants du film, en secondes (voix + 0,25) */
const UT = {
  dur: 27.5, lock: 3.3, phone: 6.55, site: 9.1, face3: 17.8, end: 21.3,
  pill: 9.0, pillType: [9.25, 10.45],           // l'adresse se tape pendant « cinémoud point com »
  endPill: 22.75, endType: [23.0, 24.2], endLogo: 23.05, endTag: 23.4, endKick: 24.1, endFoot: 24.2, tap: 24.9,
};
const UCAPS = { // [début, fin, lignes]
  hook: [[0.25, 2.2, [[['Le pire moment']], [['de la soirée ?']]]], [2.2, 4.6, [[['Passer '], ['40 minutes', '#ff2d4f']], [['à chercher un film…']]]],
    [4.6, 6.55, [[['…au lieu d’en']], [['regarder un.', '#ff2d4f']]]]],
  phone: [[6.62, 7.73, [[['J’ai découvert un site']]]], [7.73, 9.0, [[['qui règle '], ['ce problème :', '#ff2d4f']]]]],
  site: [[11.15, 13.0, [[['Tu réponds à']], [['quelques questions', '#ff2d4f']]]], [13.0, 14.65, [[['sur tes goûts']], [['et ton '], ['mood', '#ff2d4f']]]],
    [14.65, 15.58, [[['et le site']], [['te propose']]]], [15.58, 17.8, [[['les films', '#ff2d4f'], [' qui correspondent']], [['à tes envies.']]]]],
  smile: [[17.85, 20.35, [[['Franchement, si tu sais']], [['jamais quoi regarder,']]]], [20.35, 21.7, [[['va tester.', '#ff2d4f']]]]],
};
/* temps de la vidéo → temps des plans du site. Un saut (deux points au même instant) est une coupe :
   on passe les deux zooms de la question 3, l'écran est le même avant et après. */
const UMAP = [[9.1, 0.6], [10.4, 1.6], [11.0, 3.3], [11.5, 4.4], [11.5, 7.4], [12.1, 8.25], [12.8, 9.45], [13.6, 11.15],
  [14.4, 12.85], [15.2, 14.55], [15.5, 14.95], [17.0, 16.3], [UT.face3 + 0.2, 17.2]];
function brollAt(t) {
  if (t <= UMAP[0][0]) return UMAP[0][1];
  for (let i = 1; i < UMAP.length; i++) if (t < UMAP[i][0]) { const [a, A] = UMAP[i - 1], [b, B] = UMAP[i]; return A + ((B - A) * (t - a)) / (b - a); }
  return UMAP[UMAP.length - 1][1];
}
const brollFrame = (t) => (t < UT.site - 0.05 || t > UT.face3 + 0.2 ? null : clamp(Math.round(brollAt(t) * 60), 0, 1229));

let UFACE = [], UCUR = null; // les trois images de la créatrice ; image courante des plans du site
const UFR = new Map();
async function loadUgc() {
  UFACE = await Promise.all([1, 2, 3].map(async (k) => createImageBitmap(await (await fetch(`tex/face${k}.jpg`)).blob())));
}
async function needFrame(i) {
  if (i == null) return null;
  if (!UFR.has(i)) {
    UFR.set(i, await createImageBitmap(await (await fetch(`tex/broll/f${String(i + 1).padStart(5, '0')}.jpg`)).blob()));
    if (UFR.size > 8) { const k = UFR.keys().next().value; UFR.get(k).close(); UFR.delete(k); }
  }
  return UFR.get(i);
}

/* ---------- elle : image plein cadre, filmée « à la main » (poussée lente, léger flottement, coup de zoom à la coupe) ---------- */
function face(x, img, t, t0, t1, seed) {
  const u = prog(t, t0, t1), punch = 0.05 * (1 - EZ.out(prog(t, t0, t0 + 0.35)));
  const k = 1.04 + 0.05 * u + punch;
  const dx = 9 * fbm1(t * 0.7 + seed), dy = 7 * fbm1(t * 0.6 + seed + 3.1), r = 0.005 * fbm1(t * 0.5 + seed + 7.3);
  const s = Math.max(W / img.width, H / img.height) * k;
  x.save();
  x.translate(CX + dx, CY + dy); x.rotate(r);
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, (-img.width * s) / 2, (-img.height * s) / 2, img.width * s, img.height * s);
  x.restore();
  // bas de l'image un peu assombri : les sous-titres restent lisibles
  const g = x.createLinearGradient(0, 900, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
  x.fillStyle = g; x.fillRect(0, 900, W, H - 900);
}

/* ---------- sous-titres façon TikTok : lignes blanches sur cartouche noir, mots clés en rouge ---------- */
/* lines : [[texte, couleur?], …] par ligne */
function ucap(x, t, t0, t1, lines, cy, size) {
  if (t < t0 || t >= t1) return;
  const u = Math.min(1.05, spr(t - t0, 18, 9)), out = prog(t, t1 - 0.12, t1);
  const o = { fam: 'Archivo', wt: 800 }, lh = size * 1.42, padX = size * 0.42, bh = size * 1.3;
  x.save();
  x.globalAlpha = clamp(u * 1.6) * (1 - out);
  const sc = (0.72 + 0.28 * u) * (1 - 0.06 * out);
  x.translate(CX, cy); x.scale(sc, sc); x.translate(-CX, -cy);
  lines.forEach((segs, i) => {
    const ws = segs.map((s) => textWidth(s[0], size, o)), tw = ws.reduce((a, b) => a + b, 0);
    const y = cy + (i - (lines.length - 1) / 2) * lh;
    rrp(x, CX - tw / 2 - padX, y - bh / 2, tw + 2 * padX, bh, size * 0.3); x.fillStyle = 'rgba(8,4,6,0.92)'; x.fill();
    let px = CX - tw / 2;
    segs.forEach((s, k) => { drawText(x, s[0], px, y + size * 0.35, size, Object.assign({ color: s[1] || '#ffffff' }, o)); px += ws[k]; });
  });
  x.restore();
}
/* l'adresse dans sa pastille, tapée lettre à lettre */
function upill(x, t, t0, cy, size, w, h, ty) {
  const pu = EZ.out(prog(t, t0, t0 + 0.4)), [ta, tb] = ty || [t0 + 0.3, t0 + 0.95];
  if (pu <= 0) return;
  const url = 'cinem00d.com', o = { fam: 'Archivo', wt: 800 }, tw = textWidth(url, size, o);
  x.save();
  const pop = 1 + 0.035 * tri(t - tb - 0.1, 0.3);
  x.translate(CX, cy); x.scale(pop, pop); x.translate(-CX, -cy);
  rrp(x, CX - (w / 2) * pu, cy - h / 2, w * pu, h, h / 2);
  x.fillStyle = 'rgba(10,5,7,0.94)'; x.fill(); x.lineWidth = size * 0.06; x.strokeStyle = C.red; x.stroke();
  const n = Math.floor(url.length * prog(t, ta, tb));
  let px = CX - tw / 2 - size * 0.25;
  for (let i = 0; i < n; i++) { drawText(x, url[i], px, cy + size * 0.35, size, Object.assign({ color: i === 5 || i === 6 ? C.red : '#ffffff' }, o)); px += textWidth(url.slice(0, i + 1), size, o) - textWidth(url.slice(0, i), size, o); }
  if (t < tb + 0.15 && Math.floor(t * 4) % 2 === 0) { x.fillStyle = '#fff'; x.fillRect(px + 4, cy - size * 0.45, size * 0.06, size * 0.9); }
  const aa = EZ.out(prog(t, tb + 0.05, tb + 0.35));
  if (aa > 0) drawText(x, '→', CX + tw / 2 + size * 0.05 - (1 - aa) * 20, cy + size * 0.35, size * 0.8, { fam: 'Archivo', wt: 800, color: redA(aa) });
  x.restore();
}

/* ---------- l'accroche : elle, agacée ; le compteur monte jusqu'à 40:00 ---------- */
function sHook(x, t) {
  face(x, UFACE[0], t, 0, UT.phone, 1.3);
  // autocollant « compteur » : 00:00 → 40:00, se verrouille en rouge
  const lock = UT.lock, secs = Math.round(2400 * EZ.inOut(prog(t, 0.4, lock)));
  const s = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  const a = Math.min(1.06, spr(t - 0.2, 16, 8)), on = t >= lock, pun = 1 + 0.12 * tri(t - lock, 0.3);
  if (a > 0) {
    const size = 112, o = { fam: 'Anton' }, cell = textWidth('0', size, o) * 1.04, col = textWidth(':', size, o) * 1.3, tw = 4 * cell + col;
    const cy = 400, w = tw + 92, h = 172;
    x.save();
    x.translate(CX, cy); x.rotate(-0.04); x.scale(a * pun, a * pun);
    x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 28; x.shadowOffsetY = 10;
    rrp(x, -w / 2, -h / 2, w, h, 30); x.fillStyle = on ? C.red : '#ffffff'; x.fill();
    x.shadowColor = 'transparent';
    drawText(x, 'TEMPS PERDU À CHERCHER', 0, -h / 2 - 16, 24, { fam: 'Archivo', wt: 800, track: 0.14, align: 'center', color: '#ffffff' });
    let cx = -tw / 2;
    for (const ch of s) {
      const cw = ch === ':' ? col : cell;
      drawText(x, ch, cx + cw / 2, size * 0.36, size, { fam: 'Anton', align: 'center', color: on ? '#ffffff' : C.ink });
      cx += cw;
    }
    x.restore();
  }
  for (const [a0, a1, l] of UCAPS.hook) ucap(x, t, a0, a1, l, 1260, 76);
}

/* ---------- elle montre son téléphone ---------- */
function sPhone(x, t) {
  face(x, UFACE[1], t, UT.phone, UT.site, 4.7);
  for (const [a0, a1, l] of UCAPS.phone) ucap(x, t, a0, a1, l, 1260, 66);
}

/* ---------- le vrai site, dans un téléphone ---------- */
const UPH = { s: 0.76, x: 192, y: 474, w: 696, h: 1435, r: 98 }; // le téléphone des plans (83..999 × 19..1907), réduit
function sSite(x, t) {
  bgFill(x, 'blk');
  const hg = x.createRadialGradient(CX, 1150, 0, CX, 1150, 1000);
  hg.addColorStop(0, redA(0.3)); hg.addColorStop(0.5, redA(0.08)); hg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = hg; x.fillRect(0, 0, W, H);
  const P = UPH, pop = 1 + 0.06 * (1 - EZ.out(prog(t, UT.site, UT.site + 0.45)));
  x.save();
  x.translate(CX, P.y + P.h / 2); x.scale(pop, pop); x.translate(-CX, -(P.y + P.h / 2));
  x.save();
  x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 70; x.shadowOffsetY = 30;
  rrp(x, P.x, P.y, P.w, P.h, P.r); x.fillStyle = '#060304'; x.fill();
  x.restore();
  if (UCUR) {
    x.save(); rrp(x, P.x, P.y, P.w, P.h, P.r); x.clip();
    x.imageSmoothingQuality = 'high';
    x.drawImage(UCUR, P.x - 83 * P.s, P.y - 19 * P.s, 1080 * P.s, 1920 * P.s);
    x.restore();
  }
  rrp(x, P.x, P.y, P.w, P.h, P.r); x.lineWidth = 3; x.strokeStyle = 'rgba(255,120,140,0.5)'; x.stroke();
  x.restore();
  const pe = UCAPS.site[0][0];
  if (t < pe) { x.save(); x.globalAlpha = 1 - prog(t, pe - 0.15, pe); upill(x, t, UT.pill, 370, 76, 720, 136, UT.pillType); x.restore(); }
  for (const [a0, a1, l] of UCAPS.site) ucap(x, t, a0, a1, l, 370, 60);
}

/* ---------- elle sourit ---------- */
function sSmile(x, t) {
  face(x, UFACE[2], t, UT.face3, UT.end + 0.4, 9.1);
  ucap(x, t, UCAPS.smile[0][0], UCAPS.smile[0][1], UCAPS.smile[0][2], 1260, 64);
  ucap(x, t, UCAPS.smile[1][0], UCAPS.smile[1][1], UCAPS.smile[1][2], 1260, 92);
}

/* ---------- le carton final ---------- */
function sEnd(x, t) {
  bgFill(x, 'blk');
  const hg = x.createRadialGradient(CX, 900, 0, CX, 900, 1000);
  hg.addColorStop(0, redA(0.34)); hg.addColorStop(0.5, redA(0.09)); hg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = hg; x.fillRect(0, 0, W, H);
  ucap(x, t, UT.end + 0.25, UT.endLogo, [[['Je te mets le site :']]], 640, 66);
  const LW = layoutChars('CINÉMOOD', 190, { fam: 'Anton' }), x0 = CX - LW.w / 2;
  LW.chars.forEach((c, i) => revealLine(x, c.ch, x0 + c.x, 680, 190, (t - UT.endLogo - i * 0.04) / 0.55, { fam: 'Anton', color: i < 4 ? C.cream : C.red, ease: EZ.out, asc: 1.2, desc: 0.08 }));
  tl(x, [['TON HUMEUR CHOISIT TON ', C.cream], ['CINÉMA.', C.red]], CX, 770, 50, t, UT.endTag, null, { align: 'center' });
  upill(x, t, UT.endPill, 960, 100, 900, 176, UT.endType);
  kick(x, 'GRATUIT  ·  SANS INSCRIPTION', CX, 1130, t, UT.endKick, null, { align: 'center', size: 32, color: cream(0.9) });
  if (t > UT.tap - 0.5) { // un appui sur l'adresse
    const px = CX + 398, py = 985;
    finger(x, px, py, prog(t, UT.tap - 0.5, UT.tap - 0.3) * (1 - prog(t, UT.tap + 0.6, UT.tap + 0.9)), press(t, UT.tap), false);
    ripple(x, px, py, t - UT.tap, false);
  }
  para(x, 'Interface réelle  ·  films fictifs, à titre d’illustration', CX, 1440, 22, 1000, t, UT.endFoot, null, { align: 'center', color: cream(0.45) });
}

/* mention permanente, en haut à gauche, sous la barre de TikTok */
function ulabel(x) {
  const s = 'Publicité · personnage généré par IA', size = 24, o = { fam: 'Archivo', wt: 700 }, w = textWidth(s, size, o);
  rrp(x, 40, 214, w + 36, 44, 22); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fill();
  drawText(x, s, 58, 244, size, Object.assign({ color: 'rgba(255,255,255,0.88)' }, o));
}

/* ---------- le film ---------- */
function sUgc(x, t) {
  if (t < UT.phone) sHook(x, t);
  else if (t < UT.site) sPhone(x, t);
  else if (t < UT.face3) sSite(x, t);
  else {
    const e = EZ.inOut(prog(t, UT.end, UT.end + 0.4));
    if (e <= 0) sSmile(x, t);
    else if (e >= 1) sEnd(x, t);
    else { // le carton final pousse l'image vers le haut
      const d = H * 1.02;
      x.save(); x.translate(0, -d * e); sSmile(x, t); x.restore();
      x.save(); x.translate(0, d * (1 - e)); sEnd(x, t); x.restore();
    }
  }
  ulabel(x);
}
function ugcBlurAt(t) {
  if (t >= UT.end && t < UT.end + 0.42) return { n: 6, shutter: 0.8 };
  if ((t > 0.2 && t < 0.65) || (t > UT.lock - 0.1 && t < UT.lock + 0.4)) return { n: 4, shutter: 0.6 };
  return { n: 1, shutter: 0 };
}
function ugcFx(t) {
  const sh = { x: 0, y: 0 };
  let env = 0;
  for (const [t0, amp] of [[UT.lock, 7], [UT.end + 0.38, 4]]) {
    const u = t - t0;
    if (u <= 0 || u >= 0.4) continue;
    const k = (1 - u / 0.4) ** 2, s = shake(t, amp * k, 26, t0 * 7);
    sh.x += s.x; sh.y += s.y; env += amp * k;
  }
  return { shake: sh, env, vignette: 0.18, grain: 0.035, fade: Math.max(1 - t / 0.12, prog(t, UT.dur - 0.5, UT.dur)) };
}
