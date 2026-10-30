// Illustrations vectorielles des recettes, vues de dessus, générées à partir des ingrédients réels :
// couleurs et formes viennent de la composition de chaque plat. Elles remplacent provisoirement
// les photographies, qui ne seront ajoutées qu'avec leurs droits d'utilisation.
import { poids } from "./donnees.mjs";

// ---------------------------------------------------------------- outils
function graine(texte) {
  let h = 2166136261;
  for (const c of texte) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function hasard(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const teinte = (h, f) => hex(rgb(h).map((v) => (f < 0 ? v * (1 + f) : v + (255 - v) * f)));
function melange(couleurs) {
  const tot = couleurs.reduce((s, [, w]) => s + w, 0) || 1;
  const acc = [0, 0, 0];
  for (const [c, w] of couleurs) rgb(c).forEach((v, i) => (acc[i] += (v * w) / tot));
  return hex(acc);
}
const f1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------- classement des ingrédients
const HERBES = new Set(["persil-plat", "basilic", "basilic-thai", "menthe", "coriandre-fraiche", "guascas", "thym", "laurier"]);
const TEINTES = new Set(["paprika-doux", "curcuma", "concentre-tomate", "berbere", "tomate-concassee", "lait-coco", "creme", "piment-poudre", "curry-poudre", "sauce-soja", "gochujang", "sucre-palme", "sirop-erable", "golden-syrup"]);
const IGNORES = new Set(["eau", "sel", "huile-neutre", "huile-olive", "huile-sesame", "saindoux", "vinaigre-blanc", "vinaigre-xeres", "vinaigre-vin-rouge", "levure-chimique", "bicarbonate", "jus-citron", "jus-citron-vert", "sauce-poisson", "kombu", "katsuobushi", "laurier", "poivre-noir", "beurre", "ghee", "niter-kibbeh", "moutarde", "sucre"]);

function forme(ing) {
  const s = ing.s;
  if (HERBES.has(s)) return "feuille";
  if (/^tomate/.test(s) && s !== "tomate-concassee") return "quartier";
  if (["oignon-vert", "oignon-rouge", "piment-vert", "piment-serrano", "piment-limo", "piment-oiseau", "piment-fort", "poireau"].includes(s)) return "anneau";
  if (["concombre", "courgette", "carotte", "chourico", "patate-douce", "citron", "citron-vert"].includes(s)) return "rondelle";
  if (/^olive/.test(s)) return "olive";
  if (["epinards", "chou-galega", "chou-kale", "chou-cavalier", "wakame-sechee", "papaye-verte", "pousses-soja", "haricot-kilometre", "laitue"].includes(s)) return "laniere";
  if (["crevettes"].includes(s)) return "crevette";
  if (["feta", "tofu-soyeux", "tofu-ferme", "poisson-blanc"].includes(s)) return "cube";
  if (["arachides", "graines-sesame", "crevettes-sechees", "cumin-graines", "carvi", "capres", "piment-flocons", "piment-rouge-seche", "piment-alep", "origan-seche"].includes(s)) return "grain";
  if (ing.f === "legumineuses") return "grain";
  if (["spaghetti", "vermicelles-riz", "vermicelles-ble"].includes(s)) return "fil";
  if (["oeuf"].includes(s)) return "oeuf";
  if (["champignons-shiitake", "shiitake-seche"].includes(s)) return "champignon";
  if (["mais-epi"].includes(s)) return "mais";
  if (["avocat"].includes(s)) return "rondelle";
  if (ing.f === "epices") return "poudre";
  return "morceau";
}

// ---------------------------------------------------------------- formes élémentaires
function feuille(x, y, t, a, c) {
  return `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})" d="M0 ${-t}Q${t * 0.7} ${-t * 0.2} 0 ${t}Q${-t * 0.7} ${-t * 0.2} 0 ${-t}Z" fill="${c}"/><path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})" d="M0 ${-t * 0.8}L0 ${t * 0.8}" stroke="${teinte(c, -0.25)}" stroke-width="${f1(t * 0.08)}"/>`;
}
function quartier(x, y, t, a, c) {
  const d = teinte(c, 0.35);
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})"><path d="M${-t} 0A${t} ${t} 0 0 1 ${t} 0Z" fill="${c}"/><path d="M${-t * 0.72} ${-t * 0.08}A${t * 0.72} ${t * 0.72} 0 0 1 ${t * 0.72} ${-t * 0.08}Z" fill="${d}" opacity=".55"/><circle cx="${f1(-t * 0.3)}" cy="${f1(-t * 0.3)}" r="${f1(t * 0.08)}" fill="#f4e7a8"/><circle cx="${f1(t * 0.25)}" cy="${f1(-t * 0.35)}" r="${f1(t * 0.08)}" fill="#f4e7a8"/></g>`;
}
function anneau(x, y, t, a, c) {
  return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(t)}" ry="${f1(t * 0.86)}" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})" fill="none" stroke="${c}" stroke-width="${f1(t * 0.32)}"/>`;
}
function rondelle(x, y, t, a, c) {
  return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(t)}" fill="${teinte(c, -0.12)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(t * 0.78)}" fill="${teinte(c, 0.28)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(t * 0.3)}" fill="${teinte(c, 0.5)}" opacity=".6"/>`;
}
function olive(x, y, t, a, c) {
  return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(t)}" ry="${f1(t * 0.7)}" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})" fill="${c}"/><ellipse cx="${f1(x - t * 0.3)}" cy="${f1(y - t * 0.25)}" rx="${f1(t * 0.25)}" ry="${f1(t * 0.14)}" fill="#fff" opacity=".35"/>`;
}
function laniere(x, y, t, a, c) {
  const l = t * 2.2;
  return `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})" d="M${-l} 0C${-l / 2} ${-t * 0.9} ${l / 2} ${t * 0.9} ${l} 0" fill="none" stroke="${c}" stroke-width="${f1(t * 0.55)}" stroke-linecap="round"/>`;
}
function crevette(x, y, t, a, c) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})"><path d="M${-t} 0A${t} ${t} 0 1 1 ${t * 0.3} ${t * 0.95}" fill="none" stroke="${c}" stroke-width="${f1(t * 0.62)}" stroke-linecap="round"/><path d="M${-t} 0A${t} ${t} 0 1 1 ${t * 0.3} ${t * 0.95}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${f1(t * 0.12)}" stroke-dasharray="${f1(t * 0.18)} ${f1(t * 0.3)}"/></g>`;
}
function cube(x, y, t, a, c) {
  return `<rect x="${f1(x - t)}" y="${f1(y - t)}" width="${f1(t * 2)}" height="${f1(t * 2)}" rx="${f1(t * 0.25)}" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})" fill="${c}" stroke="${teinte(c, -0.12)}" stroke-width="${f1(t * 0.12)}"/>`;
}
function grain(x, y, t, a, c) {
  return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(t * 0.32)}" ry="${f1(t * 0.24)}" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})" fill="${c}"/>`;
}
function poudre(x, y, t, a, c) {
  return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(t * 0.12)}" fill="${c}" opacity=".85"/>`;
}
function champignon(x, y, t, a, c) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})"><path d="M${-t} 0A${t} ${t * 0.8} 0 0 1 ${t} 0Z" fill="${c}"/><rect x="${f1(-t * 0.22)}" y="0" width="${f1(t * 0.44)}" height="${f1(t * 0.7)}" rx="${f1(t * 0.1)}" fill="${teinte(c, 0.45)}"/></g>`;
}
function morceau(x, y, t, a, c, r) {
  const n = 7;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const rr = t * (0.75 + r() * 0.35);
    pts.push(`${f1(x + Math.cos(ang) * rr)} ${f1(y + Math.sin(ang) * rr)}`);
  }
  return `<path d="M${pts.join("L")}Z" fill="${c}" stroke="${teinte(c, -0.18)}" stroke-width="${f1(t * 0.1)}" stroke-linejoin="round"/>`;
}
function mais(x, y, t, a, c) {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})"><rect x="${-t * 1.6}" y="${-t * 0.7}" width="${t * 3.2}" height="${t * 1.4}" rx="${t * 0.7}" fill="${teinte(c, -0.1)}"/>`;
  for (let i = -3; i <= 3; i++) for (const j of [-0.35, 0, 0.35]) g += `<circle cx="${f1(i * t * 0.42)}" cy="${f1(j * t * 1.2)}" r="${f1(t * 0.2)}" fill="${c}"/>`;
  return g + "</g>";
}
function oeufPlat(x, y, t) {
  return `<path d="M${x - t} ${y}C${x - t} ${y - t * 0.9} ${x - t * 0.2} ${y - t * 1.1} ${x + t * 0.3} ${y - t * 0.95}C${x + t * 1.1} ${y - t * 0.7} ${x + t * 1.05} ${y + t * 0.5} ${x + t * 0.4} ${y + t * 0.9}C${x - t * 0.3} ${y + t * 1.15} ${x - t} ${y + t * 0.7} ${x - t} ${y}Z" fill="#fbf8f0"/><circle cx="${x + t * 0.05}" cy="${y - t * 0.05}" r="${t * 0.38}" fill="#f0a52a"/><circle cx="${x - t * 0.07}" cy="${y - t * 0.17}" r="${t * 0.1}" fill="#fff" opacity=".5"/>`;
}
const FORMES = { feuille, quartier, anneau, rondelle, olive, laniere, crevette, cube, grain, poudre, champignon, morceau, mais };

