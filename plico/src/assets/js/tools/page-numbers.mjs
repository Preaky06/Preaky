import { h, field } from '../ui.mjs';
import { batchTool } from './_batch.mjs';
import { loadDoc, newDoc, saveDoc, openRender, renderPage, pdfLib, pageGeometry, toContent, hexToRgb, outName, baseName, encodable } from '../pdf.mjs';

const TOOL = 'page-numbers';

const FORMATS = [
  ['n', '1'],
  ['page-n', 'Page 1'],
  ['n-total', '1 / 12'],
  ['page-n-total', 'Page 1 sur 12'],
  ['dash', '– 1 –'],
];

export function formatNumber(format, n, total) {
  switch (format) {
    case 'page-n':
      return `Page ${n}`;
    case 'n-total':
      return `${n} / ${total}`;
    case 'page-n-total':
      return `Page ${n} sur ${total}`;
    case 'dash':
      return `– ${n} –`;
    default:
      return String(n);
  }
}

export async function applyNumbers(doc, o, { pageOffset = 0, totalPages } = {}) {
  const { StandardFonts, rgb, degrees } = await pdfLib();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { r, g, b } = hexToRgb(o.color);
  const pages = doc.getPages();
  const total = totalPages ?? pages.length;
  const numbered = total - (o.skipFirst ? 1 : 0);
  const start = Math.max(0, Math.floor(Number(o.start) || 1));
  const [vpos, hpos] = o.position.split('-');
  pages.forEach((page, i) => {
    const absolute = i + pageOffset; // index réel dans le document complet
    if (o.skipFirst && absolute === 0) return;
    const n = start + absolute - (o.skipFirst ? 1 : 0);
    const text = encodable(font, formatNumber(o.format, n, start + numbered - 1));
    const size = Number(o.size);
    const geo = pageGeometry(page);
    const w = font.widthOfTextAtSize(text, size);
    const m = Number(o.margin);
    const vx = hpos === 'left' ? m : hpos === 'right' ? geo.vw - m - w : (geo.vw - w) / 2;
    const vy = vpos === 'top' ? geo.vh - m - size * 0.72 : m;
    const p = toContent(geo, vx, vy);
    page.drawText(text, { x: p.x, y: p.y, size, font, color: rgb(r, g, b), rotate: degrees(geo.rot) });
  });
}

export default function mount(root, { accept }) {
  const o = { position: 'bottom-center', format: 'n', start: 1, size: 11, margin: 28, skipFirst: false, color: '#16130f' };

  batchTool(root, {
    toolId: TOOL,
    accept,
    title: 'Déposez le PDF à numéroter',
    hint: 'Position, format et numéro de départ personnalisables.',
    actionLabel: 'Numéroter les pages',
    resultTitle: 'Pages numérotées',
    zipName: (files) => `${baseName(files[0].name)}-numerotes.zip`,
    stats: (inputs) => [{ value: inputs.length, label: inputs.length > 1 ? 'fichiers' : 'fichier' }],
    options(aside, changed) {
      const positions = h('div', { class: 'pos-grid', role: 'radiogroup', 'aria-label': 'Position' });
      for (const v of ['top', 'middle', 'bottom']) {
        for (const hp of ['left', 'center', 'right']) {
          const value = `${v}-${hp}`;
          if (v === 'middle') {
            positions.append(h('label', { class: 'blank', 'aria-hidden': 'true' }, h('span')));
            continue;
          }
          const input = h('input', { type: 'radio', name: 'pn-pos', value, checked: o.position === value, 'aria-label': `${v === 'top' ? 'Haut' : 'Bas'} ${hp === 'left' ? 'gauche' : hp === 'right' ? 'droite' : 'centre'}` });
          input.addEventListener('change', () => { o.position = value; changed(); });
          positions.append(h('label', {}, input, h('span')));
        }
      }
      const format = h('select', { class: 'select' }, FORMATS.map(([v, l]) => h('option', { value: v, selected: v === o.format }, l)));
      format.addEventListener('change', () => { o.format = format.value; changed(); });
      const start = h('input', { class: 'input', type: 'number', min: '0', value: String(o.start), 'data-testid': 'pn-start' });
      start.addEventListener('input', () => { o.start = Number(start.value) || 0; changed(); });
      const size = h('input', { type: 'range', min: '7', max: '28', value: String(o.size) });
      size.addEventListener('input', () => { o.size = Number(size.value); changed(); });
      const margin = h('input', { type: 'range', min: '10', max: '80', value: String(o.margin) });
      margin.addEventListener('input', () => { o.margin = Number(margin.value); changed(); });
      const skip = h('input', { type: 'checkbox', checked: o.skipFirst });
      skip.addEventListener('change', () => { o.skipFirst = skip.checked; changed(); });
      const color = h('input', { type: 'color', value: o.color, 'aria-label': 'Couleur' });
      color.addEventListener('input', () => { o.color = color.value; changed(); });
      aside.append(
        h('h3', {}, 'Position'),
        positions,
        field('Format', format),
        field('Premier numéro', start),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Taille du texte'), size),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Distance au bord'), margin),
        h('label', { class: 'check' }, skip, 'Ignorer la première page (couverture)'),
        h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'field-label' }, 'Couleur'), color),
      );
    },
    async preview(file, bytes, host) {
      const src = await loadDoc(bytes, file.name);
      const index = o.skipFirst && src.getPageCount() > 1 ? 1 : 0;
      const one = await newDoc();
      const [page] = await one.copyPages(src, [index]);
      one.addPage(page);
      await applyNumbers(one, o, { pageOffset: index, totalPages: src.getPageCount() });
      const doc = await openRender(await saveDoc(one));
      const { canvas } = await renderPage(doc, 1, { width: 560 });
      doc.destroy();
      host.replaceChildren(canvas);
    },
    async process(file, bytes, progress) {
      const doc = await loadDoc(bytes, file.name);
      progress.set(0.3, 'Numérotation…');
      await applyNumbers(doc, o);
      progress.set(0.85, 'Enregistrement…');
      return [{ name: outName(file.name, 'numerote'), bytes: await saveDoc(doc), type: 'application/pdf' }];
    },
  });
}

