// Bibliothèque : recherche, filtres par univers, domaine et catégorie, fiche d'un prompt
// avec ses champs à compléter et l'aperçu en direct.
import { CATALOGUE, CATEGORIES, DOMAINES, DOMAINE_BY_ID, ENTRY_BY_ID, UNIVERS, UNIVERS_BY_ID } from "./data/catalogue/index.js";
import { buildPrompt, champ, fieldsOf, placeholder, DEFAULT_OPTS } from "./lib/compose.js";
import { CHAMPS } from "./data/catalogue/champs.js";
import { loadFavorites, saveFavorites, loadProfile, saveProfile } from "./lib/store.js";
import { TARGETS, targetUrl, copyText } from "./lib/share.js";
import { icon } from "./lib/icons.js";
import { initHeader, toast, reducedMotion } from "./lib/ui.js";

const $ = (sel, root = document) => root.querySelector(sel);
const PAGE = 36;
const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const PROFILE_KEYS = Object.keys(CHAMPS).filter((k) => CHAMPS[k].profil);
const nf = new Intl.NumberFormat("fr-FR");

// Texte d'interface échappé, avec les espaces insécables de la typographie française
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fr = (s) => esc(s).replace(/ ([?!:;»])/g, "&nbsp;$1").replace(/« /g, "«&nbsp;");
const plural = (n, one, many) => `${nf.format(n)}&nbsp;${n > 1 ? many : one}`;

// ---------- Ordre d'affichage par défaut ----------
// Un prompt de chaque domaine à tour de rôle : les prompts propres aux domaines d'abord,
// puis les modèles, décalés d'un domaine à l'autre pour varier les titres affichés.
const BY_DOMAIN = new Map(DOMAINES.map((d) => [d.id, []]));
for (const e of CATALOGUE) BY_DOMAIN.get(e.d.id).push(e);
const DEFAULT_ORDER = [];
{
  const lists = DOMAINES.map((d, i) => {
    const all = BY_DOMAIN.get(d.id);
    const sp = all.filter((e) => e.s);
    const tp = all.filter((e) => e.m);
    const k = tp.length ? (i * 7) % tp.length : 0;
    return [...sp, ...tp.slice(k), ...tp.slice(0, k)];
  });
  for (let k = 0, any = true; any; k++) {
    any = false;
    for (const list of lists) {
      if (k < list.length) {
        DEFAULT_ORDER.push(list[k]);
        any = true;
      }
    }
  }
}
const RANK = new Map(DEFAULT_ORDER.map((e, i) => [e.id, i]));

// ---------- Recherche ----------
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const STOP = new Set("de du des la le les un une et en a au aux pour mon ma mes ton ta tes son sa ses d l j avec sur dans par ou prompt prompts ia chatgpt claude gemini".split(" "));
const SYN = { maths: "math", resto: "restau", ado: "adolescent", ados: "adolescent", job: "emploi", boulot: "emploi", appart: "appartement", bac: "baccalaureat", rdv: "rendez" };

