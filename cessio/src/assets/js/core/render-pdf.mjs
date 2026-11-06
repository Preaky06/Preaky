// Mise en page PDF des documents (pdf-lib, polices standard : aucun fichier à télécharger).
const A4 = [595.28, 841.89];
const M = { left: 62, right: 62, top: 64, bottom: 72 };
const W = A4[0] - M.left - M.right;
const INK = [0.1, 0.1, 0.1];
const MUTED = [0.42, 0.42, 0.45];
const LINE = [0.84, 0.84, 0.86];

function hexToRgb01(hex) {
  const m = String(hex || '').replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [0.36, 0.29, 1];
}

/** Retire les caractères non encodables par les polices standard PDF (WinAnsi). */
function sanitizer(font) {
  const cache = new Map();
  return (text) =>
    [...String(text ?? '').replace(/[  ]/g, ' ')]
      .map((ch) => {
        if (cache.has(ch)) return cache.get(ch);
        let out = ch;
        try {
          font.encodeText(ch);
        } catch {
          const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
          try {
            font.encodeText(base);
            out = base;
          } catch {
            out = '?';
          }
        }
        cache.set(ch, out);
        return out;
      })
      .join('');
}

function wrap(text, font, size, width) {
  const words = String(text).split(/ +/);
  const lines = [];
  let line = '';
  const fits = (s) => font.widthOfTextAtSize(s, size) <= width;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (fits(word)) {
      line = word;
      continue;
    }
    // mot plus long que la ligne : coupure caractère par caractère
    let chunk = '';
    for (const ch of word) {
      if (fits(chunk + ch)) chunk += ch;
      else {
        lines.push(chunk);
        chunk = ch;
      }
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/**
 * doc = { blocks }
 * opts = { lib (module pdf-lib), accent, logo: { bytes, type } | null, footerText, title, author }
 */
export async function renderPdf(doc, opts) {
  const { PDFDocument, StandardFonts, rgb } = opts.lib;
  const pdf = await PDFDocument.create();
  pdf.setTitle(opts.title || 'Document');
  if (opts.author) pdf.setAuthor(opts.author);
  pdf.setProducer(opts.producer || 'Cessio');
  pdf.setCreator(opts.producer || 'Cessio');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const clean = sanitizer(regular);
  const accent = rgb(...hexToRgb01(opts.accent));
  const c = (arr) => rgb(...arr);

  let page;
  let y;
  const newPage = () => {
    page = pdf.addPage(A4);
    y = A4[1] - M.top;
  };
  newPage();
  const ensure = (h) => {
    if (y - h < M.bottom) newPage();
  };

  if (opts.logo) {
    try {
      const img = opts.logo.type === 'png' ? await pdf.embedPng(opts.logo.bytes) : await pdf.embedJpg(opts.logo.bytes);
      const s = Math.min(150 / img.width, 42 / img.height, 1);
      page.drawImage(img, { x: M.left, y: y - img.height * s, width: img.width * s, height: img.height * s });
      y -= img.height * s + 22;
    } catch {
      /* logo illisible : ignoré */
    }
  }

  const text = (str, { font = regular, size = 9.6, color = INK, x = M.left, width = W, leading = size * 1.45, after = 6, indent = 0 } = {}) => {
    const lines = wrap(clean(str), font, size, width - indent);
    for (const line of lines) {
      ensure(leading);
      page.drawText(line, { x: x + indent, y: y - size, size, font, color: c(color) });
      y -= leading;
    }
    y -= after;
  };

  for (let i = 0; i < doc.blocks.length; i++) {
    const b = doc.blocks[i];
    switch (b.t) {
      case 'title':
        ensure(40);
        text(b.text, { font: bold, size: 19, leading: 24, after: 4 });
        page.drawRectangle({ x: M.left, y: y - 2, width: 44, height: 3, color: accent });
        y -= 18;
        break;
      case 'subtitle':
        text(b.text, { size: 10, color: MUTED, after: 12 });
        break;
      case 'h': {
        y -= 8;
        ensure(14 + 3 * 14); // garde le titre avec au moins trois lignes
        text(b.text, { font: bold, size: 11, leading: 15, after: 5 });
        break;
      }
      case 'p':
        text(b.text);
        break;
      case 'li':
        ensure(14);
        page.drawCircle({ x: M.left + 5, y: y - 6.4, size: 1.7, color: accent });
        text(b.text, { indent: 16, after: 4 });
        break;
      case 'small':
        y -= 6;
        text(b.text, { size: 8, color: MUTED, leading: 11 });
        break;
      case 'space':
        y -= 10;
        break;
      case 'table': {
        const cols = b.head.length;
        const widths = cols === 2 ? [W * 0.38, W * 0.62] : Array(cols).fill(W / cols);
        const pad = 6;
        const size = 9;
        const lead = 12.5;
        const drawRow = (cells, isHead) => {
          const font = isHead ? bold : regular;
          const wrapped = cells.map((cell, k) => wrap(clean(cell), k === 0 && !isHead ? bold : font, size, widths[k] - pad * 2));
          const h = Math.max(...wrapped.map((l) => l.length)) * lead + pad * 2 - 3;
          if (y - h < M.bottom) {
            newPage();
            if (!isHead) drawRow(b.head, true);
          }
          let x = M.left;
          if (isHead) page.drawRectangle({ x: M.left, y: y - h, width: W, height: h, color: rgb(0.95, 0.95, 0.97) });
          wrapped.forEach((lines, k) => {
            lines.forEach((line, n) => page.drawText(line, { x: x + pad, y: y - pad - size - n * lead + 1, size, font: k === 0 && !isHead ? bold : font, color: c(INK) }));
            x += widths[k];
          });
          page.drawLine({ start: { x: M.left, y: y - h }, end: { x: M.left + W, y: y - h }, thickness: 0.6, color: c(LINE) });
          y -= h;
        };
        y -= 2;
        page.drawLine({ start: { x: M.left, y }, end: { x: M.left + W, y }, thickness: 0.6, color: c(LINE) });
        drawRow(b.head, true);
        for (const row of b.rows) drawRow(row, false);
        y -= 10;
        break;
      }
      case 'sign': {
        const h = 128;
        if (y - h < M.bottom) newPage();
        const colW = (W - 24) / 2;
        [b.left, b.right].forEach((s, k) => {
          const x = M.left + k * (colW + 24);
          page.drawRectangle({ x, y: y - h, width: colW, height: h, borderColor: c(LINE), borderWidth: 0.8 });
          let yy = y - 18;
          page.drawText(clean(s.title), { x: x + 12, y: yy, size: 10.5, font: bold, color: c(INK) });
          yy -= 14;
          for (const line of wrap(clean(s.name || ''), regular, 9, colW - 24).slice(0, 2)) {
            page.drawText(line, { x: x + 12, y: yy, size: 9, font: regular, color: c(INK) });
            yy -= 12;
          }
          for (const line of wrap(clean(s.mention), italic, 8.5, colW - 24)) {
            page.drawText(line, { x: x + 12, y: yy, size: 8.5, font: italic, color: c(MUTED) });
            yy -= 11;
          }
          page.drawText(clean('Signature :'), { x: x + 12, y: y - h + 14, size: 8.5, font: regular, color: c(MUTED) });
        });
        y -= h + 8;
        break;
      }
      default:
        break;
    }
  }

  // Pied de page : texte + pagination
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const label = clean(`Page ${i + 1} / ${pages.length}`);
    p.drawText(label, { x: A4[0] - M.right - regular.widthOfTextAtSize(label, 8), y: 36, size: 8, font: regular, color: c(MUTED) });
    if (opts.footerText) p.drawText(clean(opts.footerText), { x: M.left, y: 36, size: 8, font: opts.footerStrong ? bold : regular, color: opts.footerStrong ? accent : c(MUTED) });
    if (opts.initials && pages.length > 1) p.drawText(clean('Paraphes :'), { x: M.left, y: 50, size: 7.5, font: regular, color: c(MUTED) });
  });
  return pdf.save({ useObjectStreams: true });
}
