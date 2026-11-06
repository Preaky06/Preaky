// Export Word (.docx) minimal et valide, sans dépendance hormis fflate pour le ZIP.
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // caractères de contrôle interdits en XML 1.0
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

const run = (text, { b = false, i = false, color, sz } = {}) =>
  `<w:r><w:rPr>${b ? '<w:b/>' : ''}${i ? '<w:i/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}${sz ? `<w:sz w:val="${sz}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

const para = (content, { style, keepNext, indent, spacingAfter, align } = {}) =>
  `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${keepNext ? '<w:keepNext/>' : ''}${spacingAfter !== undefined ? `<w:spacing w:after="${spacingAfter}"/>` : ''}${indent ? `<w:ind w:left="${indent.left}" w:hanging="${indent.hanging || 0}"/>` : ''}${align ? `<w:jc w:val="${align}"/>` : ''}</w:pPr>${content}</w:p>`;

const cell = (content, width, { fill } = {}) =>
  `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}</w:tcPr>${content}</w:tc>`;

const BORDERS = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="D6D6DB"/><w:bottom w:val="single" w:sz="4" w:color="D6D6DB"/><w:insideH w:val="single" w:sz="4" w:color="D6D6DB"/></w:tblBorders>';
const BOX = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="D6D6DB"/><w:left w:val="single" w:sz="4" w:color="D6D6DB"/><w:bottom w:val="single" w:sz="4" w:color="D6D6DB"/><w:right w:val="single" w:sz="4" w:color="D6D6DB"/><w:insideV w:val="single" w:sz="4" w:color="D6D6DB"/></w:tblBorders>';
const TOTAL = 9638; // largeur utile A4 avec marges de 2 cm, en vingtièmes de point

function table(head, rows) {
  const widths = head.length === 2 ? [3660, TOTAL - 3660] : Array(head.length).fill(Math.floor(TOTAL / head.length));
  const tr = (cells, isHead) =>
    `<w:tr>${isHead ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${cells.map((t, k) => cell(para(run(t, { b: isHead || k === 0 }), { spacingAfter: 0 }), widths[k], { fill: isHead ? 'F2F2F6' : undefined })).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${TOTAL}" w:type="dxa"/>${BORDERS}<w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${tr(head, true)}${rows.map((r) => tr(r, false)).join('')}</w:tbl>${para('', { spacingAfter: 120 })}`;
}

function signature(left, right) {
  const half = Math.floor(TOTAL / 2);
  const box = (s) =>
    [para(run(s.title, { b: true })), para(run(s.name || '')), para(run(s.mention, { i: true, color: '6B6B73', sz: 17 })), para(''), para(''), para(run('Signature :', { color: '6B6B73', sz: 17 }))].join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${TOTAL}" w:type="dxa"/>${BOX}<w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${half}"/><w:gridCol w:w="${TOTAL - half}"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(box(left), half)}${cell(box(right), TOTAL - half)}</w:tr></w:tbl>`;
}

export function docxXml(doc, { accent = '5B4BFF', footerText = '' } = {}) {
  const color = String(accent).replace('#', '').toUpperCase();
  const body = doc.blocks
    .map((b) => {
      switch (b.t) {
        case 'title':
          return para(run(b.text), { style: 'Title' });
        case 'subtitle':
          return para(run(b.text, { color: '6B6B73' }));
        case 'h':
          return para(run(b.text), { style: 'Heading1' });
        case 'p':
          return para(run(b.text));
        case 'li':
          return para(run('•\t') + run(b.text), { indent: { left: 360, hanging: 240 } });
        case 'small':
          return para(run(b.text, { color: '6B6B73', sz: 16 }));
        case 'space':
          return para('');
        case 'table':
          return table(b.head, b.rows);
        case 'sign':
          return signature(b.left, b.right);
        default:
          return '';
      }
    })
    .join('');
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NS}><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${NS}><w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${TOTAL}"/></w:tabs></w:pPr>${run(footerText, { color: '6B6B73', sz: 16 })}<w:r><w:rPr><w:color w:val="6B6B73"/><w:sz w:val="16"/></w:rPr><w:tab/><w:t xml:space="preserve">Page </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:color w:val="6B6B73"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple><w:r><w:rPr><w:color w:val="6B6B73"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve"> / </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:rPr><w:color w:val="6B6B73"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="19"/><w:szCs w:val="19"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="110" w:line="288" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="18" w:space="6" w:color="${color}"/></w:pBdr><w:spacing w:after="240"/><w:jc w:val="left"/></w:pPr><w:rPr><w:b/><w:sz w:val="38"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="260" w:after="100"/><w:jc w:val="left"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>
</w:styles>`;
  return { document, footer, styles };
}

export async function renderDocx(doc, opts = {}) {
  const { zipSync, strToU8 } = opts.fflate;
  const { document, footer, styles } = docxXml(doc, opts);
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`,
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(opts.title || 'Contrat')}</dc:title><dc:creator>${esc(opts.author || '')}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`,
    'word/document.xml': document,
    'word/styles.xml': styles,
    'word/footer1.xml': footer,
  };
  const entries = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]));
  return zipSync(entries, { level: 6 });
}
