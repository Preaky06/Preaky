import { h, icon, iconButton, pickFiles, pageDrop, makeSortable, moveItem, resultView, formatBytes, toast, paywall } from '../ui.mjs';
import { dropStage, workspace, primaryAction, runTask, checkFiles } from './_common.mjs';
import { readBytes, isPdf, loadDoc, newDoc, saveDoc, pdfBlob, openRender, renderPage, renderQueue, prepareImage, addImagePage, baseName } from '../pdf.mjs';

const TOOL = 'merge';
let uid = 0;

export default function mount(root, { accept }) {
  let items = [];
  let cleanupDrop = null;
  const queue = renderQueue(2);

  function start() {
    cleanupDrop?.();
    cleanupDrop = null;
    items = [];
    dropStage(root, {
      accept,
      multiple: true,
      title: 'Déposez vos PDF ici',
      hint: 'Vous pouvez aussi ajouter des images (JPG, PNG…) : elles deviendront des pages.',
      onFiles: add,
    });
  }

  function add(files) {
    const problem = checkFiles(files, { existing: items.length });
    if (problem) return paywall(problem);
    for (const file of files) items.push({ id: ++uid, file, kind: isPdf(file) ? 'pdf' : 'image', pages: null, thumb: null, error: null });
    if (!cleanupDrop) cleanupDrop = pageDrop({ accept, onFiles: add });
    render();
    items.filter((it) => !it.loading && !it.thumb && !it.error).forEach(loadThumb);
  }

  function loadThumb(it) {
    it.loading = true;
    if (it.kind === 'image') {
      const img = h('img', { alt: '', src: URL.createObjectURL(it.file), draggable: 'false' });
      img.onerror = () => {
        it.error = 'Image illisible';
        render();
      };
      it.thumb = img;
      it.pages = 1;
      return;
    }
    queue(async () => {
      try {
        const bytes = await readBytes(it.file);
        const doc = await openRender(bytes, it.file.name);
        it.pages = doc.numPages;
        const { canvas } = await renderPage(doc, 1, { width: 240 });
        it.thumb = canvas;
        doc.destroy();
      } catch (e) {
        it.error = e.userMessage || 'PDF illisible';
      }
      render();
    });
  }

  let list;
  let summary;
  function render() {
    if (!items.length) return start();
    if (!list) {
      const ws = workspace();
      list = h('div', { class: 'file-list', 'data-testid': 'file-list' });
      makeSortable(list, {
        itemSelector: '.file-card',
        onMove: (from, to) => {
          moveItem(items, from, to);
          render();
        },
      });
      const toolbar = h(
        'div',
        { class: 'ws-toolbar' },
        h('div', { class: 'ws-title' }, icon('file', 18), h('span', {}, 'Ordre de fusion')),
        h('div', { class: 'spacer' }),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { items.sort((a, b) => a.file.name.localeCompare(b.file.name, 'fr', { numeric: true })); render(); } }, 'Trier A → Z'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { items.reverse(); render(); } }, 'Inverser'),
      );
      ws.main.append(toolbar, list);
      summary = h('p', { class: 'muted small' });
      const action = primaryAction('Fusionner', TOOL, (btn) => merge(btn, ws.aside));
      ws.aside.append(
        h('h3', {}, 'Résumé'),
        summary,
        h('p', { class: 'notice' }, 'Glissez les fichiers pour changer l’ordre. Les pages sont copiées sans perte de qualité.'),
        action.el,
      );
      root.replaceChildren(ws.el);
    }
    list.replaceChildren(
      ...items.map((it, i) => {
        const thumb = h('div', { class: 'thumb', 'data-drag-handle': '' });
        if (it.error) thumb.append(h('span', { class: 'notice err small' }, it.error));
        else if (it.thumb) thumb.append(it.thumb);
        else thumb.append(h('span', { class: 'spinner' }));
        thumb.append(h('span', { class: 'badge' }, String(i + 1)));
        return h(
          'div',
          { class: 'file-card', 'data-id': it.id },
          thumb,
          h('div', { class: 'file-meta' }, h('strong', { title: it.file.name }, it.file.name), h('span', {}, `${it.kind === 'image' ? 'Image' : it.pages ? `${it.pages} page${it.pages > 1 ? 's' : ''}` : '…'} · ${formatBytes(it.file.size)}`)),
          h(
            'div',
            { class: 'file-actions' },
            iconButton('left', 'Déplacer avant', () => { if (i > 0) { moveItem(items, i, i - 1); render(); } }),
            iconButton('right', 'Déplacer après', () => { if (i < items.length - 1) { moveItem(items, i, i + 1); render(); } }),
            iconButton('trash', 'Retirer', () => { items.splice(i, 1); if (!items.length) { list = null; start(); } else render(); }, 'danger'),
          ),
        );
      }),
      h('button', { type: 'button', class: 'add-card', onclick: async () => add(await pickFiles({ accept, multiple: true })) }, icon('plus', 22), 'Ajouter des fichiers'),
    );
    const pages = items.reduce((s, it) => s + (it.pages || 0), 0);
    summary.textContent = `${items.length} fichier${items.length > 1 ? 's' : ''} · ${pages} page${pages > 1 ? 's' : ''} · ${formatBytes(items.reduce((s, it) => s + it.file.size, 0))}`;
  }

  async function merge(btn, host) {
    if (items.length < 2) return toast('Ajoutez au moins deux fichiers à fusionner.');
    const broken = items.find((it) => it.error);
    if (broken) return toast(`Retirez « ${broken.file.name} » : ${broken.error}`, { type: 'err' });
    const result = await runTask(host, btn, async (progress) => {
      const out = await newDoc();
      let n = 0;
      for (const it of items) {
        progress.set(n / items.length, `Ajout de ${it.file.name}`);
        if (it.kind === 'pdf') {
          const src = await loadDoc(await readBytes(it.file), it.file.name);
          const pages = await out.copyPages(src, src.getPageIndices());
          pages.forEach((p) => out.addPage(p));
        } else {
          await addImagePage(out, await prepareImage(it.file), { size: 'a4', orientation: 'auto', margin: 0 }, it.file.name);
        }
        n++;
      }
      progress.set(0.97, 'Enregistrement…');
      const bytes = await saveDoc(out);
      return { bytes, pages: out.getPageCount() };
    });
    if (!result) return;
    cleanupDrop?.();
    cleanupDrop = null;
    const count = items.length;
    list = null;
    root.replaceChildren(
      resultView({
        title: 'Vos PDF sont fusionnés',
        stats: [
          { value: count, label: 'fichiers' },
          { value: result.pages, label: 'pages' },
          { value: formatBytes(result.bytes.length), label: 'au total' },
        ],
        blob: pdfBlob(result.bytes),
        filename: `${baseName(items[0].file.name)}-fusion.pdf`,
        onRestart: start,
      }),
    );
  }

  start();
}
