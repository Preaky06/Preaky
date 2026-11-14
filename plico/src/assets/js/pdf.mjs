// Accès à pdf-lib (écriture) et pdf.js (rendu), chargés à la demande.
import config from './config.mjs';

const VENDOR = new URL('../vendor/', import.meta.url);
let libPromise;
let jsPromise;

export class UserError extends Error {
  constructor(message) {
    super(message);
    this.userMessage = message;
  }
}

export const pdfLib = () => (libPromise ??= import('../vendor/pdf-lib/pdf-lib.esm.min.js'));

export const pdfjs = () =>
  (jsPromise ??= import('../vendor/pdfjs/pdf.min.mjs').then((m) => {
    m.GlobalWorkerOptions.workerSrc = new URL('pdfjs/pdf.worker.min.mjs', VENDOR).href;
    return m;
  }));

export async function readBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

export const isPdf = (file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

/** Charge un PDF avec pdf-lib (modification). */
export async function loadDoc(bytes, name = 'Ce fichier') {
  const { PDFDocument } = await pdfLib();
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    if (/encrypt/i.test(String(e?.message)) || e?.name === 'EncryptedPDFError') {
      throw new UserError(`« ${name} » est protégé (chiffré ou par mot de passe). Retirez la protection puis réessayez.`);
    }
    throw new UserError(`« ${name} » n’est pas un PDF valide ou il est endommagé.`);
  }
}

export async function newDoc() {
  const { PDFDocument } = await pdfLib();
  return PDFDocument.create();
}

export async function saveDoc(doc) {
  doc.setProducer(config.brand.name);
  doc.setCreator(config.brand.name);
  const bytes = await doc.save({ useObjectStreams: true });
  return bytes;
}

export const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });

/** Ouvre un PDF avec pdf.js (rendu). Les octets sont copiés car pdf.js les transfère au worker. */
export async function openRender(bytes, name = 'Ce fichier') {
  const lib = await pdfjs();
  const task = lib.getDocument({
    data: bytes.slice(),
    isEvalSupported: false,
    enableXfa: false,
    cMapUrl: new URL('pdfjs/cmaps/', VENDOR).href,
    cMapPacked: true,
    standardFontDataUrl: new URL('pdfjs/standard_fonts/', VENDOR).href,
    wasmUrl: new URL('pdfjs/wasm/', VENDOR).href,
    iccUrl: new URL('pdfjs/iccs/', VENDOR).href,
  });
  try {
    return await task.promise;
  } catch (e) {
    if (e?.name === 'PasswordException') throw new UserError(`« ${name} » est protégé par un mot de passe.`);
    throw new UserError(`« ${name} » n’est pas un PDF valide ou il est endommagé.`);
  }
}

// Safari limite un canvas à ~16,7 millions de pixels.
export const MAX_CANVAS_PIXELS = 16_000_000;

/**
 * Rend une page (numéro base 1) dans un canvas.
 * opts : { scale } ou { width }, rotation supplémentaire, maxPixels
 */
export async function renderPage(doc, pageNumber, opts = {}) {
  const page = await doc.getPage(pageNumber);
  const rotation = (((page.rotate + (opts.rotation || 0)) % 360) + 360) % 360;
  const base = page.getViewport({ scale: 1, rotation });
  let scale = opts.scale ?? (opts.width ? opts.width / base.width : 1);
  const maxPixels = opts.maxPixels ?? MAX_CANVAS_PIXELS;
  if (base.width * base.height * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (base.width * base.height));
  const viewport = page.getViewport({ scale, rotation });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return { canvas, scale, width: base.width, height: base.height };
}

/** File d'attente : limite le nombre de rendus simultanés (vignettes). */
export function renderQueue(concurrency = 2) {
  const queue = [];
  let active = 0;
  const next = () => {
    if (active >= concurrency || !queue.length) return;
    const { job, resolve, reject } = queue.shift();
    active++;
    job()
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return (job) =>
    new Promise((resolve, reject) => {
      queue.push({ job, resolve, reject });
      next();
    });
}

export function canvasToBytes(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new UserError('Mémoire insuffisante pour générer l’image. Essayez une résolution plus basse.'));
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      type,
      quality,
    );
  });
}

// ── Géométrie : coordonnées « visibles » (après rotation de la page) → coordonnées PDF ──
export function pageGeometry(page) {
  const box = page.getCropBox();
  const rot = (((page.getRotation().angle || 0) % 360) + 360) % 360;
  const swap = rot === 90 || rot === 270;
  return { x0: box.x, y0: box.y, W: box.width, H: box.height, rot, vw: swap ? box.height : box.width, vh: swap ? box.width : box.height };
}

/** (vx, vy) : origine en bas à gauche de la page telle qu'affichée. */
export function toContent(g, vx, vy) {
  switch (g.rot) {
    case 90:
      return { x: g.x0 + g.W - vy, y: g.y0 + vx };
    case 180:
      return { x: g.x0 + g.W - vx, y: g.y0 + g.H - vy };
    case 270:
      return { x: g.x0 + vy, y: g.y0 + g.H - vx };
    default:
      return { x: g.x0 + vx, y: g.y0 + vy };
  }
}

