/* Moteur "Draw My Life" — SVG rendu image par image, 100 % déterministe.
 *
 * Chaque élément calcule son état à partir du temps t uniquement : on peut donc
 * rendre n'importe quelle image dans n'importe quel ordre (rendu parallèle).
 *
 * Vocabulaire :
 *   part   : morceau de dessin (tracé, texte, groupe) décrit par P(), T(), G()
 *   draw() : fait dessiner une liste de parts par la main au feutre
 *   pop()  : fait apparaître une liste de parts avec un rebond (sans la main)
 *   anim() : fonction (t) appelée à chaque image pour animer un élément
 */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1080, H = 1920;
  const FOCUS = { x: 540, y: 760 }; // centre de la zone de dessin à l'écran

  const C = {
    ink: '#1d1b20', paper: '#fbf8f2', skin: '#ffd8b5', blush: '#ff9d8a',
    hair: '#5b3a29', coral: '#ff6b4a', yellow: '#ffd23f', blue: '#4da3ff',
    navy: '#2f3e5c', green: '#5bd17a', pink: '#ff8fb8', purple: '#9b6bff',
    grey: '#c9c4bb', wood: '#d9a066', white: '#ffffff', red: '#ff4b4b',
    night: '#2b2d5c', glow: '#bfe3ff', potato: '#d9a45b',
  };

  const E = (window.E = {
    W, H, C, FOCUS, timing: null, fps: 30,
    items: [], pens: [], anims: [], events: [], cams: [], punches: [], shakes: [],
    scenes: [], uid: 0,
  });

  // ---------- utilitaires ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = {
    linear: (p) => p,
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    out: (p) => 1 - Math.pow(1 - p, 3),
    in: (p) => p * p * p,
    backOut: (p) => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    stroke: (p) => 0.55 * p + 0.45 * (p * p * (3 - 2 * p)),
  };
  Object.assign(E, { clamp, lerp, ease });

  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  E.el = el;

  // Mise à jour d'attribut seulement si la valeur change (perf).
  function set(e, k, v) {
    const key = '_' + k;
    if (e[key] === v) return;
    e[key] = v;
    if (v === null) e.removeAttribute(k);
    else e.setAttribute(k, v);
  }
  E.set = set;

  // ---------- descripteurs de dessin ----------
  // P(d, {fill, stroke, w, seq, name, back, alt, op})
  E.P = (d, o = {}) => ({ k: 'p', d, ...o });
  // Tube : trait épais à contour (bras, jambes, ficelles…)
  E.Tube = (d, o = {}) => ({ k: 'tube', d, ...o });
  // T(texte, x, y, {size, font, fill, anchor, rot, seq, name, stroke})
  E.T = (s, x, y, o = {}) => ({ k: 't', s, x, y, ...o });
  // G(parts, {tf, name, seq, alt})
  E.G = (parts, o = {}) => ({ k: 'g', parts, ...o });

  const FONTS = {
    marker: "'Permanent Marker', cursive",
    hand: "'Gochi Hand', cursive",
    titan: "'Titan One', cursive",
    fredoka: "'Fredoka', sans-serif",
  };
  E.FONTS = FONTS;

  // ---------- timing de la voix ----------
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9']/g, '');
  E.L = (id) => {
    const l = E.timing.lines.find((x) => x.id === id);
    if (!l) throw new Error('Réplique inconnue : ' + id);
    return l;
  };
  // Instant où le mot `word` est prononcé dans la réplique `id`.
  E.Wd = (id, word, nth = 0, which = 'start') => {
    const l = E.L(id);
    const target = norm(word);
    const hits = l.words.filter((w) => norm(w.w).startsWith(target) || norm(w.w).includes(target));
    if (!hits.length) throw new Error(`Mot "${word}" introuvable dans ${id}`);
    return hits[Math.min(nth, hits.length - 1)][which];
  };

  // ---------- scènes ----------
  E.scene = (name, x, y) => {
    const g = el('g', { id: 'scene-' + name, transform: `translate(${x},${y})` }, E.world);
    const s = { name, x, y, g };
    E.scenes.push(s);
    return s;
  };

  // Instancie récursivement des parts dans un parent SVG ; renvoie la liste à planifier.
  function build(parts, parent, ctx, inheritedSeq) {
    const out = [];
    parts.forEach((part, i) => {
      if (!part) return;
      const seq = part.seq !== undefined ? part.seq : inheritedSeq !== undefined ? inheritedSeq + i * 0.001 : ctx.n++;
      if (part.k === 'g') {
        const g = el('g', { transform: part.tf || null }, parent);
        if (part.pivot) g._pivot = part.pivot;
        if (part.name) ctx.named[part.name] = g;
        if (part.alt) { g.setAttribute('display', 'none'); ctx.alts.push(g); }
        const sub = build(part.parts, g, ctx, seq);
        if (!part.alt) out.push(...sub);
        return;
      }
      if (part.k === 'p') {
        const node = { part, seq, els: {} };
        const op = part.op !== undefined ? part.op : null;
        if (part.fill) {
          const back = part.back !== undefined ? part.back : true;
          if (back) node.els.back = el('path', { d: part.d, fill: C.paper, stroke: 'none' }, parent);
          node.els.fill = el('path', { d: part.d, fill: part.fill, stroke: 'none', opacity: op }, parent);
        }
        if (part.stroke !== false) {
          node.els.stroke = el('path', {
            d: part.d, fill: 'none', stroke: part.stroke || C.ink, 'stroke-width': (part.w || 7) * ctx.lw,
            'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: op,
          }, parent);
        }
        if (part.name) ctx.named[part.name] = node.els.stroke || node.els.fill;
        if (!part.alt) out.push(node);
        else Object.values(node.els).forEach((e) => { e.setAttribute('display', 'none'); ctx.alts.push(e); });
        return;
      }
      if (part.k === 'tube') {
        const w = part.w || 34;
        const node = { part, seq, els: {}, tube: true };
        const base = { d: part.d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
        node.els.out = el('path', { ...base, stroke: part.stroke || C.ink, 'stroke-width': w + 14 * ctx.lw }, parent);
        node.els.inP = el('path', { ...base, stroke: C.paper, 'stroke-width': w }, parent);
        node.els.in = el('path', { ...base, stroke: part.fill || C.white, 'stroke-width': w }, parent);
        if (part.name) ctx.named[part.name] = node.els.out;
        if (!part.alt) out.push(node);
        return;
      }
      if (part.k === 't') {
        const size = part.size || 60;
        const wrap = el('g', { transform: part.rot ? `rotate(${part.rot},${part.x},${part.y})` : null }, parent);
        const t = el('text', {
          x: part.x, y: part.y, 'font-family': FONTS[part.font || 'marker'], 'font-size': size,
          fill: part.fill || C.ink, 'text-anchor': part.anchor || 'middle', 'dominant-baseline': 'middle',
          'letter-spacing': part.ls || null,
          stroke: part.stroke || null, 'stroke-width': part.sw || null, 'paint-order': part.stroke ? 'stroke' : null,
          'stroke-linejoin': 'round',
        }, wrap);
        t.textContent = part.s;
        const node = { part, seq, els: { text: t, wrap }, text: true };
        if (part.name) ctx.named[part.name] = wrap;
        if (!part.alt) out.push(node);
        else { wrap.setAttribute('display', 'none'); ctx.alts.push(wrap); }
        return;
      }
    });
    return out;
  }

  // Zigzag de coloriage couvrant une bbox (dans le repère local du tracé).
  function zigzag(b, bw) {
    const step = bw * 0.78;
    const slant = Math.min(b.width * 0.18, 40);
    const x0 = b.x - bw * 0.3, x1 = b.x + b.width + bw * 0.3;
    let y = b.y - bw * 0.2, d = `M${x0},${y}`, left = true;
    const yEnd = b.y + b.height + bw * 0.5 + slant;
    while (y < yEnd) {
      y += step / 2;
      d += ` L${left ? x1 : x0},${y - (left ? slant : 0)}`;
      left = !left;
    }
    return d;
  }

  // Point (local) → écran.
  function toScreen(node, x, y) {
    const m = node.getCTM();
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  }

  /* Fait dessiner des parts par la main.
   * o: {at, x, y, s, r, flip, speed, dur, color:'after'|'each'|'instant', pen, gap, maxStroke} */
  E.draw = (scene, parts, o = {}) => {
    const at = o.at !== undefined ? o.at : 0;
    const tf = `translate(${o.x || 0},${o.y || 0}) rotate(${o.r || 0}) scale(${(o.flip ? -1 : 1) * (o.s || 1)},${o.s || 1})`;
    const g = el('g', { transform: tf }, scene.g || scene);
    // traits plus épais pour les petits dessins (sinon ils deviennent trop fins)
    const sc = o.s || 1;
    const ctx = { named: {}, alts: [], n: 0, lw: o.lw || (sc < 0.8 ? Math.min(2.6, 0.8 / sc) : 1) };
    const nodes = build(Array.isArray(parts) ? parts : [parts], g, ctx);
    nodes.sort((a, b) => a.seq - b.seq);

    const speed = o.speed || 2600; // px (locaux) / s
    const gap = o.gap !== undefined ? o.gap : 0.035;
    const colorMode = o.color || 'after';
    const scale = o.s || 1;

    // 1) mesures
    const strokes = [], fills = [];
    for (const n of nodes) {
      if (n.text) {
        const bb = n.els.text.getBBox();
        n.bb = bb;
        n.dur = clamp(n.part.s.length * 0.055, 0.15, 1.2);
        strokes.push(n);
        continue;
      }
      const sEl = n.tube ? n.els.out : n.els.stroke;
      if (sEl) {
        n.len = sEl.getTotalLength();
        n.dur = clamp((n.len * scale) / speed, 0.05, o.maxStroke || 0.75);
        strokes.push(n);
      }
      if (n.tube) {
        n.fillDur = colorMode === 'instant' ? 0.001 : clamp((n.len * scale) / (speed * 2.2), 0.06, 0.3);
        fills.push(n);
        continue;
      }
      if (n.els.fill) {
        const bb = n.els.fill.getBBox();
        const bw = clamp(Math.min(bb.width, bb.height) / 2.2, 14, 70);
        const zz = zigzag(bb, bw);
        const id = 'm' + E.uid++;
        const mask = el('mask', { id, maskUnits: 'userSpaceOnUse', x: -1e5, y: -1e5, width: 2e5, height: 2e5 }, E.defs);
        const mp = el('path', { d: zz, fill: 'none', stroke: '#fff', 'stroke-width': bw * 1.25, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, mask);
        // le masque doit vivre dans le même repère que le tracé : on le place via transform identique
        n.mask = { id, path: mp, mEl: mask, len: mp.getTotalLength() };
        n.els.fill.setAttribute('mask', `url(#${id})`);
        n.fillDur = clamp((n.mask.len * scale) / (speed * 3.4), 0.08, 0.5);
        if (n.part.instant || colorMode === 'instant') n.fillDur = 0.001;
        fills.push(n);
      }
    }

    // 2) planning
    const plan = [];
    if (colorMode === 'each') {
      for (const n of nodes) {
        if (strokes.includes(n)) plan.push({ n, kind: 'stroke', d: n.dur });
        if (fills.includes(n)) plan.push({ n, kind: 'fill', d: n.fillDur });
      }
    } else {
      for (const n of strokes) plan.push({ n, kind: 'stroke', d: n.dur });
      for (const n of fills) plan.push({ n, kind: 'fill', d: n.fillDur });
    }
    let total = plan.reduce((a, p) => a + p.d + gap, 0);
    const k = o.dur ? o.dur / total : 1;
    let t = at;
    for (const p of plan) {
      p.t0 = t;
      p.t1 = t + p.d * k;
      t = p.t1 + gap * k;
    }
    const end = plan.length ? plan[plan.length - 1].t1 : at;

    // 3) items animés
    for (const p of plan) {
      const n = p.n;
      if (p.kind === 'stroke' && n.text) {
        const bb = n.bb;
        const id = 'c' + E.uid++;
        const cp = el('clipPath', { id }, E.defs);
        const r = el('rect', { x: bb.x - 10, y: bb.y - 30, width: 0, height: bb.height + 60 }, cp);
        n.els.text.setAttribute('clip-path', `url(#${id})`);
        const t0 = p.t0, t1 = p.t1, wrap = n.els.wrap;
        E.items.push((tt) => {
          const q = clamp((tt - t0) / (t1 - t0));
          set(wrap, 'visibility', q <= 0 ? 'hidden' : 'visible');
          set(r, 'width', ((bb.width + 20) * q).toFixed(1));
        });
        const letters = Math.max(n.part.s.length, 1);
        if (o.pen !== false) E.pens.push({ t0, t1, kind: 'write', at: (q) => toScreen(n.els.text, bb.x + bb.width * q, bb.y + bb.height * (0.5 + 0.28 * Math.sin(q * letters * Math.PI * 1.3))) });
        continue;
      }
      if (p.kind === 'stroke') {
        const els = n.tube ? [n.els.out, n.els.inP] : [n.els.stroke];
        const L = n.len + 1;
        els.forEach((e) => e.setAttribute('stroke-dasharray', `${L} ${L + 10}`));
        const back = n.els.back;
        const t0 = p.t0, t1 = p.t1;
        E.items.push((tt) => {
          const q = ease.stroke(clamp((tt - t0) / (t1 - t0)));
          for (const e of els) {
            set(e, 'visibility', q <= 0 ? 'hidden' : 'visible');
            set(e, 'stroke-dashoffset', q >= 1 ? '0' : (L * (1 - q)).toFixed(1));
          }
          if (back) set(back, 'visibility', tt >= t0 ? 'visible' : 'hidden');
        });
        const pathEl = els[0];
        if (o.pen !== false) E.pens.push({ t0, t1, kind: 'draw', len: n.len * scale, at: (q) => { const pt = pathEl.getPointAtLength(n.len * ease.stroke(q)); return toScreen(pathEl, pt.x, pt.y); } });
        continue;
      }
      if (p.kind === 'fill' && n.tube) {
        const e = n.els.in, L = n.len + 1, t0 = p.t0, t1 = p.t1;
        e.setAttribute('stroke-dasharray', `${L} ${L + 10}`);
        E.items.push((tt) => {
          const q = clamp((tt - t0) / (t1 - t0));
          set(e, 'visibility', q <= 0 ? 'hidden' : 'visible');
          set(e, 'stroke-dashoffset', q >= 1 ? '0' : (L * (1 - q)).toFixed(1));
        });
        if (colorMode !== 'instant' && o.pen !== false)
          E.pens.push({ t0, t1, kind: 'fill', len: n.len * scale, at: (q) => { const pt = e.getPointAtLength(n.len * q); return toScreen(e, pt.x, pt.y); } });
        continue;
      }
      if (p.kind === 'fill') {
        const m = n.mask, fillEl = n.els.fill, back = n.els.back;
        const L = m.len + 1;
        m.path.setAttribute('stroke-dasharray', `${L} ${L + 10}`);
        const t0 = p.t0, t1 = p.t1;
        // si le tracé n'a pas de contour, le fond papier apparaît avec la couleur
        const hasStroke = !!n.els.stroke;
        E.items.push((tt) => {
          const q = clamp((tt - t0) / (t1 - t0));
          set(fillEl, 'visibility', q <= 0 ? 'hidden' : 'visible');
          if (q >= 1) set(fillEl, 'mask', null);
          else { set(fillEl, 'mask', `url(#${m.id})`); set(m.path, 'stroke-dashoffset', (L * (1 - q)).toFixed(1)); }
          if (back && !hasStroke) set(back, 'visibility', q > 0 ? 'visible' : 'hidden');
        });
        if (!n.part.instant && colorMode !== 'instant' && o.pen !== false)
          E.pens.push({ t0, t1, kind: 'fill', len: m.len * scale, at: (q) => { const pt = m.path.getPointAtLength(m.len * q); return toScreen(fillEl, pt.x, pt.y); } });
      }
    }

    const h = { g, start: at, end, parts: ctx.named, alts: ctx.alts, plan };
    return h;
  };

  /* Apparition "pop" (rebond) sans la main. o: {at, x, y, s, r, dur, from} */
  E.pop = (scene, parts, o = {}) => {
    const outer = el('g', {}, scene.g || scene);
    const inner = el('g', {}, outer);
    const sc = o.s || 1;
    const ctx = { named: {}, alts: [], n: 0, lw: o.lw || (sc < 0.8 ? Math.min(2.6, 0.8 / sc) : 1) };
    build(Array.isArray(parts) ? parts : [parts], inner, ctx);
    const at = o.at || 0, dur = o.dur || 0.38, s = o.s || 1;
    const x = o.x || 0, y = o.y || 0, r = o.r || 0;
    E.items.push((tt) => {
      const q = clamp((tt - at) / dur);
      set(outer, 'visibility', q <= 0 ? 'hidden' : 'visible');
      const k = q >= 1 ? 1 : ease.backOut(q);
      set(outer, 'transform', `translate(${x},${y}) rotate(${r}) scale(${(s * Math.max(k, 0.001)).toFixed(4)})`);
    });
    if (!o.silent) E.events.push({ type: 'pop', t: at });
    return { g: outer, inner, start: at, end: at + dur, parts: ctx.named, alts: ctx.alts };
  };

  // Animation libre : fn(t) appelée à chaque image.
  E.anim = (fn) => E.anims.push(fn);

  // Fait parler un perso (bouche ouverte/fermée selon le volume de la voix).
  E.talk = (h, t0, t1) => {
    const closed = h.parts.mouth, open = h.parts.mouthOpen;
    if (!closed || !open) return;
    // Plusieurs plages de parole possibles : on les cumule sur le même perso.
    (h._talk = h._talk || []).push([t0, t1]);
    if (h._talk.length > 1) return;
    E.anim((t) => {
      let isOpen = false;
      if (h._talk.some(([a, b]) => t >= a && t <= b)) {
        const f = Math.floor(t * E.fps);
        const v = E.timing.env[f] || 0;
        isOpen = v > 0.28 && f % 5 !== 4;
      }
      set(open, 'display', isOpen ? 'inline' : 'none');
      set(closed, 'opacity', isOpen ? '0' : '1');
    });
  };

  // Clignement des yeux à intervalles réguliers (décalés par seed).
  E.blink = (h, from, to = 1e9, seed = 0) => {
    const open = h.parts.eyes, shut = h.parts.eyesClosed;
    if (!open || !shut) return;
    E.anim((t) => {
      let closed = false;
      if (t > from && t < to) {
        const period = 2.7 + (seed % 3) * 0.4;
        const ph = (t - from + seed * 0.37) % period;
        closed = ph > period - 0.13;
      }
      set(open, 'opacity', closed ? '0' : '1');
      set(shut, 'display', closed ? 'inline' : 'none');
    });
  };

  // Change d'expression (variante définie dans person({faces:{...}})) entre t0 et t1.
  E.expr = (h, name, t0, t1 = 1e9) => {
    (h._expr = h._expr || []).push({ name, t0, t1 });
    if (h._expr.length > 1) return;
    const main = h.parts.face;
    E.anim((t) => {
      let active = null;
      for (const x of h._expr) if (t >= x.t0 && t < x.t1) active = x.name;
      set(main, 'display', active ? 'none' : 'inline');
      for (const x of h._expr) {
        const g = h.parts['face_' + x.name];
        if (g) set(g, 'display', active === x.name ? 'inline' : 'none');
      }
    });
  };

  // Balancement d'un groupe autour de son pivot (ex : bras qui fait coucou).
  E.swing = (g, t0, t1, amp = 14, freq = 2.2, base = 0) => {
    const [px, py] = g._pivot || [0, 0];
    (g._sw = g._sw || []).push({ t0, t1, amp, freq, base });
    if (g._sw.length > 1) return;
    E.anim((t) => {
      let a = 0;
      for (const w of g._sw) {
        if (t < w.t0 || t > w.t1) continue;
        const env = Math.min(1, (t - w.t0) / 0.15, (w.t1 - t) / 0.15);
        a = w.base * env + Math.sin((t - w.t0) * w.freq * Math.PI * 2) * w.amp * env;
      }
      set(g, 'transform', a ? `rotate(${a.toFixed(2)},${px},${py})` : null);
    });
  };

  // Déplace un groupe (handle.g ou élément) le long d'une trajectoire fn(q) → {x,y,r,s}.
  E.move = (node, t0, t1, fn, e = 'inOut') => {
    const base = node.getAttribute('transform') || '';
    E.anim((t) => {
      const q = ease[e](clamp((t - t0) / (t1 - t0)));
      const m = fn(q, t);
      set(node, 'transform', `${base} translate(${(m.x || 0).toFixed(1)},${(m.y || 0).toFixed(1)}) rotate(${(m.r || 0).toFixed(2)}) scale(${m.s === undefined ? 1 : m.s})`);
    });
  };

  // Petit rebond continu (respiration) d'un handle après son dessin.
  E.bob = (h, t0, t1 = 1e9, amp = 4, freq = 1.6) => {
    const base = h.g.getAttribute('transform');
    E.anim((t) => {
      const on = t > t0 && t < t1;
      const dy = on ? Math.sin((t - t0) * freq * Math.PI * 2) * amp : 0;
      set(h.g, 'transform', dy ? `${base} translate(0,${dy.toFixed(2)})` : base);
    });
  };

  // Affiche/masque un élément à partir de t (display).
  E.showAt = (node, t0, t1 = 1e9) => E.anim((t) => set(node, 'display', t >= t0 && t < t1 ? 'inline' : 'none'));

  // ---------- caméra ----------
  E.camSet = (x, y, z = 1) => { E.cam0 = { x, y, z }; };
  E.camTo = (t, x, y, z = 1, dur = 0.6, e = 'inOut', sfx = true) => {
    E.cams.push({ t, x, y, z, dur, e });
    if (sfx && dur > 0.2) E.events.push({ type: 'whoosh', t, dur });
  };
  E.punch = (t, amt = 0.08, dur = 0.45) => E.punches.push({ t, amt, dur });
  E.shake = (t, dur = 0.4, amp = 10) => E.shakes.push({ t, dur, amp });
  E.sfx = (type, t, extra = {}) => E.events.push({ type, t, ...extra });

  function camAt(t) {
    let s = { ...E.cam0 };
    for (const m of E.cams) {
      if (t >= m.t + m.dur) { s = { x: m.x, y: m.y, z: m.z }; continue; }
      if (t > m.t) {
        const q = ease[m.e](clamp((t - m.t) / m.dur));
        // zoom en espace logarithmique (plus naturel)
        s = { x: lerp(s.x, m.x, q), y: lerp(s.y, m.y, q), z: Math.exp(lerp(Math.log(s.z), Math.log(m.z), q)) };
      }
      break;
    }
    let z = s.z, ox = 0, oy = 0;
    for (const p of E.punches) {
      const q = (t - p.t) / p.dur;
      if (q < 0 || q > 1) continue;
      const bump = q < 0.18 ? ease.out(q / 0.18) : 1 - ease.inOut((q - 0.18) / 0.82);
      z *= 1 + p.amt * bump;
    }
    for (const sh of E.shakes) {
      const q = (t - sh.t) / sh.dur;
      if (q < 0 || q > 1) continue;
      const a = sh.amp * (1 - q);
      ox += Math.sin(t * 91) * a;
      oy += Math.cos(t * 77) * a;
    }
    return { x: s.x, y: s.y, z, ox, oy };
  }
  E.camAt = camAt;

  // ---------- main au feutre ----------
  function penAt(t) {
    const pens = E.pens;
    let prev = null, next = null;
    for (const p of pens) {
      if (t >= p.t0 && t < p.t1) return { ...p.at((t - p.t0) / (p.t1 - p.t0)), down: true, kind: p.kind };
      if (p.t1 <= t && (!prev || p.t1 > prev.t1)) prev = p;
      if (p.t0 > t && (!next || p.t0 < next.t0)) next = p;
    }
    const OFF = { x: W + 140, y: 1500 };
    const a = prev ? prev.at(1) : OFF;
    const b = next ? next.at(0) : OFF;
    const ta = prev ? prev.t1 : -10, tb = next ? next.t0 : 1e9;
    const span = tb - ta;
    if (span < 0.9) {
      const q = ease.inOut(clamp((t - ta) / span));
      return { x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q) - Math.sin(q * Math.PI) * 18, down: false };
    }
    const exit = 0.4, enter = 0.4;
    if (t - ta < exit && prev) { const q = ease.in((t - ta) / exit); return { x: lerp(a.x, OFF.x, q), y: lerp(a.y, OFF.y, q), down: false }; }
    if (tb - t < enter && next) { const q = ease.out(1 - (tb - t) / enter); return { x: lerp(OFF.x, b.x, q), y: lerp(OFF.y, b.y, q), down: false }; }
    return { ...OFF, hidden: true };
  }
  E.penAt = penAt;

  // ---------- sous-titres ----------
  function buildCaptions() {
    const chunks = [];
    const lines = E.timing.lines;
    lines.forEach((l, li) => {
      let cur = [];
      const flush = () => { if (cur.length) chunks.push({ words: cur }); cur = []; };
      l.words.forEach((w, i) => {
        cur.push(w);
        const chars = cur.map((x) => x.w).join(' ').length;
        const punct = /[.,:;?!…]$/.test(w.w);
        const nextW = l.words[i + 1];
        const nextLen = nextW ? chars + 1 + nextW.w.length : 0;
        if (punct || cur.length >= 3 || nextLen > 17) flush();
      });
      flush();
      // fins de chunks
      const lineChunks = chunks.filter((c) => !c.done);
      lineChunks.forEach((c, i) => {
        c.done = true;
        c.start = c.words[0].start;
        const nxt = lineChunks[i + 1];
        const nextLine = lines[li + 1];
        c.end = nxt ? nxt.words[0].start : Math.min(l.end + 0.35, nextLine ? nextLine.start : 1e9);
      });
    });
    E.captions = chunks;
    const layer = E.capLayer;
    for (const c of chunks) {
      const g = el('g', { visibility: 'hidden' }, layer);
      const txt = c.words.map((w) => w.w.toUpperCase()).join(' ');
      const mk = (fill, stroke, dy) => {
        const t = el('text', {
          x: 540, y: 1395 + dy, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
          'font-family': FONTS.titan, 'font-size': 74, fill, stroke, 'stroke-width': 16,
          'stroke-linejoin': 'round', 'paint-order': 'stroke', 'letter-spacing': 1,
        }, g);
        c.words.forEach((w, i) => {
          const sp = el('tspan', {}, t);
          sp.textContent = (i ? ' ' : '') + w.w.toUpperCase();
          if (fill !== C.ink) (c.spans = c.spans || []).push(sp);
        });
        return t;
      };
      mk(C.ink, C.ink, 7); // ombre portée
      const main = mk('#ffffff', C.ink, 0);
      const bw = main.getComputedTextLength ? main.getComputedTextLength() : 0;
      c.fit = bw > 960 ? 960 / bw : 1;
      c.g = g;
      c.txt = txt;
    }
  }

  function renderCaptions(t) {
    for (const c of E.captions) {
      const on = t >= c.start && t < c.end;
      set(c.g, 'visibility', on ? 'visible' : 'hidden');
      if (!on) continue;
      const q = clamp((t - c.start) / 0.14);
      const k = (q >= 1 ? 1 : 0.82 + 0.18 * ease.backOut(q)) * c.fit;
      set(c.g, 'transform', `translate(540,1395) scale(${k.toFixed(3)}) translate(-540,-1395)`);
      c.words.forEach((w, i) => {
        const active = t >= w.start - 0.02 && (t < w.end || i === c.words.length - 1);
        set(c.spans[i], 'fill', active ? C.yellow : '#ffffff');
      });
    }
  }

  // ---------- main (graphisme) ----------
  function buildHand() {
    const g = el('g', { id: 'hand' }, E.svg);
    const inner = el('g', {}, g);
    // repère : pointe du feutre en (0,0), axe du feutre vers +x, puis rotation globale.
    const a = el('g', { transform: 'rotate(58)' }, inner);
    const ink = C.ink;
    // manche (sweat corail) qui sort de l'écran
    el('path', { d: 'M250,-86 C600,-110 1000,-120 3200,-150 L3200,200 C1000,150 600,130 250,104 Z', fill: C.coral, stroke: ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, a);
    el('path', { d: 'M420,-40 C520,-20 600,10 700,20 M480,60 C560,70 620,80 720,76', fill: 'none', stroke: ink, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.35 }, a);
    el('path', { d: 'M232,-84 L284,-88 C300,-24 300,44 286,110 L236,106 C222,44 222,-20 232,-84 Z', fill: '#ff8a6e', stroke: ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, a);
    // feutre
    el('path', { d: 'M0,-4 L16,-9 L16,9 L0,4 Z', fill: ink, stroke: ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }, a);
    el('path', { d: 'M16,-11 L44,-21 L44,21 L16,11 Z', fill: '#e9e6e0', stroke: ink, 'stroke-width': 6, 'stroke-linejoin': 'round' }, a);
    el('rect', { x: 44, y: -23, width: 210, height: 46, rx: 10, fill: '#2a2a30', stroke: ink, 'stroke-width': 6 }, a);
    el('rect', { x: 120, y: -23, width: 56, height: 46, fill: C.yellow, stroke: ink, 'stroke-width': 5 }, a);
    // main : paume + doigts
    el('path', { d: 'M96,-30 C110,-80 190,-104 252,-78 C292,-60 300,60 262,96 C220,124 150,110 118,70 C100,48 90,8 96,-30 Z', fill: C.skin, stroke: ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, a);
    // doigts repliés sur le feutre
    el('path', { d: 'M86,18 C70,22 66,50 84,56 C100,62 128,58 134,44', fill: C.skin, stroke: ink, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, a);
    el('path', { d: 'M120,58 C112,74 124,92 146,88 C162,84 176,74 178,62', fill: C.skin, stroke: ink, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, a);
    el('path', { d: 'M168,78 C164,96 182,110 204,102 C218,96 226,86 226,76', fill: C.skin, stroke: ink, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, a);
    // pouce par-dessus
    el('path', { d: 'M150,-62 C120,-60 92,-40 78,-22 C70,-12 80,-2 92,-8 C110,-18 132,-30 160,-34', fill: C.skin, stroke: ink, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, a);
    el('path', { d: 'M200,-40 C214,-30 220,-12 218,4', fill: 'none', stroke: ink, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.5 }, a);
    E.hand = g;
    E.handInner = inner;
  }

  function renderHand(t) {
    const p = penAt(t);
    if (p.hidden) { set(E.hand, 'visibility', 'hidden'); return; }
    set(E.hand, 'visibility', 'visible');
    const rot = -6 + ((p.x - 540) / 540) * 7;
    const lift = (p.down ? 1 : 1.035) * 0.68;
    set(E.hand, 'transform', `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${lift})`);
  }

  // ---------- papier ----------
  function paperTexture() {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.fillStyle = C.paper;
    c.fillRect(0, 0, W, H);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26000; i++) {
      const x = rnd() * W, y = rnd() * H, a = rnd() * 0.05;
      c.fillStyle = rnd() > 0.5 ? `rgba(120,100,70,${a})` : `rgba(255,255,255,${a * 2})`;
      c.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    // vignette douce
    const gr = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(60,45,20,0.10)');
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);
    return cv.toDataURL('image/png');
  }

  // ---------- initialisation ----------
  E.init = (timing, opts = {}) => {
    E.timing = timing;
    E.duration = timing.duration;
    const svg = el('svg', { id: 'stage', width: W, height: H, viewBox: `0 0 ${W} ${H}` }, document.body);
    E.svg = svg;
    E.defs = el('defs', {}, svg);
    const f = el('filter', { id: 'boil', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, E.defs);
    E.turb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.018', numOctaves: 2, seed: 1, result: 'n' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: opts.boil !== undefined ? opts.boil : 4, xChannelSelector: 'R', yChannelSelector: 'G' }, f);
    el('image', { href: paperTexture(), x: 0, y: 0, width: W, height: H }, svg);
    E.boilG = el('g', { filter: opts.boil === 0 ? null : 'url(#boil)' }, svg);
    E.camG = el('g', {}, E.boilG);
    E.world = el('g', { id: 'world' }, E.camG);
    E.overlay = el('g', { id: 'overlay' }, svg);
    E.cam0 = { x: 0, y: 0, z: 1 };
  };

  E.finalize = () => {
    buildHand();
    E.capLayer = el('g', { id: 'captions' }, E.svg);
    buildCaptions();
    // événements "main" pour l'audio
    for (const p of E.pens) E.events.push({ type: p.kind, t: p.t0, t1: p.t1, len: p.len || 0 });
    E.events.sort((a, b) => a.t - b.t);
  };

  E.render = (t) => {
    const c = camAt(t);
    set(E.camG, 'transform', `translate(${(FOCUS.x + c.ox).toFixed(2)},${(FOCUS.y + c.oy).toFixed(2)}) scale(${c.z.toFixed(5)}) translate(${(-c.x).toFixed(2)},${(-c.y).toFixed(2)})`);
    set(E.turb, 'seed', String(1 + (Math.floor(t * E.fps / 3) % 50)));
    for (const it of E.items) it(t);
    for (const a of E.anims) a(t);
    renderHand(t);
    renderCaptions(t);
  };
})();
