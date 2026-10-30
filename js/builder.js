import { TYPES, TYPE_BY_ID, visibleQuestions } from "./data/types/index.js";
import { assemble, AUTO, DEFAULT_OPTS } from "./lib/kit.js";
import { detect, suggestFromIdea } from "./lib/detect.js";
import { loadDraft, saveDraft, clearDraft, loadHistory, saveToHistory, removeFromHistory, clearAll } from "./lib/store.js";
import { TARGETS, targetUrl, copyText, downloadText } from "./lib/share.js";
import { icon } from "./lib/icons.js";
import { initHeader, toast } from "./lib/ui.js";

const $ = (sel, root = document) => root.querySelector(sel);
const app = $("[data-app]");
const stage = $("[data-stage]");
const finePointer = window.matchMedia("(pointer: fine)").matches;
const MAX_IDEA = 240;

// Texte d'interface échappé, avec les espaces insécables de la typographie française
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fr = (s) => esc(s).replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ");

const OPTIONS_LABELS = {
  questions: "L'IA me pose ses questions si une information lui manque",
  variantes: "Demander 2 ou 3 versions différentes",
  explique: "Demander une courte explication de ses choix",
};

const INSPIRATIONS = ["histoire", "business", "apprendre", "poeme", "discours", "travail", "image", "decision"].map((id) => TYPE_BY_ID[id].exemples[0]);

// ---------- État ----------

function freshState() {
  return { idea: "", type: null, manualType: false, answers: {}, visited: {}, suggested: {}, step: "idee", qid: null, opts: { ...DEFAULT_OPTS }, historyId: null };
}

let state = freshState();

const params = new URLSearchParams(location.search);
if (params.has("idee") || params.has("type")) {
  state.idea = (params.get("idee") || "").slice(0, MAX_IDEA);
  const asked = TYPE_BY_ID[params.get("type")] ? params.get("type") : null;
  state.type = asked || (state.idea.trim() ? detect(state.idea).best : null);
  state.manualType = Boolean(asked);
  history.replaceState(null, "", location.pathname);
} else {
  const draft = loadDraft();
  if (draft && typeof draft === "object") state = { ...freshState(), ...draft };
  if (state.type && !TYPE_BY_ID[state.type]) state.type = null;
}

const typeObj = () => TYPE_BY_ID[state.type];
const answersOf = (id = state.type) => (state.answers[id] ||= {});
const visibleList = () => (typeObj() ? visibleQuestions(typeObj(), answersOf()) : []);

let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveDraft(state), 250);
}

// ---------- Prompt en direct ----------

function current() {
  if (!typeObj() || !state.idea.trim()) return null;
  return assemble(typeObj(), state.idea, answersOf(), state.opts);
}

function renderLive() {
  const out = current();
  document.querySelectorAll("[data-live]").forEach((el) => {
    el.innerHTML = out ? out.html : '<span style="opacity:.7">Ton prompt apparaîtra ici dès que tu auras écrit ton idée. Chaque réponse viendra le compléter.</span>';
  });
  const words = out ? out.text.split(/\s+/).filter(Boolean).length : 0;
  document.querySelectorAll("[data-live-meta]").forEach((el) => (el.textContent = out ? `${words} mots` : ""));
  $("[data-live-title]").textContent = state.step === "resultat" ? "Ton prompt complet" : "Ton prompt, en direct";
  if (state.step === "resultat") updateTargets(out);
}

// ---------- Étape 1 : l'idée ----------

function chipType(t) {
  return `<span class="chip-type" data-color="${t.couleur}"><span class="chip-type__icon">${icon(t.icon)}</span>${fr(t.nom)}</span>`;
}

