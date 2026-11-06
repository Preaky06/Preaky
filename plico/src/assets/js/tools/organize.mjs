import { h, icon, iconButton, makeSortable, moveItem, resultView, toast } from '../ui.mjs';
import { dropStage, workspace, primaryAction, runTask, ensureTool } from './_common.mjs';
import { readBytes, loadDoc, newDoc, saveDoc, pdfBlob, openRender, renderPage, renderQueue, outName, pdfLib } from '../pdf.mjs';

const TOOL = 'organize';

export default function mount(root, { accept }) {
  let file = null;
  let bytes = null;
  let renderDoc = null;
  let pages = [];
  let grid = null;
  let summary = null;
  let observer = null;
  const queue = renderQueue(2);

  function start() {
    observer?.disconnect();
    renderDoc?.destroy();
    renderDoc = null;
    grid = null;
    pages = [];
    dropStage(root, { accept, multiple: false, kind: 'single', title: 'Déposez votre PDF ici', hint: 'Toutes les pages s’afficheront : déplacez, pivotez, supprimez.', onFiles: ([f]) => open(f) });
  }

  async function open(f) {
    root.replaceChildren(h('div', { class: 'tool-loading' }, h('span', { class: 'spinner' })));
    try {
      file = f;
      bytes = await readBytes(f);
      await loadDoc(bytes, f.name); // vérifie que le PDF est modifiable
      renderDoc = await openRender(bytes, f.name);
      pages = Array.from({ length: renderDoc.numPages }, (_, i) => ({ index: i, rotation: 0, deleted: false, selected: false, thumb: null, loading: false }));
      build();
    } catch (e) {
      toast(e.userMessage || 'PDF illisible.', { type: 'err' });
      start();
    }
  }

  function loadThumb(p) {
    if (p.loading || p.thumb) return;
    p.loading = true;
    queue(async () => {
      if (!renderDoc) return;
      const { canvas } = await renderPage(renderDoc, p.index + 1, { width: 220 });
      p.thumb = canvas;
      const card = grid?.querySelector(`[data-index="${p.index}"] .thumb`);
      if (card) paintThumb(card, p);
    }).catch(() => {});
  }

  function paintThumb(thumbEl, p) {
    thumbEl.querySelector('.spinner')?.remove();
    if (!p.thumb) return;
    if (!thumbEl.contains(p.thumb)) thumbEl.prepend(p.thumb);
    const quarter = Math.abs(p.rotation / 90) % 2 === 1;
    const ratio = Math.min(p.thumb.width, p.thumb.height) / Math.max(p.thumb.width, p.thumb.height);
    p.thumb.style.transform = `rotate(${p.rotation}deg)${quarter ? ` scale(${ratio.toFixed(3)})` : ''}`;
  }

  const selected = () => pages.filter((p) => p.selected);

  function build() {
    observer?.disconnect();
    const ws = workspace();
    grid = h('div', { class: 'page-grid', 'data-testid': 'page-grid' });
    makeSortable(grid, {
      itemSelector: '.page-card',
      onMove: (from, to) => {
        moveItem(pages, from, to);
        renderGrid();
      },
    });
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const p = pages.find((x) => x.index === Number(e.target.dataset.index));
          if (p) loadThumb(p);
          observer.unobserve(e.target);
        }
      },
      { rootMargin: '400px' },
    );
    const rotateSel = (d) => {
      const sel = selected();
      if (!sel.length) return toast('Sélectionnez d’abord des pages (case à cocher).');
      sel.forEach((p) => (p.rotation = (p.rotation + d) % 360));
      renderGrid();
    };
    const toolbar = h(
      'div',
      { class: 'ws-toolbar' },
      h('div', { class: 'ws-title' }, icon('file', 18), h('span', { title: file.name }, file.name)),
      h('div', { class: 'spacer' }),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { const all = pages.every((p) => p.selected); pages.forEach((p) => (p.selected = !all)); renderGrid(); } }, 'Tout sélectionner'),
      h('span', { class: 'toolbar-label' }, 'Sélection :'),
      iconButton('rotL', 'Pivoter la sélection à gauche', () => rotateSel(-90)),
      iconButton('rotR', 'Pivoter la sélection à droite', () => rotateSel(90)),
      iconButton('trash', 'Supprimer ou restaurer la sélection', () => { const sel = selected(); if (!sel.length) return toast('Sélectionnez d’abord des pages.'); const del = !sel.every((p) => p.deleted); sel.forEach((p) => (p.deleted = del)); renderGrid(); }, 'danger'),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { pages.reverse(); renderGrid(); } }, 'Inverser l’ordre'),
    );
    ws.main.append(toolbar, grid);
    summary = h('p', { class: 'muted small', 'data-testid': 'summary' });
    const save = primaryAction('Enregistrer le PDF', TOOL, (btn) => exportPdf(btn, ws.aside, false));
    const extract = h('button', { type: 'button', class: 'btn btn-ghost btn-block', 'data-testid': 'extract', onclick: (e) => { if (ensureTool(TOOL)) exportPdf(e.currentTarget, ws.aside, true); } }, 'Extraire la sélection');
    ws.aside.append(
      h('h3', {}, 'Document'),
      summary,
      h('p', { class: 'notice' }, 'Glissez les pages pour les réordonner. Cochez-les pour agir sur plusieurs à la fois.'),
      h('button', { type: 'button', class: 'btn btn-ghost btn-block', onclick: () => { pages.sort((a, b) => a.index - b.index).forEach((p) => Object.assign(p, { rotation: 0, deleted: false, selected: false })); renderGrid(); } }, 'Réinitialiser'),
      h('button', { type: 'button', class: 'btn btn-ghost btn-block', onclick: start }, 'Changer de fichier'),
      h('div', { class: 'primary-action' }, extract, save.el),
    );
    root.replaceChildren(ws.el);
    renderGrid();
  }

  function renderGrid() {
    observer.disconnect();
    grid.replaceChildren(
      ...pages.map((p, i) => {
        const check = h('input', { type: 'checkbox', class: 'page-check', 'aria-label': `Sélectionner la page ${p.index + 1}`, checked: p.selected });
        check.addEventListener('change', () => {
          p.selected = check.checked;
          card.classList.toggle('selected', p.selected);
          updateSummary();
        });
        const thumb = h('div', { class: 'thumb', 'data-drag-handle': '' }, h('span', { class: 'spinner' }));
        thumb.addEventListener('click', () => {
          p.selected = !p.selected;
          check.checked = p.selected;
          card.classList.toggle('selected', p.selected);
          updateSummary();
        });
        const card = h(
          'div',
          { class: `page-card${p.selected ? ' selected' : ''}${p.deleted ? ' deleted' : ''}`, 'data-index': p.index },
          check,
          thumb,
          h('div', { class: 'page-num' }, `Page ${p.index + 1}${i !== p.index ? ` → ${i + 1}` : ''}`),
          h(
            'div',
            { class: 'file-actions' },
            iconButton('rotL', 'Pivoter à gauche', () => { p.rotation = (p.rotation - 90) % 360; paintThumb(thumb, p); }),
            iconButton('rotR', 'Pivoter à droite', () => { p.rotation = (p.rotation + 90) % 360; paintThumb(thumb, p); }),
            iconButton(p.deleted ? 'refresh' : 'trash', p.deleted ? 'Restaurer' : 'Supprimer', () => { p.deleted = !p.deleted; renderGrid(); }, 'danger'),
          ),
        );
        if (p.thumb) paintThumb(thumb, p);
        observer.observe(card);
        return card;
      }),
    );
    updateSummary();
  }

  function updateSummary() {
    const kept = pages.filter((p) => !p.deleted).length;
    const sel = selected().length;
    summary.textContent = `${pages.length} pages · ${kept} conservée${kept > 1 ? 's' : ''}${sel ? ` · ${sel} sélectionnée${sel > 1 ? 's' : ''}` : ''}`;
  }

  async function exportPdf(btn, host, onlySelection) {
    const chosen = onlySelection ? pages.filter((p) => p.selected && !p.deleted) : pages.filter((p) => !p.deleted);
    if (!chosen.length) return toast(onlySelection ? 'Cochez les pages à extraire.' : 'Toutes les pages sont supprimées.');
    const result = await runTask(host, btn, async (progress) => {
      const { degrees } = await pdfLib();
      progress.set(0.1, 'Lecture du document…');
      const src = await loadDoc(bytes, file.name);
      const out = await newDoc();
      const copied = await out.copyPages(src, chosen.map((p) => p.index));
      copied.forEach((page, i) => {
        const delta = chosen[i].rotation;
        if (delta) page.setRotation(degrees((((page.getRotation().angle + delta) % 360) + 360) % 360));
        out.addPage(page);
      });
      progress.set(0.9, 'Enregistrement…');
      return saveDoc(out);
    });
    if (!result) return;
    const name = outName(file.name, onlySelection ? 'extrait' : 'organise');
    const back = h('button', { type: 'button', class: 'btn btn-ghost btn-lg', onclick: build }, 'Continuer à modifier');
    root.replaceChildren(
      resultView({
        title: onlySelection ? 'Pages extraites' : 'PDF enregistré',
        stats: [{ value: chosen.length, label: 'pages' }],
        blob: pdfBlob(result),
        filename: name,
        extra: [back],
        onRestart: start,
      }),
    );
  }

  start();
}
