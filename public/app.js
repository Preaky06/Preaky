// Limpide — logique de l'interface (aucune dépendance).
import { SAMPLES } from "./samples.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

const MAX_IMAGES = 12;
const MAX_PDF_BYTES = 16 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2000;
const HISTORY_KEY = "limpide.history.v1";
const PREFS_KEY = "limpide.prefs.v1";

const state = {
  mode: "file",           // "file" | "text"
  files: [],              // { name, type, data (base64), preview (url|null), size }
  detail: "simple",
  lang: "fr",
  demo: false,
  abort: null,
  current: null,          // { id, result, demo, lang, at, checks: [] }
  docForChat: null,       // { files, text } — uniquement en mémoire
  chatHistory: [],
  chatBusy: false,
};

/* =========================================================== utilitaires */

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith("--")) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const storage = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
};

function toast(message, type = "") {
  const el = h("div", { class: `toast ${type}`, text: message });
  $("#toasts").append(el);
  setTimeout(() => { el.classList.add("out"); el.addEventListener("animationend", () => el.remove()); }, type === "err" ? 5200 : 2800);
}

async function copyText(text, label = "Copié") {
  try { await navigator.clipboard.writeText(text); toast(`${label} ✓`); }
  catch {
    const ta = h("textarea", { style: { position: "fixed", opacity: "0" } });
    ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand("copy"); toast(`${label} ✓`); } catch { toast("Copie impossible", "err"); }
    ta.remove();
  }
}