function detectedHtml() {
  const t = typeObj();
  if (!t) {
    return `<div class="detected" data-color="violet"><span class="detected__icon">${icon("bulb")}</span><div><p class="detected__kicker">Type d'idée</p><p class="detected__text">Écris ton idée : on reconnaîtra tout seul de quoi il s'agit. Tu pourras toujours changer.</p></div></div>`;
  }
  return `
    <div class="detected" data-color="${t.couleur}">
      <span class="detected__icon">${icon(t.icon)}</span>
      <div>
        <p class="detected__kicker">${state.manualType ? "Type choisi" : "On dirait que tu veux"}</p>
        <p class="detected__name">${fr(t.nom)}</p>
        <p class="detected__text">${fr(t.description)}</p>
      </div>
    </div>`;
}

function renderIdea() {
  stage.innerHTML = `
    <p class="kicker">Étape 1 sur 3 · Ton idée</p>
    <h2 class="app__title">Décris ton <span class="hl">idée</span>.</h2>
    <p class="app__lead">En quelques mots. On te pose ensuite les questions qui comptent pour elle.</p>
    <div>
      <label class="sr-only" for="idea">Ton idée en quelques mots</label>
      <textarea id="idea" class="field-big" maxlength="${MAX_IDEA}" rows="2" placeholder="Ex. : un conte pour endormir ma fille de 5 ans">${esc(state.idea)}</textarea>
      <p class="field-meta"><span>Entrée pour continuer</span><span data-idea-count>${state.idea.length} / ${MAX_IDEA}</span></p>
    </div>
    <div class="examples">
      <span class="examples__label">Besoin d'inspiration ?</span>
      ${INSPIRATIONS.map((ex) => `<button class="chip" type="button" data-example="${esc(ex)}">${fr(ex)}</button>`).join("")}
    </div>
    <div data-detected>${detectedHtml()}</div>
    <div class="type-picker">
      <p>Ce n'est pas ça ? Choisis le type d'idée :</p>
      <div class="type-grid">
        ${TYPES.map((t) => `<button class="type-btn" type="button" data-color="${t.couleur}" data-type="${t.id}" aria-pressed="${state.type === t.id}"><span class="type-btn__icon">${icon(t.icon)}</span>${fr(t.nom)}</button>`).join("")}
      </div>
    </div>
    <div class="stage__foot">
      <span class="q-count" data-start-hint></span>
      <div class="stage__foot-right">
        <button class="btn btn--sun btn--lg" type="button" data-start>Répondre aux questions ${icon("arrow")}</button>
      </div>
    </div>`;
  const area = $("#idea");
  autoGrow(area);
  updateStart();
  if (finePointer) {
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  }
}

function updateStart() {
  const btn = $("[data-start]");
  if (!btn) return;
  const ready = state.idea.trim() && state.type;
  btn.disabled = !ready;
  const n = state.type ? visibleList().length : 0;
  $("[data-start-hint]").textContent = ready ? `${n} questions, la plupart en un clic` : "Écris ton idée pour commencer";
}

