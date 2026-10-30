// Lézarde : suivi des fissures, de la procédure de catastrophe naturelle et dossier pour l'assureur.
// Tout reste sur l'appareil : l'état dans IndexedDB (repli en mémoire si indisponible), les photos réduites en JPEG.
import * as db from "./db.js";
import { EXEMPLE } from "./exemple.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fr = (s) => esc(s).replace(/ ([?!:;»])/g, "&nbsp;$1").replace(/« /g, "«&nbsp;");
const uid = () => Math.random().toString(36).slice(2, 10);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Dates ----------
const DAY = 86400000;
const parse = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = () => parse(iso(new Date()));
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate(), 12);
const daysBetween = (a, b) => Math.round((b - a) / DAY);
const fmtLong = (d) => (d ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d) : "");
const fmtShort = (d) => (d ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d) : "");
const mm = (n) => `${Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}&nbsp;mm`;
const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}&nbsp;mm`;

// Délais (sources sur la page d'accueil) : 30 jours après la publication de l'arrêté pour déclarer,
// 24 mois après le début du phénomène pour la demande communale.
const DELAI_DECLARATION = 30;
const DELAI_DEMANDE_MOIS = 24;

// ---------- État ----------
// « commence » : l'utilisateur a choisi de tenir son propre suivi (l'exemple ne revient plus tout seul)
const vide = () => ({ version: 1, exemple: false, commence: true, house: {}, commune: {}, cracks: [] });
let state = vide();
let selected = null;

async function persist() {
  try {
    await db.set("state", state);
  } catch {
    toast("Enregistrement impossible sur cet appareil : vos données seront perdues en quittant la page.");
  }
}

// ---------- Calculs ----------
const sorted = (c) => [...c.mesures].sort((a, b) => a.date.localeCompare(b.date));

function tendance(c) {
  const ms = sorted(c);
  if (!ms.length) return { etat: "vide", total: 0, recent: 0, last: null, first: null };
  const first = ms[0];
  const last = ms[ms.length - 1];
  // Évolution sur les 90 derniers jours : depuis le relevé le plus proche de « dernier − 90 jours »
  const cible = addDays(parse(last.date), -90);
  let ref = first;
  for (const m of ms) if (parse(m.date) <= cible) ref = m;
  const recent = last.largeur - ref.largeur;
  const total = last.largeur - first.largeur;
  let etat = "stable";
  if (ms.length < 2) etat = "a-suivre";
  else if (recent >= 0.1) etat = "ouvre";
  else if (recent <= -0.1) etat = "referme";
  return { etat, total, recent, last, first, ms };
}

const ETATS = {
  "a-suivre": ["badge--todo", "À suivre"],
  vide: ["badge--todo", "Aucun relevé"],
  ouvre: ["badge--up", "S'ouvre"],
  referme: ["badge--down", "Se referme"],
  stable: ["badge--ok", "Stable"],
};

const badge = (etat) => `<span class="badge ${ETATS[etat][0]}">${ETATS[etat][1]}</span>`;

// Rythme conseillé : toutes les 2 semaines en période sèche (juin à octobre), sinon chaque mois
function prochainReleve() {
  const dates = state.cracks.flatMap((c) => c.mesures.map((m) => m.date)).sort();
  if (!dates.length) return null;
  const last = parse(dates[dates.length - 1]);
  const sec = last.getMonth() >= 5 && last.getMonth() <= 9;
  return { date: addDays(last, sec ? 14 : 30), sec };
}

function delais() {
  const out = [];
  const t = today();
  const { commune: c, house: h } = state;
  if (c.arrete && !c.declaration) {
    const limite = addDays(parse(c.arrete), DELAI_DECLARATION);
    const reste = daysBetween(t, limite);
    out.push({ type: reste < 0 ? "late" : "urgent", reste, limite, titre: reste < 0 ? "Délai de déclaration dépassé" : "Déclarez le sinistre à votre assureur", texte: reste < 0 ? `Le délai de ${DELAI_DECLARATION} jours après la publication de l'arrêté a pris fin le ${fmtLong(limite)}. Contactez votre assureur sans attendre et gardez une trace écrite.` : `L'arrêté a été publié le ${fmtLong(parse(c.arrete))}. Vous avez jusqu'au ${fmtLong(limite)} pour déclarer.` });
  }
  if (h.debut && !c.demande && !c.arrete) {
    const limite = addMonths(parse(h.debut), DELAI_DEMANDE_MOIS);
    const reste = daysBetween(t, limite);
    out.push({ type: reste < 60 ? "urgent" : "info", reste, limite, titre: "Demande de reconnaissance par la commune", texte: `Votre commune a jusqu'au ${fmtLong(limite)} pour déposer sa demande (24 mois après le début du phénomène). Si ce n'est pas fait, signalez vos dommages par écrit à la mairie.` });
  }
  return out;
}

