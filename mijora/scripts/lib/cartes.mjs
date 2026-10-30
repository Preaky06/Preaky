// Cartes vectorielles à partir de Natural Earth (paquet world-atlas, domaine public) :
// carte du monde de l'atlas, silhouettes des continents et des pays.
import { createRequire } from "node:module";
import { geoEqualEarth, geoPath, geoMercator, geoArea, geoCentroid, geoDistance } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const monde110 = require("world-atlas/countries-110m.json");
const monde50 = require("world-atlas/countries-50m.json");

const pays110 = feature(monde110, monde110.objects.countries).features;
const pays50 = feature(monde50, monde50.objects.countries).features;
// Plusieurs entités peuvent partager un code (ex. 036 : Australie et îles Ashmore-et-Cartier) : on garde la plus grande
function parCcn(liste) {
  const m = new Map();
  for (const f of liste) {
    if (!f.id) continue;
    const id = String(f.id).padStart(3, "0");
    const cur = m.get(id);
    if (!cur || geoArea(f) > geoArea(cur)) m.set(id, f);
  }
  return m;
}
const index110 = parCcn(pays110);
const index50 = parCcn(pays50);

const arrondir = (d) => d && d.replace(/(\d+\.\d{1})\d+/g, "$1");
const entier = (d) => d && d.replace(/(\d+)\.\d+/g, "$1");

// Carte du monde : un lien par pays présent dans la carte au 1/110 000 000 ; les très petits pays,
// absents à cette échelle, restent accessibles par la liste.
export function carteMonde(pays, lien) {
  const W = 1000, H = 520;
  const proj = geoEqualEarth().fitExtent([[6, 6], [W - 6, H - 6]], { type: "Sphere" });
  const path = geoPath(proj);
  const sphere = entier(path({ type: "Sphere" }));
  const connus = new Map(pays.map((p) => [p.ccn3, p]));
  let svg = `<svg class="carte-monde" viewBox="0 0 ${W} ${H}" role="group" aria-label="Carte du monde : choisissez un pays">`;
  svg += `<path class="carte-sphere" d="${sphere}"/>`;
  const absents = [];
  for (const f of pays110) {
    const id = String(f.id ?? "").padStart(3, "0");
    const p = connus.get(id);
    const d = entier(path(f));
    if (!d) continue;
    if (!p) { svg += `<path class="carte-autre" d="${d}"/>`; continue; }
    const etat = p.recettes.length ? "recettes" : p.editorial ? "editorial" : "vide";
    svg += `<a href="${lien(p.url)}" class="carte-pays" data-etat="${etat}" data-continent="${p.continent}" data-iso="${p.iso2}" aria-label="${p.name_fr}"><path d="${d}"/><title>${p.name_fr}</title></a>`;
  }
  for (const p of pays) if (!index110.has(p.ccn3)) absents.push(p);
  return { svg: svg + "</svg>", absents };
}

// Silhouette d'un pays, centrée sur sa plus grande surface : les territoires lointains sont écartés
// et la projection tourne autour du pays (utile pour ceux qui traversent l'antiméridien).
export function silhouette(p, { W = 600, H = 450, marge = 40 } = {}) {
  const f = index50.get(p.ccn3) ?? index110.get(p.ccn3);
  if (!f) return null;
  const polys = f.geometry.type === "MultiPolygon"
    ? f.geometry.coordinates.map((c) => ({ type: "Polygon", coordinates: c }))
    : [f.geometry];
  polys.sort((a, b) => geoArea(b) - geoArea(a));
  // En dessous d'environ 150 km², le tracé au 1/50 000 000 n'a plus de sens
  if (polys.reduce((t, q) => t + geoArea(q), 0) < 3.7e-6) return null;
  const centre = geoCentroid(polys[0]);
  const rayon = Math.max(0.12, Math.sqrt(geoArea(polys[0])) * 1.6);
  const gardes = polys.filter((q) => geoDistance(geoCentroid(q), centre) < rayon * 1.8);
  const geom = { type: "MultiPolygon", coordinates: gardes.map((q) => q.coordinates) };
  const proj = geoMercator().rotate([-centre[0], 0]).fitExtent([[marge, marge], [W - marge, H - marge]], geom);
  const d = arrondir(geoPath(proj)(geom));
  return d ? { d, W, H } : null;
}

// Vignette d'un continent : fenêtre géographique fixe, pays du continent mis en valeur sur le reste du monde
const FENETRES = {
  europe: [[-24, 35], [44, 71]],
  asie: [[26, -10], [148, 55]],
  afrique: [[-19, -35], [52, 37]],
  "amerique-du-nord": [[-165, 7], [-52, 70]],
  "amerique-du-sud": [[-82, -55], [-34, 13]],
  oceanie: [[112, -47], [190, 0]],
};
export function vignetteContinent(slug, paysDuContinent, { W = 600, H = 420 } = {}) {
  const [[x0, y0], [x1, y1]] = FENETRES[slug];
  const cadre = { type: "LineString", coordinates: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].flatMap(([x, y], i, a) => {
    if (i === 0) return [[x, y]];
    const [px, py] = a[i - 1];
    return Array.from({ length: 8 }, (_, k) => [px + ((x - px) * (k + 1)) / 8, py + ((y - py) * (k + 1)) / 8]);
  }) };
  const proj = geoMercator().rotate([-(x0 + x1) / 2, 0]).fitExtent([[0, 0], [W, H]], cadre).clipExtent([[-2, -2], [W + 2, H + 2]]);
  const path = geoPath(proj);
  const ids = new Set(paysDuContinent.map((p) => p.ccn3));
  let fond = "", dedans = "";
  for (const f of pays110) {
    const d = entier(path(f));
    if (!d) continue;
    if (ids.has(String(f.id ?? "").padStart(3, "0"))) dedans += d;
    else fond += d;
  }
  return { fond, dedans, W, H };
}
