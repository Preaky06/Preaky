// Aperçu à l'écran du document (mêmes blocs que le PDF et le Word).
export function renderHtml(doc, h) {
  const root = h('article', { class: 'doc-preview', 'data-testid': 'doc-preview' });
  for (const b of doc.blocks) {
    switch (b.t) {
      case 'title':
        root.append(h('h2', { class: 'doc-title' }, b.text));
        break;
      case 'subtitle':
        root.append(h('p', { class: 'doc-sub' }, b.text));
        break;
      case 'h':
        root.append(h('h3', {}, b.text));
        break;
      case 'p':
        root.append(h('p', {}, b.text));
        break;
      case 'li': {
        const last = root.lastElementChild;
        const ul = last && last.tagName === 'UL' ? last : root.appendChild(h('ul'));
        ul.append(h('li', {}, b.text));
        break;
      }
      case 'small':
        root.append(h('p', { class: 'doc-small' }, b.text));
        break;
      case 'space':
        root.append(h('div', { style: { height: '8px' } }));
        break;
      case 'table':
        root.append(
          h('div', { class: 'doc-table-wrap' }, h('table', { class: 'doc-table' }, h('thead', {}, h('tr', {}, b.head.map((c) => h('th', {}, c)))), h('tbody', {}, b.rows.map((r) => h('tr', {}, r.map((c, k) => (k === 0 ? h('th', { scope: 'row' }, c) : h('td', {}, c)))))))),
        );
        break;
      case 'sign':
        root.append(
          h('div', { class: 'doc-sign' }, [b.left, b.right].map((s) => h('div', {}, h('strong', {}, s.title), h('span', {}, s.name || ''), h('em', {}, s.mention), h('small', {}, 'Signature :')))),
        );
        break;
      default:
        break;
    }
  }
  return root;
}