function tokens(q) {
  return norm(q)
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => SYN[t] || (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

let INDEX = null;
function index() {
  INDEX ??= CATALOGUE.map((e) => {
    const d = e.d;
    return {
      e,
      dom: norm(`${d.nom} ${d.sujet || d.pratique || d.matiere || d.situation || ""}`),
      title: norm(e.t),
      rest: norm(`${e.r} ${e.m ? e.m.id.replace(/-/g, " ") : ""} ${UNIVERS_BY_ID[d.univers].nom} ${CAT_BY_ID[e.cat].nom} ${d.role}`),
    };
  });
  return INDEX;
}

// Tous les mots doivent être trouvés ; sinon, les prompts qui en contiennent le plus.
function search(toks) {
  const scored = [];
  for (const it of index()) {
    let score = 0;
    let hits = 0;
    for (const t of toks) {
      const s = (it.dom.includes(t) ? 6 : 0) + (it.title.includes(t) ? 4 : 0) + (it.rest.includes(t) ? 1 : 0);
      if (s) hits++;
      score += s;
    }
    if (hits) scored.push({ e: it.e, score: score + (it.e.s ? 1 : 0), hits });
  }
  const byScore = (a, b) => b.score - a.score || RANK.get(a.e.id) - RANK.get(b.e.id);
  const all = scored.filter((x) => x.hits === toks.length).sort(byScore);
  if (all.length || toks.length < 2) return { list: all.map((x) => x.e), approx: false };
  const need = Math.ceil(toks.length / 2);
  const near = scored.filter((x) => x.hits >= need).sort((a, b) => b.hits - a.hits || byScore(a, b));
  return { list: near.map((x) => x.e), approx: near.length > 0 };
}

// ---------- État et adresse de la page ----------
const state = { q: "", univers: "", domaine: "", cat: "", fav: false, shown: PAGE };
let favorites = new Set(loadFavorites());
let profile = loadProfile();

function readUrl() {
  const p = new URLSearchParams(location.search);
  state.q = p.get("q") || "";
  state.domaine = DOMAINE_BY_ID[p.get("domaine")] ? p.get("domaine") : "";
  state.univers = state.domaine ? DOMAINE_BY_ID[state.domaine].univers : UNIVERS_BY_ID[p.get("univers")] ? p.get("univers") : "";
  state.cat = CAT_BY_ID[p.get("categorie")] ? p.get("categorie") : "";
  state.fav = p.get("favoris") === "1";
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.univers) p.set("univers", state.univers);
  if (state.domaine) p.set("domaine", state.domaine);
  if (state.cat) p.set("categorie", state.cat);
  if (state.fav) p.set("favoris", "1");
  const qs = p.toString();
  history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
}

function compute() {
  const toks = tokens(state.q);
  let list;
  let approx = false;
  if (toks.length) ({ list, approx } = search(toks));
  else list = state.domaine ? BY_DOMAIN.get(state.domaine) : DEFAULT_ORDER;
  if (state.univers) list = list.filter((e) => e.d.univers === state.univers);
  if (state.domaine) list = list.filter((e) => e.d.id === state.domaine);
  if (state.fav) list = list.filter((e) => favorites.has(e.id));
  const beforeCat = list;
  if (state.cat) list = list.filter((e) => e.cat === state.cat);
  return { list, beforeCat, approx };
}

// ---------- Rendu de la liste ----------
const els = {
  form: $("[data-search-form]"),
  q: $("#q"),
  unav: $("[data-unav]"),
  selU: $("[data-select-univers]"),
  selD: $("[data-select-domaine]"),
  selC: $("[data-select-cat]"),
  domainCard: $("[data-domain-card]"),
  count: $("[data-count]"),
  reset: $("[data-reset]"),
  approx: $("[data-approx]"),
  results: $("[data-results]"),
  more: $("[data-more]"),
  moreBtn: $("[data-more-btn]"),
  moreInfo: $("[data-more-info]"),
  empty: $("[data-empty]"),
  custom: $("[data-custom-link]"),
};

function renderNav() {
  const btn = (attrs, inner, pressed) => `<button class="unav__btn" type="button" ${attrs} aria-pressed="${pressed}">${inner}</button>`;
  let html = btn('data-univers=""', `<span class="unav__icon">${icon("grid")}</span><span class="unav__name">Tous les univers</span>`, !state.univers);
  for (const u of UNIVERS) {
    const on = state.univers === u.id;
    html += `<div class="unav__group" data-color="${u.couleur}">`;
    html += btn(`data-univers="${u.id}"`, `<span class="unav__icon">${icon(u.icon)}</span><span class="unav__name">${fr(u.nom)}</span>`, on && !state.domaine);
    if (on) {
      html += `<div class="unav__doms">${DOMAINES.filter((d) => d.univers === u.id)
        .map((d) => `<button class="unav__dom" type="button" data-domaine="${d.id}" aria-pressed="${state.domaine === d.id}">${fr(d.nom)}</button>`)
        .join("")}</div>`;
    }
    html += "</div>";
  }
  els.unav.innerHTML = html;

  els.selU.innerHTML = `<option value="">Tous les univers</option>${UNIVERS.map((u) => `<option value="${u.id}"${u.id === state.univers ? " selected" : ""}>${esc(u.nom)}</option>`).join("")}`;
  const active = [state.univers, state.domaine].filter(Boolean).length;
  const badge = $("[data-filter-count]");
  badge.hidden = !active;
  badge.textContent = active;
  const doms = DOMAINES.filter((d) => !state.univers || d.univers === state.univers);
  els.selD.innerHTML = `<option value="">Tous les domaines</option>${doms.map((d) => `<option value="${d.id}"${d.id === state.domaine ? " selected" : ""}>${esc(d.nom)}</option>`).join("")}`;
}

function renderDomainCard() {
  const d = DOMAINE_BY_ID[state.domaine];
  els.domainCard.hidden = !d;
  if (!d) return;
  const u = UNIVERS_BY_ID[d.univers];
  els.domainCard.dataset.color = u.couleur;
  const n = BY_DOMAIN.get(d.id).length;
  els.domainCard.innerHTML = `
    <span class="lib-domain__icon">${icon(u.icon)}</span>
    <div>
      <p class="lib-domain__kicker">${fr(u.nom)}</p>
      <h2 class="lib-domain__name">${fr(d.nom)}</h2>
      <p class="lib-domain__text">${plural(n, "prompt", "prompts")}, dont ${d.sp.length} écrits pour ce seul domaine.</p>
    </div>`;
}

function renderCats(beforeCat) {
  const present = new Set(beforeCat.map((e) => e.cat));
  const cats = CATEGORIES.filter((c) => present.has(c.id) || state.cat === c.id);
  els.selC.innerHTML = `<option value="">Toutes les tâches</option>${cats.map((c) => `<option value="${c.id}"${c.id === state.cat ? " selected" : ""}>${esc(c.nom)}</option>`).join("")}`;
  const favBtn = $("[data-fav-filter]");
  favBtn.setAttribute("aria-pressed", String(state.fav));
  renderFavCount();
}

function renderFavCount() {
  const badge = $("[data-fav-count]");
  badge.textContent = nf.format(favorites.size);
  badge.hidden = favorites.size === 0;
}

function card(e) {
  const u = UNIVERS_BY_ID[e.d.univers];
  const fav = favorites.has(e.id);
  return `<li class="pc" data-color="${u.couleur}">
    <div class="pc__top">
      <span class="pc__dom"><span class="pc__dom-icon">${icon(u.icon)}</span>${fr(e.d.nom)}</span>
      <button class="pc__fav" type="button" data-fav="${e.id}" aria-pressed="${fav}" aria-label="Favori : ${esc(e.t)} (${esc(e.d.nom)})">${icon("star")}</button>
    </div>
    <h3 class="pc__title"><a href="#${e.id}" data-open="${e.id}">${fr(e.t)}</a></h3>
  </li>`;
}

let lastList = [];
function render({ keepPage = false } = {}) {
  if (!keepPage) state.shown = PAGE;
  const { list, beforeCat, approx } = compute();
  lastList = list;
  renderNav();
  renderDomainCard();
  renderCats(beforeCat);

  const filtered = state.q || state.univers || state.domaine || state.cat || state.fav;
  els.count.innerHTML = list.length ? `${plural(list.length, "prompt", "prompts")}${filtered ? "" : " à explorer"}` : "Aucun prompt";
  els.reset.hidden = !filtered;
  els.approx.hidden = !approx;

  const shown = list.slice(0, state.shown);
  els.results.innerHTML = shown.map(card).join("");
  els.more.hidden = list.length <= state.shown;
  els.moreInfo.innerHTML = `${nf.format(shown.length)} affichés sur ${nf.format(list.length)}`;

  els.empty.hidden = list.length > 0;
  if (!list.length) {
    const why = state.fav && !favorites.size ? "Tu n'as pas encore de favori : touche l'étoile d'un prompt pour le retrouver ici." : "Essaie un autre mot, ou retire un filtre.";
    els.empty.innerHTML = `<p class="lib-empty__title">Aucun prompt ne correspond.</p><p>${fr(why)}</p>`;
  }
  els.custom.href = state.q ? `creer.html?idee=${encodeURIComponent(state.q)}` : "creer.html";
  $("[data-custom]").hidden = false;
  writeUrl();
}

// Après un changement de filtre, la nouvelle liste se lit depuis son début :
// si l'utilisateur était descendu plus bas, on remonte au haut des résultats.
function toResultsTop({ always = false } = {}) {
  const results = $("#resultats");
  const top = results.getBoundingClientRect().top;
  const header = $(".header").offsetHeight;
  // « always » : aussi quand la liste commence trop bas pour être vue
  if (top >= header && (!always || top < innerHeight * 0.4)) return;
  results.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
}

function appendMore() {
  const from = state.shown;
  state.shown += PAGE;
  els.results.insertAdjacentHTML("beforeend", lastList.slice(from, state.shown).map(card).join(""));
  els.more.hidden = lastList.length <= state.shown;
  els.moreInfo.innerHTML = `${nf.format(Math.min(state.shown, lastList.length))} affichés sur ${nf.format(lastList.length)}`;
  els.results.children[from]?.querySelector("a")?.focus({ preventScroll: true });
}

function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavorites([...favorites]);
  document.querySelectorAll(`[data-fav="${CSS.escape(id)}"]`).forEach((b) => b.setAttribute("aria-pressed", String(favorites.has(id))));
  renderFavCount();
  return favorites.has(id);
}

