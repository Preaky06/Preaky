/* CinéMood — pub « UGC » 30 s, 9:16, format TikTok. Une créatrice fictive (images générées : tex/face1..3.jpg),
   les plans du vrai site (out/plans-site, lus image par image : tex/broll/), sous-titres façon TikTok.
   0–6 s       accroche : elle, agacée, un compteur qui monte jusqu'à 40:00 ;
   6–8,6 s     elle montre son téléphone ;
   8,6–21 s    le vrai site dans un téléphone, l'adresse tapée, le parcours, le résultat ;
   21–24,4 s   elle sourit : « va tester » ;
   24,4–30 s   carton final : l'adresse en grand.
   Zone sûre TikTok : rien d'important au-dessus de 200 px ni sous 1500 px. S'appuie sur mograph.js. */
'use strict';

const UDUR = 30, USITE = 8.6, UFACE3 = 21.0, UEND = 24.4;
/* temps de la vidéo → temps des plans du site. Un saut (deux points au même instant) est une coupe :
   on passe les deux zooms de la question 3, l'écran est le même avant et après. */
const UMAP = [[8.6, 0.6], [9.6, 1.6], [10.2, 2.5], [11.0, 3.3], [11.9, 4.35], [12.1, 4.5], [12.1, 7.4], [12.9, 8.2], [13.9, 9.45],
  [15.0, 11.15], [16.0, 12.85], [17.0, 14.55], [17.4, 14.95], [19.2, 16.3], [UFACE3 + 0.2, 17.2]];
function brollAt(t) {
  if (t <= UMAP[0][0]) return UMAP[0][1];
  for (let i = 1; i < UMAP.length; i++) if (t < UMAP[i][0]) { const [a, A] = UMAP[i - 1], [b, B] = UMAP[i]; return A + ((B - A) * (t - a)) / (b - a); }
  return UMAP[UMAP.length - 1][1];
}
const brollFrame = (t) => (t < USITE - 0.05 || t > UFACE3 + 0.2 ? null : clamp(Math.round(brollAt(t) * 60), 0, 1229));

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
function upill(x, t, t0, cy, size, w, h) {
  const pu = EZ.out(prog(t, t0, t0 + 0.4));
  if (pu <= 0) return;
  const url = 'cinem00d.com', o = { fam: 'Archivo', wt: 800 }, tw = textWidth(url, size, o);
  x.save();
  const pop = 1 + 0.035 * tri(t - t0 - 1.05, 0.3);
  x.translate(CX, cy); x.scale(pop, pop); x.translate(-CX, -cy);
  rrp(x, CX - (w / 2) * pu, cy - h / 2, w * pu, h, h / 2);
  x.fillStyle = 'rgba(10,5,7,0.94)'; x.fill(); x.lineWidth = size * 0.06; x.strokeStyle = C.red; x.stroke();
  const n = Math.floor(url.length * prog(t, t0 + 0.3, t0 + 0.95));
  let px = CX - tw / 2 - size * 0.25;
  for (let i = 0; i < n; i++) { drawText(x, url[i], px, cy + size * 0.35, size, Object.assign({ color: i === 5 || i === 6 ? C.red : '#ffffff' }, o)); px += textWidth(url.slice(0, i + 1), size, o) - textWidth(url.slice(0, i), size, o); }
  if (t < t0 + 1.1 && Math.floor(t * 4) % 2 === 0) { x.fillStyle = '#fff'; x.fillRect(px + 4, cy - size * 0.45, size * 0.06, size * 0.9); }
  const aa = EZ.out(prog(t, t0 + 1.0, t0 + 1.3));
  if (aa > 0) drawText(x, '→', CX + tw / 2 + size * 0.05 - (1 - aa) * 20, cy + size * 0.35, size * 0.8, { fam: 'Archivo', wt: 800, color: redA(aa) });
  x.restore();
}

/* ---------- 0–6 s : l'accroche ---------- */
function sHook(x, t) {
  face(x, UFACE[0], t, 0, 6, 1.3);
  // autocollant « compteur » : 00:00 → 40:00, se verrouille en rouge
  const lock = 4.7, secs = Math.round(2400 * EZ.inOut(prog(t, 0.5, lock)));
  const s = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  const a = Math.min(1.06, spr(t - 0.25, 16, 8)), on = t >= lock, pun = 1 + 0.12 * tri(t - lock, 0.3);
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
  ucap(x, t, 0.3, 2.3, [[['Le pire moment']], [['de la soirée ?']]], 1260, 76);
  ucap(x, t, 2.3, 4.5, [[['Passer '], ['40 minutes', C.red]], [['à chercher un film…']]], 1260, 76);
  ucap(x, t, 4.5, 6.0, [[['…au lieu d’en']], [['regarder un.', C.red]]], 1260, 76);
}

/* ---------- 6–8,6 s : elle montre son téléphone ---------- */
function sPhone(x, t) {
  face(x, UFACE[1], t, 6, USITE, 4.7);
  ucap(x, t, 6.15, 7.35, [[['J’ai découvert un site']]], 1260, 66);
  ucap(x, t, 7.35, USITE, [[['qui règle '], ['ce problème :', C.red]]], 1260, 66);
}