// ---------------------------------------------------------------- composition
function analyser(r) {
  const lignes = r.lignes.filter((l) => !IGNORES.has(l.ing.s));
  const ponderees = lignes.map((l) => [l, poids(l) * (TEINTES.has(l.ing.s) ? 12 : 1) || 4]);
  ponderees.sort((a, b) => b[1] - a[1]);
  const base = melange(ponderees.slice(0, 5).map(([l, w]) => [l.ing.c, w]));
  const pieces = [];
  const vues = new Set();
  for (const [l] of ponderees) {
    const f = forme(l.ing);
    if (TEINTES.has(l.ing.s) && f === "poudre") continue;
    const cle = l.ing.s;
    if (vues.has(cle)) continue;
    vues.add(cle);
    pieces.push({ ing: l.ing, f });
  }
  const has = (s) => r.lignes.some((l) => l.ing.s === s);
  return { base, pieces, has };
}

function semer(r, cx, cy, rayon, pieces, nb, taille, contraintes = {}) {
  let s = "";
  const tot = pieces.length || 1;
  for (let i = 0; i < nb; i++) {
    const p = pieces[i % tot];
    const ang = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * rayon * (contraintes.couronne ? 0.55 + 0.45 * r() : 1);
    const x = cx + Math.cos(ang) * d;
    const y = cy + Math.sin(ang) * d;
    let t = taille * (0.75 + r() * 0.5);
    if (p.f === "grain" || p.f === "poudre") t *= 0.7;
    if (p.f === "feuille") t *= 0.8;
    if (p.f === "oeuf" || p.f === "fil") continue;
    s += FORMES[p.f](x, y, t, r() * 360, p.ing.c, r);
  }
  return s;
}