function downloadFile(name, content, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = h("a", { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function slug(s) {
  return (s || "document").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 50) || "document";
}

function parseDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysFromToday(date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

const fmtDate = (date) => date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

function countdownLabel(days) {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  if (days > 1) return `dans ${days} j`;
  if (days === -1) return "hier";
  return `il y a ${-days} j`;
}

function fmtMoney(amount, currency) {
  try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "EUR" }).format(amount); }
  catch { return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(amount)} ${currency || ""}`.trim(); }
}

function viewSwap(fn) {
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(fn);
  else fn();
}

/* ======================================================= thème & préférences */

function initTheme() {
  const prefs = storage.get(PREFS_KEY, {});
  if (prefs.theme) document.documentElement.dataset.theme = prefs.theme;
  $("#themeBtn").addEventListener("click", () => {
    const isDark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    viewSwap(() => { document.documentElement.dataset.theme = next; });
    storage.set(PREFS_KEY, { ...storage.get(PREFS_KEY, {}), theme: next });
  });
  if (prefs.lang) { state.lang = prefs.lang; $("#langSelect").value = prefs.lang; }
  if (prefs.detail) setDetail(prefs.detail);
  $("#langSelect").addEventListener("change", (e) => {
    state.lang = e.target.value;
    storage.set(PREFS_KEY, { ...storage.get(PREFS_KEY, {}), lang: state.lang });
  });
}

/* ================================================================ effets */

function initCursor() {
  if (!finePointer || reduceMotion) return;
  document.body.classList.add("has-cursor");
  const cursor = $(".cursor");
  let x = -100, y = -100, rx = -100, ry = -100;
  addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    cursor.style.setProperty("--cx", `${x}px`); cursor.style.setProperty("--cy", `${y}px`);
  }, { passive: true });
  addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  addEventListener("pointerup", () => cursor.classList.remove("is-down"));
  document.addEventListener("pointerover", (e) => {
    cursor.classList.toggle("is-hover", !!e.target.closest("a, button, label, summary, select, [data-magnetic], .flip"));
  });
  (function loop() {
    rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
    cursor.style.setProperty("--rx", `${rx}px`); cursor.style.setProperty("--ry", `${ry}px`);
    requestAnimationFrame(loop);
  })();
}

function initMagnetic(root = document) {
  if (!finePointer || reduceMotion) return;
  for (const el of $$("[data-magnetic]", root)) {
    if (el.dataset.magInit) continue;
    el.dataset.magInit = "1";
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.translate = `${dx * 0.22}px ${dy * 0.3}px`;
    });
    el.addEventListener("pointerleave", () => { el.style.translate = ""; });
    el.style.transition = (getComputedStyle(el).transition ? getComputedStyle(el).transition + ", " : "") + "translate 0.35s cubic-bezier(.34,1.56,.64,1)";
  }
}

function initTilt(root = document) {
  if (!finePointer || reduceMotion) return;
  for (const el of $$("[data-tilt]", root)) {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--tx", `${(-py * 7).toFixed(2)}deg`);
      el.style.setProperty("--ty", `${(px * 9).toFixed(2)}deg`);
    });
    el.addEventListener("pointerleave", () => { el.style.setProperty("--tx", "0deg"); el.style.setProperty("--ty", "0deg"); });
  }
}

function initReveal(root = document) {
  const items = $$(".reveal:not(.in)", root);
  if (!("IntersectionObserver" in window) || reduceMotion) { items.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  items.forEach((el) => io.observe(el));
}

function initTopbar() {
  const bar = $(".topbar");
  const onScroll = () => bar.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  $("#year").textContent = new Date().getFullYear();
}

// Loupe : révèle la version claire sous le pointeur. Se promène seule tant
// que personne n'y touche (et sur mobile).
function initLens() {
  const lens = $("#lensDemo");
  let manual = false, t = 0, raf = 0, idleTimer = 0;
  const set = (x, y) => { lens.style.setProperty("--x", `${x}px`); lens.style.setProperty("--y", `${y}px`); };
  const wander = () => {
    if (manual) return;
    const r = lens.getBoundingClientRect();
    t += reduceMotion ? 0 : 0.008;
    set(r.width * (0.5 + 0.33 * Math.sin(t * 1.3)), r.height * (0.5 + 0.28 * Math.sin(t * 2.1 + 1)));
    raf = requestAnimationFrame(wander);
  };
  const move = (e) => {
    const r = lens.getBoundingClientRect();
    manual = true; cancelAnimationFrame(raf); clearTimeout(idleTimer);
    set(e.clientX - r.left, e.clientY - r.top);
    idleTimer = setTimeout(() => { manual = false; wander(); }, 2500);
  };
  lens.addEventListener("pointermove", move);
  lens.addEventListener("pointerdown", move);
  const io = new IntersectionObserver(([en]) => {
    cancelAnimationFrame(raf);
    if (en.isIntersecting && !manual) wander();
  });
  io.observe(lens);
}

/* ============================================================ onglets */

function moveInk(container, active, ink) {
  const cr = container.getBoundingClientRect();
  const ar = active.getBoundingClientRect();
  ink.style.width = `${ar.width}px`;
  ink.style.transform = `translateX(${ar.left - cr.left - 4}px)`;
}

function initTabs() {
  const tabs = $(".tabs");
  const ink = $(".tab-ink", tabs);
  const select = (mode) => {
    state.mode = mode;
    $("#tabFile").setAttribute("aria-selected", mode === "file");
    $("#tabText").setAttribute("aria-selected", mode === "text");
    $("#panelFile").hidden = mode !== "file";
    $("#panelText").hidden = mode !== "text";
    moveInk(tabs, mode === "file" ? $("#tabFile") : $("#tabText"), ink);
    updateGo();
    if (mode === "text") $("#textInput").focus();
  };
  $("#tabFile").addEventListener("click", () => select("file"));
  $("#tabText").addEventListener("click", () => select("text"));
  tabs.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      select(state.mode === "file" ? "text" : "file");
      (state.mode === "file" ? $("#tabFile") : $("#tabText")).focus();
    }
  });
  state.selectTab = select;
  requestAnimationFrame(() => moveInk(tabs, $("#tabFile"), ink));

  const toggle = $(".toggle");
  $$("button", toggle).forEach((b) => b.addEventListener("click", () => {
    setDetail(b.dataset.detail);
    storage.set(PREFS_KEY, { ...storage.get(PREFS_KEY, {}), detail: state.detail });
  }));
  requestAnimationFrame(() => setDetail(state.detail));
  addEventListener("resize", () => {
    moveInk(tabs, state.mode === "file" ? $("#tabFile") : $("#tabText"), ink);
    setDetail(state.detail);
  });

  const ta = $("#textInput");
  ta.addEventListener("input", () => { $("#charCount").textContent = ta.value.length.toLocaleString("fr-FR"); updateGo(); });
}

function setDetail(detail) {
  state.detail = detail === "detailed" ? "detailed" : "simple";
  const toggle = $(".toggle");
  let active = null;
  $$("button", toggle).forEach((b) => {
    const on = b.dataset.detail === state.detail;
    b.setAttribute("aria-checked", on);
    if (on) active = b;
  });
  if (active) moveInk(toggle, active, $(".toggle-ink", toggle));
}

function updateGo() {
  const ready = state.mode === "file" ? state.files.length > 0 : $("#textInput").value.trim().length > 20;
  $("#analyzeBtn").disabled = !ready;
}

/* ========================================================== fichiers */

function readAsBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function decodeImage(file) {
  if ("createImageBitmap" in window) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* repli */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

// Redimensionne et convertit en JPEG : les photos de téléphone font souvent
// 4000 px, inutile pour la lecture et lourd à envoyer.
async function prepareImage(file) {
  const src = await decodeImage(file);
  const w = src.width, hgt = src.height;
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(w, hgt));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale); canvas.height = Math.round(hgt * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  src.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.86));
  if (!blob) throw new Error("conversion");
  return { name: file.name || "photo.jpg", type: "image/jpeg", data: await readAsBase64(blob), preview: URL.createObjectURL(blob), size: blob.size };
}

async function addFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  state.selectTab?.("file");
  for (const file of files) {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name);
    if (isPdf) {
      if (state.files.some((f) => f.type === "application/pdf")) { toast("Un seul PDF à la fois.", "err"); continue; }
      if (file.size > MAX_PDF_BYTES) { toast("PDF trop lourd (16 Mo max). Essayez de photographier les pages utiles.", "err"); continue; }
      state.files.push({ name: file.name, type: "application/pdf", data: await readAsBase64(file), preview: null, size: file.size });
    } else if (isImage) {
      if (state.files.filter((f) => f.type !== "application/pdf").length >= MAX_IMAGES) { toast(`${MAX_IMAGES} pages maximum.`, "err"); break; }
      try { state.files.push(await prepareImage(file)); }
      catch { toast(`Impossible de lire « ${file.name} ». Essayez en JPG ou PNG.`, "err"); }
    } else {
      toast(`« ${file.name} » : format non pris en charge.`, "err");
    }
  }
  renderThumbs();
  updateGo();
}

function renderThumbs() {
  const list = $("#thumbs");
  list.replaceChildren(...state.files.map((f, i) => h("li", { class: "thumb", style: { animationDelay: `${i * 60}ms` } },
    f.preview ? h("img", { src: f.preview, alt: `Page ${i + 1}` }) : h("div", { class: "pdf" }, h("b", { text: "PDF" }), f.name),
    h("span", { class: "n", text: `${i + 1}` }),
    h("button", { type: "button", "aria-label": `Retirer ${f.name}`, onclick: () => {
      if (f.preview) URL.revokeObjectURL(f.preview);
      state.files.splice(i, 1); renderThumbs(); updateGo();
    } }, "✕"),
  )));
}

function initIntake() {
  const input = $("#fileInput");
  input.addEventListener("change", () => { addFiles(input.files); input.value = ""; });
  const cam = $("#cameraInput");
  cam.addEventListener("change", () => { addFiles(cam.files); cam.value = ""; });

  // glisser-déposer sur toute la page
  const veil = $(".dropveil");
  const slot = $("#slot");
  let depth = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
  addEventListener("dragenter", (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; veil.classList.add("on"); slot.classList.add("is-over"); });
  addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
  addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) { veil.classList.remove("on"); slot.classList.remove("is-over"); } });
  addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); depth = 0; veil.classList.remove("on"); slot.classList.remove("is-over");
    if (!$("#viewHome").hidden) { addFiles(e.dataTransfer.files); $("#intake").scrollIntoView({ behavior: "smooth", block: "center" }); }
  });

  // coller une capture ou du texte
  addEventListener("paste", (e) => {
    if ($("#viewHome").hidden) return;
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(files); return; }
    const text = e.clipboardData?.getData("text") || "";
    if (text.length > 40 && document.activeElement?.id !== "textInput" && document.activeElement?.tagName !== "INPUT") {
      e.preventDefault();
      state.selectTab("text");
      $("#textInput").value = text;
      $("#textInput").dispatchEvent(new Event("input"));
    }
  });

  $("#sampleChips").replaceChildren(...SAMPLES.map((s) => h("button", {
    type: "button", class: "chip",
    onclick: () => {
      state.selectTab("text");
      $("#textInput").value = s.text();
      $("#textInput").dispatchEvent(new Event("input"));
      startAnalysis();
    },
  }, s.label)));

  $("#analyzeBtn").addEventListener("click", startAnalysis);
}

/* ============================================================== SSE */

async function postStream(url, body, onEvent, signal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let msg = "";
    try { msg = (await res.json()).error; } catch { /* corps non JSON */ }
    if (res.status === 413) msg ||= "Document trop volumineux.";
    throw new Error(msg || `Erreur serveur (${res.status}).`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx); buf = buf.slice(idx + 2);
      let event = "message", data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      let payload;
      try { payload = JSON.parse(data); } catch { continue; }
      onEvent(event, payload);
    }
  }
}

/* ============================================================ analyse */

const STAGES = {
  upload: ["Envoi sécurisé du document…"],
  thinking: ["Lecture ligne à ligne…", "Chasse au jargon…", "Repérage des dates limites…", "Vérification des montants…", "Recherche de vos recours…"],
  writing: ["Traduction en langage clair…", "Préparation de votre liste d'actions…", "Rédaction de la réponse…", "Derniers détails…"],
};

function buildScanDocs() {
  const wrap = $("#scanDocs");
  const docs = state.mode === "file" && state.files.length ? state.files.slice(0, 4) : [null];
  wrap.replaceChildren(...docs.map((f, i) => {
    const el = h("div", { class: "scan-doc", style: { "--rot": `${(i - (docs.length - 1) / 2) * 7}deg`, "--dx": `${(i - (docs.length - 1) / 2) * 18}px`, "--dy": `${-i * 6}px`, zIndex: String(10 + i), animationDelay: `${i * -1.3}s` } });
    if (f?.preview) el.append(h("img", { src: f.preview, alt: "" }));
    else {
      el.append(h("div", { class: "fake" }, Array.from({ length: 16 }, () => h("i"))));
      el.append(h("span", { class: "fake-label", text: f ? "PDF" : "TEXTE" }));
    }
    return el;
  }));
  const top = wrap.lastElementChild;
  top.append(h("div", { class: "scan-laser" }));
  return top;
}

function startScanner() {
  const scanner = $("#scanner");
  scanner.hidden = false;
  document.body.style.overflow = "hidden";
  const top = buildScanDocs();
  const stageEl = $("#scanStage");
  const thoughtsEl = $("#scanThoughts");
  thoughtsEl.replaceChildren(h("p"));
  let pct = 0, target = 4, phase = "upload", stageIdx = 0, thinkChars = 0;
  const started = Date.now();

  const setStage = (text) => {
    if (stageEl.textContent === text) return;
    stageEl.textContent = text;
    stageEl.classList.remove("swap"); void stageEl.offsetWidth; stageEl.classList.add("swap");
  };
  setStage(STAGES.upload[0]);

  const ring = $("#ringFg");
  const pctEl = $("#scanPct");
  const tick = setInterval(() => {
    // progression douce vers la cible, qui avance aussi avec le temps
    const elapsed = (Date.now() - started) / 1000;
    const timeFloor = Math.min(phase === "writing" ? 96 : 45, 4 + elapsed * (phase === "writing" ? 2.2 : 1.1));
    target = Math.max(target, timeFloor);
    pct += (Math.min(target, 99) - pct) * 0.12;
    ring.style.strokeDashoffset = String(326.7 * (1 - pct / 100));
    pctEl.textContent = Math.round(pct);
  }, 80);

  const stageTimer = setInterval(() => {
    const list = STAGES[phase];
    stageIdx = (stageIdx + 1) % list.length;
    setStage(list[stageIdx]);
  }, 3200);

  const hitTimer = setInterval(() => {
    if (reduceMotion) return;
    const hit = h("span", { class: "scan-hit", style: {
      left: `${6 + Math.random() * 40}%`, top: `${8 + Math.random() * 80}%`,
      width: `${20 + Math.random() * 45}%`, height: `${2 + Math.random() * 2.5}%`,
    } });
    top.append(hit);
    hit.addEventListener("animationend", () => hit.remove());
  }, 650);

  return {
    phase(p) {
      if (p === phase) return;
      phase = p; stageIdx = 0; setStage(STAGES[p][0]);
      if (p === "writing") target = Math.max(target, 50);
    },
    thinking(text) {
      thinkChars += text.length;
      target = Math.max(target, Math.min(48, 8 + Math.sqrt(thinkChars) * 0.9));
      let last = thoughtsEl.lastElementChild;
      last.textContent += text;
      if (/[.!?…:]\s*$/.test(last.textContent) && last.textContent.length > 60) {
        thoughtsEl.append(h("p"));
        while (thoughtsEl.children.length > 8) thoughtsEl.firstElementChild.remove();
      }
    },
    progress(chars) { target = Math.max(target, Math.min(97, 50 + (chars / 5200) * 47)); },
    async done() {
      target = 100; pct = 100;
      ring.style.strokeDashoffset = "0"; pctEl.textContent = "100";
      setStage("C'est limpide.");
      await new Promise((r) => setTimeout(r, reduceMotion ? 0 : 550));
      this.stop();
    },
    stop() {
      clearInterval(tick); clearInterval(stageTimer); clearInterval(hitTimer);
      scanner.hidden = true;
      document.body.style.overflow = "";
    },
  };
}

async function startAnalysis() {
  if (state.abort) return;
  const text = $("#textInput").value.trim();
  const useFiles = state.mode === "file";
  if (useFiles && !state.files.length) { toast("Ajoutez d'abord un document.", "err"); return; }
  if (!useFiles && text.length < 20) { toast("Le texte est trop court.", "err"); return; }

  const doc = useFiles
    ? { files: state.files.map(({ name, type, data }) => ({ name, type, data })), text: "" }
    : { files: [], text };

  const scanner = startScanner();
  const controller = new AbortController();
  state.abort = controller;
  $("#cancelBtn").onclick = () => controller.abort();

  let result = null, demo = state.demo, errorMsg = "";
  try {
    await postStream("/api/analyze", { ...doc, lang: state.lang, detail: state.detail }, (event, data) => {
      if (event === "phase") scanner.phase(data.phase);
      else if (event === "thinking") scanner.thinking(data.text);
      else if (event === "progress") scanner.progress(data.chars);
      else if (event === "result") { result = data.result; demo = !!data.demo; }
      else if (event === "error") errorMsg = data.message;
    }, controller.signal);
  } catch (err) {
    errorMsg = err.name === "AbortError" ? "" : (err.message || "Connexion interrompue.");
    if (err.name === "AbortError") { scanner.stop(); state.abort = null; toast("Analyse annulée."); return; }
  }
  state.abort = null;

  if (!result) {
    scanner.stop();
    toast(errorMsg || "L'analyse n'a pas abouti. Réessayez.", "err");
    return;
  }
  await scanner.done();

  const entry = { id: crypto.randomUUID?.() || String(Date.now()), at: Date.now(), result, demo, lang: state.lang, checks: [] };
  saveHistory(entry);
  state.docForChat = doc;
  showResult(entry);
}

/* ============================================================ résultat */

const URGENCY = {
  none: { label: "Rien à faire", angle: -67.5 },
  low: { label: "Pour info", angle: -22.5 },
  medium: { label: "À traiter", angle: 22.5 },
  high: { label: "Urgent", angle: 67.5 },
};

const CONTACT_ICONS = { phone: "☎", email: "@", address: "⌂", website: "↗", reference: "#", other: "•" };

function gauge(urgency, reason) {
  const u = URGENCY[urgency] || URGENCY.low;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 200 120");
  svg.setAttribute("aria-hidden", "true");
  const colors = ["var(--green)", "var(--blue)", "var(--orange)", "var(--red)"];
  const arc = (a0, a1) => {
    const p = (a) => [100 + 80 * Math.cos((a - 180) * Math.PI / 180), 100 + 80 * Math.sin((a - 180) * Math.PI / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A 80 80 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const track = document.createElementNS(NS, "path");
  track.setAttribute("d", arc(0, 180)); track.setAttribute("class", "g-track");
  svg.append(track);
  colors.forEach((c, i) => {
    const seg = document.createElementNS(NS, "path");
    seg.setAttribute("d", arc(i * 45 + 6, (i + 1) * 45 - 6));
    seg.setAttribute("class", "g-seg"); seg.style.stroke = c;
    svg.append(seg);
  });
  const needle = document.createElementNS(NS, "g");
  needle.setAttribute("class", "needle");
  const line = document.createElementNS(NS, "line");
  Object.entries({ x1: 100, y1: 100, x2: 100, y2: 34 }).forEach(([k, v]) => line.setAttribute(k, v));
  const hub = document.createElementNS(NS, "circle");
  Object.entries({ cx: 100, cy: 100, r: 9 }).forEach(([k, v]) => hub.setAttribute(k, v));
  needle.append(line, hub);
  svg.append(needle);
  requestAnimationFrame(() => requestAnimationFrame(() => { needle.style.transform = `rotate(${u.angle}deg)`; }));
  return h("div", { class: "gauge", role: "img", "aria-label": `Urgence : ${u.label}` },
    svg, h("span", { class: "gauge-label", text: u.label }), reason ? h("p", { class: "gauge-reason", text: reason, dir: "auto" }) : null);
}

function summaryWords(text, highlights) {
  const p = h("p", { class: "r-summary", dir: "auto" });
  const hl = new Set(highlights);
  // Les mots surlignés consécutifs forment un seul segment (« 247,40 € »).
  const groups = [];
  text.split(/\s+/).filter(Boolean).forEach((w, i) => {
    const last = groups[groups.length - 1];
    if (hl.has(i) && last?.hl && last.end === i - 1) { last.text += ` ${w}`; last.end = i; }
    else groups.push({ text: w, hl: hl.has(i), start: i, end: i });
  });
  for (const g of groups) {
    const delay = reduceMotion ? "0s" : `${0.25 + g.start * 0.035}s${g.hl ? `, ${0.6 + g.start * 0.035}s` : ""}`;
    p.append(h("span", { class: `w${g.hl ? " hlw" : ""}`, style: { animationDelay: delay }, text: g.text }), " ");
  }
  return p;
}

// Surligne les mots qui portent des chiffres (montants, délais, dates).
function pickHighlights(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  words.forEach((w, i) => {
    if (/\d/.test(w)) { out.push(i); if (/^[\d\s.,]+$/.test(w) && words[i + 1]) out.push(i + 1); }
  });
  return out;
}

function card(title, icon, cls, ...content) {
  const el = h("article", { class: `card ${cls || ""}`, "data-tilt": "" },
    h("h3", {}, h("span", { class: "ico", "aria-hidden": "true", text: icon }), title), ...content);
  el.addEventListener("animationend", (e) => { if (e.target === el) el.classList.add("settled"); });
  return el;
}

function list(items) {
  return items.length ? h("ul", { dir: "auto" }, items.map((t) => h("li", { text: t }))) : null;
}

function countUp(el, value, currency) {
  if (reduceMotion) { el.textContent = fmtMoney(value, currency); return; }
  const start = performance.now(), dur = 1400;
  const step = (now) => {
    const k = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - k, 4);
    el.textContent = fmtMoney(value * eased, currency);
    if (k < 1) requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); requestAnimationFrame(step); } });
  el.textContent = fmtMoney(0, currency);
  io.observe(el);
  // filet de sécurité si la carte n'entre jamais dans l'écran (impression, capture…)
  setTimeout(() => { io.disconnect(); if (el.textContent === fmtMoney(0, currency)) el.textContent = fmtMoney(value, currency); }, 4000);
}

function icsEscape(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsFold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 70) { out.push(rest.slice(0, 70)); rest = " " + rest.slice(70); }
  out.push(rest);
  return out.join("\r\n");
}

function buildIcs(result, items) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Limpide//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  items.forEach((it, i) => {
    const date = parseDate(it.date);
    if (!date) return;
    const next = new Date(date); next.setDate(next.getDate() + 1);
    const ymd = (x) => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${stamp}-${i}-${Math.random().toString(36).slice(2)}@limpide`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(date)}`,
      `DTEND;VALUE=DATE:${ymd(next)}`,
      icsFold(`SUMMARY:${icsEscape(`${it.label} — ${result.title}`)}`),
      icsFold(`DESCRIPTION:${icsEscape([it.consequence ? `Si oublié : ${it.consequence}` : "", result.issuer ? `Émetteur : ${result.issuer}` : "", "Rappel créé par Limpide."].filter(Boolean).join("\n"))}`),
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-P3D", icsFold(`DESCRIPTION:${icsEscape(it.label)}`), "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT12H", icsFold(`DESCRIPTION:${icsEscape(it.label)}`), "END:VALARM",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function calendarItems(r) {
  const seen = new Set();
  const items = [];
  for (const d of r.deadlines || []) if (parseDate(d.date) && !seen.has(d.date + d.label)) { seen.add(d.date + d.label); items.push(d); }
  for (const a of r.actions || []) if (parseDate(a.deadline) && ![...seen].some((k) => k.startsWith(a.deadline))) {
    seen.add(a.deadline + a.task); items.push({ date: a.deadline, label: a.task, consequence: "" });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

function renderResult(entry) {
  const r = entry.result;
  const root = $("#resultRoot");
  root.replaceChildren();
  const docDate = parseDate(r.document_date);

  // --- En-tête
  const meta = h("div", { class: "r-meta" },
    entry.demo ? h("span", { class: "tag demo", text: "Exemple fictif — mode démo" }) : null,
    r.document_type ? h("span", { class: "tag", text: r.document_type }) : null,
    r.issuer ? h("span", { class: "tag", dir: "auto", text: r.issuer }) : null,
    docDate ? h("span", { class: "tag", text: `Daté du ${docDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` }) : null,
  );
  root.append(h("section", { class: "r-hero" },
    h("div", {}, meta, h("h1", { class: "r-title", dir: "auto", text: r.title || "Votre document" }), summaryWords(r.plain_summary || "", pickHighlights(r.plain_summary || ""))),
    gauge(r.urgency, r.urgency_reason),
  ));

  const bento = h("div", { class: "bento" });
  const cards = [];

  // --- À faire
  const actions = r.actions || [];
  if (actions.length) {
    const bar = h("i");
    const updateBar = () => { bar.style.width = `${(entry.checks.filter(Boolean).length / actions.length) * 100}%`; };
    const todo = h("div", { class: "todo" }, actions.map((a, i) => {
      const due = parseDate(a.deadline);
      const days = due ? daysFromToday(due) : null;
      const input = h("input", { type: "checkbox", "aria-label": a.task });
      input.checked = !!entry.checks[i];
      input.addEventListener("change", () => {
        entry.checks[i] = input.checked; updateBar(); updateHistoryEntry(entry);
        if (input.checked && entry.checks.filter(Boolean).length === actions.length) toast("Tout est fait. Bravo ✨");
      });
      return h("label", { class: "todo-item" }, input,
        h("span", { class: "todo-box", "aria-hidden": "true" }, svgCheck()),
        h("span", { class: "todo-text", dir: "auto" },
          h("strong", { text: a.task }),
          a.detail ? h("span", { text: a.detail }) : null,
          due ? h("span", { class: `due${days < 0 ? " late" : ""}`, text: `${fmtDate(due)} · ${countdownLabel(days)}` }) : null));
    }));
    updateBar();
    cards.push(card("À faire", "✓", "accent span-7", todo, h("div", { class: "progress-bar", "aria-hidden": "true" }, bar)));
  }

  // --- Montants
  const amounts = (r.amounts || []).filter((a) => typeof a.amount === "number" && Number.isFinite(a.amount));
  if (amounts.length) {
    const dirLabel = { to_pay: "À payer", to_receive: "À recevoir", info: "Pour info" };
    cards.push(card("Montants", "€", actions.length ? "span-5" : "span-4", h("div", { class: "amounts" }, amounts.map((a) => {
      const v = h("span", { class: "amount-value" });
      countUp(v, a.amount, a.currency);
      return h("div", { class: `amount ${a.direction}` }, h("span", { class: "amount-dir", text: dirLabel[a.direction] || "" }), v, h("span", { class: "amount-label", dir: "auto", text: a.label }));
    }))));
  }

  // --- Dates clés
  const calItems = calendarItems(r);
  if ((r.deadlines || []).length) {
    const tl = h("div", { class: "timeline" }, (r.deadlines || []).filter((d) => parseDate(d.date)).sort((a, b) => a.date.localeCompare(b.date)).map((d) => {
      const date = parseDate(d.date);
      const days = daysFromToday(date);
      const cls = days < 0 ? "past" : days <= 7 ? "soon" : "";
      return h("div", { class: `tl-item ${cls}` },
        h("div", { class: "tl-top" }, h("span", { class: "tl-date", text: fmtDate(date) }), h("span", { class: `countdown ${cls}`, text: countdownLabel(days) })),
        h("span", { class: "tl-label", dir: "auto", text: d.label }),
        d.consequence ? h("span", { class: "tl-cons", dir: "auto", text: d.consequence }) : null);
    }));
    cards.push(card("Dates clés", "◷", "span-7", tl,
      calItems.length ? h("button", { type: "button", class: "mini-btn", onclick: () => {
        downloadFile(`limpide-${slug(r.title)}.ics`, buildIcs(r, calItems), "text/calendar;charset=utf-8");
        toast("Ouvrez le fichier pour l'ajouter à votre agenda");
      } }, "＋ Ajouter à mon agenda") : null));
  }

  // --- Ce qu'il faut retenir
  if ((r.key_points || []).length) cards.push(card("L'essentiel", "✳", "span-5", list(r.key_points)));

  // --- Attention
  if ((r.warnings || []).length) cards.push(card("Attention", "!", "warn span-6", list(r.warnings)));

  // --- Droits
  if ((r.rights || []).length) cards.push(card("Vos droits et options", "⚖", "span-6", list(r.rights)));

  // --- Glossaire
  if ((r.glossary || []).length) {
    cards.push(card("Mots compliqués — touchez pour traduire", "Aa", "span-12", h("div", { class: "gloss" }, r.glossary.map((g) => {
      const b = h("button", { type: "button", class: "flip", "aria-pressed": "false" },
        h("span", { class: "flip-inner" },
          h("span", { class: "flip-face flip-front" }, h("strong", { dir: "auto", text: g.term }), h("small", { text: "↻ retourner" })),
          h("span", { class: "flip-face flip-back", dir: "auto", text: g.definition })));
      b.addEventListener("click", () => { b.classList.toggle("on"); b.setAttribute("aria-pressed", b.classList.contains("on")); });
      return b;
    }))));
  }

  // --- Contacts & références
  if ((r.contacts || []).length) {
    cards.push(card("Contacts et références", "☎", "span-5", h("div", { class: "contacts" }, r.contacts.map((c) => {
      let valueEl;
      if (c.kind === "phone") valueEl = h("a", { href: `tel:${c.value.replace(/[^\d+]/g, "")}`, text: c.value });
      else if (c.kind === "email" && /@/.test(c.value)) valueEl = h("a", { href: `mailto:${c.value}`, text: c.value });
      else if (c.kind === "website") {
        const url = /^https?:\/\//i.test(c.value) ? c.value : `https://${c.value}`;
        valueEl = /^https?:\/\/[\w.-]+\.[a-z]{2,}/i.test(url) ? h("a", { href: url, target: "_blank", rel: "noopener noreferrer", text: c.value }) : h("span", { text: c.value });
      } else valueEl = h("span", { text: c.value });
      return h("div", { class: "contact" },
        h("span", { class: "contact-ico", "aria-hidden": "true", text: CONTACT_ICONS[c.kind] || "•" }),
        h("div", { class: "contact-body", dir: "auto" }, h("small", { text: c.label }), valueEl),
        h("button", { type: "button", class: "copy", onclick: () => copyText(c.value) }, "Copier"));
    }))));
  }

  // --- Réponse prête
  if (r.reply_draft?.needed && r.reply_draft.body) {
    const subject = h("input", { class: "letter-subject", type: "text", "aria-label": "Objet", dir: "auto" });
    subject.value = r.reply_draft.subject || "";
    const body = h("textarea", { "aria-label": "Courrier", dir: "auto", spellcheck: "true" });
    body.value = r.reply_draft.body;
    const email = (r.contacts || []).find((c) => c.kind === "email" && /@/.test(c.value))?.value || "";
    cards.push(card("Réponse prête à envoyer", "✉", (r.contacts || []).length ? "span-7" : "span-12",
      h("div", { class: "letter" }, subject, body),
      h("div", { class: "mini-row" },
        h("button", { type: "button", class: "mini-btn", onclick: () => copyText(`${subject.value}\n\n${body.value}`, "Courrier copié") }, "Copier"),
        h("button", { type: "button", class: "mini-btn", onclick: () => downloadFile(`courrier-${slug(r.title)}.txt`, `Objet : ${subject.value}\n\n${body.value}\n`) }, "Télécharger"),
        h("button", { type: "button", class: "mini-btn", onclick: () => {
          const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject.value)}&body=${encodeURIComponent(body.value)}`;
          location.href = href.length > 1900 ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject.value)}` : href;
          if (href.length > 1900) copyText(body.value, "Texte copié — collez-le dans l'e-mail");
        } }, email ? "Envoyer par e-mail" : "Ouvrir ma messagerie"))));
  }

  cards.forEach((c, i) => { c.style.setProperty("--i", i); bento.append(c); });
  root.append(bento);

  if (r.professional_advice) {
    root.append(h("div", { class: "pro", dir: "auto" }, h("span", { "aria-hidden": "true", text: "👤" }),
      h("div", {}, h("b", { text: "Un avis professionnel serait utile" }), r.professional_advice)));
  }
  if (r.readability && r.readability !== "good") {
    root.append(h("p", { class: "readability", text: r.readability === "poor"
      ? "Le document était difficile à lire : certaines informations peuvent manquer. Une photo plus nette, bien à plat et éclairée, donnera un meilleur résultat."
      : "Une partie du document était peu lisible : vérifiez les montants et dates importants sur l'original." }));
  }
  initTilt(root);
}