/** Retire les caractères que les polices standard PDF (WinAnsi) ne savent pas encoder. */
export function encodable(font, text) {
  let out = '';
  for (const ch of String(text)) {
    if (ch === '\n' || ch === '\r') {
      out += ch;
      continue;
    }
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      try {
        font.encodeText(base);
        out += base;
      } catch {
        out += '?';
      }
    }
  }
  return out;
}

export function hexToRgb(hex) {
  const m = String(hex).replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
}

// ── Images ──
const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };

function jpegOrientation(bytes) {
  try {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (v.getUint16(0) !== 0xffd8) return 1;
    let off = 2;
    while (off + 4 <= v.byteLength) {
      const marker = v.getUint16(off);
      off += 2;
      if (marker === 0xffda || (marker & 0xff00) !== 0xff00) break;
      const len = v.getUint16(off);
      if (marker === 0xffe1 && v.getUint32(off + 2) === 0x45786966) {
        const tiff = off + 8;
        const little = v.getUint16(tiff) === 0x4949;
        const ifd = tiff + v.getUint32(tiff + 4, little);
        const count = v.getUint16(ifd, little);
        for (let i = 0; i < count; i++) {
          const e = ifd + 2 + i * 12;
          if (v.getUint16(e, little) === 0x0112) return v.getUint16(e + 8, little);
        }
        return 1;
      }
      off += len;
    }
  } catch {
    /* EXIF illisible : orientation par défaut */
  }
  return 1;
}

export function decodeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new UserError(`« ${file.name} » : format d’image non pris en charge par ce navigateur.`));
    };
    img.src = url;
  });
}

function hasAlpha(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const step = Math.max(4, Math.floor(data.length / 4 / 250000) * 4);
  for (let i = 3; i < data.length; i += step) if (data[i] < 255) return true;
  return false;
}

/** Prépare une image pour pdf-lib : { bytes, type: 'jpg' | 'png' } avec orientation corrigée. */
export async function prepareImage(file) {
  const bytes = await readBytes(file);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (isJpeg && jpegOrientation(bytes) === 1) return { bytes, type: 'jpg' };
  if (isPng) return { bytes, type: 'png' };
  // Autres formats, ou JPEG à faire pivoter : on passe par un canvas (le navigateur applique l'EXIF).
  const { img, url } = await decodeImage(file);
  try {
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w * h > MAX_CANVAS_PIXELS) {
      const s = Math.sqrt(MAX_CANVAS_PIXELS / (w * h));
      w = Math.floor(w * s);
      h = Math.floor(h * s);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    if (!isJpeg && hasAlpha(ctx, w, h)) return { bytes: await canvasToBytes(canvas, 'image/png'), type: 'png' };
    const flat = document.createElement('canvas');
    flat.width = w;
    flat.height = h;
    const fctx = flat.getContext('2d');
    fctx.fillStyle = '#fff';
    fctx.fillRect(0, 0, w, h);
    fctx.drawImage(canvas, 0, 0);
    return { bytes: await canvasToBytes(flat, 'image/jpeg', 0.92), type: 'jpg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Ajoute une page contenant l'image.
 * opts : { size: 'a4' | 'letter' | 'fit', orientation: 'auto' | 'portrait' | 'landscape', margin (pt) }
 */
export async function addImagePage(doc, prepared, { size = 'a4', orientation = 'auto', margin = 0 } = {}, name = 'image') {
  let image;
  try {
    image = prepared.type === 'png' ? await doc.embedPng(prepared.bytes) : await doc.embedJpg(prepared.bytes);
  } catch {
    throw new UserError(`« ${name} » : image illisible ou corrompue.`);
  }
  const iw = image.width * 0.75;
  const ih = image.height * 0.75;
  let pw;
  let ph;
  if (size === 'fit') {
    const s = Math.min(1, 14000 / Math.max(iw + 2 * margin, ih + 2 * margin));
    pw = iw * s + 2 * margin;
    ph = ih * s + 2 * margin;
  } else {
    [pw, ph] = SIZES[size] || SIZES.a4;
    const landscape = orientation === 'landscape' || (orientation === 'auto' && image.width > image.height);
    if (landscape) [pw, ph] = [ph, pw];
  }
  const page = doc.addPage([pw, ph]);
  const maxW = pw - 2 * margin;
  const maxH = ph - 2 * margin;
  const s = Math.min(maxW / iw, maxH / ih);
  const w = iw * s;
  const h = ih * s;
  page.drawImage(image, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  return page;
}

// ── Noms de fichiers ──
export function baseName(name) {
  return (
    String(name || 'document')
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .trim()
      .slice(0, 80) || 'document'
  );
}

export const outName = (name, suffix, ext = 'pdf') => `${baseName(name)}${suffix ? `-${suffix}` : ''}.${ext}`;