function ombre(cx, cy, rx, ry, id) {
  return `<ellipse cx="${cx + 10}" cy="${cy + 16}" rx="${rx}" ry="${ry}" fill="#000" opacity=".22" filter="url(#${id}-flou)"/>`;
}

function assiette(cx, cy, R, id) {
  return ombre(cx, cy, R, R, id) +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fbf9f4"/><circle cx="${cx}" cy="${cy}" r="${R - 2}" fill="none" stroke="#e6dfd2" stroke-width="2"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R * 0.72}" fill="#f4efe6"/><circle cx="${cx}" cy="${cy}" r="${R * 0.72}" fill="none" stroke="#e9e2d5" stroke-width="3"/>`;
}

function bol(cx, cy, R, couleur, id) {
  return ombre(cx, cy, R, R, id) +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${couleur}"/><circle cx="${cx}" cy="${cy}" r="${R - 3}" fill="none" stroke="${teinte(couleur, 0.25)}" stroke-width="3"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R * 0.84}" fill="${teinte(couleur, -0.25)}"/>`;
}

function contenu(cx, cy, rr, couleur, id, r) {
  return `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="url(#${id}-fond)"/>` +
    `<radialGradient id="${id}-fond" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="${teinte(couleur, 0.22)}"/><stop offset=".8" stop-color="${couleur}"/><stop offset="1" stop-color="${teinte(couleur, -0.18)}"/></radialGradient>`;
}

function filet(cx, cy, rr, couleur, r) {
  let d = `M${cx - rr * 0.6} ${cy - rr * 0.1}`;
  for (let i = 0; i < 5; i++) d += `Q${f1(cx - rr * 0.45 + i * rr * 0.25)} ${f1(cy + (i % 2 ? 1 : -1) * rr * (0.15 + r() * 0.2))} ${f1(cx - rr * 0.35 + i * rr * 0.25)} ${f1(cy - rr * 0.05)}`;
  return `<path d="${d}" fill="none" stroke="${couleur}" stroke-width="5" stroke-linecap="round" opacity=".75"/>`;
}

function nid(cx, cy, rr, couleur, r) {
  let s = "";
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, d = r() * rr * 0.75;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    const l = rr * (0.5 + r() * 0.6), b = r() * Math.PI * 2;
    s += `<path d="M${f1(x - Math.cos(b) * l / 2)} ${f1(y - Math.sin(b) * l / 2)}Q${f1(x + (r() - 0.5) * l)} ${f1(y + (r() - 0.5) * l)} ${f1(x + Math.cos(b) * l / 2)} ${f1(y + Math.sin(b) * l / 2)}" fill="none" stroke="${i % 3 ? couleur : teinte(couleur, -0.12)}" stroke-width="4.2" stroke-linecap="round"/>`;
  }
  return s;
}

function riz(cx, cy, rr, r, couleur = "#f6f2e8") {
  let s = `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${couleur}"/>`;
  for (let i = 0; i < 140; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rr * 0.96;
    s += grain(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 14, r() * 180, teinte(couleur, -0.06 - r() * 0.06));
  }
  return s;
}