function svgCheck() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5");
  p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
  svg.append(p);
  return svg;
}

function showResult(entry) {
  state.current = entry;
  state.chatHistory = [];
  viewSwap(() => {
    $("#viewHome").hidden = true;
    $("#viewResult").hidden = false;
    document.body.classList.add("in-result");
    renderResult(entry);
    resetChat(entry);
    scrollTo({ top: 0, behavior: "instant" });
  });
  history.pushState({ view: "result", id: entry.id }, "", `#resultat`);
  document.title = `${entry.result.title || "Résultat"} — Limpide`;
}

function showHome(push = true) {
  viewSwap(() => {
    $("#viewResult").hidden = true;
    $("#viewHome").hidden = false;
    $("#chat").hidden = true;
    document.body.classList.remove("in-result");
    state.current = null;
    scrollTo({ top: 0, behavior: "instant" });
    initReveal();
  });
  if (push) history.pushState({ view: "home" }, "", location.pathname);
  document.title = "Limpide — la paperasse, en clair";
}

function resultAsText(r) {
  const out = [`# ${r.title}`, "", r.plain_summary, ""];
  const sec = (title, items) => { if (items?.length) out.push(`## ${title}`, ...items.map((i) => `- ${i}`), ""); };
  if (r.issuer) out.push(`Émetteur : ${r.issuer}`);
  out.push(`Urgence : ${(URGENCY[r.urgency] || URGENCY.low).label} — ${r.urgency_reason}`, "");
  sec("À faire", (r.actions || []).map((a) => `${a.task}${a.deadline ? ` (avant le ${a.deadline})` : ""}${a.detail ? ` — ${a.detail}` : ""}`));
  sec("Dates clés", (r.deadlines || []).map((d) => `${d.date} : ${d.label}${d.consequence ? ` — si oublié : ${d.consequence}` : ""}`));
  sec("Montants", (r.amounts || []).map((a) => `${a.label} : ${fmtMoney(a.amount, a.currency)}`));
  sec("L'essentiel", r.key_points);
  sec("Attention", r.warnings);
  sec("Vos droits et options", r.rights);
  sec("Lexique", (r.glossary || []).map((g) => `${g.term} : ${g.definition}`));
  sec("Contacts", (r.contacts || []).map((c) => `${c.label} : ${c.value}`));
  if (r.reply_draft?.needed && r.reply_draft.body) out.push("## Réponse proposée", `Objet : ${r.reply_draft.subject}`, "", r.reply_draft.body, "");
  if (r.professional_advice) out.push(`Conseil : ${r.professional_advice}`, "");
  out.push("—", "Analyse réalisée avec Limpide. Ne remplace pas un conseil professionnel.");
  return out.join("\n");
}