// ---------- Graphiques ----------
function chart(c, { w = 640, h = 240, label = true } = {}) {
  const ms = sorted(c);
  if (!ms.length) return "";
  const pad = { l: label ? 44 : 6, r: 14, t: 14, b: label ? 30 : 6 };
  const t0 = parse(ms[0].date).getTime();
  const t1 = parse(ms[ms.length - 1].date).getTime();
  const span = Math.max(t1 - t0, DAY);
  // Graduation « ronde » : pas de 0,1, 0,2, 0,25, 0,5, 1… mm, quatre intervalles au plus
  const top = Math.max(...ms.map((m) => m.largeur)) * 1.2 || 1;
  const pas = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10].find((p) => top / p <= 4) || 10;
  const max = Math.max(pas * Math.ceil(top / pas), pas);
  const x = (d) => (ms.length === 1 ? (pad.l + w - pad.r) / 2 : pad.l + ((parse(d).getTime() - t0) / span) * (w - pad.l - pad.r));
  const y = (v) => h - pad.b - (v / max) * (h - pad.t - pad.b);
  const pts = ms.map((m) => `${x(m.date).toFixed(1)},${y(m.largeur).toFixed(1)}`).join(" ");
  const color = "#b5653a";
  let g = "";
  if (label) {
    for (let v = 0; v <= max + 1e-9; v += pas) {
      g += `<path d="M${pad.l} ${y(v).toFixed(1)}H${w - pad.r}" stroke="rgba(12,25,18,.1)"/><text x="${pad.l - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="rgba(12,25,18,.6)">${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</text>`;
    }
    // repères de mois
    // Mois : un repère sur 1, 2 ou 3 selon la place, janvier marqué de l'année
    const start = parse(ms[0].date);
    const mois = Math.max(1, Math.round(span / (30 * DAY)));
    const saut = [1, 2, 3, 6].find((k) => ((w - pad.l - pad.r) / mois) * k >= 46) || 12;
    let i = 0;
    for (let d = new Date(start.getFullYear(), start.getMonth() + 1, 1, 12); d.getTime() <= t1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12), i++) {
      if (i % saut) continue;
      const xx = pad.l + ((d.getTime() - t0) / span) * (w - pad.l - pad.r);
      const lab = d.getMonth() === 0 ? String(d.getFullYear()) : new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d);
      g += `<path d="M${xx.toFixed(1)} ${h - pad.b}v5" stroke="rgba(12,25,18,.3)"/><text x="${xx.toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="11.5" font-weight="${d.getMonth() === 0 ? 700 : 400}" fill="rgba(12,25,18,.6)">${lab}</text>`;
    }
  }
  const area = ms.length > 1 ? `<path d="M${pts.split(" ").join(" L")} V${h - pad.b} H${x(ms[0].date).toFixed(1)}Z" fill="${color}" opacity=".08"/>` : "";
  const dots = label ? ms.map((m) => `<circle cx="${x(m.date).toFixed(1)}" cy="${y(m.largeur).toFixed(1)}" r="4.5" fill="${color}"><title>${fmtLong(parse(m.date))} : ${m.largeur.toLocaleString("fr-FR")} mm</title></circle>`).join("") : "";
  const desc = `Largeur de la fissure du ${fmtLong(parse(ms[0].date))} (${ms[0].largeur.toLocaleString("fr-FR")} mm) au ${fmtLong(parse(ms[ms.length - 1].date))} (${ms[ms.length - 1].largeur.toLocaleString("fr-FR")} mm).`;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(desc)}" font-family="Inter Tight, sans-serif">${g}${area}<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${label ? 3.5 : 3}" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}

// ---------- Photos ----------
const urls = new Map();
async function photoUrl(ref) {
  if (!ref) return null;
  if (ref.startsWith("url:")) return ref.slice(4);
  if (urls.has(ref)) return urls.get(ref);
  try {
    const blob = await db.getPhoto(ref);
    if (!blob) return null;
    const u = URL.createObjectURL(blob);
    urls.set(ref, u);
    return u;
  } catch {
    return null;
  }
}

// Réduit la photo (1600 px de côté au plus, JPEG) : assez nette pour l'expert, légère pour l'appareil
async function compress(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
}

async function fillPhotos(root) {
  for (const img of root.querySelectorAll("img[data-photo]")) {
    const u = await photoUrl(img.dataset.photo);
    if (u) img.src = u;
    else img.closest("[data-photo-wrap]")?.replaceChildren(document.createTextNode("Photo absente"));
  }
}

// ---------- Rendu ----------
const ICON = {
  check: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  now: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>',
  clock: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>',
  alert: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5"/><path d="M12 18h.01"/></svg>',
  plus: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  trash: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>',
  photo: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="4"/></svg>',
};

function renderAlerts() {
  const list = delais();
  $("[data-alerts]").innerHTML = list
    .map(
      (a) => `<div class="alert alert--${a.type}">
        <span class="alert__ic">${a.type === "info" ? ICON.clock : ICON.alert}</span>
        <p><b>${fr(a.titre)}</b>${fr(a.texte)}</p>
        ${a.reste >= 0 ? `<span class="alert__count">${a.reste === 0 ? "Aujourd'hui" : `J−${a.reste}`}</span>` : `<button class="btn btn--dark btn--sm btn--plain" type="button" data-open-report>Préparer le dossier</button>`}
      </div>`,
    )
    .join("");
}

