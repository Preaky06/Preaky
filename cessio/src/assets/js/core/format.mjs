// Formats français sûrs pour le PDF (espaces insécables classiques U+00A0, encodables en WinAnsi).
const NBSP = ' ';

export function euro(n, { decimals } = {}) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const d = decimals ?? (Number.isInteger(v) ? 0 : 2);
  const [int, dec] = Math.abs(v).toFixed(d).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${v < 0 ? '-' : ''}${grouped}${dec ? `,${dec}` : ''}${NBSP}€`;
}

export const percent = (n) => `${String(Number(n)).replace('.', ',')}${NBSP}%`;

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** 'YYYY-MM-DD' → Date (UTC midi, pour éviter les décalages de fuseau). */
export function parseISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return Number.isNaN(d.getTime()) ? null : d;
}

export const toISO = (d) => d.toISOString().slice(0, 10);
export const todayISO = () => toISO(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12)));

export function dateLong(iso) {
  const d = parseISO(iso);
  if (!d) return '—';
  const day = d.getUTCDate();
  return `${day === 1 ? '1er' : day}${NBSP}${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function dateShort(iso) {
  const d = parseISO(iso);
  if (!d) return '—';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

/** Date de fin incluse d'une période de n années : 06/11/2026 + 3 ans → 05/11/2029. */
export function endDate(startISO, years) {
  const d = parseISO(startISO);
  if (!d || !years) return null;
  // Date anniversaire (un 29 février sans équivalent devient le 1er mars), puis veille de cette date.
  const end = new Date(Date.UTC(d.getUTCFullYear() + years, d.getUTCMonth(), d.getUTCDate(), 12));
  end.setUTCDate(end.getUTCDate() - 1);
  return toISO(end);
}

export function daysBetween(fromISO, toISOString) {
  const a = parseISO(fromISO);
  const b = parseISO(toISOString);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}

export const plural = (n, one, many = `${one}s`) => `${n}${NBSP}${n > 1 ? many : one}`;
