// Gabarit des outils « appliquer un traitement à un ou plusieurs PDF » (lots réservés au plan Business).
import { h, icon, iconButton, pickFiles, resultView, formatBytes, paywall } from '../ui.mjs';
import { dropStage, workspace, primaryAction, runTask, checkFiles, tick } from './_common.mjs';
import { readBytes } from '../pdf.mjs';
import { limits } from '../plans.mjs';
import { zipBlob } from '../zip.mjs';

/**
 * cfg = {
 *   toolId, accept, title, hint, actionLabel, resultTitle,
 *   options(aside, changed)          → construit les réglages, appelle changed() à chaque modification
 *   preview?(file, bytes, host)      → aperçu du premier fichier (appelé après chaque changement)
 *   process(file, bytes, progress)   → [{ name, bytes, type }]
 *   zipName(files)                   → nom de l'archive si plusieurs sorties
 *   stats?(inputs, outputs)          → [{ value, label }]
 * }
 */
export function batchTool(root, cfg) {
  let files = [];
  let previewTimer = null;

  function start() {
    files = [];
    dropStage(root, {
      accept: cfg.accept,
      multiple: true,
      batch: true,
      title: cfg.title,
      hint: cfg.hint,
      onFiles: (f) => {
        files = f;
        build();
      },
    });
  }

  function build() {
    const ws = workspace();
    const chips = h('div', { class: 'file-chips', 'data-testid': 'file-chips' });
    const previewHost = h('div', { class: 'preview-box', 'data-testid': 'preview' }, h('span', { class: 'spinner' }));
    const renderChips = () => {
      chips.replaceChildren(
        ...files.map((f, i) =>
          h(
            'div',
            { class: 'notice', style: { alignItems: 'center', marginBottom: '8px' } },
            icon('file', 18),
            h('span', { style: { flex: '1', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, f.name),
            h('span', { class: 'muted small' }, formatBytes(f.size)),
            files.length > 1 ? iconButton('x', 'Retirer', () => { files.splice(i, 1); renderChips(); schedulePreview(); }) : null,
          ),
        ),
      );
      if (limits().batch) {
        chips.append(h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: addMore }, icon('plus', 16), 'Ajouter des PDF'));
      }
    };
    const addMore = async () => {
      const more = await pickFiles({ accept: cfg.accept, multiple: true });
      if (!more.length) return;
      const problem = checkFiles(more, { existing: files.length, batch: true });
      if (problem) return paywall(problem);
      files.push(...more);
      renderChips();
    };
    renderChips();
    ws.main.append(chips);
    if (cfg.preview) ws.main.append(previewHost, h('p', { class: 'preview-caption' }, 'Aperçu de la première page'));

    const schedulePreview = () => {
      if (!cfg.preview || !files.length) return;
      clearTimeout(previewTimer);
      previewTimer = setTimeout(async () => {
        try {
          const bytes = await readBytes(files[0]);
          await cfg.preview(files[0], bytes, previewHost);
        } catch (e) {
          previewHost.replaceChildren(h('p', { class: 'notice err' }, e.userMessage || 'Aperçu impossible.'));
        }
      }, 220);
    };

    cfg.options(ws.aside, schedulePreview);
    if (!limits().batch) ws.aside.append(h('p', { class: 'muted small' }, 'Plusieurs PDF d’un coup ? Le plan Business traite des lots entiers.'));
    ws.aside.append(h('button', { type: 'button', class: 'btn btn-ghost btn-block', onclick: start }, 'Changer de fichier'));
    const action = primaryAction(cfg.actionLabel, cfg.toolId, (btn) => run(btn, ws.aside));
    ws.aside.append(action.el);
    root.replaceChildren(ws.el);
    schedulePreview();
  }

  async function run(btn, host) {
    if (files.length > 1) {
      const problem = checkFiles(files, { batch: true });
      if (problem) return paywall(problem);
    }
    const inputs = files.slice();
    const result = await runTask(host, btn, async (progress) => {
      const outputs = [];
      for (let i = 0; i < inputs.length; i++) {
        const file = inputs[i];
        const sub = {
          set: (fraction, message) => progress.set((i + Math.max(0, Math.min(1, fraction))) / inputs.length, inputs.length > 1 ? `${file.name} — ${message || ''}` : message),
        };
        sub.set(0, 'Lecture…');
        const bytes = await readBytes(file);
        outputs.push(...(await cfg.process(file, bytes, sub)));
        await tick();
      }
      if (outputs.length === 1) return { outputs, blob: new Blob([outputs[0].bytes], { type: outputs[0].type }), filename: outputs[0].name };
      progress.set(0.99, 'Création de l’archive ZIP…');
      return { outputs, blob: await zipBlob(outputs), filename: cfg.zipName(inputs) };
    });
    if (!result) return;
    root.replaceChildren(
      resultView({
        title: cfg.resultTitle,
        text: cfg.resultText?.(inputs, result.outputs),
        stats: cfg.stats ? cfg.stats(inputs, result.outputs) : [],
        blob: result.blob,
        filename: result.filename,
        extra: [h('button', { type: 'button', class: 'btn btn-ghost btn-lg', onclick: build }, 'Modifier les réglages')],
        onRestart: start,
      }),
    );
  }

  start();
  return { files: () => files };
}