function crackCard(c) {
  const t = tendance(c);
  return `<button class="crack" type="button" data-select="${c.id}" aria-pressed="${selected === c.id}">
    <span class="crack__name">${fr(c.nom)}</span>
    <span class="crack__place">${fr(c.lieu || (c.type === "exterieur" ? "À l'extérieur" : "À l'intérieur"))}</span>
    <span class="crack__row">
      <span>${t.last ? `<span class="crack__mm">${t.last.largeur.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}<small>&nbsp;mm</small></span>` : '<span class="muted">Pas encore de relevé</span>'}</span>
      ${t.ms && t.ms.length > 1 ? `<span class="spark">${chart(c, { w: 96, h: 34, label: false })}</span>` : ""}
    </span>
    ${badge(t.etat)}
  </button>`;
}

function renderCracks() {
  const root = $("[data-cracks]");
  if (!state.cracks.length) {
    root.innerHTML = `<div class="empty">
      <img src="img/step-photo.svg" alt="" width="400" height="300" />
      <h2 class="h3">Commencez par votre première fissure</h2>
      <p>Donnez-lui un nom, puis faites un premier relevé&nbsp;: date, largeur et photo avec un repère gradué.</p>
      <div class="empty__actions">
        <button class="btn btn--leaf" type="button" data-add-crack>Ajouter une fissure<span class="btn__arrow">${ICON.plus}</span></button>
        <button class="btn btn--ghost btn--plain" type="button" data-load-example>Voir un exemple</button>
      </div>
    </div>`;
    $("[data-detail]").innerHTML = "";
    return;
  }
  root.innerHTML = `<div class="cracks">${state.cracks.map(crackCard).join("")}</div>`;
  renderDetail();
}

function renderDetail() {
  const c = state.cracks.find((x) => x.id === selected) || state.cracks[0];
  if (!c) return;
  selected = c.id;
  const t = tendance(c);
  const ms = sorted(c).reverse();
  const withPhoto = sorted(c).filter((m) => m.photo);
  const dureeJ = t.first && t.last ? daysBetween(parse(t.first.date), parse(t.last.date)) : 0;
  const root = $("[data-detail]");
  root.innerHTML = `<article class="detail" aria-labelledby="detail-title">
    <div class="detail__head">
      <div>
        <h2 class="display detail__title" id="detail-title">${fr(c.nom)}</h2>
        <p class="detail__place">${fr(c.lieu || "")}${c.lieu ? " · " : ""}${c.type === "exterieur" ? "Extérieur" : "Intérieur"}</p>
      </div>
      <div class="detail__tools">
        ${badge(t.etat)}
        <button class="link" type="button" data-edit-crack="${c.id}">Modifier</button>
        <button class="link link--danger" type="button" data-delete-crack="${c.id}">Supprimer</button>
      </div>
    </div>
    ${
      t.last
        ? `<div class="kpis">
      <p class="kpi"><span>Dernière largeur</span><b>${mm(t.last.largeur)}</b></p>
      <p class="kpi"><span>Depuis le début</span><b>${signed(t.total)}</b></p>
      <p class="kpi"><span>Sur 90 jours</span><b>${signed(t.recent)}</b></p>
      <p class="kpi"><span>Relevés</span><b>${t.ms.length} en ${dureeJ}&nbsp;j</b></p>
    </div>
    <div class="chart-box">${chart(c)}</div>`
        : ""
    }
    ${
      withPhoto.length >= 2
        ? `<div class="compare">
      <figure><img data-photo="${withPhoto[0].photo}" alt="Première photo, ${esc(fmtLong(parse(withPhoto[0].date)))}" /><figcaption>${fmtLong(parse(withPhoto[0].date))} · ${mm(withPhoto[0].largeur)}</figcaption></figure>
      <figure><img data-photo="${withPhoto[withPhoto.length - 1].photo}" alt="Dernière photo, ${esc(fmtLong(parse(withPhoto[withPhoto.length - 1].date)))}" /><figcaption>${fmtLong(parse(withPhoto[withPhoto.length - 1].date))} · ${mm(withPhoto[withPhoto.length - 1].largeur)}</figcaption></figure>
    </div>`
        : ""
    }
    <div class="detail__actions">
      <h3>${ms.length ? `${ms.length} relevé${ms.length > 1 ? "s" : ""}` : "Aucun relevé"}</h3>
      <button class="btn btn--leaf btn--sm" type="button" data-add-measure="${c.id}">Nouveau relevé<span class="btn__arrow">${ICON.plus}</span></button>
    </div>
    <ul class="mlist">${ms
      .slice(0, showAll.has(c.id) ? ms.length : 5)
      .map(
        (m) => `<li class="mrow">
        <span class="mrow__photo" data-photo-wrap>${m.photo ? `<button type="button" data-view="${m.photo}" data-caption="${esc(`${fmtLong(parse(m.date))} · ${m.largeur.toLocaleString("fr-FR")} mm`)}" aria-label="Agrandir la photo du ${esc(fmtLong(parse(m.date)))}"><img data-photo="${m.photo}" alt="" /></button>` : ICON.photo}</span>
        <span class="mrow__main"><b>${mm(m.largeur)}</b>${m.longueur ? ` · ${m.longueur.toLocaleString("fr-FR")}&nbsp;cm` : ""}
          <span class="mrow__proto" role="img" aria-label="Protocole : ${["repere", "cadrage", "jauge"].filter((k) => m.protocole?.[k]).length} sur 3">${["repere", "cadrage", "jauge"].map((k) => `<span class="${m.protocole?.[k] ? "is-on" : ""}"></span>`).join("")}</span>
          <span class="mrow__meta" style="display:block">${fmtLong(parse(m.date))}${m.note ? ` · ${fr(m.note)}` : ""}</span></span>
        <button class="icon-btn" type="button" data-delete-measure="${c.id}:${m.id}" aria-label="Supprimer le relevé du ${esc(fmtLong(parse(m.date)))}">${ICON.trash}</button>
      </li>`,
      )
      .join("")}</ul>
    ${ms.length > 5 ? `<button class="btn btn--ghost btn--plain btn--sm more-btn" type="button" data-toggle-all="${c.id}">${showAll.has(c.id) ? "Afficher seulement les 5 derniers" : `Voir les ${ms.length - 5} relevés plus anciens`}</button>` : ""}
  </article>`;
  fillPhotos(root);
}

