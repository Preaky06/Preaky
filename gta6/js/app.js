/* ==========================================================================
   Grand Theft News 6 — logique du site (vanilla JS + Leaflet pour la carte)
   ========================================================================== */
(() => {
  "use strict";

  /* ---------------------------------------------------------------- état */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  };
  const navLang = (navigator.language || "fr").slice(0, 2);
  const state = {
    lang: store.get("gtn6-lang", ["fr", "en", "es"].includes(navLang) ? navLang : "fr"),
    platform: store.get("gtn6-platform", "ps"),
    found: new Set(store.get("gtn6-found", [])),
    view: null,
    homeScroll: 0,
    enteredVia: null,
    modalFromPage: false,
    map: null,
    markers: {}
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $("#app");

  /* -------------------------------------------------------------- helpers */
  const t = (v) => (v == null ? "" : typeof v === "string" ? v : (v[state.lang] ?? v.en ?? v.fr ?? ""));
  const ui = (k) => UI[state.lang][k] ?? UI.fr[k] ?? k;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cat = (id) => CATEGORIES.find((c) => c.id === id);
  const catName = (id) => UI[state.lang].cat[id][0];
  const catDesc = (id) => UI[state.lang].cat[id][1];
  const regionName = (k) => t(REGIONS[k] ? REGIONS[k].name : k);
  const gradVars = (g) => `--c1:${g[0]};--c2:${g[1]}`;
  const arrowsText = (code) => code.split("").map((d) => ({ U: "↑", D: "↓", L: "←", R: "→" }[d])).join(" ");
  const fid = (c, id) => c + ":" + id;
  const saveFound = () => store.set("gtn6-found", Array.from(state.found));
  const itemName = (it) => t(it.nameL || it.name);

  /* Photos (gtadb.org, CC BY 4.0) et géolocalisation */
  const photoUrl = (key, small) => `img/photos/${key}${small ? "-s" : ""}.jpg`;
  const photoKey = (c, id) => ITEM_PHOTO[`${c}:${id}`];
  const geoOf = (c, id) => GEO[`${c}:${id}`];
  const minimapUrl = (c, id) => `img/minimap/${c}-${id}.jpg`;
  const toMap = (xy) => [(xy[0] - MAPIMG.X0) / MAPIMG.S, (MAPIMG.Y0 - xy[1]) / MAPIMG.S];
  const ISLAND = { x: 80, y: 330, w: 1210, h: 1780 };   // cadrage de l'île dans la carte
  const photoCap = (key) => PHOTOS[key] ? `<span class="photo-cap">${esc(ui("photo"))} : ${esc(PHOTOS[key].cap)}</span>` : "";

  /* Titres tracés avec la police Pricedown (voir tools/wordart.py) */
  let waId = 0;
  function wordart(key, cls = "", label) {
    const w = WORDART[key];
    if (!w) return `<span class="${cls}">${esc(label || key)}</span>`;
    const p = w.vb.split(" ").map(Number);
    return `<svg class="wa ${cls}" viewBox="${w.vb}" style="--ar:${(p[2] / p[3]).toFixed(4)}" role="img" aria-label="${esc(label || w.t)}"><path d="${w.d}"/></svg>`;
  }
  function six(cls = "") {
    const w = WORDART.six, p = w.vb.split(" ").map(Number), id = "vi" + (++waId);
    return `<svg class="wa wa--six ${cls}" viewBox="${w.vb}" style="--ar:${(p[2] / p[3]).toFixed(4)}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd36e"/><stop offset=".3" stop-color="#ff9a5c"/><stop offset=".58" stop-color="#ff4fa3"/><stop offset=".85" stop-color="#b44cff"/><stop offset="1" stop-color="#5c6bff"/></linearGradient></defs><path d="${w.d}" style="fill:url(#${id})"/></svg>`;
  }
  const catWA = (id, cls) => wordart(`cat:${state.lang}:${id}`, cls, catName(id));

  function stars(conf, plain) {
    const n = conf === "ok" ? 3 : conf === "mixed" ? 2 : 1;
    const row = [0, 1, 2].map((i) => `<span class="ico${i < n ? " on" : ""}">${ICON.star}</span>`).join("");
    return `<span class="stars stars--${conf}${plain ? " stars--plain" : ""}" title="${esc(ui("reliability"))} : ${esc(ui("conf_" + conf))}"><span class="stars__row">${row}</span>${esc(ui("conf_" + conf))}</span>`;
  }
  function regionTag(k, glass) {
    if (!k || !REGIONS[k]) return "";
    return `<span class="rtag${glass ? " rtag--glass" : ""}" style="--rc:${REGIONS[k].color}">${esc(regionName(k))}</span>`;
  }
  function blip(c, approx) {
    return `<span class="blip${approx ? " blip--approx" : ""}" style="--bc:${cat(c).grad[1]}"><span class="ico">${ICON[cat(c).icon]}</span></span>`;
  }
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 1800);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
      ta.select(); try { document.execCommand("copy"); } catch (_) { /* rien */ } ta.remove();
    }
    toast(ui("copied") + " " + text);
  }

  /* Apparition progressive au scroll */
  let io = null;
  function reveal(root = document) {
    const els = $$(".reveal:not(.in)", root);
    if (reduced || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    if (!io) io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    els.forEach((e) => io.observe(e));
  }

  /* -------------------------------------------------------- données liées */
  const DATASETS = { cars: () => CARS.items, eggs: () => EGGS.items, money: () => MONEY.stashes, safes: () => SAFES.items, cheats: () => CHEATS.items };
  const TRACKED = ["cars", "eggs", "money", "safes"];
  function findItem(c, id) { const ds = DATASETS[c]; return ds ? ds().find((x) => x.id === id) : null; }
  function allPins() {
    const out = [];
    TRACKED.forEach((c) => DATASETS[c]().forEach((it) => { const g = geoOf(c, it.id); if (g) out.push({ c, it, g }); }));
    return out;
  }
  function progress() {
    let total = 0, done = 0;
    TRACKED.forEach((c) => DATASETS[c]().forEach((it) => { total++; if (state.found.has(fid(c, it.id))) done++; }));
    return { total, done };
  }
  function countFor(id) {
    switch (id) {
      case "map": return `${allPins().length} ${ui("locations")}`;
      case "cheats": return `${CHEATS.stats.total} cheats`;
      case "cars": return `${CARS.items.length} ${ui("items")}`;
      case "eggs": return `${EGGS.items.length} ${ui("items")}`;
      case "money": return `${MONEY.stashes.length + MONEY.methods.length} ${ui("items")}`;
      case "safes": return `${SAFES.items.length} codes`;
      case "hundred": return `${HUNDRED.items.length} ${ui("items")}`;
      case "tips": return `${TIPS.items.length} ${ui("items")}`;
      case "people": return `${PEOPLE.main.length + PEOPLE.cast.length + PEOPLE.contacts.length} ${ui("items")}`;
    }
    return "";
  }

  /* Niveau de recherche (étoiles) = progression du joueur */
  function paintWanted(bump) {
    const { total, done } = progress();
    const n = done === 0 ? 0 : Math.max(1, Math.ceil((done / total) * 5));
    const el = $("#wanted");
    el.innerHTML = [0, 1, 2, 3, 4].map((i) => `<span class="ico${i < n ? " on" : ""}">${ICON.star}</span>`).join("");
    el.setAttribute("aria-label", `${ui("wanted")} : ${done}/${total}`);
    el.title = `${ui("wanted")} : ${done}/${total}`;
    if (bump && !reduced) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }
  function missionPassed(name) {
    if (reduced) return;
    const { total, done } = progress();
    const el = document.createElement("div");
    el.className = "passed";
    el.innerHTML = `<div class="passed__band"><div class="passed__title">${wordart("passed:" + state.lang, "", ui("missionPassed"))}</div><div class="passed__sub">${esc(name)} · ${done}/${total}</div></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  /* ================================================================ ACCUEIL */
  const PALM = `<svg viewBox="0 0 200 300" fill="currentColor" aria-hidden="true"><path d="M94 300C92 240 88 180 99 112h10c-9 68-5 128-1 188z"/><path d="M104 110C70 80 30 85 0 110c35-15 70-12 104 6z"/><path d="M104 110C80 60 50 45 15 50c35 10 63 30 89 66z"/><path d="M104 110c6-50 36-75 71-80-30 20-55 45-69 86z"/><path d="M104 110c36-25 76-20 96 10-30-15-60-18-94-2z"/><path d="M104 110c-9-40-4-80 16-110-10 35-12 75-12 114z"/><path d="M104 110c16-10 46 10 56 50-20-30-40-40-56-42z"/><path d="M104 110c-19-5-49 15-59 55 20-30 40-43 59-47z"/></svg>`;
  const FEATURED = [
    { c: "eggs", id: "skunkape" }, { c: "cars", id: "penumbra" }, { c: "cheats", id: "money" },
    { c: "eggs", id: "ufo" }, { c: "money", id: "apollo" }
  ];

  function renderHome() {
    const fan = FEATURED.map((f, i) => {
      const it = findItem(f.c, f.id), g = cat(f.c).grad;
      if (f.c === "cheats") {
        return `<a class="fan-card fan-card--cheat" href="#/cheats/${f.id}" style="${gradVars(g)};--i:${i}">
          <span class="fan-card__pill">${esc(catName(f.c))}</span>
          <div class="fan-card__code"><span class="fan-card__money">$250K</span><div class="seq seq--mini">${it.code.split("").map(keycap).join("")}</div></div>
          <span class="fan-card__body"><span class="fan-card__title">${esc(it.name)}</span><span class="fan-card__sub">${esc(t(it.effect))}</span></span>
          <span class="glare"></span></a>`;
      }
      const pk = photoKey(f.c, f.id);
      return `<a class="fan-card" href="#/${f.c}/${f.id}" style="${gradVars(g)};--i:${i}">
        ${pk ? `<img class="fan-card__img" src="${photoUrl(pk, true)}" alt="" loading="eager">` : ""}
        <span class="fan-card__pill">${esc(catName(f.c))}</span>
        <span class="fan-card__body"><span class="fan-card__title">${esc(itemName(it))}</span><span class="fan-card__sub">${esc(t(it.tag || ""))}</span></span>
        <span class="glare"></span></a>`;
    }).join("");

    const cards = CATEGORIES.map((c, i) => `
      <a class="cat-card reveal" href="#/${c.id}" data-cat="${c.id}" style="${gradVars(c.grad)};--d:${(i % 3) * 70 + Math.floor(i / 3) * 50}ms">
        <img class="cat-card__img" src="${photoUrl(c.photo, true)}" alt="" loading="lazy">
        <span class="cat-card__count">${esc(countFor(c.id))}</span>
        <span class="cat-card__badge">${ICON[c.icon]}</span>
        <span class="cat-card__body">
          <span class="cat-card__title">${catWA(c.id)}</span>
          <span class="cat-card__desc">${esc(catDesc(c.id))}</span>
          <span class="cat-card__bar"></span>
        </span>
        <span class="glare"></span>
      </a>`).join("");


    app.innerHTML = `
      <section class="hero">
        <div class="hero__media"><img src="${photoUrl("vice-city-sign")}" alt="" fetchpriority="high"></div>
        <span class="hero__palms hero__palms--l">${PALM}</span>
        <span class="hero__palms hero__palms--r">${PALM}</span>
        <div class="hero__inner">
          <p class="badge hero-in" style="--d:0ms"><span class="badge__dot"></span>${esc(ui("badge"))}</p>
          <h1 class="logo-lockup hero-in" style="--d:120ms" aria-label="Grand Theft News 6">
            <span class="logo-lockup__stack" aria-hidden="true">${wordart("grand")}${wordart("theft")}${wordart("news")}</span>
            ${six("logo-lockup__six")}
            <span class="logo-lockup__script" aria-hidden="true">${esc(ui("heroScript"))}</span>
          </h1>
          <p class="hero__text hero-in" style="--d:260ms">${esc(ui("heroText"))}</p>
        </div>
        <div class="fan-wrap">
          <p class="fan-label hero-in" style="--d:340ms">${esc(ui("featured"))}</p>
          <div class="fan">${fan}</div>
        </div>
        ${photoCap("vice-city-sign")}
      </section>
      <section class="cats" id="cats">
        <div class="section-head reveal"><h2>${wordart("choose:" + state.lang, "", ui("choose"))}</h2><p>${esc(ui("chooseSub"))}</p></div>
        <div class="cat-grid">${cards}</div>
      </section>`;

    bindTilt($$(".cat-card", app));
    bindTilt($$(".fan-card", app), 8);
    $$(".cat-card", app).forEach((el) => el.addEventListener("click", onCatClick));
    reveal(app);
  }

  /* Effet 3D au survol */
  function bindTilt(els, max = 10) {
    if (reduced) return;
    els.forEach((el) => {
      let raf = 0;
      el.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch") return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.setProperty("--ry", ((px - 0.5) * max * 2).toFixed(2) + "deg");
          el.style.setProperty("--rx", ((0.5 - py) * max * 2).toFixed(2) + "deg");
          el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        });
      });
      el.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* Clic sur une catégorie : onde, puis écran de chargement façon GTA */
  function ripple(el, e) {
    const r = el.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "ripple";
    const size = Math.max(r.width, r.height) * 2.2;
    s.style.cssText = `width:${size}px;height:${size}px;left:${(e.clientX || r.left + r.width / 2) - r.left - size / 2}px;top:${(e.clientY || r.top + r.height / 2) - r.top - size / 2}px`;
    el.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }
  function onCatClick(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    const el = e.currentTarget, id = el.dataset.cat;
    ripple(el, e);
    el.classList.add("is-pressed");
    state.enteredVia = id;
    if (reduced) { location.hash = "#/" + id; return; }
    setTimeout(() => loadingScreen(el, cat(id), () => { location.hash = "#/" + id; }), 120);
  }
  function loadingScreen(el, c, done) {
    const r = el.getBoundingClientRect();
    const ov = document.createElement("div");
    ov.className = "loader";
    ov.style.cssText = gradVars(c.grad);
    ov.innerHTML = `<img src="${photoUrl(c.photo)}" alt=""><div class="loader__title">${catWA(c.id)}</div><div class="loader__spin">${esc(ui("loading"))}</div>`;
    document.body.appendChild(ov);
    const anim = ov.animate([
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "24px" },
      { left: "0px", top: "0px", width: innerWidth + "px", height: innerHeight + "px", borderRadius: "0px" }
    ], { duration: 520, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
    anim.onfinish = () => {
      setTimeout(() => {
        done();
        requestAnimationFrame(() => {
          const out = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease", fill: "forwards" });
          out.onfinish = () => ov.remove();
        });
      }, 380);
    };
  }
  function shrinkTo(id) {
    if (reduced) return;
    const el = $(`.cat-card[data-cat="${id}"]`, app);
    if (!el) return;
    const r = el.getBoundingClientRect(), c = cat(id);
    const ov = document.createElement("div");
    ov.className = "loader";
    ov.style.cssText = gradVars(c.grad);
    ov.innerHTML = `<img src="${photoUrl(c.photo)}" alt="">`;
    document.body.appendChild(ov);
    const anim = ov.animate([
      { left: "0px", top: "0px", width: innerWidth + "px", height: innerHeight + "px", borderRadius: "0px", opacity: 1 },
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "24px", opacity: 1, offset: .85 },
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "24px", opacity: 0 }
    ], { duration: 560, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
    anim.onfinish = () => ov.remove();
  }

  /* ============================================================ CATÉGORIES */
  function detailShell(id, chips, body, sources) {
    const c = cat(id);
    return `
      <section class="detail" data-cat="${id}" style="${gradVars(c.grad)}">
        <div class="detail__hero">
          <img class="detail__hero-img" src="${photoUrl(c.photo)}" alt="">
          <a class="back-btn" href="#/"><span class="ico">${ICON.back}</span>${esc(ui("back"))}</a>
          <div class="detail__text">
            <p class="kicker d-in" style="--d:60ms">Grand Theft News 6</p>
            <h1 class="detail__title d-in" style="--d:120ms">${catWA(id)}</h1>
            <p class="detail__sub d-in" style="--d:180ms">${esc(catDesc(id))}</p>
            <div class="chips d-in" style="--d:240ms">${chips}</div>
          </div>
          ${photoCap(c.photo)}
        </div>
        <div class="detail__body">${body}</div>
        ${sources ? renderSources(sources) : ""}
      </section>`;
  }
  function renderSources(list) {
    return `<div class="sources reveal"><h3>${esc(ui("sources"))}</h3><ul>${list.map(([n, u]) =>
      `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}<span class="ico ico--xs">${ICON.ext}</span></a></li>`).join("")}</ul></div>`;
  }
  function progressChip(id, items) {
    const total = items.length;
    const done = items.filter((it) => state.found.has(fid(id, it.id))).length;
    return `<span class="chip chip--progress" data-progress="${id}"><span class="bar"><span style="width:${total ? (done / total) * 100 : 0}%"></span></span><b>${done}/${total}</b> ${esc(ui("progress"))}</span>`;
  }
  function updateProgress(id) {
    const el = $(`[data-progress="${id}"]`);
    if (!el || !DATASETS[id]) return;
    const items = DATASETS[id]();
    const done = items.filter((it) => state.found.has(fid(id, it.id))).length;
    el.querySelector(".bar span").style.width = (done / items.length) * 100 + "%";
    el.querySelector("b").textContent = `${done}/${items.length}`;
  }
  function toolbar(filters, key) {
    return `<div class="toolbar reveal">
      <label class="searchbox"><span class="ico">${ICON.search}</span><input id="search-${key}" type="search" placeholder="${esc(ui("search"))}" data-search aria-label="${esc(ui("search"))}"></label>
      <div class="filters" role="group" data-filter-key="${key}">
        <button class="fchip is-active" data-f="*">${esc(ui("all"))}</button>
        ${filters.map(([v, label, n]) => `<button class="fchip" data-f="${esc(v)}">${esc(label)}<span>${n}</span></button>`).join("")}
      </div>
    </div>`;
  }
  function regionFilters(items) {
    const counts = {};
    items.forEach((it) => { counts[it.region] = (counts[it.region] || 0) + 1; });
    return Object.keys(REGIONS).filter((k) => counts[k]).map((k) => [k, regionName(k), counts[k]]);
  }
  function bindToolbar(root) {
    const input = $("[data-search]", root);
    const group = $(".filters", root);
    if (!group) return;
    const key = group.dataset.filterKey;
    let f = "*";
    const apply = () => {
      const q = (input?.value || "").trim().toLowerCase();
      let shown = 0;
      $$("[data-filterable]", root).forEach((el) => {
        const ok = (f === "*" || el.dataset[key] === f) && (!q || el.dataset.text.includes(q));
        el.hidden = !ok;
        if (ok) shown++;
      });
      const empty = $(".empty", root);
      if (empty) empty.hidden = shown > 0;
    };
    group.addEventListener("click", (e) => {
      const b = e.target.closest(".fchip"); if (!b) return;
      $$(".fchip", group).forEach((x) => x.classList.toggle("is-active", x === b));
      f = b.dataset.f; apply();
    });
    input?.addEventListener("input", apply);
  }
  const searchText = (...parts) => esc(parts.map((p) => t(p)).join(" ").toLowerCase());

  /* Pastille de localisation : ta carte de Leonida recadrée sur l'élément */
  function locator(g) {
    const [ux, uy] = toMap(g.xy), k = 0.5, half = 40;
    return `<span class="locator${g.approx ? " locator--approx" : ""}" aria-hidden="true" style="background-image:url(${MAPIMG.src});background-size:${MAPIMG.w * k}px ${MAPIMG.h * k}px;background-position:${(half - ux * k).toFixed(1)}px ${(half - uy * k).toFixed(1)}px"></span>`;
  }

  /* Carte d'élément (voitures, easter eggs, cash) */
  function itemCard(c, it, i, extra = {}) {
    const found = state.found.has(fid(c, it.id));
    const pk = photoKey(c, it.id), g = geoOf(c, it.id);
    const media = pk ? `<img src="${photoUrl(pk, true)}" alt="" loading="lazy">`
      : g ? `<img src="${minimapUrl(c, it.id)}" alt="" loading="lazy">`
      : `<span class="item-card__glyph"><span class="ico">${ICON[cat(c).icon]}</span></span>`;
    const foot = extra.amount ? `<span class="cash">${esc(extra.amount)}</span>`
      : it.value ? `<span class="value">${esc(t(it.value))}</span>`
      : it.reward ? `<span class="value">${esc(t(it.reward))}</span>` : "<span></span>";
    return `<article class="item-card reveal${g ? " item-card--loc" : ""}${found ? " is-found" : ""}" tabindex="0" role="button" data-open="${c}/${it.id}"
        data-filterable data-region="${it.region}" data-text="${searchText(it.nameL || it.name, it.loc, it.how, it.desc, it.tag, it.type)}"
        style="${gradVars(cat(c).grad)};--d:${(i % 3) * 60}ms">
      <div class="item-card__media">${media}<span class="item-card__top">${regionTag(it.region)}${stars(it.conf)}</span></div>
      <div class="item-card__body">
        ${g ? locator(g) : ""}
        <p class="item-card__tag">${esc(t(it.tag || it.type || ""))}</p>
        <h3>${esc(itemName(it))}</h3>
        <p class="item-card__loc"><span class="ico ico--xs">${ICON.pin}</span>${esc(t(it.loc))}</p>
        <div class="item-card__foot">${foot}
          <button class="found-btn" data-found="${c}/${it.id}" aria-pressed="${found}" title="${esc(ui("markFound"))}"><span class="ico">${ICON.check}</span><span class="found-btn__txt">${esc(ui("found"))}</span></button>
        </div>
      </div>
    </article>`;
  }

  /* --------------------------------------------------------------- CHEATS */
  function cheatSeq(code, big) {
    const sh = state.platform === "ps" ? ["L1", "R1"] : ["LB", "RB"];
    if (!code) return `<div class="seq seq--unknown">${"<span class=\"key key--ghost\">?</span>".repeat(4)}<em>${esc(ui("noCode"))}</em></div>`;
    return `<div class="seq${big ? " seq--big" : ""}"><span class="shoulder">${sh[0]}+${sh[1]}</span>${code.split("").map(keycap).join("")}</div>`;
  }
  function renderCheats() {
    const sh = state.platform === "ps" ? "<b class=\"btn-chip\">L1</b> + <b class=\"btn-chip\">R1</b>" : "<b class=\"btn-chip\">LB</b> + <b class=\"btn-chip\">RB</b>";
    const steps = CHEATS.howto.map((s, i) => `<li class="step reveal" style="--d:${i * 70}ms"><span class="step__n">${i + 1}</span><p>${esc(t(s)).replace("{SHOULDERS}", sh)}</p></li>`).join("");
    const filters = Object.keys(CHEATS.groups).map((g) => [g, t(CHEATS.groups[g]), CHEATS.items.filter((x) => x.group === g).length]);
    const cards = CHEATS.items.map((it, i) => `
      <article class="cheat-card reveal" tabindex="0" role="button" data-open="cheats/${it.id}" data-filterable data-group="${it.group}"
        data-text="${searchText(it.name, it.effect, it.unlock, CHEATS.groups[it.group])}" style="--d:${(i % 3) * 60}ms">
        <header><span class="gtag gtag--${it.group}">${esc(t(CHEATS.groups[it.group]))}</span>${stars(it.conf, true)}</header>
        <h3>${esc(it.name)}</h3>
        <p class="cheat-card__effect">${esc(t(it.effect))}</p>
        ${cheatSeq(it.code)}
        <p class="cheat-card__unlock"><b>${esc(ui("unlock"))}</b> ${esc(t(it.unlock))}</p>
        ${it.code ? `<button class="copy-btn" data-copy="${esc(arrowsText(it.code))}"><span class="ico">${ICON.copy}</span>${esc(ui("copy"))}</button>` : ""}
      </article>`).join("");
    const chips = `<span class="chip"><b>${CHEATS.stats.total}</b> ${esc(ui("totalCheats"))}</span><span class="chip"><b>${CHEATS.stats.known}</b> ${esc(ui("knownCodes"))}</span>`;
    const body = `
      <div class="panel reveal">
        <div class="panel__head"><h2>${esc(ui("howTitle"))}</h2>
          <div class="seg" role="group" aria-label="${esc(ui("platform"))}">
            <button class="seg__btn${state.platform === "ps" ? " is-active" : ""}" data-platform="ps">PS5</button>
            <button class="seg__btn${state.platform === "xb" ? " is-active" : ""}" data-platform="xb">Xbox</button>
          </div>
        </div>
        <ol class="steps">${steps}</ol>
        <div class="callout callout--warn"><span class="ico">${ICON.warn}</span><p>${esc(t(CHEATS.warning))}</p></div>
      </div>
      ${toolbar(filters, "group")}
      <div class="grid grid--cheats">${cards}</div>
      <p class="empty" hidden>${esc(ui("empty"))}</p>`;
    return detailShell("cheats", chips, body, CHEATS.sources);
  }

  /* ---------------------------------------------------------- CARS / EGGS */
  function renderCars() {
    const keep = CARS.keep.map((s, i) => `<li class="step reveal" style="--d:${i * 70}ms"><span class="step__n">${i + 1}</span><p>${esc(t(s))}</p></li>`).join("");
    const body = `
      <div class="panel reveal"><div class="panel__head"><h2>${esc(ui("keepTitle"))}</h2></div><ol class="steps">${keep}</ol></div>
      ${toolbar(regionFilters(CARS.items), "region")}
      <div class="grid">${CARS.items.map((it, i) => itemCard("cars", it, i)).join("")}</div>
      <p class="empty" hidden>${esc(ui("empty"))}</p>`;
    return detailShell("cars", progressChip("cars", CARS.items) + `<span class="chip"><b>${CARS.items.length}</b> ${esc(ui("items"))}</span>`, body, CARS.sources);
  }
  function renderEggs() {
    const body = `
      ${toolbar(regionFilters(EGGS.items), "region")}
      <div class="grid">${EGGS.items.map((it, i) => itemCard("eggs", it, i)).join("")}</div>
      <p class="empty" hidden>${esc(ui("empty"))}</p>`;
    return detailShell("eggs", progressChip("eggs", EGGS.items) + `<span class="chip"><b>${EGGS.items.length}</b> ${esc(ui("items"))}</span>`, body, EGGS.sources);
  }

  /* ---------------------------------------------------------------- MONEY */
  function renderMoney() {
    const methods = MONEY.methods.map((m, i) => {
      const pk = ITEM_PHOTO["method:" + m.id];
      return `
      <article class="method reveal" style="--d:${(i % 3) * 60}ms">
        ${pk ? `<div class="method__media"><img src="${photoUrl(pk, true)}" alt="" loading="lazy"></div>` : ""}
        <div class="method__body"><div class="method__top"><h3>${esc(t(m.name))}</h3><span class="cash">${esc(t(m.amount))}</span></div><p>${esc(t(m.text))}</p>
        ${m.yt ? `<a class="link-video" href="https://www.youtube.com/watch?v=${esc(m.yt)}" target="_blank" rel="noopener noreferrer"><span class="ico">${ICON.play}</span>${esc(ui("video"))}</a>` : ""}</div>
      </article>`;
    }).join("");
    const body = `
      <div class="callout callout--cash reveal"><span class="ico">${ICON.bank}</span><p><b>${esc(ui("bankTitle"))} —</b> ${esc(t(MONEY.bank))}</p></div>
      <h2 class="h2 reveal">${esc(ui("stashTitle"))}</h2>
      ${toolbar(regionFilters(MONEY.stashes), "region")}
      <div class="grid">${MONEY.stashes.map((it, i) => itemCard("money", it, i, { amount: it.amount })).join("")}</div>
      <p class="empty" hidden>${esc(ui("empty"))}</p>
      <h2 class="h2 reveal">${esc(ui("methodsTitle"))}</h2>
      <div class="grid grid--methods">${methods}</div>`;
    return detailShell("money", progressChip("money", MONEY.stashes), body, MONEY.sources);
  }

  /* ---------------------------------------------------------------- SAFES */
  function renderSafes() {
    const cards = SAFES.items.map((it, i) => {
      const found = state.found.has(fid("safes", it.id)), g = geoOf("safes", it.id);
      return `
      <article class="safe-card reveal${found ? " is-found" : ""}" data-filterable data-region="${it.region}" data-text="${searchText(it.name, it.note, it.code)}" style="--d:${(i % 4) * 50}ms">
        <div class="safe-card__screen"><span class="safe-card__code">${esc(it.code)}</span></div>
        <div class="safe-card__body">
          <div class="safe-card__tags">${regionTag(it.region)}${it.mission ? `<span class="rtag rtag--plain">${esc(ui("missionSafe"))}</span>` : ""}${stars(it.conf, true)}</div>
          <h3>${esc(t(it.name))}</h3>
          ${it.note ? `<p>${esc(t(it.note))}</p>` : ""}
          <div class="safe-card__foot">
            <button class="copy-btn" data-copy="${esc(it.code)}"><span class="ico">${ICON.copy}</span>${esc(ui("copy"))}</button>
            ${g ? `<a class="map-link" href="#/map/safes-${it.id}"><span class="ico">${ICON.pin}</span>${esc(ui("openOnMap"))}</a>` : ""}
            <button class="found-btn" data-found="safes/${it.id}" aria-pressed="${found}" title="${esc(ui("markFound"))}"><span class="ico">${ICON.check}</span><span class="found-btn__txt">${esc(ui("found"))}</span></button>
          </div>
        </div>
      </article>`; }).join("");
    const body = `
      <div class="callout reveal"><span class="ico">${ICON.eye}</span><p>${esc(t(SAFES.tip))}</p></div>
      ${toolbar(regionFilters(SAFES.items), "region")}
      <div class="grid grid--safes">${cards}</div>
      <p class="empty" hidden>${esc(ui("empty"))}</p>`;
    return detailShell("safes", progressChip("safes", SAFES.items), body, SAFES.sources);
  }

  /* -------------------------------------------------------------- HUNDRED */
  function renderHundred() {
    const cards = HUNDRED.items.map((it, i) => `
      <article class="coll-card reveal" style="--d:${(i % 3) * 60}ms">
        <div class="coll-card__num"><span>${it.total}</span><small>${esc(ui("total"))}</small></div>
        <div class="coll-card__body">
          <div class="coll-card__top"><h3>${esc(t(it.name))}</h3>${stars(it.conf, true)}</div>
          <p class="coll-card__need"><b>${esc(t(it.need))}</b> ${esc(ui("needed"))}</p>
          <p>${esc(t(it.text))}</p>
          ${it.yt ? `<a class="link-video" href="https://www.youtube.com/watch?v=${esc(it.yt)}" target="_blank" rel="noopener noreferrer"><span class="ico">${ICON.play}</span>${esc(ui("video"))}</a>` : ""}
        </div>
      </article>`).join("");
    const body = `<div class="callout reveal"><span class="ico">${ICON.info}</span><p>${esc(t(HUNDRED.tip))}</p></div><div class="grid grid--coll">${cards}</div>`;
    return detailShell("hundred", `<span class="chip"><b>${HUNDRED.items.length}</b> ${esc(ui("items"))}</span>`, body, HUNDRED.sources);
  }

  /* ----------------------------------------------------------------- TIPS */
  function renderTips() {
    const cards = TIPS.items.map((it, i) => `
      <article class="tip-card reveal" style="--d:${(i % 3) * 60}ms">
        <span class="tip-card__n">${String(i + 1).padStart(2, "0")}</span>
        <span class="tip-card__ico ico">${ICON[it.icon] || ICON.info}</span>
        <h3>${esc(t(it.title))}</h3>
        <p>${esc(t(it.text))}</p>
      </article>`).join("");
    return detailShell("tips", `<span class="chip"><b>${TIPS.items.length}</b> ${esc(ui("items"))}</span>`, `<div class="grid grid--tips">${cards}</div>`, TIPS.sources);
  }

  /* --------------------------------------------------------------- PEOPLE */
  function renderPeople() {
    const initials = (n) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const pics = { jason: "jason-lucia", lucia: "lucia-car" };
    const main = PEOPLE.main.map((p, i) => `
      <article class="hero-person reveal" style="${gradVars(p.color)};--d:${i * 100}ms">
        <div class="hero-person__media"><img src="${photoUrl(pics[p.id], true)}" alt="" loading="lazy"></div>
        <div class="hero-person__body"><p class="kicker">${esc(t(p.role))}</p><h3>${esc(p.name)}</h3><p>${esc(t(p.text))}</p></div>
      </article>`).join("");
    const cast = PEOPLE.cast.map((p, i) => `
      <article class="person reveal" style="--d:${(i % 3) * 60}ms">
        <span class="person__avatar">${initials(p.name)}</span>
        <div><h3>${esc(p.name)}</h3><p class="person__role">${esc(t(p.role))}</p><p>${esc(t(p.text))}</p></div>
      </article>`).join("");
    const contacts = PEOPLE.contacts.map((p) => `<li><b>${esc(p.name)}</b><span>${esc(t(p.text))}</span></li>`).join("");
    const body = `
      <div class="grid grid--duo">${main}</div>
      <h2 class="h2 reveal">${esc(ui("castTitle"))}</h2>
      <div class="grid grid--cast">${cast}</div>
      <h2 class="h2 reveal">${esc(ui("contactsTitle"))}</h2>
      <ul class="contacts reveal">${contacts}</ul>`;
    return detailShell("people", `<span class="chip"><b>2</b> ${esc(ui("leads"))}</span>`, body, PEOPLE.sources);
  }

  /* ------------------------------------------------------------------ MAP */
  function popupHtml(c, it, g) {
    const pk = photoKey(c, it.id);
    const sub = c === "safes" ? `${esc(ui("code"))} : <b class="mono">${esc(it.code)}</b>` : esc(t(it.loc || it.note || ""));
    const go = c === "safes" ? `#/safes` : `#/${c}/${it.id}`;
    return `<div style="${gradVars(cat(c).grad)}">
      ${pk ? `<div class="pop__img"><img src="${photoUrl(pk, true)}" alt=""></div>` : `<div class="pop__img"><img src="${minimapUrl(c, it.id)}" alt=""></div>`}
      <div class="pop__body">
        <p class="pop__cat">${esc(catName(c))} · ${esc(regionName(it.region))}</p>
        <p class="pop__title">${esc(c === "safes" ? t(it.name) : itemName(it))}</p>
        <p class="pop__sub">${sub}</p>
        <div class="pop__row">${stars(it.conf, true)}<a class="pop__go" href="${go}">${esc(ui("openSheet"))} →</a></div>
      </div></div>`;
  }
  function renderMap() {
    const pins = allPins();
    const legend = TRACKED.map((c) => {
      const n = pins.filter((p) => p.c === c).length;
      return `<button class="legend-btn is-on" data-layer="${c}" style="--lc:${cat(c).grad[1]}">${blip(c)}${esc(catName(c))}<span>${n}</span></button>`;
    }).join("");
    const regions = MAPINFO.regions.map((r, i) => `
      <article class="region-card reveal" style="--rc:${REGIONS[r.key].color};--d:${(i % 3) * 60}ms">
        <div class="region-card__img"><img src="${photoUrl(REGION_PHOTO[r.key], true)}" alt="" loading="lazy"></div>
        <div class="region-card__body"><h3>${esc(regionName(r.key))}</h3><p>${esc(t(r.text))}</p></div>
      </article>`).join("");
    const facts = MAPINFO.facts.map((f) => `<div class="fact-big reveal"><b>${esc(f.big)}</b><span>${esc(t(f.text))}</span></div>`).join("");
    const ext = MAPINFO.external.map(([n, u]) => `<a class="ext-card" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}<span class="ico">${ICON.ext}</span></a>`).join("");
    const body = `
      <div class="map-panel reveal in">
        <div class="map-head">
          <div><p class="map-head__kicker">${esc(ui("mapKicker"))}</p><h2>${esc(ui("mapHeading"))}</h2></div>
          <p class="map-head__count"><b>${pins.length}</b>${esc(ui("locations"))}</p>
        </div>
        <div class="legend" role="group" aria-label="${esc(ui("legend"))}">${legend}</div>
        <div class="map-box" id="leafletMap" aria-label="${esc(ui("mapTitle"))}"></div>
        <p class="map-note"><span><span class="ico ico--xs">${ICON.info}</span>${esc(ui("mapNote"))}</span><span>${esc(ui("mapLegendNote"))}</span></p>
      </div>
      <div class="facts-row" style="margin-top:24px">${facts}</div>
      <h2 class="h2 reveal">${esc(ui("regionsTitle"))}</h2>
      <div class="grid grid--regions">${regions}</div>
      <h2 class="h2 reveal">${esc(ui("exactMaps"))}</h2>
      <div class="ext-row reveal">${ext}</div>`;
    return detailShell("map", `<span class="chip"><b>6</b> ${esc(ui("regionsWord"))}</span><span class="chip"><b>${pins.length}</b> ${esc(ui("locations"))}</span>`, body, MAPINFO.sources);
  }
  function initMap(focus) {
    const el = $("#leafletMap");
    if (!el || typeof L === "undefined") return;
    if (state.map) { state.map.remove(); state.map = null; }
    const W = MAPIMG.w, H = MAPIMG.h;
    const map = L.map(el, { crs: L.CRS.Simple, minZoom: -3, maxZoom: 1, zoomSnap: 0.05, zoomDelta: 0.5, maxBounds: [[-H - 100, -100], [100, W + 100]], maxBoundsViscosity: 0.8 });
    L.imageOverlay(MAPIMG.src, [[-H, 0], [0, W]]).addTo(map);
    map.fitBounds([[-(ISLAND.y + ISLAND.h), ISLAND.x], [-ISLAND.y, ISLAND.x + ISLAND.w]]);
    map.attributionControl.setPrefix(false).addAttribution('Points : <a href="https://map.gtadb.org" target="_blank" rel="noopener">gtadb.org</a> (CC BY 4.0)');
    const layers = {}; state.markers = {};
    TRACKED.forEach((c) => { layers[c] = L.layerGroup().addTo(map); });
    allPins().forEach(({ c, it, g }) => {
      const [ux, uy] = toMap(g.xy);
      const found = state.found.has(fid(c, it.id));
      const icon = L.divIcon({ className: `gtn-marker${found ? " gtn-marker--found" : ""}`, html: blip(c, g.approx), iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -16] });
      const m = L.marker([-uy, ux], { icon, title: c === "safes" ? t(it.name) : itemName(it), riseOnHover: true })
        .bindPopup(popupHtml(c, it, g), { className: "gtn-pop", minWidth: 250, maxWidth: 250, autoPanPadding: [30, 30] });
      m.on("popupopen", () => m.getElement()?.classList.add("is-active"));
      m.on("popupclose", () => m.getElement()?.classList.remove("is-active"));
      m.addTo(layers[c]);
      state.markers[`${c}-${it.id}`] = m;
    });
    $$(".legend-btn").forEach((b) => b.addEventListener("click", () => {
      const on = b.classList.toggle("is-on");
      on ? layers[b.dataset.layer].addTo(map) : map.removeLayer(layers[b.dataset.layer]);
    }));
    state.map = map;
    if (focus) focusMarker(focus);
  }
  function focusMarker(key) {
    const m = state.markers[key];
    if (!m || !state.map) return;
    $("#leafletMap")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    state.map.setView(m.getLatLng(), 0, { animate: !reduced });
    setTimeout(() => m.openPopup(), reduced ? 0 : 350);
  }

  const RENDER = { map: renderMap, cheats: renderCheats, cars: renderCars, eggs: renderEggs, money: renderMoney, safes: renderSafes, hundred: renderHundred, tips: renderTips, people: renderPeople };

  function renderCategory(id, focus) {
    if (state.map) { state.map.remove(); state.map = null; }
    app.innerHTML = RENDER[id]();
    const root = $(".detail", app);
    bindToolbar(root);
    $$(".seg__btn", root).forEach((b) => b.addEventListener("click", () => {
      state.platform = b.dataset.platform; store.set("gtn6-platform", state.platform);
      const y = window.scrollY; renderCategory("cheats"); window.scrollTo(0, y);
    }));
    reveal(app);
    if (id === "map") initMap(focus);
  }

  /* ================================================================ MODALE */
  const modal = $("#modal"), sheet = $(".modal__sheet", modal);
  let lastFocus = null;
  function whereBlock(c, it) {
    const g = geoOf(c, it.id);
    if (!g) return `<div class="where--none"><span class="ico">${ICON.pin}</span>${esc(ui("noPin"))}</div>`;
    const [ux, uy] = toMap(g.xy);
    const left = ((ux - ISLAND.x) / ISLAND.w) * 100, top = ((uy - ISLAND.y) / ISLAND.h) * 100;
    const bgPos = `${(ISLAND.x / (MAPIMG.w - ISLAND.w)) * 100}% ${(ISLAND.y / (MAPIMG.h - ISLAND.h)) * 100}%`;
    return `<div class="where">
      <h3>${esc(ui("whereTitle"))}</h3>
      <div class="where__map where__island" style="background-image:url(${MAPIMG.src});background-size:${(MAPIMG.w / ISLAND.w) * 100}% auto;background-position:${bgPos}">
        <span class="where__label">${esc(ui("islandView"))}</span>
        <span class="where__pin" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%">${blip(c, g.approx)}</span>
      </div>
      <div class="where__side">
        <div class="where__map where__close">
          <span class="where__label">${esc(ui("closeView"))}</span>
          <img src="${minimapUrl(c, it.id)}" alt="" loading="lazy">
          ${g.approx ? `<span class="where__zone"></span>` : `<span class="where__pin" style="left:50%;top:50%">${blip(c)}</span>`}
        </div>
        <p class="where__info"><span class="ico">${ICON.pin}</span>${esc(g.approx ? ui("approxPin") : ui("exactPin"))}</p>
        <a class="btn btn--primary" href="#/map/${c}-${it.id}" data-close-modal><span class="ico">${ICON.map}</span>${esc(ui("openOnMap"))}</a>
      </div>
    </div>`;
  }
  function openModal(c, id) {
    const it = findItem(c, id);
    if (!it) return false;
    const g = cat(c).grad;
    const found = state.found.has(fid(c, id));
    let html;
    if (c === "cheats") {
      html = `
        <div class="sheet__hero sheet__hero--cheat">
          <p class="kicker">${esc(catName(c))} · ${esc(t(CHEATS.groups[it.group]))}</p>
          <h2 id="modalTitle">${esc(it.name)}</h2>
          ${cheatSeq(it.code, true)}
        </div>
        <div class="sheet__content">
          <div class="badges">${stars(it.conf, true)}</div>
          <div class="facts">
            <div class="fact"><span>${esc(ui("effect"))}</span><p>${esc(t(it.effect))}</p></div>
            <div class="fact"><span>${esc(ui("unlock"))}</span><p>${esc(t(it.unlock))}</p></div>
          </div>
          ${it.note ? `<div class="callout callout--warn"><span class="ico">${ICON.warn}</span><p><b>${esc(ui("note"))} —</b> ${esc(t(it.note))}</p></div>` : ""}
          <div class="callout"><span class="ico">${ICON.info}</span><p>${esc(t(CHEATS.warning))}</p></div>
          <div class="sheet__actions">${it.code ? `<button class="btn btn--primary" data-copy="${esc(arrowsText(it.code))}"><span class="ico">${ICON.copy}</span>${esc(ui("copy"))}</button>` : ""}</div>
        </div>`;
    } else {
      const pk = photoKey(c, id), geo = geoOf(c, id);
      const media = pk ? `<img src="${photoUrl(pk)}" alt="">${photoCap(pk)}`
        : geo ? `<img src="${minimapUrl(c, id)}" alt="">`
        : `<span class="item-card__glyph"><span class="ico">${ICON[cat(c).icon]}</span></span>`;
      const facts = [["location", it.loc], ["how", it.how], ["reward", it.reward], ["value", it.value]];
      html = `
        <div class="sheet__media">${media}</div>
        <div class="sheet__content">
          <p class="kicker">${esc(catName(c))} · ${esc(regionName(it.region))}</p>
          <h2 id="modalTitle">${esc(itemName(it))}</h2>
          <div class="badges">${stars(it.conf, true)}${it.tag ? `<span class="rtag rtag--plain">${esc(t(it.tag))}</span>` : ""}${it.type ? `<span class="rtag rtag--plain">${esc(t(it.type))}</span>` : ""}${it.amount ? `<span class="cash">${esc(it.amount)}</span>` : ""}</div>
          ${it.desc ? `<p class="sheet__lead">${esc(t(it.desc))}</p>` : ""}
          <div class="facts">${facts.filter(([, v]) => v).map(([k, v]) => `<div class="fact"><span>${esc(ui(k))}</span><p>${esc(t(v))}</p></div>`).join("")}</div>
          ${it.note ? `<div class="callout callout--warn"><span class="ico">${ICON.warn}</span><p><b>${esc(ui("note"))} —</b> ${esc(t(it.note))}</p></div>` : ""}
          ${whereBlock(c, it)}
          <div class="sheet__actions">
            <button class="btn ${found ? "btn--done" : "btn--primary"}" data-found="${c}/${id}" aria-pressed="${found}"><span class="ico">${ICON.check}</span>${esc(found ? ui("found") : ui("markFound"))}</button>
            ${it.yt ? `<a class="btn" href="https://www.youtube.com/watch?v=${esc(it.yt)}" target="_blank" rel="noopener noreferrer"><span class="ico">${ICON.play}</span>${esc(ui("video"))}</a>` : ""}
          </div>
        </div>`;
    }
    sheet.setAttribute("style", gradVars(g));
    sheet.innerHTML = `<button class="sheet__close" data-close aria-label="${esc(ui("close"))}">${ICON.close}</button>${html}`;
    sheet.scrollTop = 0;
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("no-scroll");
    setTimeout(() => $(".sheet__close", sheet)?.focus({ preventScroll: true }), 60);
    return true;
  }
  function closeModal(fromRoute) {
    if (!modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("no-scroll");
    lastFocus?.focus?.({ preventScroll: true });
    if (!fromRoute) {
      const [, c] = location.hash.split("/");
      if (state.modalFromPage) { state.modalFromPage = false; history.back(); }
      else history.replaceState(null, "", "#/" + c);
    }
  }
  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); closeLang(); } });

  /* ===================================================== ÉVÉNEMENTS GLOBAUX */
  document.addEventListener("click", (e) => {
    const cp = e.target.closest("[data-copy]");
    if (cp) { e.preventDefault(); e.stopPropagation(); copy(cp.dataset.copy); return; }
    const fb = e.target.closest("[data-found]");
    if (fb) {
      e.preventDefault(); e.stopPropagation();
      const [c, id] = fb.dataset.found.split("/"), key = fid(c, id);
      const on = !state.found.has(key);
      on ? state.found.add(key) : state.found.delete(key);
      saveFound();
      $$(`[data-found="${c}/${id}"]`).forEach((b) => {
        b.setAttribute("aria-pressed", on);
        if (b.classList.contains("btn")) {
          b.classList.toggle("btn--done", on); b.classList.toggle("btn--primary", !on);
          b.lastChild.textContent = on ? ui("found") : ui("markFound");
        }
        b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
        (b.closest(".safe-card") || null)?.classList.toggle("is-found", on);
      });
      $$(`[data-open="${c}/${id}"]`).forEach((el) => el.classList.toggle("is-found", on));
      updateProgress(c);
      paintWanted(on);
      if (on) { const it = findItem(c, id); missionPassed(c === "safes" ? t(it.name) : itemName(it)); }
      return;
    }
    if (e.target.closest("[data-close-modal]")) { modal.classList.remove("is-open"); document.documentElement.classList.remove("no-scroll"); modal.setAttribute("aria-hidden", "true"); state.modalFromPage = false; return; }
    const op = e.target.closest("[data-open]");
    if (op && !e.target.closest("a")) { state.modalFromPage = true; location.hash = "#/" + op.dataset.open; }
  });
  document.addEventListener("keydown", (e) => {
    const op = e.target.closest?.("[data-open]");
    if (op && (e.key === "Enter" || e.key === " ") && e.target === op) { e.preventDefault(); state.modalFromPage = true; location.hash = "#/" + op.dataset.open; }
  });
  document.addEventListener("click", (e) => { if (e.target.closest(".fan-card, .pop__go")) state.modalFromPage = true; }, true);

  /* =================================================================== ROUTEUR */
  function route(opts = {}) {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const c = parts[0] && RENDER[parts[0]] ? parts[0] : null;
    const sub = parts[1];
    const prev = state.view;

    if (!c) {
      closeModal(true);
      if (prev !== null || opts.force || !app.firstElementChild) {
        if (state.map) { state.map.remove(); state.map = null; }
        renderHome();
        if (prev && !opts.force) {
          window.scrollTo(0, state.homeScroll);
          if (state.enteredVia === prev) shrinkTo(prev);
        } else if (!opts.keepScroll) window.scrollTo(0, 0);
        state.enteredVia = null;
      }
      state.view = null;
      document.title = "Grand Theft News 6";
      return;
    }
    if (c === "map") {
      closeModal(true);
      if (prev !== "map" || opts.force) {
        if (prev === null && !opts.force) state.homeScroll = window.scrollY;
        renderCategory("map", sub);
        if (!opts.keepScroll && !sub) window.scrollTo(0, 0);
        state.view = "map";
      } else if (sub) focusMarker(sub);
      document.title = `${catName(c)} · Grand Theft News 6`;
      return;
    }
    if (prev !== c || opts.force) {
      if (prev === null && !opts.force) state.homeScroll = window.scrollY;
      renderCategory(c);
      if (!opts.keepScroll) window.scrollTo(0, 0);
      state.view = c;
    }
    document.title = `${catName(c)} · Grand Theft News 6`;
    if (sub) { if (!openModal(c, sub)) closeModal(true); }
    else closeModal(true);
  }
  window.addEventListener("hashchange", () => route());

  /* ======================================================== LANGUE & THÈME */
  const langBtn = $("#langBtn"), langMenu = $("#langMenu");
  function paintChrome() {
    document.documentElement.lang = state.lang;
    $("#langCode").textContent = state.lang.toUpperCase();
    langMenu.innerHTML = Object.keys(UI).map((l) =>
      `<li role="option" aria-selected="${l === state.lang}"><button data-lang="${l}"><span class="lang__code">${l.toUpperCase()}</span>${esc(UI[l].langName)}${l === state.lang ? `<span class="ico ico--xs">${ICON.check}</span>` : ""}</button></li>`).join("");
    $("#themeBtn").setAttribute("aria-label", ui("theme"));
    langBtn.setAttribute("aria-label", ui("lang"));
    $("#footerUpdated").textContent = ui("updated");
    $("#footerLegal").textContent = ui("footer");
    $("#footerCredits").innerHTML = `${esc(ui("credits"))} <a href="https://map.gtadb.org" target="_blank" rel="noopener noreferrer">map.gtadb.org</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>`;
    $$("[data-icon]").forEach((el) => { if (!el.innerHTML) el.innerHTML = ICON[el.dataset.icon]; });
    $("#brand").innerHTML = `${wordart("brand", "brand__name", "Grand Theft News")}${six("brand__six")}`;
    paintWanted(false);
  }
  function closeLang() { $("#lang").classList.remove("is-open"); langBtn.setAttribute("aria-expanded", "false"); }
  langBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !$("#lang").classList.contains("is-open");
    $("#lang").classList.toggle("is-open", open);
    langBtn.setAttribute("aria-expanded", open);
  });
  langMenu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]"); if (!b) return;
    state.lang = b.dataset.lang; store.set("gtn6-lang", state.lang);
    closeLang(); paintChrome();
    const y = window.scrollY;
    app.classList.add("swap");
    setTimeout(() => { route({ force: true, keepScroll: true }); window.scrollTo(0, y); app.classList.remove("swap"); }, reduced ? 0 : 160);
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("#lang")) closeLang(); });

  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.classList.add("theme-anim");
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("gtn6-theme", next); } catch (e) { /* stockage indisponible */ }
    setTimeout(() => document.documentElement.classList.remove("theme-anim"), 450);
  });

  /* Démarrage */
  paintChrome();
  route({ force: true });
})();