// ---------- Fiche d'un prompt ----------
const dlg = $("[data-prompt-dialog]");
const pForm = $("[data-p-form]");
const pPreview = $("[data-p-preview]");
const pMeta = $("[data-p-meta]");
const values = new Map();
let current = null;
let opts = { ...DEFAULT_OPTS };
let closingFromHistory = false;

const OPTION_LABELS = {
  questions: "L'IA me pose ses questions si une information lui manque",
  variantes: "Demander 2 ou 3 versions différentes",
};

function valuesOf(e) {
  if (!values.has(e.id)) {
    const v = {};
    for (const key of fieldsOf(e)) {
      const c = champ(key);
      v[key] = (c.profil && profile[key]) || c.defaut || "";
    }
    values.set(e.id, v);
  }
  return values.get(e.id);
}

function fieldHtml(e, key, value) {
  const c = champ(key);
  const multi = Boolean(c.long);
  return `<div class="pf">
    <label class="pf__label" for="pf-${key}">${fr(c.l)}${c.opt ? ' <span class="pf__opt">facultatif</span>' : ""}</label>
    <textarea class="q-input pf__input${multi ? "" : " q-input--line"}" id="pf-${key}" data-key="${key}" rows="${multi ? 3 : 1}"${multi ? "" : " data-line"} placeholder="${esc(placeholder(key, e.d))}">${esc(value)}</textarea>
  </div>`;
}

