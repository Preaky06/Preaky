import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as PDFLib from 'pdf-lib';
import * as fflate from 'fflate';
import { euro, endDate, dateLong } from '../../src/assets/js/core/format.mjs';
import { computePrice } from '../../src/assets/js/core/pricing.mjs';
import { newContract, buildContract, buildSummary, buildQuoteClause, validate, renewal, contractEnd } from '../../src/assets/js/core/contract.mjs';
import { renderPdf } from '../../src/assets/js/core/render-pdf.mjs';
import { renderDocx } from '../../src/assets/js/core/render-docx.mjs';
import { buildIcs } from '../../src/assets/js/core/ics.mjs';
import { buildCsv } from '../../src/assets/js/core/csv.mjs';

const NB = ' ';
const textOf = (doc) => doc.blocks.map((b) => [b.text, ...(b.rows || []).flat(), b.left?.title, b.left?.mention, b.right?.title, b.right?.mention].filter(Boolean).join(' ')).join('\n');

function sample(over = {}) {
  const c = newContract({ name: 'Maël Gillet', status: 'Entrepreneur individuel', siret: '123 456 789 00012', address: '1 rue des Arts, 06000 Nice', email: 'mael@exemple.fr' });
  Object.assign(c, {
    client: { kind: 'pro', name: 'Boulangerie Dupont', form: 'SARL', siret: '987 654 321 00011', address: '2 place du Marché, 06000 Nice', representative: 'Jeanne Dupont, gérante', email: '' },
    works: [{ title: 'Logo Boulangerie Dupont', type: 'logo', description: 'logotype et monogramme, versions couleur et monochrome' }],
    startDate: '2026-11-06',
    signDate: '2026-11-06',
    creationFee: 1200,
    place: 'Nice',
    modes: {
      web: { enabled: true, type: 'forfait', override: null, rate: null, detail: '' },
      print: { enabled: true, type: 'forfait', override: null, rate: null, detail: 'tirage maximum 10 000 exemplaires' },
      trademark: { enabled: true, type: 'forfait', override: null, rate: null, detail: '' },
    },
    rights: { reproduction: true, representation: true, adaptation: true, translation: false, trademark: true, transfer: false },
    ...over,
  });
  return c;
}

test('format : euros, dates, échéances', () => {
  assert.equal(euro(1250), `1${NB}250${NB}€`);
  assert.equal(euro(99.5), `99,50${NB}€`);
  assert.equal(endDate('2026-11-06', 3), '2029-11-05');
  assert.equal(endDate('2024-02-29', 1), '2025-02-28');
  assert.equal(endDate('2026-01-01', 1), '2026-12-31');
  assert.equal(dateLong('2026-03-01'), `1er${NB}mars 2026`);
});

test('prix : pourcentage du prix de création × territoire × durée × exclusivité', () => {
  const base = { creationFee: 1000, territory: 'france', duration: '5', exclusive: true, modes: { web: { enabled: true }, social: { enabled: true } } };
  assert.deepEqual(computePrice(base).lines.map((l) => l.amount), [150, 100]);
  assert.equal(computePrice(base).total, 250);
  assert.equal(computePrice({ ...base, territory: 'world', duration: '10' }).lines[0].amount, 300);
  assert.equal(computePrice({ ...base, exclusive: false }).lines[0].amount, 105);
  assert.equal(computePrice({ ...base, modes: { web: { enabled: true, override: 420 } } }).total, 420);
  assert.equal(computePrice({ ...base, percentages: { web: 20 } }).lines[0].amount, 200);
  const prop = computePrice({ ...base, modes: { merch: { enabled: true, type: 'proportionnel', rate: 8 } } });
  assert.equal(prop.lines[0].amount, null);
  assert.equal(prop.hasProportional, true);
  assert.equal(prop.total, 0);
});