function serviette(r, W, H, couleur, rayure) {
  const x = r() < 0.5 ? -40 : W * 0.62, y = r() < 0.5 ? -60 : H * 0.55;
  const a = (r() - 0.5) * 30;
  return `<g transform="rotate(${f1(a)} ${x + 140} ${y + 120})"><rect x="${x}" y="${y}" width="${W * 0.5}" height="${H * 0.62}" rx="6" fill="${couleur}"/>` +
    `<rect x="${x}" y="${y + 26}" width="${W * 0.5}" height="5" fill="${rayure}" opacity=".7"/><rect x="${x}" y="${y + 38}" width="${W * 0.5}" height="2" fill="${rayure}" opacity=".7"/></g>`;
}

function couvert(x, y, a, cuillere) {
  const metal = "#d8d3c8", bord = "#b7b1a4";
  const tete = cuillere
    ? `<ellipse cx="0" cy="-70" rx="24" ry="34" fill="${metal}" stroke="${bord}" stroke-width="2"/><ellipse cx="-6" cy="-78" rx="8" ry="14" fill="#fff" opacity=".35"/>`
    : `<path d="M-18 -110V-62Q-18 -40 0 -36Q18 -40 18 -62V-110" fill="none" stroke="${metal}" stroke-width="7" stroke-linecap="round"/><path d="M-6 -110V-60M6 -110V-60" stroke="${metal}" stroke-width="5" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${a})">${tete}<rect x="-7" y="-38" width="14" height="150" rx="7" fill="${metal}" stroke="${bord}" stroke-width="2"/></g>`;
}

const FONDS = [
  { table: "#263B32", lin: "#efe6d4", rayure: "#C47D4D" },
  { table: "#b5764b", lin: "#f6efe2", rayure: "#263B32" },
  { table: "#d9c9a8", lin: "#fbf8f1", rayure: "#C47D4D" },
  { table: "#3b4650", lin: "#efe6d4", rayure: "#d9c9a8" },
  { table: "#5d6040", lin: "#f3ebdd", rayure: "#C47D4D" },
  { table: "#e3d7c0", lin: "#ffffff", rayure: "#263B32" },
];
const BOLS = ["#f3ede2", "#2f3b45", "#a85d36", "#e8e1d2", "#3f4f3f"];