function favLabel(on) {
  return on ? "Retirer des favoris" : "Ajouter aux favoris";
}

function renderDialog(e) {
  const u = UNIVERS_BY_ID[e.d.univers];
  const v = valuesOf(e);
  const keys = fieldsOf(e);
  const fav = favorites.has(e.id);
  const hasProfile = keys.some((k) => PROFILE_KEYS.includes(k));
  dlg.dataset.color = u.couleur;
  pForm.innerHTML = `
    <button class="pdlg__crumb" type="button" data-goto-domaine="${e.d.id}"><span class="pdlg__crumb-icon">${icon(u.icon)}</span>${fr(e.d.nom)}</button>
    <div class="pdlg__head">
      <h2 class="pdlg__title" id="pdlg-title">${fr(e.t)}</h2>
      <button class="pdlg__fav" type="button" data-act="fav" aria-pressed="${fav}" aria-label="${favLabel(fav)}" title="${favLabel(fav)}">${icon("star")}</button>
    </div>
    <p class="pdlg__lead">${fr(e.r)}</p>
    <button class="btn btn--ghost btn--sm pdlg__jump" type="button" data-act="jump">${icon("eye")}Voir le prompt complet</button>

    <section class="pdlg__block" aria-labelledby="pf-title">
      <h3 class="block-title" id="pf-title">${icon("edit")}${keys.length > 1 ? `Complète ces ${keys.length} champs` : "Complète ce champ"}</h3>
      <p class="pdlg__help">Un champ vide&nbsp;? L'IA te posera la question.</p>
      <div class="pfields">${keys.map((k) => fieldHtml(e, k, v[k])).join("")}</div>
      ${hasProfile ? `<p class="pf__hint">Ton activité et ton public sont retenus sur cet appareil. <button class="link-btn" type="button" data-open-profile>Modifier mon profil</button></p>` : ""}
    </section>

    <div class="pdlg__actions">
      <button class="btn btn--sun btn--lg" type="button" data-act="copy">${icon("copy")}Copier le prompt</button>
      ${Object.entries(TARGETS)
        .map(([k, t]) => `<button class="btn btn--ghost" type="button" data-act="${k}">${icon("external")}Ouvrir dans ${t.nom}</button>`)
        .join("")}
    </div>

    <details class="pdlg__extra">
      <summary>${icon("sliders")}Plus d'options</summary>
      <div class="switches">${Object.entries(OPTION_LABELS)
        .map(([k, label]) => `<button class="switch" type="button" role="switch" aria-checked="${Boolean(opts[k])}" data-switch="${k}"><span class="switch__track"></span>${fr(label)}</button>`)
        .join("")}</div>
      <div class="pdlg__relance">
        <p><b>Pour aller plus loin</b>, une fois la réponse reçue&nbsp;: «&nbsp;<span data-p-relance></span>&nbsp;»</p>
        <button class="btn btn--ghost btn--sm" type="button" data-act="relance">${icon("copy")}Copier</button>
      </div>
      <p class="pdlg__more">
        <button class="link-btn" type="button" data-act="link">${icon("link")}Copier le lien de ce prompt</button>
        <button class="link-btn" type="button" data-act="clear">${icon("refresh")}Vider les champs</button>
      </p>
    </details>`;
  pForm.querySelectorAll("textarea").forEach(autoGrow);
  updatePreview();
}

