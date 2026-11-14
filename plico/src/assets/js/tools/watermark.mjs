import { h, segmented, field } from '../ui.mjs';
import { batchTool } from './_batch.mjs';
import { loadDoc, newDoc, saveDoc, openRender, renderPage, pdfLib, pageGeometry, toContent, encodable, hexToRgb, outName, baseName } from '../pdf.mjs';

const TOOL = 'watermark';

export async function applyWatermark(doc, o) {
  const { StandardFonts, rgb, degrees } = await pdfLib();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const text = encodable(font, o.text || ' ').replace(/[\r\n]+/g, ' ');
  const { r, g, b } = hexToRgb(o.color);
  const color = rgb(r, g, b);
  const theta = (Number(o.angle) * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  for (const page of doc.getPages()) {
    const geo = pageGeometry(page);
    const size = Number(o.size);
    const w = font.widthOfTextAtSize(text, size);
    const th = size * 0.72;
    const centers = [];
    if (o.mode === 'tile') {
      const stepX = w + size * 2.5;
      const stepY = size * 4.5;
      const reach = Math.max(geo.vw, geo.vh);
      let row = 0;
      for (let cy = -reach * 0.5; cy <= geo.vh + reach * 0.5 && centers.length < 600; cy += stepY, row++) {
        for (let cx = -reach * 0.5 + (row % 2 ? stepX / 2 : 0); cx <= geo.vw + reach * 0.5 && centers.length < 600; cx += stepX) centers.push([cx, cy]);
      }
    } else {
      centers.push([geo.vw / 2, geo.vh / 2]);
    }
    for (const [cx, cy] of centers) {
      const ox = cx - (w / 2) * cos + (th / 2) * sin;
      const oy = cy - (w / 2) * sin - (th / 2) * cos;
      const p = toContent(geo, ox, oy);
      page.drawText(text, { x: p.x, y: p.y, size, font, color, opacity: Number(o.opacity) / 100, rotate: degrees(Number(o.angle) + geo.rot) });
    }
  }
}

export default function mount(root, { accept }) {
  const o = { text: 'CONFIDENTIEL', mode: 'center', size: 64, opacity: 25, angle: 45, color: '#e5372a' };

  batchTool(root, {
    toolId: TOOL,
    accept,
    title: 'Déposez le PDF à marquer',
    hint: 'Ajoutez « Confidentiel », « Brouillon », votre nom…',
    actionLabel: 'Appliquer le filigrane',
    resultTitle: 'Filigrane appliqué',
    zipName: (files) => `${baseName(files[0].name)}-filigranes.zip`,
    stats: (inputs) => [{ value: inputs.length, label: inputs.length > 1 ? 'fichiers' : 'fichier' }],
    options(aside, changed) {
      const text = h('input', { class: 'input', value: o.text, maxlength: '80', 'data-testid': 'wm-text' });
      text.addEventListener('input', () => { o.text = text.value; changed(); });
      const range = (key, min, max, step, suffix) => {
        const out = h('span', { class: 'muted' }, `${o[key]}${suffix}`);
        const input = h('input', { type: 'range', min, max, step, value: String(o[key]) });
        input.addEventListener('input', () => { o[key] = Number(input.value); out.textContent = `${o[key]}${suffix}`; changed(); });
        return h('div', { class: 'field' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'field-label' }, { size: 'Taille', opacity: 'Opacité', angle: 'Angle' }[key]), out), input);
      };
      const color = h('input', { type: 'color', value: o.color, 'aria-label': 'Couleur' });
      color.addEventListener('input', () => { o.color = color.value; changed(); });
      aside.append(
        field('Texte du filigrane', text),
        h('h3', {}, 'Disposition'),
        segmented('wm-mode', [['center', 'Centré'], ['tile', 'Mosaïque']], o.mode, (v) => { o.mode = v; changed(); }),
        range('size', 12, 160, 1, ' pt'),
        range('opacity', 5, 100, 1, ' %'),
        range('angle', -90, 90, 5, '°'),
        h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'field-label' }, 'Couleur'), color),
      );
    },
    async preview(file, bytes, host) {
      const src = await loadDoc(bytes, file.name);
      const one = await newDoc();
      const [first] = await one.copyPages(src, [0]);
      one.addPage(first);
      await applyWatermark(one, o);
      const out = await saveDoc(one);
      const doc = await openRender(out);
      const { canvas } = await renderPage(doc, 1, { width: 560 });
      doc.destroy();
      host.replaceChildren(canvas);
    },
    async process(file, bytes, progress) {
      const doc = await loadDoc(bytes, file.name);
      progress.set(0.3, 'Application du filigrane…');
      await applyWatermark(doc, o);
      progress.set(0.85, 'Enregistrement…');
      return [{ name: outName(file.name, 'filigrane'), bytes: await saveDoc(doc), type: 'application/pdf' }];
    },
  });
}