function renderSide() {
  const h = state.house;
  $("[data-house]").innerHTML = `<div class="side-card__head"><h2>Ma maison</h2><button class="link" type="button" data-open="house-dialog">${h.commune || h.nom ? "Modifier" : "Compléter"}</button></div>
    <dl class="facts">
      <div><dt>Logement</dt><dd>${fr(h.nom || "À renseigner")}</dd></div>
      <div><dt>Commune</dt><dd>${fr(h.commune || "À renseigner")}</dd></div>
      <div><dt>Premières fissures</dt><dd>${h.debut ? fmtLong(parse(h.debut)) : "À renseigner"}</dd></div>
      ${h.assureur ? `<div><dt>Assureur</dt><dd>${fr(h.assureur)}${h.contrat ? ` · n°&nbsp;${fr(h.contrat)}` : ""}</dd></div>` : ""}
    </dl>`;

  const c = state.commune;
  const etapes = [
    ["signalement", "Signalement en mairie"],
    ["demande", "Demande de reconnaissance déposée"],
    ["arrete", "Arrêté publié au Journal officiel"],
    ["declaration", "Déclaration à l'assureur"],
    ["expertise", "Passage de l'expert"],
    ["decision", "Décision de l'assureur"],
  ];
  const now = etapes.findIndex(([k]) => !c[k]);
  $("[data-commune]").innerHTML = `<div class="side-card__head"><h2>La procédure</h2><button class="link" type="button" data-open="commune-dialog">Mettre à jour</button></div>
    <ol class="procedure">${etapes
      .map(([k, l], i) => {
        const cls = c[k] ? "is-done" : i === now ? "is-now" : "";
        let detail = c[k] ? fmtLong(parse(c[k])) : i === now ? "Prochaine étape" : "";
        if (k === "arrete" && c.arreteRef && c[k]) detail += ` · ${esc(c.arreteRef)}`;
        if (k === "declaration" && !c[k] && c.arrete) detail = `Avant le ${fmtLong(addDays(parse(c.arrete), DELAI_DECLARATION))}`;
        return `<li class="${cls}"><span class="dot">${c[k] ? ICON.check : i === now ? ICON.now : ""}</span><span>${fr(l)}${detail ? `<small>${detail}</small>` : ""}</span></li>`;
      })
      .join("")}</ol>`;

  const next = prochainReleve();
  const total = state.cracks.reduce((n, x) => n + x.mesures.length, 0);
  const t = today();
  $("[data-next]").innerHTML = `<div class="side-card__head"><h2>Prochain relevé</h2></div>
    ${
      next
        ? `<p class="next-big">${daysBetween(t, next.date) <= 0 ? "Aujourd'hui" : fmtShort(next.date)}</p><p>${daysBetween(t, next.date) < 0 ? `En retard de ${-daysBetween(t, next.date)}&nbsp;jours. ` : ""}${next.sec ? "Période sèche&nbsp;: un relevé toutes les deux semaines." : "Hors période sèche&nbsp;: un relevé par mois suffit."} ${total} relevé${total > 1 ? "s" : ""} enregistré${total > 1 ? "s" : ""}.</p>`
        : "<p>Faites un premier relevé pour lancer le suivi. Ensuite&nbsp;: toutes les deux semaines en période sèche, une fois par mois le reste de l'année.</p>"
    }`;
}

function render() {
  $("[data-demo-bar]").hidden = !state.exemple;
  renderAlerts();
  renderCracks();
  renderSide();
}

// ---------- Fenêtres et formulaires ----------
function open(id) {
  const d = document.getElementById(id);
  if (!d.open) d.showModal();
  return d;
}

let editingCrack = null;
const showAll = new Set();
let measureFor = null;
let pendingPhoto = null;

