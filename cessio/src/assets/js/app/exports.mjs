// Exports et enregistrement, avec les limites de chaque plan.
import config from '../config.mjs';
import { can, planFor, limits } from '../plans.mjs';
import { paywall, downloadBlob, toast } from '../ui.mjs';
import { buildContract, buildSummary, buildQuoteClause } from '../core/contract.mjs';
import { saveContract, countContracts, getContract, getSettings } from '../core/store.mjs';
import { renderPdf } from '../core/render-pdf.mjs';
import { renderDocx } from '../core/render-docx.mjs';
import { buildIcs } from '../core/ics.mjs';
import { buildCsv } from '../core/csv.mjs';

let pdfLibPromise;
const pdfLib = () => (pdfLibPromise ??= import('../../vendor/pdf-lib/pdf-lib.esm.min.js'));
const fflate = () => import('../../vendor/fflate/fflate.mjs');

export const slug = (s) =>
  String(s || 'document')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'document';

const baseName = (c) => slug(`${c.number || 'brouillon'}-${c.client?.name || 'client'}`);

/** Vérifie la limite de contrats du plan avant d'enregistrer un nouveau contrat. */
export function canStore(c) {
  if (getContract(c.id)) return true;
  const max = limits().maxContracts;
  if (countContracts() < max) return true;
  paywall({ reason: `Le plan ${limits().planName} conserve jusqu’à ${max} contrats. Passez à Solo pour des contrats illimités.`, requiredPlan: planFor('maxContracts', max + 1) });
  return false;
}

export function persist(c) {
  if (!canStore(c)) return null;
  try {
    return saveContract(c);
  } catch (e) {
    toast(e.message, { type: 'err', timeout: 8000 });
    return null;
  }
}

function dataUrlImage(url) {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(url || '');
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, type: m[1] === 'png' ? 'png' : 'jpg' };
}

function branding() {
  const s = getSettings();
  const branded = can('branding');
  const host = config.siteUrl ? config.siteUrl.replace(/^https?:\/\//, '') : '';
  return {
    accent: branded && s.accent ? s.accent : config.brand.accent,
    logo: branded && s.logo ? dataUrlImage(s.logo) : null,
    footerText: limits().watermark ? `Généré avec ${config.brand.name}${host ? ` — ${host}` : ''}` : '',
  };
}

export async function exportPdf(c, kind = 'contract') {
  const doc = kind === 'summary' ? buildSummary(c) : buildContract(c);
  const bytes = await renderPdf(doc, { lib: await pdfLib(), ...branding(), title: doc.title, author: c.author?.name, producer: config.brand.name });
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName(c)}-${kind === 'summary' ? 'recapitulatif' : 'contrat'}.pdf`);
}

export async function exportDocx(c) {
  if (!can('word')) return paywall({ reason: 'L’export Word modifiable est inclus dans le plan Solo.', requiredPlan: planFor('word') });
  const doc = buildContract(c);
  const { accent, footerText } = branding();
  const bytes = await renderDocx(doc, { fflate: await fflate(), accent, footerText: footerText || c.author?.name || '', title: doc.title, author: c.author?.name });
  downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `${baseName(c)}-contrat.docx`);
}

export async function copyQuoteClause(c) {
  const text = buildQuoteClause(c);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('Clause copiée : collez-la dans votre devis.', { type: 'ok' });
  return text;
}

export function exportIcs(list) {
  if (!can('ics')) return paywall({ reason: 'Les rappels d’échéance dans votre agenda sont inclus dans le plan Solo.', requiredPlan: planFor('ics') });
  const { text, count } = buildIcs(list, { brand: config.brand.name });
  if (!count) return toast('Aucune cession à durée limitée : rien à ajouter à l’agenda.');
  downloadBlob(new Blob([text], { type: 'text/calendar;charset=utf-8' }), `${slug(config.brand.name)}-echeances.ics`);
  toast(`${count} échéance${count > 1 ? 's' : ''} exportée${count > 1 ? 's' : ''}. Ouvrez le fichier pour l’ajouter à votre agenda.`, { type: 'ok' });
}

export function exportCsv(list) {
  if (!can('csv')) return paywall({ reason: 'L’export du registre en CSV est inclus dans le plan Studio.', requiredPlan: planFor('csv') });
  downloadBlob(new Blob([buildCsv(list)], { type: 'text/csv;charset=utf-8' }), `${slug(config.brand.name)}-registre.csv`);
}
