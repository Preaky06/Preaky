/* ==========================================================================
   Grand Theft News 6 — logique du site (vanilla JS, sans build)
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
    view: null,          // id de la catégorie affichée (null = accueil)
    homeScroll: 0,
    enteredVia: null,    // catégorie ouverte depuis sa carte (pour l'animation retour)
    modalFromPage: false
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

  /* Images YouTube : on tente plusieurs résolutions, sinon l'illustration reste */
  function yt(id, opts = {}) {
    if (!id) return "";
    const n = opts.frame || 0;
    return `<span class="yt ${opts.cls || ""}" data-yt="${esc(id)}" data-n="${n}"><img alt="${esc(opts.alt || "")}" loading="${opts.eager ? "eager" : "lazy"}" decoding="async"></span>`;
  }
  function hydrateImages(root = document) {
    $$(".yt:not([data-ready])", root).forEach((box) => {
      box.dataset.ready = "1";
      const id = box.dataset.yt, n = +box.dataset.n;
      const base = `https://i.ytimg.com/vi/${id}/`;
      const chain = n > 0
        ? [[`maxres${n}.jpg`, 0], [`hq${n}.jpg`, 1]]
        : [["maxresdefault.jpg", 0], ["hq720.jpg", 0], ["sddefault.jpg", 1], ["hqdefault.jpg", 1]];
      const img = box.querySelector("img");
      let i = 0;
      const next = () => {
        if (i >= chain.length) { box.classList.add("yt--failed"); img.removeAttribute("src"); return; }
        const [file, is43] = chain[i++];
        box.dataset.ratio = is43 ? "43" : "169";
        img.src = base + file;
      };
      img.addEventListener("load", () => {
        if (img.naturalWidth && img.naturalWidth <= 120) return next(); // vignette « indisponible »
        box.classList.add("yt--ok");
      });
      img.addEventListener("error", next);
      next();
    });
  }

  function confBadge(c) {
    const ic = c === "ok" ? ICON.check : c === "mixed" ? ICON.warn : ICON.info;
    return `<span class="conf conf--${c}" title="${esc(ui("conf_" + c))}"><span class="ico">${ic}</span><span>${esc(ui("conf_" + c))}</span></span>`;
  }
  function regionTag(k) {
    if (!k || !REGIONS[k]) return "";
    return `<span class="rtag" style="--rc:${REGIONS[k].color}">${esc(regionName(k))}</span>`;
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
      ta.select(); try { document.execCommand("copy"); } catch (_) {} ta.remove();
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
  const DATASETS = {
    cars: () => CARS.items, eggs: () => EGGS.items, money: () => MONEY.stashes, safes: () => SAFES.items, cheats: () => CHEATS.items
  };
  function findItem(c, id) { const ds = DATASETS[c]; return ds ? ds().find((x) => x.id === id) : null; }
  const itemName = (it) => t(it.nameL || it.name);

  function allPins() {
    const out = [];
    [["cars", CARS.items], ["eggs", EGGS.items], ["money", MONEY.stashes], ["safes", SAFES.items]].forEach(([c, arr]) =>
      arr.forEach((it) => { if (it.pin) out.push({ c, it }); }));
    return out;
  }

  function countFor(id) {
    switch (id) {
      case "map": return `${allPins().length} spots`;
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

  /* ================================================================ ACCUEIL */
  const FEATURED = [
    { c: "eggs", id: "skunkape", grad: ["#c4f25e", "#1fa35c"] },
    { c: "cars", id: "penumbra", grad: ["#ff8a5c", "#e0245e"] },
    { c: "cheats", id: "money", grad: ["#a07bff", "#4b1fb8"] },
    { c: "eggs", id: "ufo", grad: ["#5be3ff", "#3b4bdb"] },
    { c: "money", id: "apollo", grad: ["#ffdc4d", "#ff8a1f"] }
  ];

  function renderHome() {
    const fan = FEATURED.map((f, i) => {
      const it = findItem(f.c, f.id);
      const sub = f.c === "cheats" ? t(it.effect) : t(it.tag || "");
      const media = f.c === "cheats"
        ? `<div class="fan-card__code"><span class="fan-card__money">$250K</span><div class="seq seq--mini">${it.code.split("").map(keycap).join("")}</div></div>`
        : `<div class="fan-card__media">${yt(it.yt, { alt: itemName(it) })}<span class="fan-card__art">${art(cat(f.c).icon)}</span></div>`;
      return `<a class="fan-card" href="#/${f.c}/${f.id}" style="${gradVars(f.grad)};--i:${i}" data-cat="${f.c}">
        <span class="fan-card__head"><span><span class="fan-card__title">${esc(itemName(it))}</span><span class="fan-card__sub">${esc(sub)}</span></span>
        <span class="fan-card__pill">${esc(catName(f.c))}</span></span>
        ${media}
        <span class="fan-card__glare"></span>
      </a>`;
    }).join("");

    const cards = CATEGORIES.map((c, i) => `
      <a class="cat-card reveal" href="#/${c.id}" data-cat="${c.id}" style="${gradVars(c.grad)};--d:${(i % 3) * 70 + Math.floor(i / 3) * 60}ms">
        <span class="cat-card__img">${yt(c.frame[0], { frame: c.frame[1] })}</span>
        <span class="cat-card__shade"></span>
        <span class="cat-card__rays"></span>
        <span class="cat-card__title">${esc(catName(c.id))}</span>
        <span class="cat-card__count">${esc(countFor(c.id))}</span>
        <span class="cat-card__art">${art(c.icon)}</span>
        <span class="cat-card__foot"><span class="cat-card__label">Grand Theft News 6</span><span class="cat-card__desc">${esc(catDesc(c.id))}</span></span>
        <span class="cat-card__glare"></span>
      </a>`).join("");

    app.innerHTML = `
      <section class="hero">
        <div class="hero__media">${yt(TRAILERS.t2, { eager: true })}</div>
        <div class="hero__inner">
          <p class="badge hero-in" style="--d:0ms"><span class="badge__dot"></span>${esc(ui("badge"))}</p>
          <h1 class="hero__title"><span class="hero-in" style="--d:80ms">Grand Theft</span><span class="hero-in grad-text" style="--d:180ms">News 6</span></h1>
          <p class="hero__text hero-in" style="--d:280ms">${esc(ui("heroText"))}</p>
        </div>
        <div class="fan-wrap">
          <p class="fan-label hero-in" style="--d:360ms">${esc(ui("featured"))}</p>
          <div class="fan">${fan}</div>
        </div>
      </section>
      <section class="cats" id="cats">
        <div class="section-head reveal">
          <h2>${esc(ui("choose"))}</h2>
          <p>${esc(ui("chooseSub"))}</p>
        </div>
        <div class="cat-grid">${cards}</div>
      </section>`;

    hydrateImages(app);
    bindTilt($$(".cat-card", app));
    bindTilt($$(".fan-card", app), 8);
    $$(".cat-card", app).forEach((el) => el.addEventListener("click", onCatClick));
    reveal(app);
  }

  /* Effet 3D au survol */
  function bindTilt(els, max = 12) {
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

  /* Clic sur une carte : onde + la carte s'agrandit jusqu'à remplir l'écran */
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
    const el = e.currentTarget, id = el.dataset.cat, c = cat(id);
    ripple(el, e);
    el.classList.add("is-pressed");
    state.enteredVia = id;
    if (reduced) { location.hash = "#/" + id; return; }
    setTimeout(() => expandFrom(el, c.grad, () => { location.hash = "#/" + id; }), 140);
  }
  function expandFrom(el, grad, done) {
    const r = el.getBoundingClientRect();
    const ov = document.createElement("div");
    ov.className = "expander";
    ov.style.background = `linear-gradient(150deg, ${grad[0]}, ${grad[1]})`;
    ov.innerHTML = `<div class="expander__art">${el.querySelector(".cat-card__art")?.innerHTML || ""}</div>`;
    document.body.appendChild(ov);
    const vw = window.innerWidth, vh = window.innerHeight;
    const anim = ov.animate([
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "28px" },
      { left: "0px", top: "0px", width: vw + "px", height: vh + "px", borderRadius: "0px" }
    ], { duration: 520, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
    anim.onfinish = () => {
      done();
      requestAnimationFrame(() => {
        const out = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: "ease", fill: "forwards" });
        out.onfinish = () => ov.remove();
      });
    };
  }
  function shrinkTo(id, grad) {
    if (reduced) return;
    const el = $(`.cat-card[data-cat="${id}"]`, app);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ov = document.createElement("div");
    ov.className = "expander";
    ov.style.background = `linear-gradient(150deg, ${grad[0]}, ${grad[1]})`;
    document.body.appendChild(ov);
    const anim = ov.animate([
      { left: "0px", top: "0px", width: innerWidth + "px", height: innerHeight + "px", borderRadius: "0px", opacity: 1 },
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "28px", opacity: 1, offset: .85 },
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "28px", opacity: 0 }
    ], { duration: 560, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
    anim.onfinish = () => ov.remove();
  }

  /* ============================================================ CATÉGORIES */
  function detailShell(id, chips, body, sources, opts = {}) {
    const c = cat(id);
    return `
      <section class="detail" data-cat="${id}" style="${gradVars(c.grad)}">
        <div class="detail__hero">
          <div class="detail__hero-bg">${yt(c.frame[0], { frame: c.frame[1], eager: true })}</div>
          <a class="back-btn" href="#/"><span class="ico">${ICON.back}</span>${esc(ui("back"))}</a>
          <div class="detail__hero-inner">
            <div class="detail__text">
              <p class="kicker d-in" style="--d:60ms">Grand Theft News 6</p>
              <h1 class="detail__title d-in" style="--d:120ms">${esc(catName(id))}</h1>
              <p class="detail__sub d-in" style="--d:180ms">${esc(catDesc(id))}</p>
              <div class="chips d-in" style="--d:240ms">${chips}</div>
            </div>
            <div class="detail__art d-in" style="--d:100ms">${art(c.icon)}</div>
          </div>
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
    if (!el) return;
    const items = DATASETS[id]();
    const done = items.filter((it) => state.found.has(fid(id, it.id))).length;
    el.querySelector(".bar span").style.width = (done / items.length) * 100 + "%";
    el.querySelector("b").textContent = `${done}/${items.length}`;
  }
  function toolbar(filters, key) {
    return `<div class="toolbar reveal">
      <label class="searchbox"><span class="ico">${ICON.search}</span><input type="search" placeholder="${esc(ui("search"))}" data-search aria-label="${esc(ui("search"))}"></label>
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

  /* Carte d'élément générique (voitures, easter eggs, cash) */
  function itemCard(c, it, i, extra = {}) {
    const g = extra.grad || cat(c).grad;
    const found = state.found.has(fid(c, it.id));
    const media = it.yt
      ? yt(it.yt, { alt: itemName(it) })
      : "";
    return `<article class="item-card reveal ${found ? "is-found" : ""}" tabindex="0" role="button" data-open="${c}/${it.id}"
        data-filterable data-region="${it.region}" data-text="${searchText(it.nameL || it.name, it.loc, it.how, it.desc, it.tag, it.type)}"
        style="${gradVars(g)};--d:${(i % 3) * 60}ms">
      <div class="item-card__media">
        <span class="item-card__art">${art(cat(c).icon)}</span>
        ${media}
        ${it.yt ? `<span class="item-card__play"><span class="ico">${ICON.play}</span></span>` : ""}
        <span class="item-card__top">${regionTag(it.region)}${confBadge(it.conf)}</span>
      </div>
      <div class="item-card__body">
        <p class="item-card__tag">${esc(t(it.tag || it.type || ""))}</p>
        <h3>${esc(itemName(it))}</h3>
        <p class="item-card__loc"><span class="ico ico--xs">${ICON.pin}</span>${esc(t(it.loc))}</p>
        <div class="item-card__foot">
          ${extra.amount ? `<span class="amount">${esc(extra.amount)}</span>` : it.value ? `<span class="value">${esc(t(it.value))}</span>` : it.reward ? `<span class="value">${esc(t(it.reward))}</span>` : "<span></span>"}
          <button class="found-btn" data-found="${c}/${it.id}" aria-pressed="${found}" title="${esc(ui("markFound"))}"><span class="ico">${ICON.check}</span><span class="found-btn__txt">${esc(ui("found"))}</span></button>
        </div>
      </div>
    </article>`;
  }

  /* --------------------------------------------------------------- CHEATS */
  function cheatSeq(code, big) {
    const sh = state.platform === "ps" ? ["L1", "R1"] : ["LB", "RB"];
    if (!code) return `<div class="seq seq--unknown">${"<span class=\"key key--ghost\">?</span>".repeat(4)}<em>${esc(ui("noCode"))}</em></div>`;
    return `<div class="seq ${big ? "seq--big" : ""}"><span class="shoulder">${sh[0]}+${sh[1]}</span>${code.split("").map(keycap).join("")}</div>`;
  }
  function renderCheats() {
    const sh = state.platform === "ps" ? "<b class=\"btn-chip\">L1</b> + <b class=\"btn-chip\">R1</b>" : "<b class=\"btn-chip\">LB</b> + <b class=\"btn-chip\">RB</b>";
    const steps = CHEATS.howto.map((s, i) =>
      `<li class="step reveal" style="--d:${i * 70}ms"><span class="step__n">${i + 1}</span><p>${esc(t(s)).replace("{SHOULDERS}", sh)}</p></li>`).join("");
    const groups = Object.keys(CHEATS.groups);
    const filters = groups.map((g) => [g, t(CHEATS.groups[g]), CHEATS.items.filter((x) => x.group === g).length]);
    const cards = CHEATS.items.map((it, i) => `
      <article class="cheat-card reveal" tabindex="0" role="button" data-open="cheats/${it.id}" data-filterable data-group="${it.group}"
        data-text="${searchText(it.name, it.effect, it.unlock, CHEATS.groups[it.group])}" style="--d:${(i % 3) * 60}ms">
        <header><span class="gtag gtag--${it.group}">${esc(t(CHEATS.groups[it.group]))}</span>${confBadge(it.conf)}</header>
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
            <button class="seg__btn ${state.platform === "ps" ? "is-active" : ""}" data-platform="ps">PS5</button>
            <button class="seg__btn ${state.platform === "xb" ? "is-active" : ""}" data-platform="xb">Xbox</button>
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

  /* ----------------------------------------------------------------- CARS */
  function renderCars() {
    const keep = CARS.keep.map((s, i) => `<li class="step reveal" style="--d:${i * 70}ms"><span class="step__n">${i + 1}</span><p>${esc(t(s))}</p></li>`).join("");
    const body = `
      <div class="panel reveal"><div class="panel__head"><h2>${esc(ui("keepTitle"))}</h2></div><ol class="steps">${keep}</ol></div>
      ${toolbar(regionFilters(CARS.items), "region")}
      <div class="grid">${CARS.items.map((it, i) => itemCard("cars", it, i)).join("")}</div>
      <p class="empty" hidden>${esc(ui("empty"))}</p>`;
    return detailShell("cars", progressChip("cars", CARS.items) + `<span class="chip"><b>${CARS.items.length}</b> ${esc(ui("items"))}</span>`, body, CARS.sources);
  }

  /* ----------------------------------------------------------------- EGGS */
  function renderEggs() {
    const body = `
      ${toolbar(regionFilters(EGGS.items), "region")}
      <div class="grid">${EGGS.items.map((it, i) => itemCard("eggs", it, i)).join("")}</div>
      <p class="empty" hidden>${esc(ui("empty"))}</p>`;
    return detailShell("eggs", progressChip("eggs", EGGS.items) + `<span class="chip"><b>${EGGS.items.length}</b> ${esc(ui("items"))}</span>`, body, EGGS.sources);
  }

  /* ---------------------------------------------------------------- MONEY */
  function renderMoney() {
    const methods = MONEY.methods.map((m, i) => `
      <article class="method reveal" style="--d:${(i % 3) * 60}ms">
        ${m.yt ? `<a class="method__media" href="https://www.youtube.com/watch?v=${esc(m.yt)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(ui("video"))}">${yt(m.yt)}<span class="item-card__play"><span class="ico">${ICON.play}</span></span></a>` : ""}
        <div class="method__body"><div class="method__top"><h3>${esc(t(m.name))}</h3><span class="amount">${esc(t(m.amount))}</span></div><p>${esc(t(m.text))}</p></div>
      </article>`).join("");
    const body = `
      <div class="callout callout--gold reveal"><span class="ico">${ICON.bank}</span><p><b>${esc(ui("bankTitle"))} —</b> ${esc(t(MONEY.bank))}</p></div>
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
      const found = state.found.has(fid("safes", it.id));
      return `
      <article class="safe-card reveal ${found ? "is-found" : ""}" data-filterable data-region="${it.region}" data-text="${searchText(it.name, it.note, it.code)}" style="--d:${(i % 4) * 50}ms">
        <div class="safe-card__screen"><span class="safe-card__code">${esc(it.code)}</span></div>
        <div class="safe-card__body">
          <div class="safe-card__tags">${regionTag(it.region)}${it.mission ? `<span class="rtag rtag--plain">${esc(ui("missionSafe"))}</span>` : ""}${confBadge(it.conf)}</div>
          <h3>${esc(t(it.name))}</h3>
          ${it.note ? `<p>${esc(t(it.note))}</p>` : ""}
          <div class="safe-card__foot">
            <button class="copy-btn" data-copy="${esc(it.code)}"><span class="ico">${ICON.copy}</span>${esc(ui("copy"))}</button>
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
          <div class="coll-card__top"><h3>${esc(t(it.name))}</h3>${confBadge(it.conf)}</div>
          <p class="coll-card__need"><b>${esc(t(it.need))}</b> ${esc(ui("needed"))}</p>
          <p>${esc(t(it.text))}</p>
          ${it.yt ? `<a class="link-video" href="https://www.youtube.com/watch?v=${esc(it.yt)}" target="_blank" rel="noopener noreferrer"><span class="ico">${ICON.play}</span>${esc(ui("video"))}</a>` : ""}
        </div>
      </article>`).join("");
    const body = `
      <div class="callout reveal"><span class="ico">${ICON.info}</span><p>${esc(t(HUNDRED.tip))}</p></div>
      <div class="grid grid--coll">${cards}</div>`;
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
    const main = PEOPLE.main.map((p, i) => `
      <article class="hero-person reveal" style="${gradVars(p.color)};--d:${i * 100}ms">
        <div class="hero-person__media">${yt(TRAILERS.t2, { frame: i === 0 ? 1 : 2 })}<span class="hero-person__mono">${initials(p.name)}</span></div>
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
  const MAP_CATS = ["cars", "eggs", "money", "safes"];
  function renderMapSvg() {
    const land = "M60 150 L300 140 L520 128 L830 118 C845 150 852 200 850 260 C848 340 842 420 836 500 C830 580 824 640 815 700 C806 760 790 812 766 852 C744 888 718 906 694 908 C668 908 646 892 628 870 C600 836 578 790 560 740 C540 684 520 620 508 556 C496 490 494 430 486 376 C478 326 462 290 432 266 C400 244 360 240 320 244 C270 250 220 256 170 252 C130 248 96 236 72 214 C58 200 56 176 60 150Z";
    const polys = {
      gellhorn: "0,0 430,0 430,420 0,420",
      kalaga: "430,0 1000,0 1000,300 430,322",
      ambrosia: "430,322 1000,300 1000,590 430,630",
      vice: "690,590 1000,590 1000,805 735,812",
      grass: "430,630 690,590 735,812 1000,805 1000,1060 430,1060"
    };
    const keys = [[712, 926], [690, 940], [664, 953], [636, 964], [606, 974], [576, 982], [544, 989], [512, 994], [478, 998], [444, 1000]];
    const isles = [[845, 704, 9, 6], [841, 744, 8, 5], [832, 678, 7, 5], [846, 772, 8, 5], [850, 716, 5, 4]];
    const pins = allPins().map(({ c, it }) => {
      const col = cat(c).grad[1];
      return `<g class="pin" data-c="${c}" data-id="${it.id}" transform="translate(${it.pin[0]} ${it.pin[1]})" tabindex="0" role="button" aria-label="${esc(itemName(it))}">
        <circle class="pin__pulse" r="12" fill="${col}"/>
        <circle class="pin__dot" r="8" fill="${col}"/>
      </g>`;
    }).join("");
    const labels = MAPINFO.regions.map((r) => `<text class="map-label" x="${r.label[0]}" y="${r.label[1]}" text-anchor="${r.anchor || "middle"}">${esc(regionName(r.key).toUpperCase())}</text>`).join("");
    const towns = MAPINFO.towns.map((tw) => `<g class="town" transform="translate(${tw.at[0]} ${tw.at[1]})"><circle r="4"/><text x="${tw.dx ?? 9}" y="${tw.dy ?? 5}" text-anchor="${tw.anchor || "start"}">${esc(tw.name)}</text></g>`).join("");
    return `
<svg class="map-svg" viewBox="0 0 1000 1060" role="img" aria-label="${esc(ui("mapTitle"))}">
  <defs>
    <clipPath id="landClip"><path d="${land}"/></clipPath>
    <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--sea1)"/><stop offset="1" stop-color="var(--sea2)"/></linearGradient>
    <pattern id="waves" width="40" height="18" patternUnits="userSpaceOnUse"><path d="M0 9 q10 -6 20 0 t20 0" fill="none" stroke="var(--wave)" stroke-width="1.4"/></pattern>
    <filter id="landShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity=".28"/></filter>
  </defs>
  <rect width="1000" height="1060" fill="url(#sea)"/>
  <rect width="1000" height="1060" fill="url(#waves)"/>
  <g filter="url(#landShadow)">
    <path d="${land}" fill="var(--land)"/>
    ${keys.map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${16 - i * 0.4}" ry="6" transform="rotate(-18 ${x} ${y})" fill="var(--land)"/>`).join("")}
    ${isles.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="var(--land)"/>`).join("")}
    <path d="M864 640 C872 690 874 745 868 800" stroke="var(--land)" stroke-width="7" stroke-linecap="round" fill="none"/>
  </g>
  <g clip-path="url(#landClip)" class="regions">
    ${Object.entries(polys).map(([k, p]) => `<polygon class="region" data-region="${k}" points="${p}" fill="${REGIONS[k].color}"/>`).join("")}
  </g>
  <g class="regions">
    ${keys.map(([x, y], i) => `<ellipse class="region" data-region="keys" cx="${x}" cy="${y}" rx="${16 - i * 0.4}" ry="6" transform="rotate(-18 ${x} ${y})" fill="${REGIONS.keys.color}"/>`).join("")}
    ${isles.map(([x, y, rx, ry]) => `<ellipse class="region" data-region="vice" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${REGIONS.vice.color}"/>`).join("")}
    <path class="region" data-region="vice" d="M864 640 C872 690 874 745 868 800" stroke="${REGIONS.vice.color}" stroke-width="7" stroke-linecap="round" fill="none"/>
  </g>
  <path d="${land}" fill="none" stroke="var(--coast)" stroke-width="2.5"/>
  <polyline points="${keys.map((k) => k.join(",")).join(" ")}" fill="none" stroke="var(--road)" stroke-width="2" stroke-dasharray="5 5"/>
  <path d="M720 905 C740 880 760 860 780 830 C800 790 812 740 818 700 C826 620 834 520 840 420" fill="none" stroke="var(--road)" stroke-width="2.4" stroke-dasharray="7 6" opacity=".7"/>
  <path d="M200 225 C320 230 430 270 480 340 C520 400 560 430 640 440 C700 450 760 560 800 680" fill="none" stroke="var(--road)" stroke-width="2.4" stroke-dasharray="7 6" opacity=".7"/>
  <ellipse cx="712" cy="476" rx="32" ry="24" fill="url(#sea)" stroke="var(--coast)" stroke-width="2"/>
  ${labels}
  ${towns}
  <g class="compass" transform="translate(110 900)">
    <circle r="40" fill="var(--panel)" stroke="var(--coast)" stroke-width="2"/>
    <path d="M0 -30 L8 0 L0 30 L-8 0Z" fill="var(--muted)"/><path d="M0 -30 L8 0 L-8 0Z" fill="#ff4f9a"/>
    <text y="-44" text-anchor="middle">N</text>
  </g>
  <g class="pins">${pins}</g>
</svg>`;
  }
  function renderMap() {
    const pinsAll = allPins();
    const legend = MAP_CATS.map((c) => {
      const n = pinsAll.filter((p) => p.c === c).length;
      return `<button class="legend-btn is-on" data-layer="${c}" style="--lc:${cat(c).grad[1]}"><span class="legend-btn__dot"></span>${esc(catName(c))}<span>${n}</span></button>`;
    }).join("");
    const regions = MAPINFO.regions.map((r, i) => `
      <article class="region-card reveal" style="--rc:${REGIONS[r.key].color};--d:${(i % 3) * 60}ms" data-region-card="${r.key}">
        <h3><span class="region-card__dot"></span>${esc(regionName(r.key))}</h3>
        <p>${esc(t(r.text))}</p>
      </article>`).join("");
    const facts = MAPINFO.facts.map((f) => `<div class="fact-big reveal"><b>${esc(f.big)}</b><span>${esc(t(f.text))}</span></div>`).join("");
    const ext = MAPINFO.external.map(([n, u]) => `<a class="ext-card" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}<span class="ico">${ICON.ext}</span></a>`).join("");
    const body = `
      <div class="facts-row">${facts}</div>
      <div class="map-panel reveal">
        <div class="map-panel__head">
          <h2>${esc(ui("mapTitle"))}</h2>
          <div class="legend" role="group" aria-label="${esc(ui("legend"))}">${legend}</div>
        </div>
        <div class="map-box" id="mapBox">${renderMapSvg()}<div class="map-pop" id="mapPop" hidden></div></div>
        <p class="map-note"><span class="ico ico--xs">${ICON.info}</span>${esc(ui("mapNote"))}</p>
      </div>
      <h2 class="h2 reveal">${esc(ui("regionsTitle"))}</h2>
      <div class="grid grid--regions">${regions}</div>
      <h2 class="h2 reveal">${esc(ui("exactMaps"))}</h2>
      <div class="ext-row reveal">${ext}</div>`;
    return detailShell("map", `<span class="chip"><b>6</b> ${esc(ui("regionsWord"))}</span><span class="chip"><b>${pinsAll.length}</b> spots</span>`, body, MAPINFO.sources);
  }
  function bindMap(root) {
    const box = $("#mapBox", root);
    if (!box) return;
    const pop = $("#mapPop", root);
    const show = (g) => {
      const c = g.dataset.c, it = findItem(c, g.dataset.id);
      const [x, y] = it.pin;
      $$(".pin.is-active", box).forEach((p) => p.classList.remove("is-active"));
      g.classList.add("is-active");
      pop.hidden = false;
      pop.style.left = (x / 1000) * 100 + "%";
      pop.style.top = (y / 1060) * 100 + "%";
      pop.classList.toggle("map-pop--left", x > 700);
      pop.classList.toggle("map-pop--below", y < 340);
      pop.style.setProperty("--c1", cat(c).grad[0]); pop.style.setProperty("--c2", cat(c).grad[1]);
      const sub = c === "safes" ? `${ui("code")} : <b class="mono">${esc(it.code)}</b>` : esc(t(it.loc || it.note || ""));
      pop.innerHTML = `<button class="map-pop__x" aria-label="${esc(ui("close"))}">${ICON.close}</button>
        <p class="map-pop__cat">${esc(catName(c))} · ${esc(regionName(it.region))}</p>
        <h4>${esc(itemName(it))}</h4><p class="map-pop__sub">${sub}</p>
        ${c !== "safes" ? `<a class="map-pop__go" href="#/${c}/${it.id}">${esc(ui("openSheet"))} →</a>` : ""}`;
      pop.classList.remove("pop-in"); void pop.offsetWidth; pop.classList.add("pop-in");
    };
    box.addEventListener("click", (e) => {
      const g = e.target.closest(".pin");
      if (g) { show(g); return; }
      if (e.target.closest(".map-pop__x") || !e.target.closest(".map-pop")) { pop.hidden = true; $$(".pin.is-active", box).forEach((p) => p.classList.remove("is-active")); }
    });
    box.addEventListener("keydown", (e) => { const g = e.target.closest(".pin"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); show(g); } });
    $$(".legend-btn", root).forEach((b) => b.addEventListener("click", () => {
      b.classList.toggle("is-on");
      const on = b.classList.contains("is-on");
      $$(`.pin[data-c="${b.dataset.layer}"]`, box).forEach((p) => p.classList.toggle("is-off", !on));
      pop.hidden = true;
    }));
    /* Survol d'une carte région => la région s'illumine sur la carte */
    $$("[data-region-card]", root).forEach((card) => {
      card.addEventListener("mouseenter", () => box.querySelectorAll(`.region[data-region="${card.dataset.regionCard}"]`).forEach((r) => r.classList.add("is-hi")));
      card.addEventListener("mouseleave", () => box.querySelectorAll(".region.is-hi").forEach((r) => r.classList.remove("is-hi")));
    });
  }

  const RENDER = { map: renderMap, cheats: renderCheats, cars: renderCars, eggs: renderEggs, money: renderMoney, safes: renderSafes, hundred: renderHundred, tips: renderTips, people: renderPeople };

  function renderCategory(id) {
    app.innerHTML = RENDER[id]();
    hydrateImages(app);
    const root = $(".detail", app);
    bindToolbar(root);
    bindMap(root);
    $$(".seg__btn", root).forEach((b) => b.addEventListener("click", () => {
      state.platform = b.dataset.platform; store.set("gtn6-platform", state.platform);
      const y = window.scrollY; renderCategory("cheats"); window.scrollTo(0, y);
    }));
    reveal(app);
  }

  /* ================================================================ MODALE */
  const modal = $("#modal"), sheet = $(".modal__sheet", modal);
  let lastFocus = null;
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
          <div class="badges">${confBadge(it.conf)}</div>
          <div class="facts">
            <div class="fact"><span>${esc(ui("effect"))}</span><p>${esc(t(it.effect))}</p></div>
            <div class="fact"><span>${esc(ui("unlock"))}</span><p>${esc(t(it.unlock))}</p></div>
          </div>
          ${it.note ? `<div class="callout callout--warn"><span class="ico">${ICON.warn}</span><p><b>${esc(ui("note"))} —</b> ${esc(t(it.note))}</p></div>` : ""}
          <div class="callout"><span class="ico">${ICON.info}</span><p>${esc(t(CHEATS.warning))}</p></div>
          <div class="sheet__actions">${it.code ? `<button class="btn btn--primary" data-copy="${esc(arrowsText(it.code))}"><span class="ico">${ICON.copy}</span>${esc(ui("copy"))}</button>` : ""}</div>
        </div>`;
    } else {
      const facts = [
        ["location", it.loc], ["how", it.how], ["reward", it.reward], ["value", it.value]
      ];
      html = `
        <div class="sheet__media">
          <span class="item-card__art">${art(cat(c).icon)}</span>
          ${it.yt ? yt(it.yt, { eager: true, alt: itemName(it) }) : ""}
          ${it.yt ? `<a class="sheet__play" href="https://www.youtube.com/watch?v=${esc(it.yt)}" target="_blank" rel="noopener noreferrer"><span class="ico">${ICON.play}</span>${esc(ui("video"))}</a>` : ""}
        </div>
        <div class="sheet__content">
          <p class="kicker">${esc(catName(c))} · ${esc(regionName(it.region))}</p>
          <h2 id="modalTitle">${esc(itemName(it))}</h2>
          <div class="badges">${confBadge(it.conf)}${it.tag ? `<span class="rtag rtag--plain">${esc(t(it.tag))}</span>` : ""}${it.type ? `<span class="rtag rtag--plain">${esc(t(it.type))}</span>` : ""}${it.amount ? `<span class="amount">${esc(it.amount)}</span>` : ""}</div>
          ${it.desc ? `<p class="sheet__lead">${esc(t(it.desc))}</p>` : ""}
          <div class="facts">
            ${facts.filter(([, v]) => v).map(([k, v]) => `<div class="fact"><span>${esc(ui(k))}</span><p>${esc(t(v))}</p></div>`).join("")}
          </div>
          ${it.note ? `<div class="callout callout--warn"><span class="ico">${ICON.warn}</span><p><b>${esc(ui("note"))} —</b> ${esc(t(it.note))}</p></div>` : ""}
          <div class="sheet__actions">
            <button class="btn ${found ? "btn--done" : "btn--primary"}" data-found="${c}/${id}" aria-pressed="${found}"><span class="ico">${ICON.check}</span>${esc(found ? ui("found") : ui("markFound"))}</button>
            ${it.yt ? `<a class="btn" href="https://www.youtube.com/watch?v=${esc(it.yt)}" target="_blank" rel="noopener noreferrer"><span class="ico">${ICON.play}</span>${esc(ui("video"))}</a>` : ""}
          </div>
        </div>`;
    }
    sheet.setAttribute("style", gradVars(g));
    sheet.innerHTML = `<button class="sheet__close" data-close aria-label="${esc(ui("close"))}">${ICON.close}</button>${html}`;
    hydrateImages(sheet);
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
        b.classList.toggle("btn--done", on); b.classList.toggle("btn--primary", !on && b.classList.contains("btn"));
        if (b.classList.contains("btn")) b.lastChild.textContent = on ? ui("found") : ui("markFound");
        b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
      });
      $$(`[data-open="${c}/${id}"], .safe-card [data-found="${c}/${id}"]`).forEach((el) => (el.closest(".item-card, .safe-card") || el).classList.toggle("is-found", on));
      updateProgress(c);
      return;
    }
    const op = e.target.closest("[data-open]");
    if (op && !e.target.closest("a")) {
      state.modalFromPage = true;
      location.hash = "#/" + op.dataset.open;
    }
  });
  document.addEventListener("keydown", (e) => {
    const op = e.target.closest?.("[data-open]");
    if (op && (e.key === "Enter" || e.key === " ") && e.target === op) { e.preventDefault(); state.modalFromPage = true; location.hash = "#/" + op.dataset.open; }
  });
  /* Clic dans les cartes « à la une » : marque comme ouvert depuis la page */
  document.addEventListener("click", (e) => { if (e.target.closest(".fan-card, .map-pop__go")) state.modalFromPage = true; }, true);

  /* =================================================================== ROUTEUR */
  function route(opts = {}) {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const c = parts[0] && RENDER[parts[0]] ? parts[0] : null;
    const item = parts[1];
    const prev = state.view;

    if (!c) {
      closeModal(true);
      if (prev !== null || opts.force || !app.firstElementChild) {
        renderHome();
        if (prev && !opts.force) {
          window.scrollTo(0, state.homeScroll);
          if (state.enteredVia === prev) shrinkTo(prev, cat(prev).grad);
        } else if (!opts.keepScroll) window.scrollTo(0, 0);
        state.enteredVia = null;
      }
      state.view = null;
      document.title = "Grand Theft News 6";
      return;
    }
    if (prev !== c || opts.force) {
      if (prev === null && !opts.force) state.homeScroll = window.scrollY;
      renderCategory(c);
      if (!opts.keepScroll) window.scrollTo(0, 0);
      state.view = c;
    }
    document.title = `${catName(c)} · Grand Theft News 6`;
    if (item) { if (!openModal(c, item)) closeModal(true); }
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
    $$("[data-icon]").forEach((el) => { if (!el.innerHTML) el.innerHTML = ICON[el.dataset.icon]; });
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
    setTimeout(() => {
      route({ force: true, keepScroll: true });
      window.scrollTo(0, y);
      app.classList.remove("swap");
    }, reduced ? 0 : 160);
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