function initResultToolbar() {
  $("#backBtn").addEventListener("click", () => showHome());
  $("#printBtn").addEventListener("click", () => {
    $$(".card").forEach((c) => c.classList.add("settled"));
    print();
  });
  $("#downloadBtn").addEventListener("click", () => {
    const r = state.current?.result; if (!r) return;
    downloadFile(`limpide-${slug(r.title)}.md`, resultAsText(r), "text/markdown;charset=utf-8");
  });
  $("#shareBtn").addEventListener("click", async () => {
    const r = state.current?.result; if (!r) return;
    const text = resultAsText(r);
    if (navigator.share) {
      try { await navigator.share({ title: r.title, text }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    copyText(text, "Résumé copié");
  });
  addEventListener("popstate", (e) => {
    if (e.state?.view === "result") {
      const entry = loadHistory().find((x) => x.id === e.state.id);
      if (entry) { showResultNoPush(entry); return; }
    }
    if (!$("#viewResult").hidden) showHome(false);
  });
}

function showResultNoPush(entry) {
  state.current = entry;
  state.docForChat = null;
  viewSwap(() => {
    $("#viewHome").hidden = true; $("#viewResult").hidden = false;
    document.body.classList.add("in-result");
    renderResult(entry); resetChat(entry);
  });
}

/* ============================================================ historique */

function loadHistory() { return storage.get(HISTORY_KEY, []); }

function saveHistory(entry) {
  const list = [entry, ...loadHistory().filter((x) => x.id !== entry.id)].slice(0, 40);
  if (!storage.set(HISTORY_KEY, list)) storage.set(HISTORY_KEY, list.slice(0, 10));
  renderHistoryCount();
}

function updateHistoryEntry(entry) {
  const list = loadHistory();
  const i = list.findIndex((x) => x.id === entry.id);
  if (i !== -1) { list[i] = entry; storage.set(HISTORY_KEY, list); }
}

function renderHistoryCount() {
  const n = loadHistory().length;
  const badge = $("#historyCount");
  badge.hidden = !n; badge.textContent = n;
}

function renderHistory() {
  const ul = $("#historyList");
  const items = loadHistory();
  if (!items.length) {
    ul.replaceChildren(h("li", { class: "drawer-note", text: "Aucun document pour l'instant. Vos analyses apparaîtront ici." }));
    return;
  }
  ul.replaceChildren(...items.map((e, i) => h("li", { class: "history-item", style: { animationDelay: `${i * 40}ms` } },
    h("button", { type: "button", class: "history-open", onclick: () => {
      $("#historyDrawer").close();
      state.docForChat = null;
      showResult(e);
    } },
      h("strong", { dir: "auto" }, h("span", { class: `dot ${e.result.urgency}`, "aria-hidden": "true" }), e.result.title || "Document"),
      h("small", { text: `${new Date(e.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}${e.result.issuer ? ` · ${e.result.issuer}` : ""}${e.demo ? " · démo" : ""}` })),
    h("button", { type: "button", class: "history-del", "aria-label": `Supprimer ${e.result.title}`, onclick: () => {
      storage.set(HISTORY_KEY, loadHistory().filter((x) => x.id !== e.id));
      renderHistory(); renderHistoryCount();
    } }, "✕"),
  )));
}

function initHistory() {
  const drawer = $("#historyDrawer");
  $("#historyBtn").addEventListener("click", () => { renderHistory(); drawer.showModal(); });
  drawer.addEventListener("click", (e) => { if (e.target === drawer || e.target.closest("[data-close]")) drawer.close(); });
  $("#clearHistoryBtn").addEventListener("click", () => {
    if (!confirm("Effacer toutes vos analyses de ce navigateur ?")) return;
    storage.set(HISTORY_KEY, []); renderHistory(); renderHistoryCount(); toast("Historique effacé");
  });
  renderHistoryCount();
}

/* ================================================================ chat */

function mdLite(text) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const bullet = /^\s*([-*•]|\d+[.)])\s+/;
  let html = "", para = [], items = [];
  const flushPara = () => { if (para.length) html += `<p>${para.map(inline).join("<br>")}</p>`; para = []; };
  const flushList = () => { if (items.length) html += `<ul>${items.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`; items = []; };
  for (const line of esc.split("\n")) {
    if (!line.trim()) { flushPara(); flushList(); }
    else if (bullet.test(line)) { flushPara(); items.push(line.replace(bullet, "")); }
    else { flushList(); para.push(line); }
  }
  flushPara(); flushList();
  return html;
  function inline(s) { return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>"); }
}

function resetChat(entry) {
  const chat = $("#chat");
  chat.hidden = false;
  $("#chatPanel").hidden = true;
  $("#chatToggle").setAttribute("aria-expanded", "false");
  $("#chatLog").replaceChildren(h("div", { class: "msg bot", dir: "auto" },
    state.docForChat ? "Je garde le document sous la main. Demandez-moi n'importe quoi à son sujet." : "Je me base sur l'analyse enregistrée. Posez votre question."));
  renderSuggestions(entry.result.suggested_questions || []);
}

function renderSuggestions(qs) {
  $("#chatSuggest").replaceChildren(...qs.slice(0, 3).map((q) => h("button", { type: "button", dir: "auto", onclick: () => ask(q) }, q)));
}

async function ask(question) {
  question = question.trim();
  if (!question || state.chatBusy || !state.current) return;
  state.chatBusy = true;
  $("#chatSuggest").replaceChildren();
  const log = $("#chatLog");
  log.append(h("div", { class: "msg user", dir: "auto", text: question }));
  const bot = h("div", { class: "msg bot typing", dir: "auto" });
  log.append(bot);
  log.scrollTop = log.scrollHeight;
  let answer = "", errorMsg = "";
  try {
    const doc = state.docForChat || { files: [], text: "" };
    await postStream("/api/ask", {
      ...doc,
      analysis: state.current.result,
      history: state.chatHistory,
      question,
      lang: state.current.lang || state.lang,
    }, (event, data) => {
      if (event === "delta") {
        answer += data.text;
        bot.innerHTML = mdLite(answer);
        log.scrollTop = log.scrollHeight;
      } else if (event === "error") errorMsg = data.message;
    });
  } catch (err) { errorMsg = err.message || "Connexion interrompue."; }
  bot.classList.remove("typing");
  if (errorMsg && !answer) { bot.classList.add("err"); bot.textContent = errorMsg; }
  else {
    state.chatHistory.push({ role: "user", content: question }, { role: "assistant", content: answer });
  }
  state.chatBusy = false;
  log.scrollTop = log.scrollHeight;
}

function initChat() {
  const toggle = $("#chatToggle");
  toggle.addEventListener("click", () => {
    const open = $("#chatPanel").hidden;
    $("#chatPanel").hidden = !open;
    toggle.setAttribute("aria-expanded", open);
    if (open) $("#chatInput").focus();
  });
  $("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#chatInput");
    ask(input.value); input.value = "";
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#chatPanel").hidden) { $("#chatPanel").hidden = true; toggle.setAttribute("aria-expanded", "false"); }
  });
}

/* ================================================================ santé */

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    state.demo = !!data.demo;
    $(".demo-banner").hidden = !data.demo;
  } catch { /* hors ligne : on laissera l'erreur apparaître à l'analyse */ }
}

/* ================================================================ init */

function init() {
  initTheme();
  initTopbar();
  initCursor();
  initLens();
  initTabs();
  initIntake();
  initResultToolbar();
  initHistory();
  initChat();
  initReveal();
  initTilt();
  initMagnetic();
  checkHealth();
  history.replaceState({ view: "home" }, "", location.pathname);
}

init();
