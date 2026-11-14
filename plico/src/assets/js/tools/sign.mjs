import { h, icon, iconButton, modal, resultView, toast, field } from '../ui.mjs';
import { dropStage, workspace, primaryAction, runTask } from './_common.mjs';
import { readBytes, loadDoc, saveDoc, pdfBlob, openRender, renderPage, pdfLib, pageGeometry, toContent, encodable, decodeImage, outName } from '../pdf.mjs';

const TOOL = 'sign';
const SIG_KEY = 'plico.signature.v1';
// Métriques communes aperçu / export (Arial et Helvetica ont les mêmes chasses)
const ASC = 0.78;
const DESC = 0.24;
const LH = 1.2;
const FONT = 'Helvetica, Arial, sans-serif';
let uid = 0;

const clamp = (v, a, b) => Math.min(Math.max(v, a), Math.max(a, b));

function loadSignature() {
  try {
    return localStorage.getItem(SIG_KEY);
  } catch {
    return null;
  }
}

function trimCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: hgt } = canvas;
  const data = ctx.getImageData(0, 0, w, hgt).data;
  let minX = w;
  let minY = hgt;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < hgt; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const pad = 6;
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1 + pad * 2;
  out.height = maxY - minY + 1 + pad * 2;
  out.getContext('2d').drawImage(canvas, minX - pad, minY - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function dataUrlBytes(url) {
  const bin = atob(url.split(',')[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

const measureCtx = document.createElement('canvas').getContext('2d');
function measure(el) {
  measureCtx.font = `${el.fontSize}px ${FONT}`;
  const lines = String(el.text || ' ').split('\n');
  el.w = Math.max(8, ...lines.map((l) => measureCtx.measureText(l || ' ').width));
  el.h = el.fontSize * (ASC + DESC) + (lines.length - 1) * LH * el.fontSize;
}

/** Fenêtre de création de signature : dessin, texte ou image. */
function signatureCreator(onDone) {
  let mode = 'draw';
  const color = { value: '#10204a' };
  // Dessin
  const pad = h('canvas', { class: 'sig-pad', 'aria-label': 'Zone de signature' });
  let ink = false;
  const setupPad = () => {
    const r = pad.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    pad.width = Math.round(r.width * dpr);
    pad.height = Math.round(r.height * dpr);
    const ctx = pad.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.8;
    ink = false;
  };
  let last = null;
  const point = (e) => {
    const r = pad.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    last = point(e);
    const ctx = pad.getContext('2d');
    ctx.fillStyle = color.value;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ink = true;
  });
  pad.addEventListener('pointermove', (e) => {
    if (!last) return;
    const ctx = pad.getContext('2d');
    ctx.strokeStyle = color.value;
    for (const ev of e.getCoalescedEvents ? e.getCoalescedEvents() : [e]) {
      const p = point(ev);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    }
  });
  const end = () => (last = null);
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);

  // Texte
  const typed = h('input', { class: 'input', placeholder: 'Votre nom', maxlength: '60', 'data-testid': 'sig-name' });
  const fonts = [
    ['"Segoe Script", "Snell Roundhand", "Brush Script MT", "URW Chancery L", cursive', 'Manuscrite'],
    ['"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive', 'Libre'],
    ['Georgia, "Times New Roman", serif', 'Classique'],
  ];
  const fontSelect = h('select', { class: 'select' }, fonts.map(([v, l]) => h('option', { value: v }, l)));
  const typedPreview = h('canvas', { class: 'sig-pad', style: { cursor: 'default' } });
  const drawTyped = () => {
    const r = typedPreview.getBoundingClientRect();
    typedPreview.width = Math.max(300, Math.round(r.width * 2));
    typedPreview.height = Math.max(120, Math.round(r.height * 2));
    const ctx = typedPreview.getContext('2d');
    ctx.clearRect(0, 0, typedPreview.width, typedPreview.height);
    ctx.fillStyle = color.value;
    const style = fontSelect.value.startsWith('Georgia') ? 'italic ' : '';
    let size = typedPreview.height * 0.42;
    ctx.font = `${style}${size}px ${fontSelect.value}`;
    const text = typed.value || 'Votre nom';
    const max = typedPreview.width * 0.9;
    const w = ctx.measureText(text).width;
    if (w > max) {
      size *= max / w;
      ctx.font = `${style}${size}px ${fontSelect.value}`;
    }
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.globalAlpha = typed.value ? 1 : 0.25;
    ctx.fillText(text, typedPreview.width / 2, typedPreview.height / 2);
  };
  typed.addEventListener('input', drawTyped);
  fontSelect.addEventListener('change', drawTyped);

  // Import
  const upload = h('input', { type: 'file', accept: 'image/*', class: 'input' });
  const removeWhite = h('input', { type: 'checkbox', checked: true });
  const uploadPreview = h('canvas', { class: 'sig-pad', style: { cursor: 'default', objectFit: 'contain' } });
  let uploaded = null;
  const drawUpload = () => {
    if (!uploaded) return;
    const max = 1400;
    const s = Math.min(1, max / uploaded.naturalWidth);
    uploadPreview.width = Math.round(uploaded.naturalWidth * s);
    uploadPreview.height = Math.round(uploaded.naturalHeight * s);
    const ctx = uploadPreview.getContext('2d');
    ctx.clearRect(0, 0, uploadPreview.width, uploadPreview.height);
    ctx.drawImage(uploaded, 0, 0, uploadPreview.width, uploadPreview.height);
    if (removeWhite.checked) {
      const img = ctx.getImageData(0, 0, uploadPreview.width, uploadPreview.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) d[i + 3] = 0;
      ctx.putImageData(img, 0, 0);
    }
  };
  upload.addEventListener('change', async () => {
    const f = upload.files[0];
    if (!f) return;
    try {
      const { img } = await decodeImage(f);
      uploaded = img;
      drawUpload();
    } catch (e) {
      toast(e.userMessage, { type: 'err' });
    }
  });
  removeWhite.addEventListener('change', drawUpload);

  const panels = {
    draw: h('div', {}, pad, h('div', { class: 'row', style: { marginTop: '10px', justifyContent: 'space-between' } }, h('div', { class: 'row', style: { flex: 'none', gap: '8px' } }, ...[['#10204a', 'Bleu nuit'], ['#000000', 'Noir'], ['#1f4fd1', 'Bleu']].map(([c, label]) => h('button', { type: 'button', class: 'swatch', 'aria-label': `Encre ${label}`, 'aria-pressed': String(c === color.value), style: { background: c }, onclick: (e) => { color.value = c; e.currentTarget.parentElement.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }))), h('button', { type: 'button', class: 'btn btn-ghost btn-sm', style: { flex: 'none' }, onclick: setupPad }, 'Effacer'))),
    type: h('div', { style: { display: 'grid', gap: '10px' } }, typed, fontSelect, typedPreview),
    upload: h('div', { style: { display: 'grid', gap: '10px' } }, upload, h('label', { class: 'check' }, removeWhite, 'Rendre le fond blanc transparent'), uploadPreview),
  };
  const tabButtons = {};
  const tabs = h(
    'div',
    { class: 'tabs', role: 'tablist' },
    ...[
      ['draw', 'Dessiner'],
      ['type', 'Écrire'],
      ['upload', 'Importer'],
    ].map(([k, l]) => (tabButtons[k] = h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === mode), onclick: () => select(k) }, l))),
  );
  const host = h('div', {}, panels.draw);
  const select = (k) => {
    mode = k;
    Object.entries(tabButtons).forEach(([key, b]) => b.setAttribute('aria-selected', String(key === k)));
    host.replaceChildren(panels[k]);
    requestAnimationFrame(() => (k === 'draw' ? setupPad() : k === 'type' ? drawTyped() : drawUpload()));
  };
  const remember = h('input', { type: 'checkbox', checked: !!loadSignature() });

  const { close } = modal((closeFn) => [
    h('div', { class: 'modal-body' }, h('h2', {}, 'Votre signature'), tabs, host, h('label', { class: 'check', style: { marginTop: '14px' } }, remember, 'Mémoriser sur cet appareil (jamais envoyée)')),
    h(
      'div',
      { class: 'modal-actions' },
      h('button', { type: 'button', class: 'btn btn-ghost', onclick: closeFn }, 'Annuler'),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-accent',
          'data-testid': 'sig-save',
          onclick: () => {
            let source = null;
            if (mode === 'draw') source = ink ? pad : null;
            else if (mode === 'type') source = typed.value.trim() ? typedPreview : null;
            else source = uploaded ? uploadPreview : null;
            const trimmed = source && trimCanvas(source);
            if (!trimmed) return toast('Créez d’abord votre signature.');
            const url = trimmed.toDataURL('image/png');
            try {
              if (remember.checked) localStorage.setItem(SIG_KEY, url);
              else localStorage.removeItem(SIG_KEY);
            } catch {
              /* stockage indisponible */
            }
            onDone(url);
            closeFn();
          },
        },
        'Utiliser cette signature',
      ),
    ),
  ]);
  requestAnimationFrame(setupPad);
  return close;
}