function updatePreview() {
  if (!current) return;
  const out = buildPrompt(current, valuesOf(current), opts);
  pPreview.innerHTML = out.html;
  const relance = pForm.querySelector("[data-p-relance]");
  if (relance) relance.textContent = out.relance;
  pMeta.innerHTML = `${out.missing.length ? `${plural(out.missing.length, "champ", "champs")} à compléter · ` : ""}${nf.format(out.text.length)}&nbsp;caractères`;
  return out;
}

function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 4}px`;
}

function openEntry(id, { push = true } = {}) {
  const e = ENTRY_BY_ID.get(id);
  if (!e) return;
  current = e;
  renderDialog(e);
  if (push && location.hash !== `#${id}`) history.pushState({ prompt: id }, "", `${location.pathname}${location.search}#${id}`);
  if (!dlg.open) dlg.showModal();
  pForm.scrollTop = 0;
  pPreview.scrollTop = 0;
  dlg.scrollTop = 0;
  // Les hauteurs dépendent de la largeur réelle, connue une fois la fenêtre ouverte
  requestAnimationFrame(() => pForm.querySelectorAll("textarea").forEach(autoGrow));
  $("#pdlg-title").setAttribute("tabindex", "-1");
  $("#pdlg-title").focus({ preventScroll: true });
}

dlg.addEventListener("close", () => {
  const id = current?.id;
  current = null;
  if (closingFromHistory) {
    closingFromHistory = false;
    return;
  }
  if (id && location.hash === `#${id}`) {
    if (history.state?.prompt === id) history.back();
    else history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
});

window.addEventListener("popstate", () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (ENTRY_BY_ID.has(id)) openEntry(id, { push: false });
  else if (dlg.open) {
    closingFromHistory = true;
    dlg.close();
  }
});