test('contrat : chaque exigence de l’article L131-3 est présente', () => {
  const doc = buildContract(sample());
  const t = textOf(doc);
  for (const needle of [
    'Article 1 – Œuvres concernées',
    'Article 2 – Droits cédés',
    '2.1. Droit de reproduction',
    '2.2. Droit de représentation',
    '2.3. Droit d’adaptation',
    '2.4. Droit de dépôt à titre de marque',
    'Article 3 – Domaine d’exploitation : étendue et destination',
    'tirage maximum 10 000 exemplaires',
    'Destination : les œuvres sont exploitées pour',
    'Article 4 – Territoire',
    'la France (métropole et outre-mer)',
    `pour une durée de 5 ans à compter du 06/11/2026, soit jusqu’au 05/11/2031 inclus`,
    'le droit moral de l’Auteur est perpétuel, inaliénable et imprescriptible : il n’est pas cédé',
    'en application de l’article L131-4 du CPI',
    'article L131-6 du CPI',
    'indemnité forfaitaire de 40 €',
    'La cession ne prend effet qu’au complet paiement',
    'Lu et approuvé, bon pour cession de droits',
  ]) assert.ok(t.includes(needle), `absent : ${needle}`);
  assert.ok(!t.includes('Droit de traduction'), 'droit non coché absent');
  assert.equal(doc.price.total, 180 + 180 + 600, 'web 15 % + print 15 % + marque 50 % de 1 200 €');
});

test('contrat : cession gratuite, client particulier, logiciel', () => {
  const c = sample({ creationFee: 0, client: { kind: 'particulier', name: 'Paul Martin', address: '3 rue Haute, Lyon' } });
  const t = textOf(buildContract(c));
  assert.ok(t.includes('à titre exclusif et gratuit'));
  assert.ok(t.includes('consentie à titre gratuit'));
  assert.ok(!t.includes('40 €'), 'pas d’indemnité B2B pour un particulier');
  assert.ok(t.includes('médiateur de la consommation'));
  const soft = sample({ forfaitReason: 'logiciel', works: [{ title: 'Application de réservation', type: 'code', description: '' }] });
  assert.ok(textOf(buildContract(soft)).includes('s’agissant d’une cession de droits portant sur un logiciel'));
});

test('contrat : rémunération proportionnelle avec minimum garanti', () => {
  const c = sample({ modes: { merch: { enabled: true, type: 'proportionnel', rate: 8, detail: '' } }, proportional: { period: 'semestre', minimum: 300 } });
  const t = textOf(buildContract(c));
  assert.ok(t.includes(`8${NB}% des recettes HT`));
  assert.ok(t.includes('chaque semestre civil'));
  assert.ok(t.includes(`minimum garanti de 300${NB}€ HT`));
});

test('validation : champs obligatoires et domaine d’exploitation', () => {
  const empty = newContract();
  const codes = validate(empty).map((e) => e.field);
  assert.ok(codes.includes('author.name') && codes.includes('client.name') && codes.includes('works'));
  const noModes = sample({ modes: {} });
  assert.ok(validate(noModes).some((e) => e.field === 'modes' && /L131-3/.test(e.message)));
  const badRate = sample({ modes: { merch: { enabled: true, type: 'proportionnel', rate: 0 } } });
  assert.ok(validate(badRate).some((e) => e.field === 'modes.merch'));
  assert.deepEqual(validate(sample()), []);
});

test('renouvellement : démarre le lendemain de l’échéance', () => {
  const c = sample({ duration: '3' });
  assert.equal(contractEnd(c), '2029-11-05');
  const r = renewal(c);
  assert.equal(r.startDate, '2029-11-06');
  assert.notEqual(r.id, c.id);
  assert.equal(r.renewalOf, c.id);
  assert.equal(contractEnd({ ...c, duration: 'legal' }), null);
});