function refreshDetection() {
  if (!state.manualType) state.type = state.idea.trim() ? detect(state.idea).best : null;
  $("[data-detected]").innerHTML = detectedHtml();
  document.querySelectorAll("[data-type]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === state.type)));
  updateStart();
  renderLive();
  persist();
}

// ---------- Étape 2 : les questions ----------

function prepareQuestion(q) {
  const answers = answersOf();
  const key = `${state.type}.${q.id}`;
  if (state.visited[key]) return;
  state.visited[key] = true;
  if (answers[q.id] !== undefined) return;
  const suggestion = suggestFromIdea(q, state.idea);
  if (suggestion !== undefined && suggestion !== "") {
    answers[q.id] = suggestion;
    state.suggested[key] = true;
  }
}

function answerLabel(q, value) {
  if (value === AUTO) return "Laissé à l'IA";
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return "";
  if (q.options) return (Array.isArray(value) ? value : [value]).map((v) => q.options.find((o) => o.v === v)?.label ?? v).join(", ");
  return String(value);
}

function optionHtml(q, opt, index, selected) {
  const multi = q.type === "multi";
  const on = multi ? (selected || []).includes(opt.v) : selected === opt.v;
  const role = multi ? `aria-pressed="${on}"` : `role="radio" aria-checked="${on}"`;
  return `<button class="opt${multi ? " opt--multi" : ""}" type="button" data-opt="${esc(opt.v)}" ${role}>
      <span class="opt__mark">${icon("check")}</span><span>${fr(opt.label)}</span>${index < 9 ? `<span class="opt__key" aria-hidden="true">${index + 1}</span>` : ""}
    </button>`;
}

function answerHtml(q) {
  const value = answersOf()[q.id];
  const key = `${state.type}.${q.id}`;
  const auto = q.auto
    ? `<button class="opt opt--auto" type="button" data-auto ${q.type === "choice" ? `role="radio" aria-checked="${value === AUTO}"` : `aria-pressed="${value === AUTO}"`}>
         <span class="opt__mark">${icon("wand")}</span><span>Laisse l'IA décider</span>
       </button>`
    : "";

  if (q.type === "choice" || q.type === "multi") {
    const group = q.type === "choice" ? `role="radiogroup" aria-labelledby="q-label"` : `role="group" aria-labelledby="q-label"`;
    return `
      <div class="opts" ${group}>${q.options.map((o, i) => optionHtml(q, o, i, value)).join("")}${auto}</div>
      ${state.suggested[key] && value !== undefined ? `<p class="q-hint"><span>${icon("sparkle")} Pré-sélectionné d'après ton idée : tu peux changer.</span></p>` : ""}
      ${q.type === "multi" ? '<p class="q-hint"><span>Plusieurs choix possibles.</span></p>' : ""}`;
  }

  const isAuto = value === AUTO;
  const text = isAuto ? "" : value ?? "";
  const field =
    q.type === "long"
      ? `<textarea id="q-input" class="q-input" rows="4" aria-labelledby="q-label" ${isAuto ? "disabled" : ""}>${esc(text)}</textarea>`
      : `<textarea id="q-input" class="q-input q-input--line" rows="1" data-line aria-labelledby="q-label" ${isAuto ? "disabled" : ""}>${esc(text)}</textarea>`;
  return `
    <div>
      ${field}
      <p class="q-hint">
        <span>${state.suggested[key] && !isAuto ? "Pré-rempli d'après ton idée : modifie-le librement." : q.type === "long" ? "Ctrl + Entrée pour valider" : "Entrée pour valider"}</span>
      </p>
    </div>
    ${q.auto ? `<div class="opts">${auto}</div>` : ""}
    ${
      q.suggestions?.length
        ? `<div class="suggest"><p>${q.type === "long" ? "Idées à ajouter :" : "Idées de réponse :"}</p><div class="suggest__list">${q.suggestions
            .map((s) => `<button class="chip" type="button" data-suggest="${esc(s)}">${icon("plus")}${fr(s)}</button>`)
            .join("")}</div></div>`
        : ""
    }`;
}

function renderQuestion({ focus = true } = {}) {
  const list = visibleList();
  let q = list.find((x) => x.id === state.qid);
  if (!q) {
    q = list[0];
    state.qid = q?.id;
  }
  if (!q) return goResult();
  prepareQuestion(q);
  const index = list.indexOf(q);
  const t = typeObj();
  const last = index === list.length - 1;

  stage.innerHTML = `
    <div class="q-top">
      <button class="link-btn" type="button" data-goto-idea>${icon("left")}Modifier mon idée</button>
      ${chipType(t)}
      <span class="q-count">Question ${index + 1} sur ${list.length}</span>
    </div>
    <div class="progress" aria-hidden="true"><span style="--p:${Math.round(((index + 1) / (list.length + 1)) * 100)}%"></span></div>
    <p class="q-idea">${icon("bulb")}<span>Ton idée : <b>« ${fr(state.idea.trim())} »</b></span></p>
    <div>
      <h2 class="q-label" id="q-label" tabindex="-1">${fr(q.label)}${q.optional ? ' <span class="tag">Facultatif</span>' : ""}</h2>
      <p class="q-why">${icon("bulb")}<span><b>Pourquoi cette question ?</b> ${fr(q.pourquoi)}</span></p>
    </div>
    <div class="q-answer">${answerHtml(q)}</div>
    <div class="stage__foot">
      <button class="btn btn--ghost" type="button" data-prev>${icon("left")}${index === 0 ? "Mon idée" : "Précédente"}</button>
      <div class="stage__foot-right">
        <button class="link-btn" type="button" data-skip>Passer</button>
        <button class="btn ${last ? "btn--sun" : "btn--violet"} btn--lg" type="button" data-next>${last ? "Voir mon prompt" : "Suivante"} ${icon("arrow")}</button>
      </div>
    </div>
    ${last ? "" : `<p class="q-hint"><button class="link-btn" type="button" data-finish>${icon("eye")}Voir le prompt maintenant</button><span>Touches 1 à 9 pour choisir une réponse</span></p>`}`;

  const input = $("#q-input");
  if (input) autoGrow(input);
  if (!focus) return;
  if (input && !input.disabled && finePointer) input.focus();
  else $("#q-label").focus({ preventScroll: true });
  if (stage.getBoundingClientRect().top < 0) stage.scrollIntoView({ block: "start" });
}

function currentQuestion() {
  return visibleList().find((q) => q.id === state.qid);
}

function setAnswer(q, value) {
  const answers = answersOf();
  const key = `${state.type}.${q.id}`;
  delete state.suggested[key];
  if (value === undefined || value === "" || (Array.isArray(value) && !value.length)) delete answers[q.id];
  else answers[q.id] = value;
  renderLive();
  persist();
}

function next() {
  const list = visibleList();
  const i = list.findIndex((q) => q.id === state.qid);
  if (i < list.length - 1) {
    state.qid = list[i + 1].id;
    renderQuestion();
  } else goResult();
  persist();
}

function prev() {
  const list = visibleList();
  const i = list.findIndex((q) => q.id === state.qid);
  if (i > 0) {
    state.qid = list[i - 1].id;
    go("questions");
  } else go("idee");
}

// ---------- Étape 3 : le résultat ----------

function goResult() {
  state.step = "resultat";
  state.historyId ||= `p${Date.now().toString(36)}`;
  render();
  record();
}

function record() {
  if (!typeObj() || !state.idea.trim()) return;
  saveToHistory({ id: state.historyId, date: Date.now(), idea: state.idea.trim(), type: state.type, answers: answersOf(), opts: state.opts });
  updateHistoryCount();
}

function summaryHtml() {
  const t = typeObj();
  const items = visibleList().map((q) => {
    const label = answerLabel(q, answersOf()[q.id]);
    return `
      <div class="summary__item">
        <span class="summary__q">${fr(q.label)}</span>
        <span class="summary__a${label ? "" : " is-empty"}">${label ? fr(label) : "Pas de réponse"}</span>
        <button class="btn btn--ghost btn--sm summary__edit" type="button" data-edit="${q.id}" aria-label="Modifier la réponse : ${esc(q.label)}">${icon("edit")}</button>
      </div>`;
  });
  return `
    <div class="summary__item">
      <span class="summary__q">Ton idée · ${fr(t.nom)}</span>
      <span class="summary__a">${fr(state.idea.trim())}</span>
      <button class="btn btn--ghost btn--sm summary__edit" type="button" data-goto-idea aria-label="Modifier mon idée">${icon("edit")}</button>
    </div>
    ${items.join("")}`;
}

function renderResult() {
  const out = current();
  stage.innerHTML = `
    <p class="kicker">Étape 3 sur 3 · Ton prompt</p>
    <h2 class="app__title" tabindex="-1" id="result-title">Ton prompt est <span class="hl">prêt</span>.</h2>
    <p class="app__lead">Copie-le dans ton IA, ou ouvre-le directement. Il est aussi enregistré dans « Mes prompts », sur cet appareil.</p>
    <div class="actions">
      <button class="btn btn--sun btn--lg" type="button" data-copy>${icon("copy")}Copier le prompt</button>
      <a class="btn btn--ghost btn--lg" data-target="claude" target="_blank" rel="noopener">${icon("external")}Ouvrir dans ${TARGETS.claude.nom}</a>
      <a class="btn btn--ghost btn--lg" data-target="chatgpt" target="_blank" rel="noopener">${icon("external")}Ouvrir dans ${TARGETS.chatgpt.nom}</a>
      <button class="btn btn--ghost btn--lg btn--icon" type="button" data-download aria-label="Télécharger le prompt en fichier texte">${icon("download")}</button>
    </div>
    <div>
      <h2 class="block-title">${icon("sliders")}Affiner le prompt</h2>
      <div class="switches">
        ${Object.entries(OPTIONS_LABELS)
          .map(([k, label]) => `<button class="switch" type="button" role="switch" aria-checked="${Boolean(state.opts[k])}" data-switch="${k}"><span class="switch__track"></span>${fr(label)}</button>`)
          .join("")}
      </div>
    </div>
    <div>
      <h2 class="block-title">${icon("edit")}Tes réponses</h2>
      <div class="summary">${summaryHtml()}</div>
    </div>
    <div>
      <h2 class="block-title">${icon("refresh")}Pour aller plus loin, après la réponse de l'IA</h2>
      <div class="relances">
        ${(out?.relances || [])
          .map((r, i) => `<div class="relance"><span>${fr(r)}</span><button class="btn btn--ghost btn--sm" type="button" data-relance="${i}" aria-label="Copier cette relance">${icon("copy")}</button></div>`)
          .join("")}
      </div>
    </div>
    <div class="stage__foot">
      <button class="btn btn--ghost" type="button" data-prev>${icon("left")}Revenir aux questions</button>
      <div class="stage__foot-right">
        <button class="btn btn--ink" type="button" data-restart>${icon("plus")}Nouvelle idée</button>
      </div>
    </div>`;
  updateTargets(out);
  $("#result-title").focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function updateTargets(out) {
  document.querySelectorAll("[data-target]").forEach((a) => {
    if (!out) return;
    const { url, tooLong } = targetUrl(a.dataset.target, out.text);
    a.href = url;
    a.dataset.tooLong = tooLong ? "1" : "";
  });
}

// ---------- Rendu général ----------

function go(step) {
  state.step = step;
  render();
  persist();
}

function render() {
  if (state.step !== "idee" && (!typeObj() || !state.idea.trim())) state.step = "idee";
  app.dataset.step = state.step;
  if (state.step === "idee") renderIdea();
  else if (state.step === "questions") renderQuestion();
  else renderResult();
  renderLive();
}

function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 4}px`;
}

function restart() {
  if (state.step === "questions" && Object.keys(answersOf()).length && !confirm("Recommencer avec une nouvelle idée ? Tes réponses en cours seront perdues.")) return;
  state = freshState();
  clearDraft();
  render();
}

// ---------- Événements ----------

stage.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "idea") {
    state.idea = t.value.slice(0, MAX_IDEA);
    $("[data-idea-count]").textContent = `${state.idea.length} / ${MAX_IDEA}`;
    autoGrow(t);
    clearTimeout(refreshDetection.timer);
    refreshDetection.timer = setTimeout(refreshDetection, 140);
    return;
  }
  if (t.id === "q-input") {
    // réponse courte : une seule ligne logique, même après un collage
    if (t.hasAttribute("data-line") && t.value.includes("\n")) t.value = t.value.replace(/\s*\n\s*/g, " ");
    autoGrow(t);
    setAnswer(currentQuestion(), t.value);
    const hint = stage.querySelector(".q-hint span");
    if (hint && hint.textContent.startsWith("Pré-rempli")) hint.textContent = currentQuestion().type === "long" ? "Ctrl + Entrée pour valider" : "Entrée pour valider";
  }
});

