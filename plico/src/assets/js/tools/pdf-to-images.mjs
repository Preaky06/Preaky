import { h, segmented, field } from '../ui.mjs';
import { batchTool } from './_batch.mjs';
import { tick } from './_common.mjs';
import { openRender, renderPage, canvasToBytes, baseName, UserError } from '../pdf.mjs';
import { parseRanges, rangesToIndices } from '../ranges.mjs';

const TOOL = 'pdf-to-images';

export default function mount(root, { accept }) {
  const o = { format: 'png', dpi: 150, quality: 0.9, pages: '' };

  batchTool(root, {
    toolId: TOOL,
    accept,
    title: 'Déposez le PDF à convertir',
    hint: 'Chaque page devient une image PNG ou JPG.',
    actionLabel: 'Convertir en images',
    resultTitle: 'Images prêtes',
    zipName: (files) => `${baseName(files[0].name)}-images.zip`,
    stats: (inputs, outputs) => [{ value: outputs.length, label: outputs.length > 1 ? 'images' : 'image' }],
    options(aside) {
      const quality = h('input', { type: 'range', min: '0.5', max: '1', step: '0.05', value: String(o.quality) });
      quality.addEventListener('input', () => (o.quality = Number(quality.value)));
      const qualityField = h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Qualité JPG'), quality);
      const pages = h('input', { class: 'input mono', placeholder: 'Toutes les pages', 'data-testid': 'pages' });
      pages.addEventListener('input', () => (o.pages = pages.value));
      const sync = () => (qualityField.hidden = o.format !== 'jpg');
      aside.append(
        h('h3', {}, 'Format'),
        segmented('pti-format', [['png', 'PNG'], ['jpg', 'JPG']], o.format, (v) => { o.format = v; sync(); }),
        h('h3', {}, 'Résolution'),
        segmented('pti-dpi', [['72', '72 dpi'], ['150', '150 dpi'], ['300', '300 dpi']], String(o.dpi), (v) => (o.dpi = Number(v))),
        qualityField,
        field('Pages à exporter', pages, 'Laissez vide pour tout exporter, ou ex. : 1, 3-5'),
      );
      sync();
    },
    async process(file, bytes, progress) {
      const doc = await openRender(bytes, file.name);
      try {
        let indices = Array.from({ length: doc.numPages }, (_, i) => i);
        if (o.pages.trim()) {
          try {
            indices = rangesToIndices(parseRanges(o.pages, doc.numPages));
          } catch (e) {
            throw new UserError(`${file.name} : ${e.userMessage}`);
          }
        }
        const outputs = [];
        const pad = String(doc.numPages).length;
        const type = o.format === 'jpg' ? 'image/jpeg' : 'image/png';
        for (let k = 0; k < indices.length; k++) {
          const n = indices[k] + 1;
          progress.set(k / indices.length, `Page ${n}`);
          const { canvas } = await renderPage(doc, n, { scale: o.dpi / 72 });
          const data = await canvasToBytes(canvas, type, o.format === 'jpg' ? o.quality : undefined);
          canvas.width = canvas.height = 0;
          outputs.push({ name: `${baseName(file.name)}-page-${String(n).padStart(pad, '0')}.${o.format}`, bytes: data, type });
          await tick();
        }
        return outputs;
      } finally {
        doc.destroy();
      }
    },
  });
}