test('récapitulatif et clause de devis', () => {
  const s = textOf(buildSummary(sample()));
  assert.ok(s.includes('Ce qui n’est pas cédé') && s.includes('Droit moral'));
  const q = buildQuoteClause(sample());
  assert.ok(q.includes('Sous réserve du complet paiement') && q.includes('art. L131-3'));
});

test('ICS : rappel à J-30 et échéance, lignes pliées, CRLF', () => {
  const { text, count } = buildIcs([sample({ duration: '1' }), sample({ duration: 'legal' })]);
  assert.equal(count, 1, 'la durée légale n’a pas d’échéance');
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.ok(text.includes('DTSTART;VALUE=DATE:20271006'), 'J-30 de la fin au 05/11/2027');
  assert.ok(text.includes('DTSTART;VALUE=DATE:20271105'));
  for (const line of text.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, `ligne trop longue : ${line}`);
});

test('CSV : BOM, séparateur point-virgule, échappement', () => {
  const csv = buildCsv([sample({ works: [{ title: 'Logo "Dupont"; v2', type: 'logo' }] })]);
  assert.ok(csv.startsWith('﻿Numéro;'));
  assert.ok(csv.includes('"Logo ""Dupont""; v2"'));
});

test('PDF : contrat lisible, pagination et mention gratuite', async () => {
  const doc = buildContract(sample({ number: 'CES-2026-001' }));
  const bytes = await renderPdf(doc, { lib: PDFLib, accent: '#5b4bff', footerText: 'Généré avec Cessio', title: doc.title });
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, standardFontDataUrl: new URL('../../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).pathname }).promise;
  assert.ok(pdf.numPages >= 2, 'plusieurs pages');
  let all = '';
  for (let i = 1; i <= pdf.numPages; i++) all += (await (await pdf.getPage(i)).getTextContent()).items.map((it) => it.str).join(' ') + '\n';
  for (const needle of ['Contrat de cession de droits d’auteur', 'Droit de représentation', 'Article 4 – Territoire', 'Généré avec Cessio', `Page 1 / ${pdf.numPages}`, 'Boulangerie Dupont']) {
    assert.ok(all.replace(/\s+/g, ' ').includes(needle), `PDF sans : ${needle}`);
  }
});

test('Word : archive valide, XML bien formé, lisible par pandoc et LibreOffice', async (t) => {
  const doc = buildContract(sample());
  const bytes = await renderDocx(doc, { fflate, accent: '#5b4bff', footerText: 'Cessio', title: doc.title, author: 'Maël' });
  const files = fflate.unzipSync(bytes);
  for (const name of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/footer1.xml', 'word/_rels/document.xml.rels']) assert.ok(files[name], `manque ${name}`);
  const dir = mkdtempSync(join(tmpdir(), 'cessio-docx-'));
  try {
    const path = join(dir, 'contrat.docx');
    writeFileSync(path, bytes);
    for (const name of Object.keys(files)) {
      const xml = join(dir, `x-${name.replace(/[^\w.]/g, '_')}`);
      writeFileSync(xml, files[name]);
      execFileSync('python3', ['-I', '-c', 'import sys, xml.dom.minidom; xml.dom.minidom.parse(sys.argv[1])', xml]);
    }
    try {
      const txt = execFileSync('pandoc', ['-f', 'docx', '-t', 'plain', path], { encoding: 'utf8' });
      assert.ok(txt.includes('Droit de reproduction') && txt.includes('Article 7'), 'pandoc lit le contenu');
    } catch (e) {
      if (e.code === 'ENOENT') t.diagnostic('pandoc absent : vérification ignorée');
      else throw e;
    }
    try {
      execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', dir, path], { stdio: 'ignore', timeout: 120000 });
      assert.ok(existsSync(join(dir, 'contrat.pdf')) && readFileSync(join(dir, 'contrat.pdf')).length > 5000, 'LibreOffice convertit le .docx');
    } catch (e) {
      if (e.code === 'ENOENT') t.diagnostic('LibreOffice absent : vérification ignorée');
      else throw e;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
