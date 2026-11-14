// Analyse de plages de pages : "1-3, 5, 8-" → [{ start: 1, end: 3 }, { start: 5, end: 5 }, { start: 8, end: N }]

export class RangeError_ extends Error {
  constructor(message) {
    super(message);
    this.userMessage = message;
  }
}

export function parseRanges(input, pageCount) {
  const text = String(input || '')
    .replace(/[–—−]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .trim();
  if (!text) throw new RangeError_('Indiquez au moins une page ou une plage, par exemple « 1-3, 5 ».');
  const tokens = text.split(/[,;\s]+/).filter(Boolean);
  const ranges = [];
  for (const token of tokens) {
    const m = token.match(/^(\d+)?-(\d+)?$/) || token.match(/^(\d+)$/);
    if (!m || token === '-') throw new RangeError_(`Plage invalide : « ${token} ». Exemples valides : 2, 4-7, 9-.`);
    const isRange = token.includes('-');
    const start = m[1] ? Number(m[1]) : 1;
    const end = isRange ? (m[2] ? Number(m[2]) : pageCount) : start;
    if (start < 1 || end < 1) throw new RangeError_('Les pages commencent à 1.');
    if (start > pageCount || end > pageCount) {
      throw new RangeError_(`La page ${Math.max(start, end)} n’existe pas : le document compte ${pageCount} page${pageCount > 1 ? 's' : ''}.`);
    }
    if (start > end) throw new RangeError_(`Plage « ${token} » : le début doit précéder la fin.`);
    ranges.push({ start, end });
  }
  return ranges;
}

/** Liste plate d'indices (base 0), sans doublons, dans l'ordre donné. */
export function rangesToIndices(ranges) {
  const seen = new Set();
  const out = [];
  for (const { start, end } of ranges) {
    for (let p = start; p <= end; p++) {
      if (!seen.has(p)) {
        seen.add(p);
        out.push(p - 1);
      }
    }
  }
  return out;
}

/** Découpe en groupes de n pages. */
export function chunkRanges(pageCount, n) {
  const size = Math.max(1, Math.floor(n));
  const out = [];
  for (let s = 1; s <= pageCount; s += size) out.push({ start: s, end: Math.min(pageCount, s + size - 1) });
  return out;
}

export const rangeLabel = ({ start, end }) => (start === end ? `${start}` : `${start}-${end}`);