stage.addEventListener("keydown", (e) => {
  const t = e.target;
  if (t.id === "idea" && e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!$("[data-start]").disabled) $("[data-start]").click();
    return;
  }
  if (t.id === "q-input" && e.key === "Enter" && (t.hasAttribute("data-line") || e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    next();
  }
});

stage.addEventListener("click", async (e) => {
  const el = e.target.closest("button, a");
  if (!el) return;

  if (el.dataset.example !== undefined) {
    state.idea = el.dataset.example;
    state.manualType = false;
    const area = $("#idea");
    area.value = state.idea;
    autoGrow(area);
    $("[data-idea-count]").textContent = `${state.idea.length} / ${MAX_IDEA}`;
    refreshDetection();
    return;
  }
  if (el.dataset.type) {
    state.type = el.dataset.type;
    state.manualType = true;
    refreshDetection();
    return;
  }
  if (el.hasAttribute("data-start")) {
    state.step = "questions";
    state.qid = visibleList()[0]?.id;
    render();
    persist();
    return;
  }
  if (el.hasAttribute("data-goto-idea")) return go("idee");
  if (el.hasAttribute("data-prev")) return state.step === "resultat" ? go("questions") : prev();
  if (el.hasAttribute("data-next")) return next();
  if (el.hasAttribute("data-finish")) return goResult();
  if (el.hasAttribute("data-restart")) return restart();
  if (el.hasAttribute("data-skip")) {
    setAnswer(currentQuestion(), undefined);
    return next();
  }

  const q = currentQuestion();
  if (el.dataset.opt !== undefined && q) {
    if (q.type === "multi") {
      const value = Array.isArray(answersOf()[q.id]) ? [...answersOf()[q.id]] : [];
      const i = value.indexOf(el.dataset.opt);
      if (i === -1) value.push(el.dataset.opt);
      else value.splice(i, 1);
      setAnswer(q, value);
      renderQuestion({ focus: false });
      stage.querySelector(`[data-opt="${CSS.escape(el.dataset.opt)}"]`)?.focus();
    } else {
      setAnswer(q, el.dataset.opt);
      renderQuestion({ focus: false });
      setTimeout(next, 260);
    }
    return;
  }
  if (el.hasAttribute("data-auto") && q) {
    // « Laisse l'IA décider » vaut réponse : on passe à la suite ; un second clic l'annule
    const on = answersOf()[q.id] === AUTO;
    setAnswer(q, on ? undefined : AUTO);
    renderQuestion({ focus: on });
    if (!on) setTimeout(next, 260);
    return;
  }
  if (el.dataset.suggest !== undefined && q) {
    const input = $("#q-input");
    const currentValue = answersOf()[q.id] === AUTO ? "" : input.value.trim();
    const value = q.type === "long" && currentValue ? `${currentValue}\n${el.dataset.suggest}` : el.dataset.suggest;
    setAnswer(q, value);
    renderQuestion({ focus: false });
    const field = $("#q-input");
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    return;
  }

  if (el.dataset.edit) {
    state.qid = el.dataset.edit;
    return go("questions");
  }
  if (el.dataset.switch) {
    state.opts[el.dataset.switch] = !state.opts[el.dataset.switch];
    el.setAttribute("aria-checked", String(state.opts[el.dataset.switch]));
    renderLive();
    record();
    persist();
    return;
  }
  if (el.hasAttribute("data-copy")) {
    const out = current();
    if (await copyText(out.text)) toast("Prompt copié. Colle-le dans ton IA.");
    else toast("Copie impossible : sélectionne le texte du prompt et copie-le.", { tone: "warn" });
    return;
  }
  if (el.dataset.relance !== undefined) {
    const out = current();
    if (await copyText(out.relances[Number(el.dataset.relance)])) toast("Relance copiée.");
    return;
  }
  if (el.hasAttribute("data-download")) {
    const slug = state.idea.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    downloadText(`prompt-${slug || "promptoir"}.txt`, current().text);
    return;
  }
  if (el.dataset.target && el.dataset.tooLong) {
    // Trop long pour passer dans l'adresse : on copie, la page s'ouvre vide
    await copyText(current().text);
    toast("Prompt long : il est copié. Colle-le dans la conversation qui s'ouvre.", { tone: "warn" });
  }
});