function openCrackForm(id = null) {
  editingCrack = id;
  const form = $('[data-form="crack"]');
  const c = state.cracks.find((x) => x.id === id);
  form.reset();
  form.nom.value = c?.nom || "";
  form.lieu.value = c?.lieu || "";
  form.type.value = c?.type || "interieur";
  open("crack-dialog");
  form.nom.focus();
}

async function openMeasureForm(crackId) {
  measureFor = crackId;
  pendingPhoto = null;
  const c = state.cracks.find((x) => x.id === crackId);
  const form = $('[data-form="measure"]');
  form.reset();
  form.date.value = iso(today());
  form.date.max = iso(today());
  $("[data-measure-crack]").innerHTML = fr(c.nom);
  $("[data-photo-preview]").hidden = true;
  $("[data-photo-label]").textContent = "Prendre ou choisir une photo";
  // La dernière photo sert de modèle de cadrage
  const lastWithPhoto = sorted(c).filter((m) => m.photo).pop();
  const ref = $("[data-photo-ref]");
  ref.hidden = !lastWithPhoto;
  if (lastWithPhoto) {
    ref.innerHTML = `<img data-photo="${lastWithPhoto.photo}" alt="Photo précédente, à reprendre avec le même cadrage" /><span>Cadrage du ${fmtShort(parse(lastWithPhoto.date))}</span>`;
    fillPhotos(ref);
  }
  open("measure-dialog");
}

function fillForm(form, data) {
  for (const el of form.elements) if (el.name && el.type !== "file" && el.type !== "radio" && el.type !== "checkbox") el.value = data[el.name] || "";
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button, [data-open]");
  if (e.target.matches("dialog")) e.target.close();
  if (!t) return;
  const d = t.dataset;
  if (t.hasAttribute("data-close")) t.closest("dialog").close();
  else if (d.open) {
    const dlg = open(d.open);
    if (d.open === "house-dialog") fillForm($('[data-form="house"]'), state.house);
    if (d.open === "commune-dialog") fillForm($('[data-form="commune"]'), state.commune);
    dlg.querySelector("input")?.focus();
  } else if (t.hasAttribute("data-add-crack")) openCrackForm();
  else if (d.editCrack) openCrackForm(d.editCrack);
  else if (d.deleteCrack) {
    const c = state.cracks.find((x) => x.id === d.deleteCrack);
    if (!(await ask(`Supprimer « ${c.nom} » ?`, `Ses ${c.mesures.length} relevés et leurs photos seront supprimés de cet appareil.`, "Supprimer"))) return;
    for (const m of c.mesures) if (m.photo && !m.photo.startsWith("url:")) db.deletePhoto(m.photo).catch(() => {});
    state.cracks = state.cracks.filter((x) => x.id !== c.id);
    selected = state.cracks[0]?.id || null;
    await persist();
    render();
  } else if (d.select) {
    selected = d.select;
    renderCracks();
    if (window.innerWidth < 1024) $("[data-detail]").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  } else if (d.addMeasure) openMeasureForm(d.addMeasure);
  else if (d.toggleAll) {
    if (showAll.has(d.toggleAll)) showAll.delete(d.toggleAll);
    else showAll.add(d.toggleAll);
    renderDetail();
  }
  else if (d.deleteMeasure) {
    const [cid, mid] = d.deleteMeasure.split(":");
    const c = state.cracks.find((x) => x.id === cid);
    const m = c.mesures.find((x) => x.id === mid);
    if (!(await ask("Supprimer ce relevé ?", `Relevé du ${fmtLong(parse(m.date))}, ${m.largeur.toLocaleString("fr-FR")} mm.`, "Supprimer"))) return;
    if (m.photo && !m.photo.startsWith("url:")) db.deletePhoto(m.photo).catch(() => {});
    c.mesures = c.mesures.filter((x) => x.id !== mid);
    await persist();
    render();
  } else if (d.view) {
    const v = document.createElement("dialog");
    v.className = "viewer";
    v.setAttribute("aria-label", "Photo agrandie");
    v.innerHTML = `<img alt="${esc(d.caption)}" /><p>${esc(d.caption)}</p>`;
    document.body.append(v);
    v.querySelector("img").src = await photoUrl(d.view);
    v.addEventListener("close", () => v.remove());
    v.addEventListener("click", () => v.close());
    v.showModal();
  } else if (t.hasAttribute("data-open-report")) openReport();
  else if (t.hasAttribute("data-print")) window.print();
  else if (t.hasAttribute("data-load-example")) {
    if (state.cracks.length && !state.exemple && !(await ask("Remplacer vos données par l'exemple ?", "Vos fissures et vos relevés seront effacés de cet appareil. Exportez d'abord une sauvegarde si vous voulez les garder.", "Charger l'exemple"))) return;
    await chargerExemple();
    document.querySelectorAll("dialog[open]").forEach((x) => x.close());
  } else if (t.hasAttribute("data-start-own")) {
    state = vide();
    selected = null;
    await persist();
    render();
    openCrackForm();
  } else if (t.hasAttribute("data-reset-all")) {
    if (!(await ask("Tout effacer ?", "Fissures, relevés et photos seront supprimés de cet appareil.", "Tout effacer"))) return;
    await db.clearAll().catch(() => {});
    state = vide();
    selected = null;
    await persist();
    render();
    t.closest("dialog")?.close();
    toast("Tout est effacé.");
  } else if (t.hasAttribute("data-export")) exporter();
});

