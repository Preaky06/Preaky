/**
 * Géométrie de l'escalier isométrique (unités SVG), calculée une fois, côté serveur et client.
 *
 * Projection isométrique : (x, y, z) → ((x − y)·cos30°, (x + y)·sin30° − z).
 * L'escalier monte vers −y (haut-droite à l'écran). Marche i : x ∈ [0, W],
 * y ∈ [−(i+1)·D, −i·D], z ∈ [0, (i+1)·H]. Faces visibles : dessus (+z), contremarche (+y), flanc (+x).
 */
export const STEPS = 7;
const W = 160; // largeur de l'escalier
const D = 118; // profondeur d'une marche
const H = 74; // hauteur d'une contremarche
const C = Math.cos(Math.PI / 6);
const S = 0.5;

export interface Pt {
  x: number;
  y: number;
}

export const project = (x: number, y: number, z: number): Pt => ({ x: (x - y) * C, y: (x + y) * S - z });
const poly = (pts: Pt[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

export interface Block {
  i: number;
  top: string;
  front: string;
  side: string;
}

/** Blocs dans l'ordre de dessin (du fond vers l'avant). */
export const BLOCKS: Block[] = Array.from({ length: STEPS }, (_, k) => STEPS - 1 - k).map((i) => {
  const y0 = -i * D;
  const y1 = -(i + 1) * D;
  const z = (i + 1) * H;
  return {
    i,
    top: poly([project(0, y1, z), project(W, y1, z), project(W, y0, z), project(0, y0, z)]),
    front: poly([project(0, y0, 0), project(W, y0, 0), project(W, y0, z), project(0, y0, z)]),
    side: poly([project(W, y1, 0), project(W, y0, 0), project(W, y0, z), project(W, y1, z)]),
  };
});

/** Ombre portée au sol. */
export const SHADOW = poly([
  project(0, 40, 0),
  project(W + 70, 40, 0),
  project(W + 70, -STEPS * D, 0),
  project(0, -STEPS * D, 0),
]);

/** Ruban qui gravit l'escalier (x = 62 % de la largeur), du sol jusqu'au milieu de la dernière marche. */
const PX = W * 0.62;
const pathPts3: [number, number, number][] = [[PX + 3.4 * D, 0, 0]]; // arrive du sol, en bas à droite
for (let i = 0; i < STEPS; i++) {
  pathPts3.push([PX, -i * D, i * H], [PX, -i * D, (i + 1) * H]);
  pathPts3.push([PX, i === STEPS - 1 ? -(i + 0.5) * D : -(i + 1) * D, (i + 1) * H]);
}
export const PATH_POINTS = pathPts3.map(([x, y, z]) => project(x, y, z));
export const PATH_D = `M${PATH_POINTS.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")}`;

const seg = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
const cumulative = PATH_POINTS.reduce<number[]>((acc, p, k) => {
  acc.push(k === 0 ? 0 : acc[k - 1] + seg(PATH_POINTS[k - 1], p));
  return acc;
}, []);
export const PATH_LENGTH = cumulative[cumulative.length - 1];

/** Longueur du ruban quand il atteint le milieu de la marche i (sommet de la contremarche + ½ marche). */
export const LENGTH_AT_STEP = Array.from({ length: STEPS }, (_, i) => {
  const k = 2 + i * 3; // index du point « haut de contremarche » de la marche i
  const next = Math.min(k + 1, PATH_POINTS.length - 1);
  return cumulative[k] + (i === STEPS - 1 ? cumulative[next] - cumulative[k] : (cumulative[next] - cumulative[k]) / 2);
});

/** Flèche finale : monte à la verticale depuis la fin du ruban. */
const tip = PATH_POINTS[PATH_POINTS.length - 1];
export const ARROW = {
  d: `M${tip.x.toFixed(1)},${tip.y.toFixed(1)} V${(tip.y - H * 1.6).toFixed(1)}`,
  head: poly([
    { x: tip.x - 22, y: tip.y - H * 1.6 },
    { x: tip.x, y: tip.y - H * 1.6 - 34 },
    { x: tip.x + 22, y: tip.y - H * 1.6 },
  ]),
};

/** Point d'appui de l'objet posé sur la marche i (x = 26 % de la largeur, milieu de la marche). */
export const OBJECT_BASE: Pt[] = Array.from({ length: STEPS }, (_, i) => project(W * 0.26, -(i + 0.55) * D, (i + 1) * H));
export const OBJECT_SIZE = 118;

/** Cadre complet (étiquettes à gauche, flèche en haut). */
export const BBOX = (() => {
  const xs = [...PATH_POINTS.map((p) => p.x), project(W + 70, 40, 0).x, ...OBJECT_BASE.map((p) => p.x - 250)];
  const ys = [...PATH_POINTS.map((p) => p.y), tip.y - H * 1.6 - 60, project(W + 70, 40, 0).y];
  const minX = Math.min(...xs) - 30;
  const maxX = Math.max(...xs) + 60;
  const minY = Math.min(...ys) - 40;
  const maxY = Math.max(...ys) + 30;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
})();

/** Étiquette de prix : à gauche de l'objet. */
export const LABEL = { w: 232, h: 68, gap: OBJECT_SIZE * 0.55 };

/** Point visé par la caméra pour la marche i : centre du groupe étiquette + objet. */
export const FOCUS: Pt[] = OBJECT_BASE.map((b) => ({
  x: (b.x - LABEL.gap - LABEL.w + b.x + OBJECT_SIZE / 2) / 2,
  y: b.y - OBJECT_SIZE * 0.4,
}));