// Touches 1 à 9 : choisir une réponse
document.addEventListener("keydown", (e) => {
  if (state.step !== "questions" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName) || document.querySelector("dialog[open]")) return;
  const n = Number(e.key);
  if (!n) return;
  const btn = stage.querySelectorAll(".opts [data-opt]")[n - 1];
  if (btn) {
    e.preventDefault();
    btn.click();
  }
});

// ---------- Aperçu mobile et historique ----------

const preview = $("#apercu");
const historyDialog = $("#historique");

$("[data-peek]").addEventListener("click", () => {
  renderLive();
  preview.showModal();
});

function updateHistoryCount() {
  const n = loadHistory().length;
  const badge = $("[data-history-count]");
  badge.hidden = n === 0;
  badge.textContent = n;
}

function renderHistory() {
  const list = loadHistory();
  const root = $("[data-history-list]");
  if (!list.length) {
    root.innerHTML = '<p class="empty">Aucun prompt pour l\'instant. Ils apparaîtront ici dès que tu en auras terminé un.</p>';
    return;
  }
  root.innerHTML = list
    .map((entry) => {
      const t = TYPE_BY_ID[entry.type];
      if (!t) return "";
      const date = new Date(entry.date).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      return `
        <article class="hist__item">
          ${chipType(t)}
          <p class="hist__idea">${fr(entry.idea)}</p>
          <p class="hist__date">${date}</p>
          <div class="hist__actions">
            <button class="btn btn--ink btn--sm" type="button" data-open="${entry.id}">${icon("eye")}Ouvrir</button>
            <button class="btn btn--ghost btn--sm" type="button" data-remove="${entry.id}">${icon("trash")}Supprimer</button>
          </div>
        </article>`;
    })
    .join("");
}