// Le plat, centré en (cx, cy), à l'échelle k ; renvoie le SVG et la définition des dégradés
export function plat(rec, cx, cy, k, id) {
  const r = hasard(graine(rec.slug));
  const { base, pieces, has } = analyser(rec);
  const visibles = pieces.filter((p) => p.f !== "poudre" || pieces.length < 3);
  let s = "";
  const R = 160 * k;
  const v = rec.visuel;

  if (v === "bol") {
    const coul = BOLS[Math.floor(r() * BOLS.length)];
    const rizBol = rec.lignes.find((l) => /^riz/.test(l.ing.s));
    if (rizBol && has("oeuf")) {
      // riz garni : chaque garniture occupe son secteur, l'œuf au centre
      s += bol(cx, cy, R, coul, id) + riz(cx, cy, R * 0.8, r);
      const garn = visibles.filter((p) => !["oeuf", "poudre", "grain"].includes(p.f)).slice(0, 6);
      garn.forEach((p, i) => {
        const a0 = (i / garn.length) * Math.PI * 2, a1 = ((i + 1) / garn.length) * Math.PI * 2;
        const rr = R * 0.78;
        s += `<path d="M${cx} ${cy}L${f1(cx + Math.cos(a0) * rr)} ${f1(cy + Math.sin(a0) * rr)}A${rr} ${rr} 0 0 1 ${f1(cx + Math.cos(a1) * rr)} ${f1(cy + Math.sin(a1) * rr)}Z" fill="${teinte(p.ing.c, 0.1)}"/>`;
        for (let j = 0; j < 9; j++) {
          const a = a0 + (0.15 + r() * 0.7) * (a1 - a0), d = R * (0.35 + r() * 0.38);
          s += FORMES[p.f === "morceau" ? "laniere" : p.f](cx + Math.cos(a) * d, cy + Math.sin(a) * d, 10 * k, (a * 180) / Math.PI + 90, teinte(p.ing.c, -0.08), r);
        }
      });
      s += oeufPlat(cx, cy, R * 0.3);
      if (has("gochujang")) s += `<circle cx="${cx + R * 0.32}" cy="${cy + R * 0.3}" r="${R * 0.1}" fill="#b0261a"/>`;
      if (has("graines-sesame")) s += semer(r, cx, cy, R * 0.6, [{ ing: { c: "#efe2c0" }, f: "grain" }], 24, 12 * k);
    } else {
      s += bol(cx, cy, R, coul, id) + contenu(cx, cy, R * 0.8, base, id, r);
      if (has("oeuf")) s += oeufPlat(cx + R * 0.15, cy - R * 0.1, R * 0.28);
      s += semer(r, cx, cy, R * 0.62, visibles.slice(0, 5), 26, 12 * k);
    }
    if (has("huile-olive") || has("huile-sesame")) s += filet(cx, cy + R * 0.1, R * 0.7, has("huile-sesame") ? "#b07a2a" : "#c9b23a", r);
    if (has("creme")) s += `<path d="M${cx - 30 * k} ${cy + 20 * k}q${20 * k} ${-30 * k} ${45 * k} ${-6 * k}t${20 * k} ${16 * k}" fill="none" stroke="#fbf6ea" stroke-width="${10 * k}" stroke-linecap="round"/>`;
  } else if (v === "assiette" || v === "salade") {
    s += assiette(cx, cy, R, id);
    const fil = pieces.find((p) => p.f === "fil");
    const rizP = rec.lignes.find((l) => /^riz/.test(l.ing.s));
    if (fil) s += nid(cx, cy, R * 0.62, fil.ing.c, r);
    else if (rizP) {
      const haricot = rec.lignes.find((l) => /^haricots-(noirs|rouges)/.test(l.ing.s));
      s += riz(cx, cy, R * 0.6, r, haricot ? teinte(haricot.ing.c, 0.72) : "#f6f2e8");
      if (haricot) for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R * 0.56; s += olive(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 7 * k, r() * 180, haricot.ing.c); }
    }
    else if (v === "assiette") s += `<path d="M${cx - R * 0.5} ${cy}C${cx - R * 0.5} ${cy - R * 0.5} ${cx + R * 0.45} ${cy - R * 0.55} ${cx + R * 0.52} ${cy}S${cx - R * 0.5} ${cy + R * 0.55} ${cx - R * 0.5} ${cy}Z" fill="${base}"/>`;
    if (has("oeuf") && !rec.lignes.some((l) => /tomate/.test(l.ing.s))) s += oeufPlat(cx + R * 0.25, cy - R * 0.15, R * 0.24);
    if (has("oeuf") && rec.lignes.some((l) => /tomate/.test(l.ing.s))) {
      for (let i = 0; i < 9; i++) s += morceau(cx + (r() - 0.5) * R * 0.9, cy + (r() - 0.5) * R * 0.8, 18 * k, 0, "#f3c84a", r);
    }
    const n = v === "salade" ? 46 : 22;
    s += semer(r, cx, cy, R * (v === "salade" ? 0.66 : 0.55), visibles.filter((p) => p.f !== "fil").slice(0, 7), n, (v === "salade" ? 15 : 11) * k);
    if (has("feta")) s += `<rect x="${cx - 38 * k}" y="${cy - 26 * k}" width="${76 * k}" height="${52 * k}" rx="4" transform="rotate(-8 ${cx} ${cy})" fill="#fbfaf5" stroke="#e8e3d6" stroke-width="2"/>` + semer(r, cx, cy, 30 * k, [{ ing: { c: "#6a6a3a" }, f: "poudre" }], 18, 14 * k);
    if (has("huile-olive")) s += filet(cx, cy + R * 0.18, R * 0.55, "#c9b23a", r);
  } else if (v === "plat") {
    s += ombre(cx, cy, R * 1.12, R * 0.92, id);
    s += `<rect x="${cx - R * 1.32}" y="${cy - 26 * k}" width="${R * 2.64}" height="${52 * k}" rx="${20 * k}" fill="#24272a"/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${R * 1.12}" ry="${R * 0.92}" fill="#2c3033"/><ellipse cx="${cx}" cy="${cy}" rx="${R * 1.02}" ry="${R * 0.83}" fill="#1f2224"/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${R * 0.94}" ry="${R * 0.76}" fill="url(#${id}-fond)"/><radialGradient id="${id}-fond" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="${teinte(base, 0.15)}"/><stop offset="1" stop-color="${teinte(base, -0.2)}"/></radialGradient>`;
    s += semer(r, cx, cy, R * 0.68, visibles.slice(0, 6), 40, 14 * k);
  } else if (v === "sauce") {
    s += ombre(cx, cy, R * 0.85, R * 0.85, id);
    s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.85}" fill="#4b4a45"/><circle cx="${cx}" cy="${cy}" r="${R * 0.85}" fill="none" stroke="#5e5d57" stroke-width="6" stroke-dasharray="2 9"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.68}" fill="url(#${id}-fond)"/><radialGradient id="${id}-fond" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="${teinte(base, 0.18)}"/><stop offset="1" stop-color="${teinte(base, -0.15)}"/></radialGradient>`;
    s += semer(r, cx, cy, R * 0.55, visibles.slice(0, 6), 34, 10 * k);
    s += semer(r, cx, cy, R * 1.25, visibles.filter((p) => p.f === "feuille" || p.f === "quartier").slice(0, 2), 6, 14 * k, { couronne: true });
  } else if (v === "rouleaux") {
    s += ombre(cx, cy, R * 1.3, R * 0.75, id);
    s += `<rect x="${cx - R * 1.35}" y="${cy - R * 0.8}" width="${R * 2.7}" height="${R * 1.6}" rx="${18 * k}" fill="#c39a6b"/><rect x="${cx - R * 1.35}" y="${cy - R * 0.8}" width="${R * 2.7}" height="${R * 1.6}" rx="${18 * k}" fill="none" stroke="#a87f52" stroke-width="3"/>`;
    for (let i = 0; i < 4; i++) {
      const y = cy - R * 0.5 + i * R * 0.34;
      const x = cx - R * 0.95;
      s += `<rect x="${x}" y="${y - 22 * k}" width="${R * 1.5}" height="${44 * k}" rx="${22 * k}" fill="#f4efe4"/>`;
      s += `<rect x="${x + 14 * k}" y="${y - 12 * k}" width="${R * 1.32}" height="${10 * k}" rx="${5 * k}" fill="#6fae58" opacity=".7"/>`;
      s += `<rect x="${x + 14 * k}" y="${y + 1 * k}" width="${R * 1.32}" height="${8 * k}" rx="${4 * k}" fill="#f2eee6" opacity=".9"/>`;
      for (let j = 0; j < 3; j++) s += `<ellipse cx="${x + 40 * k + j * 52 * k}" cy="${y - 3 * k}" rx="${16 * k}" ry="${7 * k}" fill="#ef8a6a" opacity=".75"/>`;
      s += `<rect x="${x}" y="${y - 22 * k}" width="${R * 1.5}" height="${44 * k}" rx="${22 * k}" fill="#fff" opacity=".28"/>`;
    }
    s += `<circle cx="${cx + R * 0.95}" cy="${cy + R * 0.35}" r="${36 * k}" fill="#f3ede2"/><circle cx="${cx + R * 0.95}" cy="${cy + R * 0.35}" r="${28 * k}" fill="#5a2e1e"/>` + semer(r, cx + R * 0.95, cy + R * 0.35, 20 * k, [{ ing: { c: "#c8904a" }, f: "grain" }], 10, 16 * k);
  } else if (v === "pain" && has("farine-mais-precuite")) {
    s += ombre(cx, cy, R * 1.2, R * 0.9, id);
    s += `<rect x="${cx - R * 1.25}" y="${cy - R * 0.9}" width="${R * 2.5}" height="${R * 1.8}" rx="${18 * k}" fill="#a87a4e"/>`;
    const pos = [[-0.55, -0.35], [0.45, -0.4], [-0.15, 0.4], [0.75, 0.4]];
    for (const [dx, dy] of pos) {
      const x = cx + dx * R, y = cy + dy * R;
      s += `<circle cx="${x}" cy="${y}" r="${58 * k}" fill="#e9cf8a"/><circle cx="${x}" cy="${y}" r="${58 * k}" fill="none" stroke="#c99b55" stroke-width="${6 * k}"/>`;
      for (let i = 0; i < 6; i++) s += `<circle cx="${x + (r() - 0.5) * 70 * k}" cy="${y + (r() - 0.5) * 70 * k}" r="${(4 + r() * 6) * k}" fill="#7a4e22" opacity=".55"/>`;
    }
  } else if (v === "pain") {
    s += ombre(cx, cy, R * 1.0, R * 0.95, id);
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#9b6c45"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.82}" fill="#d9a660"/><circle cx="${cx - R * 0.15}" cy="${cy - R * 0.2}" r="${R * 0.5}" fill="#e7bf7a" opacity=".6"/>`;
    s += `<path d="M${cx - R * 0.55} ${cy}L${cx + R * 0.55} ${cy}M${cx} ${cy - R * 0.55}L${cx} ${cy + R * 0.55}" stroke="#a8743c" stroke-width="${9 * k}" stroke-linecap="round"/>`;
    for (let i = 0; i < 60; i++) s += poudre(cx + (r() - 0.5) * R * 1.3, cy + (r() - 0.5) * R * 1.3, 18 * k, 0, "#fbf6ea");
  } else if (v === "boulettes") {
    s += assiette(cx, cy, R, id);
    const pos = [[0, 0]];
    for (let i = 0; i < 6; i++) pos.push([Math.cos((i * Math.PI) / 3) * 0.37, Math.sin((i * Math.PI) / 3) * 0.37]);
    for (let i = 0; i < 6; i++) pos.push([Math.cos((i * Math.PI) / 3 + Math.PI / 6) * 0.62, Math.sin((i * Math.PI) / 3 + Math.PI / 6) * 0.62]);
    for (const [dx, dy] of pos) {
      const x = cx + dx * R + (r() - 0.5) * 6 * k, y = cy + dy * R + (r() - 0.5) * 6 * k;
      s += `<circle cx="${f1(x + 3)}" cy="${f1(y + 4)}" r="${30 * k}" fill="#000" opacity=".12"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${30 * k}" fill="#e2b45f"/><circle cx="${f1(x - 8 * k)}" cy="${f1(y - 9 * k)}" r="${13 * k}" fill="#f2d89a" opacity=".8"/>`;
    }
  } else if (v === "pile") {
    s += assiette(cx, cy, R, id);
    for (let i = 4; i >= 0; i--) s += `<circle cx="${cx + i * 3 * k}" cy="${cy + i * 4 * k}" r="${R * 0.6}" fill="${i ? "#b9783a" : "#d79a52"}"/><circle cx="${cx + i * 3 * k}" cy="${cy + i * 4 * k}" r="${R * 0.6}" fill="none" stroke="#a5652c" stroke-width="2"/>`;
    s += `<path d="M${cx - R * 0.35} ${cy - R * 0.1}C${cx - R * 0.2} ${cy - R * 0.45} ${cx + R * 0.3} ${cy - R * 0.35} ${cx + R * 0.3} ${cy}S${cx} ${cy + R * 0.42} ${cx - R * 0.2} ${cy + R * 0.25}" fill="#8a4a16" opacity=".75"/>`;
    s += `<rect x="${cx - 18 * k}" y="${cy - 30 * k}" width="${40 * k}" height="${30 * k}" rx="5" fill="#f6e3a2"/>`;
  } else if (v === "dessert" && has("farine-ble")) {
    s += ombre(cx, cy, R * 1.2, R * 0.9, id);
    s += `<rect x="${cx - R * 1.2}" y="${cy - R * 0.92}" width="${R * 2.4}" height="${R * 1.84}" rx="${30 * k}" fill="#f3ede2"/><rect x="${cx - R * 1.04}" y="${cy - R * 0.76}" width="${R * 2.08}" height="${R * 1.52}" rx="${20 * k}" fill="#7a3f14"/>`;
    for (let i = 0; i < 14; i++) s += `<circle cx="${f1(cx + (r() - 0.5) * R * 1.7)}" cy="${f1(cy + (r() - 0.5) * R * 1.2)}" r="${(28 + r() * 16) * k}" fill="${r() < 0.5 ? "#d9a35a" : "#c98e45"}"/>`;
  } else {
    // éclats de caramel alvéolé sur papier cuisson
    s += ombre(cx, cy, R * 1.1, R * 0.9, id);
    s += `<rect x="${cx - R * 1.15}" y="${cy - R * 0.95}" width="${R * 2.3}" height="${R * 1.9}" rx="4" transform="rotate(-4 ${cx} ${cy})" fill="#f6f0e2"/>`;
    for (let i = 0; i < 9; i++) {
      const x = cx + (r() - 0.5) * R * 1.6, y = cy + (r() - 0.5) * R * 1.3, t = (34 + r() * 22) * k;
      const pts = Array.from({ length: 5 }, (_, j) => { const a = (j / 5) * Math.PI * 2 + r() * 0.6; const d = t * (0.6 + r() * 0.5); return `${f1(x + Math.cos(a) * d)} ${f1(y + Math.sin(a) * d)}`; });
      s += `<path d="M${pts.join("L")}Z" fill="#e0a43c" stroke="#c4862a" stroke-width="3" stroke-linejoin="round"/>`;
      for (let j = 0; j < 4; j++) s += `<circle cx="${f1(x + (r() - 0.5) * t)}" cy="${f1(y + (r() - 0.5) * t)}" r="${(3 + r() * 4) * k}" fill="#f2cf7a"/>`;
    }
  }
  return s;
}

