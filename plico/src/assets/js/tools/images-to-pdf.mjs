import { h, icon, iconButton, pickFiles, pageDrop, makeSortable, moveItem, resultView, formatBytes, segmented, paywall } from '../ui.mjs';
import { dropStage, workspace, primaryAction, runTask, checkFiles, tick } from './_common.mjs';
import { newDoc, saveDoc, pdfBlob, prepareImage, addImagePage, baseName } from '../pdf.mjs';

const TOOL = 'images-to-pdf';
let uid = 0;

export default function mount(root, { accept }) {
  let items = [];
  let list = null;
  let cleanupDrop = null;
  const opts = { size: 'a4', orientation: 'auto', margin: 0 };

  function start() {
    cleanupDrop?.();
    cleanupDrop = null;
    items.forEach((it) => URL.revokeObjectURL(it.url));
    items = [];
    list = null;
    dropStage(root, { accept, multiple: true, kind: 'images', title: 'Déposez vos images ici', hint: 'JPG, PNG, WebP, HEIC… Chaque image devient une page.', onFiles: add });
  }

  function add(files) {
    const problem = checkFiles(files, { kind: 'images', existing: items.length });
    if (problem) return paywall(problem);
    for (const file of files) items.push({ id: ++uid, file, url: URL.createObjectURL(file), error: null });
    if (!cleanupDrop) cleanupDrop = pageDrop({ accept, onFiles: add });
    render();
  }

  function render() {
    if (!items.length) return start();
    if (!list) {
      const ws = workspace();
      list = h('div', { class: 'file-list', 'data-testid': 'file-list' });
      makeSortable(list, { itemSelector: '.file-card', onMove: (a, b) => { moveItem(items, a, b); render(); } });
      ws.main.append(
        h('div', { class: 'ws-toolbar' }, h('div', { class: 'ws-title' }, icon('file', 18), h('span', {}, 'Ordre des pages')), h('div', { class: 'spacer' }), h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { items.sort((a, b) => a.file.name.localeCompare(b.file.name, 'fr', { numeric: true })); render(); } }, 'Trier A → Z')),
        list,
      );
      const orientation = segmented('img-orient', [['auto', 'Auto'], ['portrait', 'Portrait'], ['landscape', 'Paysage']], opts.orientation, (v) => (opts.orientation = v));
      const syncOrientation = () => orientation.querySelectorAll('input').forEach((i) => (i.disabled = opts.size === 'fit'));
      const action = primaryAction('Créer le PDF', TOOL, (btn) => run(btn, ws.aside));
      ws.aside.append(
        h('h3', {}, 'Format de page'),
        segmented('img-size', [['a4', 'A4'], ['letter', 'Lettre US'], ['fit', 'Taille de l’image']], opts.size, (v) => { opts.size = v; syncOrientation(); }),
        h('h3', {}, 'Orientation'),
        orientation,
        h('h3', {}, 'Marges'),
        segmented('img-margin', [['0', 'Aucune'], ['20', 'Petites'], ['40', 'Grandes']], String(opts.margin), (v) => (opts.margin = Number(v))),
        action.el,
      );
      syncOrientation();
      root.replaceChildren(ws.el);
    }
    list.replaceChildren(
      ...items.map((it, i) => {
        const img = h('img', { src: it.url, alt: '', draggable: 'false', loading: 'lazy' });
        img.onerror = () => {
          img.replaceWith(h('span', { class: 'small muted' }, 'Aperçu indisponible'));
        };
        return h(
          'div',
          { class: 'file-card' },
          h('div', { class: 'thumb', 'data-drag-handle': '' }, img, h('span', { class: 'badge' }, String(i + 1))),
          h('div', { class: 'file-meta' }, h('strong', { title: it.file.name }, it.file.name), h('span', {}, formatBytes(it.file.size))),
          h(
            'div',
            { class: 'file-actions' },
            iconButton('left', 'Déplacer avant', () => { if (i > 0) { moveItem(items, i, i - 1); render(); } }),
            iconButton('right', 'Déplacer après', () => { if (i < items.length - 1) { moveItem(items, i, i + 1); render(); } }),
            iconButton('trash', 'Retirer', () => { URL.revokeObjectURL(it.url); items.splice(i, 1); render(); }, 'danger'),
          ),
        );
      }),
      h('button', { type: 'button', class: 'add-card', onclick: async () => add(await pickFiles({ accept, multiple: true })) }, icon('plus', 22), 'Ajouter des images'),
    );
  }

  async function run(btn, host) {
    const result = await runTask(host, btn, async (progress) => {
      const doc = await newDoc();
      for (let i = 0; i < items.length; i++) {
        progress.set(i / items.length, `Image ${i + 1} sur ${items.length}`);
        await addImagePage(doc, await prepareImage(items[i].file), opts, items[i].file.name);
        await tick();
      }
      progress.set(0.97, 'Enregistrement…');
      return saveDoc(doc);
    });
    if (!result) return;
    cleanupDrop?.();
    cleanupDrop = null;
    const count = items.length;
    const name = count === 1 ? `${baseName(items[0].file.name)}.pdf` : `${baseName(items[0].file.name)}-et-${count - 1}-autres.pdf`;
    list = null;
    root.replaceChildren(resultView({ title: 'Votre PDF est prêt', stats: [{ value: count, label: count > 1 ? 'pages' : 'page' }, { value: formatBytes(result.length), label: 'taille' }], blob: pdfBlob(result), filename: name, onRestart: start }));
  }

  start();
}