async function act(name, btn) {
  if (!current) return;
  const out = buildPrompt(current, valuesOf(current), opts);
  if (name === "jump") {
    dlg.querySelector(".pdlg__live").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (name === "copy") {
    const ok = await copyText(out.text);
    toast(ok ? (out.missing.length ? "Prompt copié. Les champs vides restent marqués [À COMPLÉTER]." : "Prompt copié. Colle-le dans ton IA.") : "La copie a échoué&nbsp;: sélectionne le texte du prompt à la main.", { tone: ok ? "ok" : "warn" });
  } else if (TARGETS[name]) {
    const { url, tooLong } = targetUrl(name, out.text);
    if (tooLong) {
      await copyText(out.text);
      toast(`Prompt trop long pour l'adresse&nbsp;: il est copié, colle-le dans ${TARGETS[name].nom}.`, { tone: "warn" });
    }
    window.open(url, "_blank", "noopener");
  } else if (name === "fav") {
    const on = toggleFavorite(current.id);
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", favLabel(on));
    btn.title = favLabel(on);
    toast(on ? "Ajouté à tes favoris." : "Retiré de tes favoris.");
    if (state.fav) render({ keepPage: true });
  } else if (name === "link") {
    const ok = await copyText(`${location.origin}${location.pathname}#${current.id}`);
    toast(ok ? "Lien copié. Tes réponses n'y figurent pas." : "La copie du lien a échoué.", { tone: ok ? "ok" : "warn" });
  } else if (name === "clear") {
    const v = valuesOf(current);
    for (const key of Object.keys(v)) v[key] = "";
    pForm.querySelectorAll("textarea[data-key]").forEach((t) => {
      t.value = "";
      autoGrow(t);
    });
    updatePreview();
  } else if (name === "relance") {
    const ok = await copyText(out.relance);
    toast(ok ? "Relance copiée." : "La copie a échoué.", { tone: ok ? "ok" : "warn" });
  }
}

pForm.addEventListener("input", (e) => {
  const t = e.target;
  if (!t.dataset.key || !current) return;
  if (t.hasAttribute("data-line") && t.value.includes("\n")) t.value = t.value.replace(/\s*\n\s*/g, " ");
  autoGrow(t);
  valuesOf(current)[t.dataset.key] = t.value;
  if (PROFILE_KEYS.includes(t.dataset.key)) {
    profile = { ...profile, [t.dataset.key]: t.value.trim() };
    saveProfile(profile);
  }
  updatePreview();
});

pForm.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.hasAttribute?.("data-line")) e.preventDefault();
});

pForm.addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  if (el.dataset.switch) {
    opts = { ...opts, [el.dataset.switch]: !opts[el.dataset.switch] };
    el.setAttribute("aria-checked", String(opts[el.dataset.switch]));
    updatePreview();
  } else if (el.dataset.act) act(el.dataset.act, el);
  else if (el.dataset.gotoUnivers || el.dataset.gotoDomaine) {
    state.q = "";
    state.cat = "";
    state.fav = false;
    state.univers = el.dataset.gotoUnivers || DOMAINE_BY_ID[el.dataset.gotoDomaine].univers;
    state.domaine = el.dataset.gotoDomaine || "";
    els.q.value = "";
    dlg.close();
    render();
    $("#resultats").focus({ preventScroll: true });
    $("#resultats").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

dlg.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) dlg.close();
  // Clic sur le fond assombri
  else if (e.target === dlg) dlg.close();
});

// ---------- Profil ----------
const profileDlg = $("[data-profile-dialog]");
const profileFields = $("[data-profile-fields]");

function renderProfile() {
  profileFields.innerHTML = PROFILE_KEYS.map((key) => {
    const c = CHAMPS[key];
    const p = typeof c.p === "function" ? c.p({}) : c.p;
    return `<div class="pf">
      <label class="pf__label" for="pr-${key}">${fr(c.l)}</label>
      <textarea class="q-input q-input--line pf__input" id="pr-${key}" data-profile-key="${key}" rows="1" data-line placeholder="${esc(p)}">${esc(profile[key] || "")}</textarea>
    </div>`;
  }).join("");
  profileFields.querySelectorAll("textarea").forEach(autoGrow);
}

profileFields.addEventListener("input", (e) => {
  const t = e.target;
  if (!t.dataset.profileKey) return;
  if (t.value.includes("\n")) t.value = t.value.replace(/\s*\n\s*/g, " ");
  autoGrow(t);
  applyProfile(t.dataset.profileKey, t.value.trim());
});