/* ---------- 8,6–21 s : le vrai site, dans un téléphone ---------- */
const UPH = { s: 0.76, x: 192, y: 474, w: 696, h: 1435, r: 98 }; // le téléphone des plans (83..999 × 19..1907), réduit
function sSite(x, t) {
  bgFill(x, 'blk');
  const hg = x.createRadialGradient(CX, 1150, 0, CX, 1150, 1000);
  hg.addColorStop(0, redA(0.3)); hg.addColorStop(0.5, redA(0.08)); hg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = hg; x.fillRect(0, 0, W, H);
  const P = UPH, pop = 1 + 0.06 * (1 - EZ.out(prog(t, USITE, USITE + 0.45)));
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
  if (t < 11.95) { x.save(); x.globalAlpha = 1 - prog(t, 11.8, 11.95); upill(x, t, USITE, 370, 76, 720, 136); x.restore(); }
  ucap(x, t, 12.1, 14.6, [[['Tu réponds à']], [['quelques questions', C.red]]], 370, 60);
  ucap(x, t, 14.6, 17.0, [[['sur tes goûts']], [['et ton '], ['mood', C.red]]], 370, 60);
  ucap(x, t, 17.0, 18.8, [[['et le site']], [['te propose']]], 370, 60);
  ucap(x, t, 18.8, UFACE3, [[['les films', C.red], [' qui collent']], [['à tes envies.']]], 370, 60);
}

/* ---------- 21–24,4 s : elle sourit ---------- */
function sSmile(x, t) {
  face(x, UFACE[2], t, UFACE3, UEND + 0.4, 9.1);
  ucap(x, t, UFACE3 + 0.15, 23.0, [[['Franchement, si tu sais']], [['jamais quoi regarder,']]], 1260, 64);
  ucap(x, t, 23.0, UEND + 0.4, [[['va tester.', C.red]]], 1260, 92);
}

/* ---------- 24,4–30 s : le carton final ---------- */
function sEnd(x, t) {
  bgFill(x, 'blk');
  const hg = x.createRadialGradient(CX, 900, 0, CX, 900, 1000);
  hg.addColorStop(0, redA(0.34)); hg.addColorStop(0.5, redA(0.09)); hg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = hg; x.fillRect(0, 0, W, H);
  ucap(x, t, 24.75, 26.5, [[['Je te mets le site :']]], 640, 66);
  const LW = layoutChars('CINÉMOOD', 190, { fam: 'Anton' }), x0 = CX - LW.w / 2;
  LW.chars.forEach((c, i) => revealLine(x, c.ch, x0 + c.x, 680, 190, (t - 26.55 - i * 0.04) / 0.55, { fam: 'Anton', color: i < 4 ? C.cream : C.red, ease: EZ.out, asc: 1.2, desc: 0.08 }));
  tl(x, [['TON HUMEUR CHOISIT TON ', C.cream], ['CINÉMA.', C.red]], CX, 770, 50, t, 26.9, null, { align: 'center' });
  upill(x, t, 25.0, 960, 100, 900, 176);
  kick(x, 'GRATUIT  ·  SANS INSCRIPTION', CX, 1130, t, 26.3, null, { align: 'center', size: 32, color: cream(0.9) });
  if (t > 27.3) { // un appui sur l'adresse
    const px = CX + 398, py = 985;
    finger(x, px, py, prog(t, 27.3, 27.5) * (1 - prog(t, 28.4, 28.7)), press(t, 27.8), false);
    ripple(x, px, py, t - 27.8, false);
  }
  para(x, 'Interface réelle  ·  films fictifs, à titre d’illustration', CX, 1440, 22, 1000, t, 26.8, null, { align: 'center', color: cream(0.45) });
}

/* mention permanente, en haut à gauche, sous la barre de TikTok */
function ulabel(x) {
  const s = 'Publicité · personnage généré par IA', size = 24, o = { fam: 'Archivo', wt: 700 }, w = textWidth(s, size, o);
  rrp(x, 40, 214, w + 36, 44, 22); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fill();
  drawText(x, s, 58, 244, size, Object.assign({ color: 'rgba(255,255,255,0.88)' }, o));
}

/* ---------- le film ---------- */
function sUgc(x, t) {
  if (t < 6) sHook(x, t);
  else if (t < USITE) sPhone(x, t);
  else if (t < UFACE3) sSite(x, t);
  else {
    const e = EZ.inOut(prog(t, UEND, UEND + 0.4));
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
  if (t >= UEND && t < UEND + 0.42) return { n: 6, shutter: 0.8 };
  if ((t > 0.25 && t < 0.7) || (t > 4.6 && t < 5.1)) return { n: 4, shutter: 0.6 };
  return { n: 1, shutter: 0 };
}
function ugcFx(t) {
  const sh = { x: 0, y: 0 };
  let env = 0;
  for (const [t0, amp] of [[4.7, 7], [UEND + 0.38, 4]]) {
    const u = t - t0;
    if (u <= 0 || u >= 0.4) continue;
    const k = (1 - u / 0.4) ** 2, s = shake(t, amp * k, 26, t0 * 7);
    sh.x += s.x; sh.y += s.y; env += amp * k;
  }
  return { shake: sh, env, vignette: 0.18, grain: 0.035, fade: Math.max(1 - t / 0.12, prog(t, UDUR - 0.5, UDUR)) };
}
