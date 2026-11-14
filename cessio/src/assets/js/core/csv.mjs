// Export CSV du registre (séparateur « ; », UTF-8 avec BOM : s'ouvre directement dans Excel en français).
import { contractEnd, priceOf } from './contract.mjs';
import { TERRITORIES, DURATIONS } from './pricing.mjs';
import { dateShort } from './format.mjs';

const cell = (v) => {
  const s = String(v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildCsv(contracts, percentages) {
  const head = ['Numéro', 'Statut', 'Auteur', 'Client', 'Œuvres', 'Exploitations', 'Territoire', 'Durée', 'Début', 'Fin', 'Exclusif', 'Droits (HT)', 'Création (HT)'];
  const rows = contracts.map((c) => {
    const p = priceOf(c, percentages);
    return [c.number, c.status, c.author?.name, c.client?.name, c.works.map((w) => w.title).join(' | '), p.lines.map((l) => l.label).join(' | '), TERRITORIES[c.territory]?.label, DURATIONS[c.duration]?.label, dateShort(c.startDate), c.duration === 'legal' ? 'Durée légale' : dateShort(contractEnd(c)), c.exclusive ? 'Oui' : 'Non', String(p.total).replace('.', ','), String(c.creationFee || 0).replace('.', ',')];
  });
  return '\ufeff' + [head, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}
