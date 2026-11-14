import { h, icon, resultView, toast, segmented, field, formatBytes } from '../ui.mjs';
import { dropStage, workspace, primaryAction, runTask, tick } from './_common.mjs';
import { readBytes, loadDoc, newDoc, saveDoc, pdfBlob, openRender, renderPage, baseName } from '../pdf.mjs';
import { parseRanges, chunkRanges, rangesToIndices, rangeLabel } from '../ranges.mjs';
import { zipBlob } from '../zip.mjs';

const TOOL = 'split';

export default function mount(root, { accept }) {
  let file = null;
  let bytes = null;
  let count = 0;
  const state = { mode: 'ranges', ranges: '', every: 2 };

  function start() {
    dropStage(root, { accept, multiple: false, kind: 'single', title: 'Déposez le PDF à diviser', hint: 'Par plages de pages, toutes les N pages, ou page par page.', onFiles: ([f]) => open(f) });
  }

  async function open(f) {
    root.replaceChildren(h('div', { class: 'tool-loading' }, h('span', { class: 'spinner' })));
    try {
      file = f;
      bytes = await readBytes(f);
      const doc = await loadDoc(bytes, f.name);
      count = doc.getPageCount();
      state.ranges = count > 1 ? `1-${Math.ceil(count / 2)}, ${Math.ceil(count / 2) + 1}-${count}` : '1';
      build();
    } catch (e) {
      toast(e.userMessage || 'PDF illisible.', { type: 'err' });
      start();
    }
  }

  function plan() {
    if (state.mode === 'single') return { parts: chunkRanges(count, 1) };
    if (state.mode === 'every') {
      const n = Number(state.every);
      if (!Number.isInteger(n) || n < 1) return { error: 'Indiquez un nombre de pages entier, supérieur ou égal à 1.' };
      return { parts: chunkRanges(count, n) };
    }
    try {
      const ranges = parseRanges(state.ranges, count);
      if (state.mode === 'extract') return { parts: [ranges], extract: true };
      return { parts: ranges };
    } catch (e) {
      return { error: e.userMessage || 'Plages invalides.' };
    }
  }

  function build() {
    const ws = workspace();
    const thumbBox = h('div', { class: 'thumb', style: { width: '110px', flex: 'none', borderRadius: '10px' } }, h('span', { class: 'spinner' }));
    const preview = h('div', { 'data-testid': 'split-preview' });
    ws.main.append(
      h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '16px', marginBottom: '18px' } }, thumbBox, h('div', {}, h('div', { class: 'ws-title' }, icon('file', 18), h('span', {}, file.name)), h('p', { class: 'muted small' }, `${count} page${count > 1 ? 's' : ''} · ${formatBytes(file.size)}`))),
      h('h3', { style: { fontSize: '1rem' } }, 'Fichiers qui seront créés'),
      preview,
    );
    openRender(bytes, file.name)
      .then(async (doc) => {
        const { canvas } = await renderPage(doc, 1, { width: 200 });
        thumbBox.replaceChildren(canvas);
        doc.destroy();
      })
      .catch(() => thumbBox.replaceChildren());

    const rangesInput = h('input', { class: 'input mono', value: state.ranges, 'data-testid': 'ranges', autocomplete: 'off', spellcheck: 'false' });
    const everyInput = h('input', { class: 'input', type: 'number', min: '1', max: String(count), value: String(state.every), 'data-testid': 'every' });
    const rangesField = field('Pages', rangesInput, 'Ex. : 1-3, 5, 8- (« 8- » = jusqu’à la fin)');
    const everyField = field('Nombre de pages par fichier', everyInput);
    const sync = () => {
      rangesField.hidden = !['ranges', 'extract'].includes(state.mode);
      everyField.hidden = state.mode !== 'every';
      const p = plan();
      rangesInput.setAttribute('aria-invalid', String(!!p.error && !rangesField.hidden));
      if (p.error) {
        preview.replaceChildren(h('p', { class: 'notice err' }, p.error));
        return;
      }
      const parts = p.extract ? [{ label: p.parts[0].map(rangeLabel).join(', '), pages: rangesToIndices(p.parts[0]).length }] : p.parts.map((r) => ({ label: rangeLabel(r), pages: r.end - r.start + 1 }));
      const shown = parts.slice(0, 60);
      preview.replaceChildren(
        ...[
        h('ol', { class: 'steps' }, shown.map((part) => h('li', {}, h('span', {}, h('strong', {}, `Pages ${part.label}`), h('span', { class: 'muted' }, ` — ${part.pages} page${part.pages > 1 ? 's' : ''}`))))),
        parts.length > shown.length ? h('p', { class: 'muted small', style: { marginTop: '10px' } }, `… et ${parts.length - shown.length} autres fichiers.`) : null,
        h('p', { class: 'muted small', style: { marginTop: '12px' } }, parts.length > 1 ? `${parts.length} fichiers, téléchargés dans une archive ZIP.` : '1 fichier PDF.'),
        ].filter(Boolean),
      );
    };
    rangesInput.addEventListener('input', () => { state.ranges = rangesInput.value; sync(); });
    everyInput.addEventListener('input', () => { state.every = everyInput.value; sync(); });
    const modes = segmented('split-mode', [['ranges', 'Par plages'], ['every', 'Toutes les N pages'], ['single', 'Page par page'], ['extract', 'Extraire des pages']], state.mode, (v) => { state.mode = v; sync(); }, { wrap: true });

    const action = primaryAction('Diviser le PDF', TOOL, (btn) => run(btn, ws.aside));
    ws.aside.append(h('h3', {}, 'Mode'), modes, rangesField, everyField, h('button', { type: 'button', class: 'btn btn-ghost btn-block', onclick: start }, 'Changer de fichier'), action.el);
    root.replaceChildren(ws.el);
    sync();
  }

  async function run(btn, host) {
    const p = plan();
    if (p.error) return toast(p.error, { type: 'err' });
    const result = await runTask(host, btn, async (progress) => {
      const src = await loadDoc(bytes, file.name);
      const base = baseName(file.name);
      const outputs = [];
      const groups = p.extract ? [{ indices: rangesToIndices(p.parts[0]), label: 'extrait' }] : p.parts.map((r) => ({ indices: rangesToIndices([r]), label: `pages-${rangeLabel(r)}` }));
      for (let i = 0; i < groups.length; i++) {
        progress.set(i / groups.length, `Fichier ${i + 1} sur ${groups.length}`);
        const out = await newDoc();
        const copied = await out.copyPages(src, groups[i].indices);
        copied.forEach((pg) => out.addPage(pg));
        outputs.push({ name: `${base}-${groups[i].label}.pdf`, bytes: await saveDoc(out) });
        if (i % 5 === 4) await tick();
      }
      if (outputs.length === 1) return { blob: pdfBlob(outputs[0].bytes), filename: outputs[0].name, count: 1 };
      progress.set(0.98, 'Création de l’archive…');
      return { blob: await zipBlob(outputs), filename: `${base}-divise.zip`, count: outputs.length };
    });
    if (!result) return;
    root.replaceChildren(
      resultView({
        title: 'PDF divisé',
        stats: [{ value: result.count, label: result.count > 1 ? 'fichiers' : 'fichier' }],
        blob: result.blob,
        filename: result.filename,
        extra: [h('button', { type: 'button', class: 'btn btn-ghost btn-lg', onclick: build }, 'Modifier le découpage')],
        onRestart: start,
      }),
    );
  }

  start();
}