$('[data-form="crack"]').addEventListener("submit", async (e) => {
  const f = e.target;
  const data = { nom: f.nom.value.trim(), lieu: f.lieu.value.trim(), type: f.type.value };
  if (!data.nom) return e.preventDefault();
  if (editingCrack) Object.assign(state.cracks.find((x) => x.id === editingCrack), data);
  else {
    const c = { id: uid(), ...data, mesures: [] };
    state.cracks.push(c);
    selected = c.id;
  }
  await persist();
  render();
  if (!editingCrack) setTimeout(() => openMeasureForm(selected), 50);
});

$('[data-form="measure"] input[type="file"]').addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $("[data-photo-label]").textContent = "Préparation de la photo";
  try {
    pendingPhoto = await compress(file);
    const prev = $("[data-photo-preview]");
    prev.src = URL.createObjectURL(pendingPhoto);
    prev.hidden = false;
    $("[data-photo-label]").textContent = "Changer de photo";
  } catch {
    pendingPhoto = null;
    $("[data-photo-label]").textContent = "Photo illisible, essayez-en une autre";
  }
});

$('[data-form="measure"]').addEventListener("submit", async (e) => {
  const f = e.target;
  const largeur = Number(String(f.largeur.value).replace(",", "."));
  if (!f.date.value || !(largeur >= 0)) return e.preventDefault();
  const c = state.cracks.find((x) => x.id === measureFor);
  let photo = null;
  if (pendingPhoto) {
    photo = uid();
    try {
      await db.putPhoto(photo, pendingPhoto);
    } catch {
      photo = null;
      toast("La photo n'a pas pu être enregistrée sur cet appareil.");
    }
  }
  c.mesures.push({
    id: uid(),
    date: f.date.value,
    largeur,
    longueur: f.longueur.value ? Number(f.longueur.value) : null,
    photo,
    note: f.note.value.trim(),
    protocole: { repere: f.repere.checked, cadrage: f.cadrage.checked, jauge: f.jauge.checked },
  });
  if (!state.house.debut || f.date.value < state.house.debut) state.house.debut = f.date.value;
  await persist();
  render();
  toast("Relevé enregistré.");
});

for (const [name, key] of [["house", "house"], ["commune", "commune"]]) {
  $(`[data-form="${name}"]`).addEventListener("submit", async (e) => {
    const f = e.target;
    const data = {};
    for (const el of f.elements) if (el.name) data[el.name] = el.value.trim();
    state[key] = data;
    await persist();
    render();
  });
}

// ---------- Exemple ----------
async function chargerExemple() {
  await db.clearAll().catch(() => {});
  state = EXEMPLE(today(), iso, addDays);
  selected = state.cracks[0].id;
  await persist();
  render();
  toast("Exemple chargé : une maison fictive, avec trois fissures suivies.");
}