// Illustration complète d'une recette (4:3)
export function illustration(rec) {
  const W = 800, H = 600;
  const r = hasard(graine(rec.slug + "/fond"));
  const fond = FONDS[graine(rec.slug) % FONDS.length];
  const id = "i" + graine(rec.slug).toString(36);
  const cuillere = rec.visuel === "bol" || rec.visuel === "sauce";
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Illustration : ${rec.titre.replace(/"/g, "")}">`;
  s += `<defs><filter id="${id}-flou" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${fond.table}"/>`;
  s += serviette(r, W, H, fond.lin, fond.rayure);
  if (!["rouleaux", "pain", "dessert", "boulettes"].includes(rec.visuel) || rec.visuel === "boulettes") s += couvert(W * 0.86, H * 0.52, 8, cuillere);
  s += plat(rec, W * 0.47, H * 0.5, rec.visuel === "rouleaux" || rec.visuel === "pain" || rec.visuel === "dessert" ? 1.3 : rec.visuel === "plat" ? 1.45 : 1.6, id);
  return s + "</svg>";
}

// Scène de l'accueil : plusieurs plats du catalogue sur une même table
export function scene(recettes) {
  const W = 1200, H = 1000;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Illustration : une table garnie de plats du monde">`;
  s += `<defs><filter id="sc-flou" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter></defs>`;
  s += `<rect width="${W}" height="${H}" fill="#263B32"/>`;
  s += `<g transform="rotate(-8 300 300)"><rect x="80" y="40" width="520" height="430" rx="6" fill="#efe6d4"/><rect x="80" y="70" width="520" height="6" fill="#C47D4D" opacity=".7"/><rect x="80" y="84" width="520" height="2" fill="#C47D4D" opacity=".7"/></g>`;
  const places = [[330, 280, 1.2], [900, 210, 1.05], [610, 650, 1.35], [150, 790, 0.95], [1070, 720, 1.0], [640, 60, 0.7]];
  recettes.slice(0, places.length).forEach((rec, i) => {
    const [x, y, k] = places[i];
    s += plat(rec, x, y, k, `sc${i}`).replaceAll(`url(#sc${i}-flou)`, "url(#sc-flou)");
  });
  const rr = hasard(7);
  const herbes = ["#3f8a3a", "#4f9a5a", "#C47D4D", "#d9c9a8"];
  for (let i = 0; i < 26; i++) s += feuille(rr() * W, rr() * H, 10 + rr() * 6, rr() * 360, herbes[i % herbes.length]);
  return s + "</svg>";
}