export default function mount(root, { accept }) {
  let file = null;
  let bytes = null;
  let renderDoc = null;
  let count = 0;
  let current = 1;
  let elements = [];
  let activeId = null;
  let signature = loadSignature();
  let scale = 1;
  const dims = {};
  let viewer;
  let stage;
  let overlay;
  let pagerLabel;
  let asideDynamic;
  let sigPreview;
  let resizeTimer;
  let resizeBound = false;

  function start() {
    renderDoc?.destroy();
    renderDoc = null;
    elements = [];
    activeId = null;
    dropStage(root, { accept, multiple: false, kind: 'single', title: 'Déposez le PDF à signer', hint: 'Signature, date et texte, placés où vous voulez.', onFiles: ([f]) => open(f) });
  }

  async function open(f) {
    root.replaceChildren(h('div', { class: 'tool-loading' }, h('span', { class: 'spinner' })));
    try {
      file = f;
      bytes = await readBytes(f);
      await loadDoc(bytes, f.name);
      renderDoc = await openRender(bytes, f.name);
      count = renderDoc.numPages;
      current = 1;
      build();
    } catch (e) {
      toast(e.userMessage || 'PDF illisible.', { type: 'err' });
      start();
    }
  }

  const active = () => elements.find((e) => e.id === activeId) || null;

  function build() {
    const ws = workspace();
    viewer = h('div', { class: 'viewer', 'data-testid': 'viewer' });
    pagerLabel = h('span', {});
    const pager = h('div', { class: 'pager' }, iconButton('left', 'Page précédente', () => go(current - 1)), pagerLabel, iconButton('right', 'Page suivante', () => go(current + 1)));
    ws.main.append(h('div', { class: 'ws-toolbar' }, h('div', { class: 'ws-title' }, icon('file', 18), h('span', {}, file.name))), viewer, pager);

    sigPreview = h('div', { class: 'sig-preview' });
    asideDynamic = h('div', { style: { display: 'grid', gap: '12px' } });
    const add = (label, fn, testid) => h('button', { type: 'button', class: 'btn btn-ghost btn-block', onclick: fn, 'data-testid': testid }, icon('plus', 16), label);
    ws.aside.append(
      h('h3', {}, 'Votre signature'),
      sigPreview,
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => signatureCreator((url) => { signature = url; renderSig(); placeSignature(); }) }, 'Créer ou modifier'),
      h('h3', {}, 'Ajouter sur cette page'),
      add('Signature', () => (signature ? placeSignature() : signatureCreator((url) => { signature = url; renderSig(); placeSignature(); })), 'add-signature'),
      add('Date du jour', () => placeText(new Date().toLocaleDateString('fr-FR')), 'add-date'),
      add('Texte', () => placeText('Votre texte'), 'add-text'),
      asideDynamic,
      h('button', { type: 'button', class: 'btn btn-ghost btn-block', onclick: start }, 'Changer de fichier'),
      primaryAction('Télécharger le PDF signé', TOOL, (btn) => exportPdf(btn, ws.aside)).el,
    );
    root.replaceChildren(ws.el);
    renderSig();
    go(current);
    if (!resizeBound) {
      resizeBound = true;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => viewer?.isConnected && go(current), 200);
      });
    }
  }

  function renderSig() {
    sigPreview.replaceChildren(signature ? h('img', { src: signature, alt: 'Votre signature' }) : h('span', { class: 'muted small' }, 'Aucune signature pour l’instant'));
  }

  async function go(n) {
    current = clamp(n, 1, count);
    pagerLabel.textContent = `Page ${current} / ${count}`;
    const available = Math.max(240, viewer.clientWidth - 32);
    const page = await renderDoc.getPage(current);
    const base = page.getViewport({ scale: 1 });
    dims[current] = { vw: base.width, vh: base.height };
    const displayW = Math.min(available, 860);
    scale = displayW / base.width;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { canvas } = await renderPage(renderDoc, current, { scale: scale * dpr });
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${base.height * scale}px`;
    overlay = h('div', { style: { position: 'absolute', inset: '0' } });
    stage = h('div', { class: 'page-stage' }, canvas, overlay);
    stage.addEventListener('pointerdown', (e) => {
      if (e.target === overlay || e.target === canvas) setActive(null);
    });
    viewer.replaceChildren(stage);
    drawOverlay();
  }

  function setActive(id) {
    activeId = id;
    overlay?.querySelectorAll('.placed').forEach((n) => n.classList.toggle('active', Number(n.dataset.id) === id));
    syncAside();
  }

  function position(node, el) {
    Object.assign(node.style, { left: `${el.x * scale}px`, top: `${el.y * scale}px`, width: `${el.w * scale}px`, height: `${el.h * scale}px` });
  }

  function textCanvas(el) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = h('canvas', { class: 'ptext' });
    c.width = Math.max(1, Math.ceil(el.w * scale * dpr));
    c.height = Math.max(1, Math.ceil(el.h * scale * dpr));
    Object.assign(c.style, { width: '100%', height: '100%' });
    const ctx = c.getContext('2d');
    ctx.scale(scale * dpr, scale * dpr);
    ctx.fillStyle = '#000';
    ctx.font = `${el.fontSize}px ${FONT}`;
    String(el.text).split('\n').forEach((line, i) => ctx.fillText(line, 0, ASC * el.fontSize + i * LH * el.fontSize));
    return c;
  }

  function node(el) {
    const n = h('div', { class: `placed${el.id === activeId ? ' active' : ''}`, 'data-id': el.id, 'data-testid': 'placed' });
    position(n, el);
    n.append(el.type === 'image' ? h('img', { src: el.src, alt: '' }) : textCanvas(el));
    const handle = h('span', { class: 'handle' });
    const remove = h('button', { type: 'button', class: 'remove', 'aria-label': 'Retirer' }, '×');
    remove.addEventListener('pointerdown', (e) => e.stopPropagation());
    remove.addEventListener('click', () => {
      elements = elements.filter((x) => x !== el);
      activeId = null;
      drawOverlay();
      syncAside();
    });
    n.append(handle, remove);
    n.addEventListener('pointerdown', (e) => drag(e, el, n, e.target === handle ? 'resize' : 'move'));
    return n;
  }

  function drawOverlay() {
    if (!overlay) return;
    overlay.replaceChildren(...elements.filter((e) => e.page === current).map(node));
  }

  function drag(e, el, n, mode) {
    e.preventDefault();
    e.stopPropagation();
    setActive(el.id);
    n.setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    const s0 = { ...el };
    const { vw, vh } = dims[el.page];
    const move = (ev) => {
      const dx = (ev.clientX - sx) / scale;
      const dy = (ev.clientY - sy) / scale;
      if (mode === 'move') {
        el.x = clamp(s0.x + dx, 0, vw - el.w);
        el.y = clamp(s0.y + dy, 0, vh - el.h);
        position(n, el);
        return;
      }
      if (el.type === 'image') {
        const k = clamp((s0.w + dx) / s0.w, 16 / s0.w, Math.min((vw - el.x) / s0.w, (vh - el.y) / s0.h));
        el.w = s0.w * k;
        el.h = s0.h * k;
      } else {
        el.fontSize = clamp(s0.fontSize * ((s0.w + dx) / s0.w), 5, 120);
        measure(el);
        if (el.x + el.w > vw) el.x = Math.max(0, vw - el.w);
        if (el.y + el.h > vh) el.y = Math.max(0, vh - el.h);
      }
      position(n, el);
      if (el.type === 'text') n.querySelector('canvas').replaceWith(textCanvas(el));
    };
    const up = () => {
      n.removeEventListener('pointermove', move);
      n.removeEventListener('pointerup', up);
      n.removeEventListener('pointercancel', up);
      syncAside();
    };
    n.addEventListener('pointermove', move);
    n.addEventListener('pointerup', up);
    n.addEventListener('pointercancel', up);
  }

  function placeSignature() {
    if (!signature || !dims[current]) return;
    const img = new Image();
    img.onload = () => {
      const { vw, vh } = dims[current];
      const w = vw * 0.28;
      const hgt = (w * img.naturalHeight) / img.naturalWidth;
      const el = { id: ++uid, page: current, type: 'image', src: signature, w, h: hgt, x: vw * 0.6 - w / 2, y: vh * 0.78 - hgt / 2 };
      el.x = clamp(el.x, 0, vw - w);
      el.y = clamp(el.y, 0, vh - hgt);
      elements.push(el);
      activeId = el.id;
      drawOverlay();
      syncAside();
    };
    img.src = signature;
  }

  function placeText(text) {
    if (!dims[current]) return;
    const { vw, vh } = dims[current];
    const el = { id: ++uid, page: current, type: 'text', text, fontSize: 12, x: 0, y: 0 };
    measure(el);
    el.x = clamp(vw * 0.15, 0, vw - el.w);
    el.y = clamp(vh * 0.85, 0, vh - el.h);
    elements.push(el);
    activeId = el.id;
    drawOverlay();
    syncAside();
  }

  function syncAside() {
    const el = active();
    asideDynamic.replaceChildren();
    if (!el) {
      const n = elements.length;
      asideDynamic.append(h('p', { class: 'muted small' }, n ? `${n} élément${n > 1 ? 's' : ''} placé${n > 1 ? 's' : ''}. Cliquez sur un élément pour le modifier ; glissez-le pour le déplacer, la poignée orange pour le redimensionner.` : 'Ajoutez une signature, la date ou du texte, puis glissez-les à la bonne place.'));
      return;
    }
    if (el.type === 'text') {
      const ta = h('textarea', { class: 'input', rows: '3', 'data-testid': 'text-value' }, el.text);
      ta.addEventListener('input', () => {
        el.text = ta.value;
        measure(el);
        drawOverlay();
      });
      const size = h('input', { type: 'range', min: '6', max: '48', value: String(Math.round(el.fontSize)) });
      size.addEventListener('input', () => {
        el.fontSize = Number(size.value);
        measure(el);
        drawOverlay();
      });
      asideDynamic.append(h('h3', {}, 'Texte sélectionné'), field('Contenu', ta), h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Taille'), size));
    } else {
      asideDynamic.append(h('h3', {}, 'Signature sélectionnée'));
    }
    asideDynamic.append(
      h('button', {
        type: 'button',
        class: 'btn btn-ghost btn-sm',
        onclick: () => {
          for (let p = 1; p <= count; p++) {
            if (p === el.page) continue;
            elements.push({ ...el, id: ++uid, page: p });
          }
          toast(`Ajouté sur les ${count} pages (même position).`, { type: 'ok' });
        },
      }, 'Répéter sur toutes les pages'),
    );
  }

  async function exportPdf(btn, host) {
    if (!elements.length) return toast('Ajoutez au moins une signature ou un texte.');
    const result = await runTask(host, btn, async (progress) => {
      const { StandardFonts, rgb, degrees } = await pdfLib();
      const doc = await loadDoc(bytes, file.name);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const images = new Map();
      for (let i = 0; i < elements.length; i++) {
        progress.set(i / elements.length, 'Application des signatures…');
        const el = elements[i];
        const page = pages[el.page - 1];
        const geo = pageGeometry(page);
        if (el.type === 'image') {
          if (!images.has(el.src)) images.set(el.src, await doc.embedPng(dataUrlBytes(el.src)));
          const p = toContent(geo, el.x, geo.vh - el.y - el.h);
          page.drawImage(images.get(el.src), { x: p.x, y: p.y, width: el.w, height: el.h, rotate: degrees(geo.rot) });
        } else {
          encodable(font, el.text)
            .split('\n')
            .forEach((line, k) => {
              const p = toContent(geo, el.x, geo.vh - (el.y + ASC * el.fontSize + k * LH * el.fontSize));
              page.drawText(line, { x: p.x, y: p.y, size: el.fontSize, font, color: rgb(0, 0, 0), rotate: degrees(geo.rot) });
            });
        }
      }
      progress.set(0.95, 'Enregistrement…');
      return saveDoc(doc);
    });
    if (!result) return;
    root.replaceChildren(
      resultView({
        title: 'Document signé',
        stats: [{ value: elements.length, label: elements.length > 1 ? 'éléments ajoutés' : 'élément ajouté' }],
        blob: pdfBlob(result),
        filename: outName(file.name, 'signe'),
        extra: [h('button', { type: 'button', class: 'btn btn-ghost btn-lg', onclick: build }, 'Continuer à modifier')],
        onRestart: start,
      }),
    );
  }

  start();
}