// ---------- Sauvegarde ----------
async function exporter() {
  const photos = {};
  for (const c of state.cracks) {
    for (const m of c.mesures) {
      if (!m.photo || m.photo.startsWith("url:")) continue;
      const blob = await db.getPhoto(m.photo).catch(() => null);
      if (blob) photos[m.photo] = await new Promise((r) => {
        const fr2 = new FileReader();
        fr2.onload = () => r(fr2.result);
        fr2.readAsDataURL(blob);
      });
    }
  }
  const data = JSON.stringify({ app: "lezarde", exporte: new Date().toISOString(), state, photos });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  a.download = `lezarde-sauvegarde-${iso(today())}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  toast("Sauvegarde exportée.");
}

$("[data-import]").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "lezarde" || !data.state?.cracks) throw new Error("format");
    if (!(await ask("Restaurer cette sauvegarde ?", "Les données actuelles de cet appareil seront remplacées.", "Restaurer"))) return;
    await db.clearAll().catch(() => {});
    for (const [id, url] of Object.entries(data.photos || {})) await db.putPhoto(id, await (await fetch(url)).blob());
    state = data.state;
    selected = state.cracks[0]?.id || null;
    await persist();
    render();
    e.target.closest("dialog")?.close();
    toast("Sauvegarde restaurée.");
  } catch {
    toast("Ce fichier n'est pas une sauvegarde Lézarde valide.");
  } finally {
    e.target.value = "";
  }
});

// ---------- Dossier pour l'assureur ----------
async function openReport() {
  const h = state.house;
  const c = state.commune;
  const all = state.cracks.flatMap((x) => x.mesures.map((m) => ({ ...m, crack: x })));
  const dates = all.map((m) => m.date).sort();
  const nbPhotos = all.filter((m) => m.photo).length;
  const limite = c.arrete ? addDays(parse(c.arrete), DELAI_DECLARATION) : null;
  const ligne = (label, v) => (v ? `<tr><th>${label}</th><td>${v}</td></tr>` : "");

  const parFissure = state.cracks
    .map((x) => {
      const t = tendance(x);
      const ms = sorted(x);
      const photos = ms.filter((m) => m.photo);
      const choix = photos.length <= 3 ? photos : [photos[0], photos[Math.floor(photos.length / 2)], photos[photos.length - 1]];
      return `<section>
        <h3>${fr(x.nom)}</h3>
        <p class="report__meta">${fr(x.lieu || "")}${x.lieu ? " · " : ""}${x.type === "exterieur" ? "extérieur" : "intérieur"} · ${ms.length} relevé${ms.length > 1 ? "s" : ""}${t.last ? ` · de ${mm(t.first.largeur)} à ${mm(t.last.largeur)} (${signed(t.total)})` : ""}</p>
        ${ms.length > 1 ? `<div class="report__chart">${chart(x)}</div>` : ""}
        ${ms.length ? `<table><thead><tr><th>Date</th><th class="num">Largeur</th><th class="num">Longueur</th><th>Protocole</th><th>Note</th></tr></thead><tbody>${ms
          .map((m) => `<tr><td>${fmtLong(parse(m.date))}</td><td class="num">${mm(m.largeur)}</td><td class="num">${m.longueur ? `${m.longueur}&nbsp;cm` : "–"}</td><td>${["repere", "cadrage", "jauge"].filter((k) => m.protocole?.[k]).length}/3</td><td>${fr(m.note || "")}</td></tr>`)
          .join("")}</tbody></table>` : "<p>Aucun relevé.</p>"}
        ${choix.length ? `<div class="report__photos">${choix.map((m) => `<figure><img data-photo="${m.photo}" alt="Photo du ${esc(fmtLong(parse(m.date)))}" /><figcaption>${fmtLong(parse(m.date))} · ${mm(m.largeur)}</figcaption></figure>`).join("")}</div>` : ""}
      </section>`;
    })
    .join("");

  const lettre = `${h.nom ? `${h.nom}\n` : ""}${h.adresse || "[Votre adresse]"}${h.commune ? `\n${h.commune}` : ""}

À l'attention de ${h.assureur || "[votre assureur]"}
Contrat n° ${h.contrat || "[numéro de contrat]"}

Objet : déclaration de sinistre, catastrophe naturelle (mouvements de terrain liés à la sécheresse et à la réhydratation des sols)

Madame, Monsieur,

À la suite de la publication au Journal officiel, le ${c.arrete ? fmtLong(parse(c.arrete)) : "[date de publication]"}, de l'arrêté portant reconnaissance de l'état de catastrophe naturelle${c.arreteRef ? ` (${c.arreteRef})` : ""} pour la commune de ${h.commune || "[commune]"}, je vous déclare les dommages subis par mon logement situé ${h.adresse ? `au ${h.adresse}` : "à l'adresse ci-dessus"}.

Des fissures sont apparues à partir du ${h.debut ? fmtLong(parse(h.debut)) : "[date]"}. Je les suis depuis à intervalles réguliers : vous trouverez ci-joint le relevé daté de ${state.cracks.length} fissure${state.cracks.length > 1 ? "s" : ""} (${all.length} mesures, ${nbPhotos} photos), qui montre leur évolution.

Je vous remercie de bien vouloir enregistrer ce sinistre et de me faire connaître la suite donnée, notamment la date de passage de votre expert.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

[Signature]`;

  const pieces = [
    ["Relevés datés des fissures et photos (ce dossier)", all.length > 0],
    ["Copie de l'arrêté de catastrophe naturelle publié au Journal officiel", Boolean(c.arrete)],
    ["Courrier de signalement adressé à la mairie", Boolean(c.signalement)],
    ["Attestation d'assurance habitation", Boolean(h.assureur)],
    ["Titre de propriété ou acte d'achat", false],
    ["Factures et devis de travaux antérieurs sur la structure, s'il y en a", false],
  ];

  $("[data-report]").innerHTML = `
    <header class="report__cover">
      <h1 id="report-title">Dossier de suivi des fissures</h1>
      <p class="report__meta">${fr(h.nom || "Logement")}${h.adresse ? ` · ${fr(h.adresse)}` : ""}${h.commune ? ` · ${fr(h.commune)}` : ""}</p>
      <p class="report__meta">Relevés du ${dates.length ? fmtLong(parse(dates[0])) : "–"} au ${dates.length ? fmtLong(parse(dates[dates.length - 1])) : "–"} · Dossier édité le ${fmtLong(today())}</p>
    </header>
    ${state.exemple ? '<p class="warn" style="margin-top:16px">Exemple : les données de ce dossier sont fictives.</p>' : ""}

    <h2>Synthèse</h2>
    <table><tbody>
      ${ligne("Fissures suivies", String(state.cracks.length))}
      ${ligne("Relevés", `${all.length}, dont ${nbPhotos} avec photo`)}
      ${ligne("Premières fissures constatées", h.debut ? fmtLong(parse(h.debut)) : "")}
      ${ligne("Assureur", h.assureur ? `${fr(h.assureur)}${h.contrat ? ` · contrat n°&nbsp;${fr(h.contrat)}` : ""}` : "")}
    </tbody></table>
    ${state.cracks.length ? `<table><thead><tr><th>Fissure</th><th>Premier relevé</th><th>Dernier relevé</th><th class="num">Évolution</th></tr></thead><tbody>${state.cracks
      .map((x) => {
        const t = tendance(x);
        return `<tr><td>${fr(x.nom)}</td><td>${t.first ? `${fmtLong(parse(t.first.date))} · ${mm(t.first.largeur)}` : "–"}</td><td>${t.last ? `${fmtLong(parse(t.last.date))} · ${mm(t.last.largeur)}` : "–"}</td><td class="num">${t.last ? signed(t.total) : "–"}</td></tr>`;
      })
      .join("")}</tbody></table>` : ""}

    <h2>Procédure de catastrophe naturelle</h2>
    <table><tbody>
      ${ligne("Signalement en mairie", c.signalement ? fmtLong(parse(c.signalement)) : "Non renseigné")}
      ${ligne("Demande communale déposée", c.demande ? fmtLong(parse(c.demande)) : "Non renseigné")}
      ${ligne("Arrêté publié au Journal officiel", c.arrete ? `${fmtLong(parse(c.arrete))}${c.arreteRef ? ` · ${fr(c.arreteRef)}` : ""}` : "Non publié ou non renseigné")}
      ${ligne("Date limite de déclaration", limite ? `${fmtLong(limite)} (${DELAI_DECLARATION} jours après la publication)` : "")}
      ${ligne("Déclaration à l'assureur", c.declaration ? fmtLong(parse(c.declaration)) : "")}
      ${ligne("Passage de l'expert", c.expertise ? fmtLong(parse(c.expertise)) : "")}
    </tbody></table>

    <h2>Détail des fissures</h2>
    ${parFissure || "<p>Aucune fissure enregistrée.</p>"}

    <h2>Pièces à joindre</h2>
    <ul class="report__checks">${pieces.map(([l, ok]) => `<li class="${ok ? "is-ok" : ""}">${fr(l)}</li>`).join("")}</ul>

    <h2>Modèle de courrier de déclaration</h2>
    <p>À adapter, puis à envoyer en recommandé avec accusé de réception ou par le canal indiqué par votre assureur.</p>
    <div class="report__letter">${esc(lettre)}</div>

    <p class="report__foot">Document établi par le propriétaire à l'aide de Lézarde. Les mesures et les photos sont fournies par le propriétaire. Ce dossier ne remplace pas l'avis d'un expert. Vérifiez les délais et conditions applicables dans votre contrat et auprès de votre assureur.</p>`;
  open("report-dialog");
  await fillPhotos($("[data-report]"));
}

