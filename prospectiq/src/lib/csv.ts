// CSV compatible Excel (séparateur « ; », BOM UTF-8). Neutralise les formules (injection CSV).
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: unknown[][]) => '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
