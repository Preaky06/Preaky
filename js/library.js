import { METIERS, CATEGORIES, PARCOURS } from "./data/metiers.js";
import { VARIABLES, PROFILE_KEYS } from "./data/variables.js";
import { PROMPTS } from "./data/prompts/index.js";
import { compile, keysOf, targetUrl, copyText, typo, escapeHtml, TARGETS } from "./lib/prompt.js";
import { getValue, setValue, filledCount, clearAll, isFav, toggleFav, favCount } from "./lib/store.js";
import { icon } from "./lib/icons.js";
import { initHeader, initReveal, toast } from "./lib/ui.js";

const byId = Object.fromEntries(PROMPTS.map((p) => [p.id, p]));
const metierById = Object.fromEntries(METIERS.map((m) => [m.id, m]));
const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const CAT_TAG = { strategie: "", creation: "tag--orange", redaction: "tag--lime", analyse: "tag--night", relation: "tag--outline" };

const $ = (sel, root = document) => root.querySelector(sel);
const els = {
  q: $("#q"),
  chipsMetier: $("[data-chips-metier]"),
  chipsCat: $("[data-chips-cat]"),
  intro: $("[data-metier-intro]"),
  count: $("[data-results-count]"),
  reset: $("[data-reset]"),
  grid: $("[data-grid]"),
  filters: $("[data-filters]"),
  sheet: $("#sheet"),
  profile: $("#profil"),
  profileForm: $("[data-profile-form]"),
};

// ---------- État des filtres (reflété dans l'adresse) ----------

const params = new URLSearchParams(location.search);
const state = {
  metier: metierById[params.get("metier")] ? params.get("metier") : null,
  cat: catById[params.get("cat")] ? params.get("cat") : null,
  fav: params.get("favoris") === "1",
  q: params.get("q") || "",
};

function syncUrl() {
  const p = new URLSearchParams();
  if (state.metier) p.set("metier", state.metier);
  if (state.cat) p.set("cat", state.cat);
  if (state.fav) p.set("favoris", "1");
  if (state.q.trim()) p.set("q", state.q.trim());
  const qs = p.toString();
  history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
}

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const haystacks = Object.fromEntries(
  PROMPTS.map((p) => [
    p.id,
    {
      titre: norm(p.titre),
      all: norm([p.titre, p.resume, p.resultat, metierById[p.metier].nom, catById[p.categorie].nom, ...(p.tags || [])].join(" ")),
    },
  ]),
);