// Reporte une valeur du profil dans les prompts déjà ouverts et dans la fiche affichée
function applyProfile(key, value) {
  profile = { ...profile, [key]: value };
  saveProfile(profile);
  for (const v of values.values()) if (key in v) v[key] = value;
  const field = pForm.querySelector(`textarea[data-key="${key}"]`);
  if (field) {
    field.value = value;
    autoGrow(field);
    updatePreview();
  }
}

profileDlg.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]") || e.target === profileDlg) profileDlg.close();
  if (e.target.closest("[data-profile-clear]")) {
    PROFILE_KEYS.forEach((key) => applyProfile(key, ""));
    renderProfile();
    toast("Profil effacé.");
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-open-profile]")) return;
  renderProfile();
  profileDlg.showModal();
  requestAnimationFrame(() => profileFields.querySelectorAll("textarea").forEach(autoGrow));
});

// ---------- Événements de la liste ----------
let searchTimer;
els.q.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.q = els.q.value.trim();
    render();
  }, 160);
});

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearTimeout(searchTimer);
  state.q = els.q.value.trim();
  render();
  els.q.blur();
  $("#resultats").scrollIntoView({ behavior: "smooth", block: "start" });
});

els.unav.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.domaine !== undefined) {
    state.domaine = state.domaine === b.dataset.domaine ? "" : b.dataset.domaine;
  } else {
    state.univers = state.univers === b.dataset.univers ? "" : b.dataset.univers;
    state.domaine = "";
  }
  state.cat = "";
  render();
  toResultsTop();
});

els.selU.addEventListener("change", () => {
  state.univers = els.selU.value;
  state.domaine = "";
  state.cat = "";
  render();
  toResultsTop();
});

els.selD.addEventListener("change", () => {
  state.domaine = els.selD.value;
  if (state.domaine) state.univers = DOMAINE_BY_ID[state.domaine].univers;
  state.cat = "";
  render();
  toResultsTop();
});

els.selC.addEventListener("change", () => {
  state.cat = els.selC.value;
  render();
  toResultsTop();
});

// Recherches suggérées sous le champ
const TRIES = ["avis négatif", "CV", "fiche de révision", "boulangerie"];
$("[data-try]").insertAdjacentHTML("beforeend", TRIES.map((t) => `<button class="chip" type="button" data-try-q="${esc(t)}">${esc(t)}</button>`).join(""));
$("[data-try]").addEventListener("click", (e) => {
  const b = e.target.closest("[data-try-q]");
  if (!b) return;
  els.q.value = b.dataset.tryQ;
  state.q = b.dataset.tryQ;
  render();
  toResultsTop();
});

// Favoris, dans l'en-tête : affiche ou masque uniquement les favoris, puis montre la liste
$("[data-fav-filter]").addEventListener("click", () => {
  state.fav = !state.fav;
  render();
  toResultsTop({ always: true });
});

els.reset.addEventListener("click", () => {
  Object.assign(state, { q: "", univers: "", domaine: "", cat: "", fav: false });
  els.q.value = "";
  render();
  toResultsTop();
});

els.results.addEventListener("click", (e) => {
  const fav = e.target.closest("[data-fav]");
  if (fav) {
    toggleFavorite(fav.dataset.fav);
    if (state.fav) render({ keepPage: true });
    return;
  }
  const open = e.target.closest("[data-open]");
  if (open) {
    e.preventDefault();
    openEntry(open.dataset.open);
  }
});

els.moreBtn.addEventListener("click", appendMore);

window.addEventListener("resize", () => {
  if (dlg.open) pForm.querySelectorAll("textarea").forEach(autoGrow);
}, { passive: true });

// ---------- Démarrage ----------
readUrl();
els.q.value = state.q;
// Sur mobile, les filtres sont repliés, sauf si l'adresse en contient
if (state.univers || state.domaine) $("[data-filters]").open = true;
initHeader();
render();
document.fonts?.ready.then(() => dlg.open && pForm.querySelectorAll("textarea").forEach(autoGrow));
const startId = decodeURIComponent(location.hash.slice(1));
if (ENTRY_BY_ID.has(startId)) openEntry(startId, { push: false });