// ---------- Confirmation intégrée (les boîtes du navigateur ne sont pas fiables partout) ----------
function ask(titre, texte, action) {
  const d = document.getElementById("confirm-dialog");
  d.querySelector("[data-confirm-title]").textContent = titre;
  d.querySelector("[data-confirm-text]").textContent = texte;
  d.querySelector("[data-confirm-ok]").textContent = action;
  d.returnValue = "";
  d.showModal();
  d.querySelector("[data-confirm-cancel]").focus();
  return new Promise((resolve) => d.addEventListener("close", () => resolve(d.returnValue === "ok"), { once: true }));
}

// ---------- Toast ----------
let toastTimer;
function toast(message) {
  let el = $(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
  }
  const host = document.querySelector("dialog[open]") || document.body;
  if (el.parentElement !== host) host.append(el);
  el.innerHTML = `${ICON.check}<span>${esc(message)}</span>`;
  el.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), 3200);
}

// Page verrouillée tant qu'une fenêtre est ouverte
new MutationObserver(() => document.documentElement.classList.toggle("is-locked", Boolean(document.querySelector("dialog[open]")))).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"], childList: true });

// ---------- Démarrage ----------
(async () => {
  try {
    // Rien d'enregistré : première visite, l'exemple sera montré
    state = (await db.get("state")) || { ...vide(), commence: false };
  } catch {
    toast("Cet appareil n'autorise pas l'enregistrement : vos données ne seront pas conservées.");
  }
  await entree(location.hash.slice(1) || (new URLSearchParams(location.search).get("exemple") === "1" ? "exemple" : ""));
  window.addEventListener("hashchange", () => entree(location.hash.slice(1)));
})();

// Points d'entrée : #nouveau (suivi vierge), #exemple (maison fictive), sinon les données de l'appareil.
// L'exemple ne remplace jamais des données personnelles sans confirmation.
async function entree(voulu) {
  const libre = !state.cracks.length || state.exemple;
  if (voulu === "nouveau" && libre) {
    state = vide();
    selected = null;
    await persist();
    render();
    openCrackForm();
  } else if ((voulu === "exemple" && libre) || (!state.commence && !state.cracks.length)) {
    // Première visite : l'application s'ouvre sur l'exemple, clairement signalé
    await chargerExemple();
  } else {
    selected ??= state.cracks[0]?.id || null;
    render();
  }
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}