function filtered({ ignoreCat = false } = {}) {
  const tokens = norm(state.q).split(/\s+/).filter(Boolean);
  const list = PROMPTS.filter((p) => {
    if (state.metier && p.metier !== state.metier) return false;
    if (!ignoreCat && state.cat && p.categorie !== state.cat) return false;
    if (state.fav && !isFav(p.id)) return false;
    return tokens.every((t) => haystacks[p.id].all.includes(t));
  });
  if (!tokens.length) return list;
  // Les correspondances dans le titre passent devant
  const score = (p) => tokens.filter((t) => haystacks[p.id].titre.includes(t)).length;
  return list.map((p, i) => ({ p, i, s: score(p) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.p);
}

// ---------- Rendu de la liste ----------

// Les pastilles sont créées une fois puis mises à jour sur place,
// pour ne pas perdre le défilement horizontal de leur rangée.
function buildChips() {
  els.chipsMetier.innerHTML =
    `<button class="chip" type="button" data-metier="">Tous les métiers <span class="chip__n">${PROMPTS.length}</span></button>` +
    METIERS.map((m) => {
      const n = PROMPTS.filter((p) => p.metier === m.id).length;
      return `<button class="chip" type="button" data-metier="${m.id}">${icon(m.icon)}${escapeHtml(m.nom)} <span class="chip__n">${n}</span></button>`;
    }).join("");

  els.chipsCat.innerHTML =
    `<button class="chip chip--small" type="button" data-cat="">Toutes les tâches</button>` +
    CATEGORIES.map((c) => `<button class="chip chip--small" type="button" data-cat="${c.id}">${c.nom} <span class="chip__n"></span></button>`).join("") +
    `<button class="chip chip--small chip--fav" type="button" data-fav>${icon("star")}Favoris <span class="chip__n"></span></button>`;
}

function renderChips() {
  els.chipsMetier.querySelectorAll("[data-metier]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.metier || null) === state.metier)));
  const base = filtered({ ignoreCat: true });
  els.chipsCat.querySelectorAll("[data-cat]").forEach((b) => {
    const pressed = (b.dataset.cat || null) === state.cat;
    b.setAttribute("aria-pressed", String(pressed));
    const n = b.querySelector(".chip__n");
    if (!n) return;
    const count = base.filter((p) => p.categorie === b.dataset.cat).length;
    n.textContent = count;
    b.disabled = count === 0 && !pressed;
  });
  const fav = els.chipsCat.querySelector("[data-fav]");
  fav.setAttribute("aria-pressed", String(state.fav));
  fav.querySelector(".chip__n").textContent = favCount();
}

// Après un changement de filtre depuis la barre collée, on remonte au début des résultats
function scrollToResults() {
  if (!els.filters.classList.contains("is-stuck")) return;
  const body = document.querySelector(".lib-body");
  window.scrollTo({ top: body.offsetTop - parseFloat(getComputedStyle(els.filters).top) + 1 });
}

function renderIntro() {
  if (!state.metier) {
    els.intro.innerHTML = "";
    return;
  }
  const m = metierById[state.metier];
  const route = PARCOURS.find((p) => p.metier === m.id);
  els.intro.innerHTML = `
    <div class="metier-intro">
      <span class="metier-intro__icon">${icon(m.icon)}</span>
      <div>
        <h2 class="metier-intro__name">${escapeHtml(m.nom)}</h2>
        <p class="metier-intro__text">${typo(m.accroche)}</p>
      </div>
      ${
        route
          ? `<div class="route">
              <p class="route__title">${icon("layers")}Parcours : ${typo(route.titre)}</p>
              <ol class="route__steps">${route.etapes
                .map((e) => `<li><button class="route__step" type="button" data-open="${e.id}"><b>${typo(byId[e.id].titre)}</b><span>${typo(e.note)}</span></button></li>`)
                .join("")}</ol>
            </div>`
          : ""
      }
    </div>`;
}

function cardHtml(p) {
  const m = metierById[p.metier];
  const fav = isFav(p.id);
  return `
    <article class="card">
      <button class="fav" type="button" data-fav-id="${p.id}" aria-pressed="${fav}" aria-label="${fav ? "Retirer des favoris" : "Ajouter aux favoris"} : ${escapeHtml(p.titre)}">${icon("star")}</button>
      <div class="card__top">
        <span class="tag ${CAT_TAG[p.categorie]}">${catById[p.categorie].nom}</span>
        <span class="card__level">${p.niveau}</span>
      </div>
      <h3 class="card__title"><button class="card__open" type="button" data-open="${p.id}">${typo(p.titre)}</button></h3>
      <p class="card__resume">${typo(p.resume)}</p>
      <div class="card__foot">
        <span>${escapeHtml(m.nom)} · ${keysOf(p).length} champs</span>
        <span class="card__go" aria-hidden="true">Ouvrir ${icon("arrow")}</span>
      </div>
    </article>`;
}

function renderList() {
  const list = filtered();
  const active = state.metier || state.cat || state.fav || state.q.trim();
  els.count.innerHTML = `<b>${list.length}</b> prompt${list.length > 1 ? "s" : ""}${state.q.trim() ? ` pour « ${escapeHtml(state.q.trim())} »` : ""}`;
  els.reset.hidden = !active;

  if (list.length) {
    els.grid.innerHTML = list.map(cardHtml).join("");
    return;
  }
  const noFavs = state.fav && favCount() === 0;
  els.grid.innerHTML = `
    <div class="empty" style="grid-column: 1 / -1">
      <p class="empty__title">${noFavs ? "Pas encore de favoris" : "Rien de ce côté"}</p>
      <p>${noFavs ? "Clique sur l'étoile d'un prompt pour le retrouver ici." : "Aucun prompt ne correspond. Essaie un autre mot ou un autre métier."}</p>
      <button class="btn btn--dark" type="button" data-reset>Voir tous les prompts</button>
    </div>`;
}

function render() {
  renderChips();
  renderIntro();
  renderList();
  syncUrl();
}

function resetFilters() {
  Object.assign(state, { metier: null, cat: null, fav: false, q: "" });
  els.q.value = "";
  render();
}

// ---------- Fiche d'un prompt ----------

let current = null;
let pushedHash = false;

function parcoursOf(id) {
  for (const route of PARCOURS) {
    const i = route.etapes.findIndex((e) => e.id === id);
    if (i !== -1) return { route, i };
  }
  return null;
}

function fieldHtml(key, prefix = "f") {
  const v = VARIABLES[key];
  const value = getValue(key);
  const hint = v.profile ? `<span class="field__hint field__hint--profile">Profil</span>` : v.optional ? `<span class="field__hint">Facultatif</span>` : "";
  const attrs = `id="${prefix}-${key}" data-key="${key}" placeholder="${escapeHtml(v.placeholder || "")}"`;
  const input = v.long ? `<textarea ${attrs} rows="4">${escapeHtml(value)}</textarea>` : `<input ${attrs} type="text" value="${escapeHtml(value)}" />`;
  return `<label class="field${String(value).trim() ? " is-filled" : ""}" for="${prefix}-${key}"><span class="field__label">${typo(v.label)}${hint}</span>${input}</label>`;
}

function sheetHtml(p) {
  const m = metierById[p.metier];
  const keys = keysOf(p);
  const nav = parcoursOf(p.id);
  const prev = nav && nav.route.etapes[nav.i - 1];
  const next = nav && nav.route.etapes[nav.i + 1];
  return `
    <div class="sheet__inner">
      <button class="sheet__close" type="button" data-close aria-label="Fermer">${icon("x")}</button>
      <div class="sheet__left">
        <div class="sheet__meta">
          <span class="tag tag--night">${icon(m.icon)}${escapeHtml(m.nom)}</span>
          <span class="tag ${CAT_TAG[p.categorie]}">${catById[p.categorie].nom}</span>
          <span class="card__level">${p.niveau}</span>
        </div>
        <h2 class="sheet__title" id="sheet-title">${typo(p.titre)}</h2>
        <p class="sheet__resume">${typo(p.resume)}</p>

        <div class="sheet__section">
          <h3 class="sheet__h">${icon("filter")}Remplis ton contexte <small data-progress-label></small></h3>
          <div class="progress"><span data-progress></span></div>
          <form data-fields autocomplete="off">${keys.map((k) => fieldHtml(k)).join("")}</form>
        </div>

        <div class="sheet__section">
          <h3 class="sheet__h">${icon("target")}Ce que tu obtiens</h3>
          <p class="result-box">${typo(p.resultat)}</p>
        </div>

        <div class="sheet__section">
          <h3 class="sheet__h">${icon("shield")}À vérifier avant d'utiliser</h3>
          <ul class="info-list">${p.verifier.map((v) => `<li>${icon("alert")}<span>${typo(v)}</span></li>`).join("")}</ul>
        </div>

        ${
          nav
            ? `<div class="sheet__nav">
                <p class="route__title" style="width:100%;margin:0">${icon("layers")}Parcours « ${typo(nav.route.titre)} » · étape ${nav.i + 1} sur ${nav.route.etapes.length}</p>
                ${prev ? `<button class="btn btn--ghost btn--sm" type="button" data-open="${prev.id}">← ${typo(byId[prev.id].titre)}</button>` : ""}
                ${next ? `<button class="btn btn--dark btn--sm" type="button" data-open="${next.id}">Étape suivante : ${typo(byId[next.id].titre)} →</button>` : ""}
              </div>`
            : ""
        }
      </div>

      <div class="sheet__right on-dark">
        <div class="sheet__preview-head">
          <span class="sheet__preview-title">Ton prompt</span>
          <span class="sheet__status" data-status></span>
        </div>
        <pre class="preview" data-preview tabindex="0" aria-label="Aperçu du prompt"></pre>
        <div class="relance">
          <p class="relance__head">${icon("refresh")}Relance, une fois la réponse obtenue
            <button class="link-btn" type="button" data-copy-relance>${icon("copy")}Copier</button>
          </p>
          <p>${typo(p.relance)}</p>
        </div>
        <div class="sheet__actions">
          <button class="btn btn--cta" type="button" data-copy>${icon("copy")}Copier le prompt</button>
          <a class="btn btn--ghost" data-target="claude" target="_blank" rel="noopener">${icon("external")}${TARGETS.claude.nom}</a>
          <a class="btn btn--ghost" data-target="chatgpt" target="_blank" rel="noopener">${icon("external")}${TARGETS.chatgpt.nom}</a>
          <button class="btn btn--ghost" type="button" data-share aria-label="Copier le lien de ce prompt">${icon("link")}</button>
        </div>
      </div>
    </div>`;
}

function currentValues(p) {
  return Object.fromEntries(keysOf(p).map((k) => [k, getValue(k)]));
}

function updateSheet() {
  const p = current;
  if (!p) return;
  const keys = keysOf(p);
  const { text, html, missing } = compile(p, currentValues(p));
  const sheet = els.sheet;
  $("[data-preview]", sheet).innerHTML = html;

  const filled = filledCount(keys);
  $("[data-progress]", sheet).style.setProperty("--p", `${Math.round((filled / keys.length) * 100)}%`);
  $("[data-progress-label]", sheet).textContent = `${filled} sur ${keys.length}`;

  const status = $("[data-status]", sheet);
  status.textContent = missing.length ? `${missing.length} champ${missing.length > 1 ? "s" : ""} à compléter` : "Prêt à copier";
  status.classList.toggle("is-missing", missing.length > 0);

  sheet.querySelectorAll("[data-target]").forEach((a) => {
    const { url, tooLong } = targetUrl(a.dataset.target, text);
    a.href = url;
    a.dataset.tooLong = tooLong ? "1" : "";
  });
}

function openSheet(id, { push = true } = {}) {
  const p = byId[id];
  if (!p) return;
  current = p;
  els.sheet.innerHTML = sheetHtml(p);
  updateSheet();
  if (!els.sheet.open) els.sheet.showModal();
  els.sheet.scrollTop = 0;
  $(".sheet__left", els.sheet).scrollTop = 0;
  $(".sheet__inner", els.sheet).scrollTop = 0;

  if (location.hash !== `#${id}`) {
    if (push) {
      history.pushState({ sheet: id }, "", `${location.pathname}${location.search}#${id}`);
      pushedHash = true;
    } else {
      history.replaceState(history.state, "", `${location.pathname}${location.search}#${id}`);
    }
  }

  // Sur ordinateur, on place le curseur dans le premier champ vide
  if (window.matchMedia("(pointer: fine)").matches) {
    const firstEmpty = [...els.sheet.querySelectorAll("[data-key]")].find((f) => !f.value.trim());
    (firstEmpty || $(".sheet__close", els.sheet)).focus({ preventScroll: true });
  }
}

function closeSheet() {
  if (els.sheet.open) els.sheet.close();
}

els.sheet.addEventListener("close", () => {
  current = null;
  if (/^#[\w-]+$/.test(location.hash) && byId[location.hash.slice(1)]) {
    if (pushedHash) history.back();
    else history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
  pushedHash = false;
  els.sheet.innerHTML = "";
  renderList();
  renderChips();
});

// Entrée dans un champ ne doit pas recharger la page
document.addEventListener("submit", (e) => e.preventDefault());

els.sheet.addEventListener("input", (e) => {
  const field = e.target.closest("[data-key]");
  if (!field) return;
  setValue(field.dataset.key, field.value);
  field.closest(".field").classList.toggle("is-filled", !!field.value.trim());
  updateSheet();
  updateProfileBadge();
});

els.sheet.addEventListener("click", async (e) => {
  const t = e.target;
  if (t === els.sheet) return closeSheet(); // clic sur le fond
  if (t.closest("[data-close]")) return closeSheet();

  const open = t.closest("[data-open]");
  if (open) return openSheet(open.dataset.open, { push: false });

  const mark = t.closest("mark[data-key]");
  if (mark) {
    const field = els.sheet.querySelector(`#f-${mark.dataset.key}`);
    field?.focus();
    field?.scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }

  if (t.closest("[data-copy]")) {
    const { text, missing } = compile(current, currentValues(current));
    const ok = await copyText(text);
    if (!ok) return toast("Copie impossible : sélectionne le texte du prompt et copie-le.", { tone: "warn" });
    if (missing.length) toast(`Copié. ${missing.length} champ${missing.length > 1 ? "s restent" : " reste"} à compléter dans le texte.`, { tone: "warn" });
    else toast("Prompt copié. Colle-le dans ton IA.");
    return;
  }

  if (t.closest("[data-copy-relance]")) {
    if (await copyText(current.relance)) toast("Relance copiée.");
    return;
  }

  if (t.closest("[data-share]")) {
    const url = `${location.origin}${location.pathname}#${current.id}`;
    if (await copyText(url)) toast("Lien du prompt copié. Tes champs ne sont pas partagés.");
    return;
  }

  const target = t.closest("[data-target]");
  if (target?.dataset.tooLong) {
    // Trop long pour passer dans l'adresse : on copie, la page s'ouvre vide
    const { text } = compile(current, currentValues(current));
    await copyText(text);
    toast("Prompt long : il est copié. Colle-le dans la conversation qui s'ouvre.", { tone: "warn" });
  }
});

// ---------- Profil ----------

function renderProfileForm() {
  els.profileForm.innerHTML = PROFILE_KEYS.map((k) => fieldHtml(k, "pf")).join("");
}

function updateProfileBadge() {
  const filled = filledCount(PROFILE_KEYS);
  document.querySelectorAll("[data-profile-badge]").forEach((b) => {
    b.hidden = filled === PROFILE_KEYS.length;
    b.textContent = `${filled}/${PROFILE_KEYS.length}`;
  });
}

function openProfile() {
  renderProfileForm();
  if (els.sheet.open) closeSheet();
  els.profile.showModal();
}

els.profile.addEventListener("input", (e) => {
  const field = e.target.closest("[data-key]");
  if (!field) return;
  setValue(field.dataset.key, field.value);
  field.closest(".field").classList.toggle("is-filled", !!field.value.trim());
  updateProfileBadge();
});

els.profile.addEventListener("click", (e) => {
  if (e.target === els.profile || e.target.closest("[data-close]")) els.profile.close();
  if (e.target.closest("[data-clear]")) {
    if (!confirm("Effacer ton profil, tous les champs remplis et tes favoris de ce navigateur ?")) return;
    clearAll();
    renderProfileForm();
    updateProfileBadge();
    render();
    toast("Tes données sont effacées.");
  }
});

els.profile.addEventListener("close", () => {
  if (location.hash === "#profil") history.replaceState(null, "", `${location.pathname}${location.search}`);
});

// ---------- Événements de la liste ----------

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-open-profile]")) return openProfile();
  if (e.target.closest("dialog")) return;

  const chipMetier = e.target.closest("[data-metier]");
  if (chipMetier) {
    state.metier = chipMetier.dataset.metier || null;
    state.cat = null;
    render();
    scrollToResults();
    return;
  }
  const chipCat = e.target.closest("[data-cat]");
  if (chipCat) {
    state.cat = chipCat.dataset.cat || null;
    render();
    scrollToResults();
    return;
  }
  if (e.target.closest("[data-fav]")) {
    state.fav = !state.fav;
    render();
    scrollToResults();
    return;
  }
  if (e.target.closest("[data-reset]")) return resetFilters();

  const favBtn = e.target.closest("[data-fav-id]");
  if (favBtn) {
    const on = toggleFav(favBtn.dataset.favId);
    favBtn.setAttribute("aria-pressed", String(on));
    toast(on ? "Ajouté à tes favoris." : "Retiré de tes favoris.");
    if (state.fav) renderList();
    renderChips();
    return;
  }
  const open = e.target.closest("[data-open]");
  if (open) openSheet(open.dataset.open);
});

let searchTimer;
els.q.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.q = els.q.value;
    renderChips();
    renderList();
    syncUrl();
  }, 120);
});

document.addEventListener("keydown", (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if (e.key === "/" && !typing && !document.querySelector("dialog[open]")) {
    e.preventDefault();
    els.q.focus();
  }
});

function onHash() {
  const id = location.hash.slice(1);
  if (id === "profil") return openProfile();
  if (byId[id]) return openSheet(id, { push: false });
  closeSheet();
}

window.addEventListener("popstate", () => {
  pushedHash = false;
  onHash();
});

// La barre de filtres perd ses coins arrondis quand elle colle sous l'en-tête
window.addEventListener(
  "scroll",
  () => {
    const top = els.filters.getBoundingClientRect().top;
    els.filters.classList.toggle("is-stuck", top <= parseFloat(getComputedStyle(els.filters).top) + 1);
  },
  { passive: true },
);

// ---------- Démarrage ----------

$("[data-stats]").innerHTML = `<b>${PROMPTS.length}</b> prompts · <b>${METIERS.length}</b> métiers · <b>${PARCOURS.length}</b> parcours`;
els.q.value = state.q;
buildChips();
render();
updateProfileBadge();
initHeader();
initReveal();
if (location.hash) onHash();