$("[data-open-history]").addEventListener("click", () => {
  renderHistory();
  historyDialog.showModal();
});

for (const dialog of [preview, historyDialog]) {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.closest("[data-close]")) dialog.close();
  });
}

historyDialog.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  const remove = e.target.closest("[data-remove]");
  if (open) {
    const entry = loadHistory().find((x) => x.id === open.dataset.open);
    if (!entry) return;
    state = { ...freshState(), idea: entry.idea, type: entry.type, manualType: true, answers: { [entry.type]: entry.answers }, opts: { ...DEFAULT_OPTS, ...entry.opts }, historyId: entry.id, step: "resultat" };
    historyDialog.close();
    render();
    persist();
  }
  if (remove) {
    removeFromHistory(remove.dataset.remove);
    if (state.historyId === remove.dataset.remove) state.historyId = null;
    renderHistory();
    updateHistoryCount();
  }
  if (e.target.closest("[data-clear-all]")) {
    if (!confirm("Effacer tous tes prompts enregistrés et ton brouillon de ce navigateur ?")) return;
    clearAll();
    renderHistory();
    updateHistoryCount();
    toast("Tout est effacé.");
  }
});

document.querySelector(".header [data-restart]").addEventListener("click", restart);

// ---------- Démarrage ----------

initHeader();
updateHistoryCount();
render();
