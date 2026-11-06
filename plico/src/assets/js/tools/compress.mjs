import { h, segmented, formatBytes } from '../ui.mjs';
import { batchTool } from './_batch.mjs';
import { tick } from './_common.mjs';
import { loadDoc, newDoc, saveDoc, openRender, renderPage, canvasToBytes, outName, baseName } from '../pdf.mjs';

const TOOL = 'compress';

export const LEVELS = {
  lossless: { label: 'Sans perte', dpi: 0, quality: 0 },
  balanced: { label: 'Équilibré', dpi: 120, quality: 0.72 },
  strong: { label: 'Fort', dpi: 85, quality: 0.55 },
};

async function lossless(bytes, name) {
  const doc = await loadDoc(bytes, name);
  return doc.save({ useObjectStreams: true });
}

async function rasterize(bytes, name, level, progress, grayscale) {
  const src = await openRender(bytes, name);
  const out = await newDoc();
  try {
    for (let i = 1; i <= src.numPages; i++) {
      progress.set((i - 1) / src.numPages, `Page ${i} sur ${src.numPages}`);
      const { canvas, width, height } = await renderPage(src, i, { scale: level.dpi / 72 });
      if (grayscale) {
        const ctx = canvas.getContext('2d');
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = img.data;
        for (let p = 0; p < d.length; p += 4) {
          const y = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
          d[p] = d[p + 1] = d[p + 2] = y;
        }
        ctx.putImageData(img, 0, 0);
      }
      const jpeg = await canvasToBytes(canvas, 'image/jpeg', level.quality);
      canvas.width = canvas.height = 0;
      const image = await out.embedJpg(jpeg);
      const page = out.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
      if (i % 3 === 0) await tick();
    }
  } finally {
    src.destroy();
  }
  return saveDoc(out);
}

export default function mount(root, { accept }) {
  const o = { level: 'balanced', grayscale: false };

  batchTool(root, {
    toolId: TOOL,
    accept,
    title: 'Déposez le PDF à compresser',
    hint: 'Idéal pour les scans et les documents trop lourds pour un e-mail.',
    actionLabel: 'Compresser',
    resultTitle: 'Compression terminée',
    zipName: (files) => `${baseName(files[0].name)}-compresses.zip`,
    resultText: (inputs, outputs) => (outputs.some((x) => x.kept) ? 'Certains fichiers étaient déjà optimisés : l’original a été conservé pour eux.' : ''),
    stats: (inputs, outputs) => {
      const before = inputs.reduce((s, f) => s + f.size, 0);
      const after = outputs.reduce((s, x) => s + x.bytes.length, 0);
      const pct = before ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;
      return [
        { value: formatBytes(before), label: 'avant' },
        { value: formatBytes(after), label: 'après' },
        { value: `−${pct} %`, label: 'gagnés' },
      ];
    },
    options(aside) {
      const explain = h('p', { class: 'notice' });
      const gray = h('input', { type: 'checkbox', checked: o.grayscale });
      gray.addEventListener('change', () => (o.grayscale = gray.checked));
      const grayRow = h('label', { class: 'check' }, gray, 'Convertir en niveaux de gris (gain supplémentaire)');
      const sync = () => {
        explain.className = o.level === 'lossless' ? 'notice' : 'notice warn';
        explain.textContent =
          o.level === 'lossless'
            ? 'Réorganise la structure du fichier sans toucher au contenu. Gain modeste, qualité intacte.'
            : `Chaque page est convertie en image optimisée (${LEVELS[o.level].dpi} dpi). Très efficace sur les scans ; le texte ne sera plus sélectionnable.`;
        grayRow.hidden = o.level === 'lossless';
      };
      aside.append(
        h('h3', {}, 'Niveau de compression'),
        segmented('cmp-level', Object.entries(LEVELS).map(([k, v]) => [k, v.label]), o.level, (v) => { o.level = v; sync(); }),
        explain,
        grayRow,
      );
      sync();
    },
    async process(file, bytes, progress) {
      const level = LEVELS[o.level];
      const result = o.level === 'lossless' ? await lossless(bytes, file.name) : await rasterize(bytes, file.name, level, progress, o.grayscale);
      const kept = result.length >= bytes.length;
      return [{ name: outName(file.name, 'compresse'), bytes: kept ? bytes : result, type: 'application/pdf', kept }];
    },
  });
}

