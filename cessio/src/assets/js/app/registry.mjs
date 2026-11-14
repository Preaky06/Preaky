// Registre des cessions : échéances, statuts, renouvellement, exports.
import { h, icon, iconButton, toast, downloadBlob, put } from '../ui.mjs';
import { listContracts, removeContract, saveContract, exportBackup, importBackup } from '../core/store.mjs';
import { contractEnd, priceOf, renewal } from '../core/contract.mjs';
import { euro, dateShort, daysBetween, todayISO, plural } from '../core/format.mjs';
import { exportPdf, exportIcs, exportCsv, canStore, slug } from './exports.mjs';
import config from '../config.mjs';

const STATUS = { brouillon: 'Brouillon', envoye: 'Envoyé', signe: 'Signé' };

export function expiryInfo(c, today = todayISO()) {
  const end = contractEnd(c);
  if (!end) return { kind: 'legal', label: 'Durée légale', days: null, end: null };
  const days = daysBetween(today, end);
  if (days < 0) return { kind: 'expired', label: `Expirée le ${dateShort(end)}`, days, end };
  if (days <= 90) return { kind: 'soon', label: `Expire dans ${plural(days, 'jour')}`, days, end };
  return { kind: 'ok', label: `Jusqu’au ${dateShort(end)}`, days, end };
}

export function mountRegistry(root, { onOpen }) {
  let query = '';
  let filter = 'all';

  function render() {
    const all = listContracts();
    const soon = all.filter((c) => ['soon', 'expired'].includes(expiryInfo(c).kind) && c.status === 'signe');
    const list = all.filter((c) => {
      const info = expiryInfo(c);
      if (filter === 'signe' && c.status !== 'signe') return false;
      if (filter === 'soon' && !['soon', 'expired'].includes(info.kind)) return false;
      return true;
    });
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Rechercher un client, une œuvre, un numéro…', value: query, 'aria-label': 'Rechercher' });
    search.addEventListener('input', () => {
      query = search.value;
      renderList();
    });
    const filters = h('div', { class: 'segmented' }, ...[['all', 'Tous'], ['signe', 'Signés'], ['soon', 'À renouveler']].map(([k, label]) => {
      const input = h('input', { type: 'radio', name: 'reg-filter', checked: filter === k });
      input.addEventListener('change', () => {
        filter = k;
        render();
      });
      return h('label', {}, input, label);
    }));
    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0];
      if (!f) return;
      try {
        const n = importBackup(await f.text());
        toast(`${n} contrat${n > 1 ? 's' : ''} restauré${n > 1 ? 's' : ''}.`, { type: 'ok' });
        render();
      } catch (e) {
        toast(e.message, { type: 'err' });
      }
    });
    const listBox = h('div', { class: 'reg-list', 'data-testid': 'registry' });
    const renderList = () => {
      const shown = list.filter((c) => !query || `${c.number} ${c.client?.name} ${c.works?.map((w) => w.title).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
      put(listBox, 
        ...(shown.length
          ? shown.map(row)
          : [h('div', { class: 'empty' }, all.length ? 'Aucun contrat ne correspond.' : h('div', {}, h('p', {}, 'Votre registre est vide.'), h('a', { class: 'btn btn-accent', href: '#nouveau' }, 'Créer mon premier contrat')))]),
      );
    };
    put(root, 
      h('div', { class: 'reg-head' }, h('h2', {}, 'Registre des cessions'), h('span', { class: 'muted' }, `${all.length} contrat${all.length > 1 ? 's' : ''}`)),
      soon.length
        ? h('div', { class: 'notice warn', 'data-testid': 'expiry-alert' }, icon('refresh', 18), h('span', {}, `${soon.length} cession${soon.length > 1 ? 's' : ''} signée${soon.length > 1 ? 's' : ''} arrive${soon.length > 1 ? 'nt' : ''} à échéance ou ${soon.length > 1 ? 'sont expirées' : 'est expirée'} : proposez un renouvellement, c’est un revenu complémentaire.`))
        : null,
      h('div', { class: 'reg-toolbar' }, search, filters),
      listBox,
      h(
        'div',
        { class: 'reg-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', 'data-testid': 'export-ics', onclick: () => exportIcs(all.filter((c) => c.status === 'signe')) }, 'Échéances dans mon agenda (.ics)'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', 'data-testid': 'export-csv', onclick: () => exportCsv(all) }, 'Exporter en CSV'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', 'data-testid': 'backup', onclick: () => downloadBlob(new Blob([exportBackup()], { type: 'application/json' }), `${slug(config.brand.name)}-sauvegarde-${todayISO()}.json`) }, 'Sauvegarder (.json)'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => fileInput.click() }, 'Restaurer une sauvegarde'),
        fileInput,
      ),
      h('p', { class: 'muted small' }, 'Vos contrats sont stockés uniquement dans ce navigateur. Faites une sauvegarde régulière, et avant de changer d’ordinateur.'),
    );
    renderList();
  }

  function row(c) {
    const info = expiryInfo(c);
    const price = priceOf(c);
    const status = h('select', { class: 'select select-sm', 'aria-label': 'Statut', 'data-testid': 'status' }, Object.entries(STATUS).map(([k, v]) => h('option', { value: k, selected: c.status === k }, v)));
    status.addEventListener('change', () => {
      saveContract({ ...c, status: status.value });
      render();
    });
    return h(
      'div',
      { class: `reg-row ${info.kind}`, 'data-id': c.id },
      h('div', { class: 'reg-main' },
        h('strong', {}, c.client?.name || 'Client'),
        h('span', { class: 'muted small' }, `${c.number} · ${c.works.map((w) => w.title).join(', ')}`),
      ),
      h('span', { class: `badge ${info.kind}` }, info.label),
      h('span', { class: 'reg-price' }, price.total ? euro(price.total) : price.hasProportional ? 'Proportionnel' : 'Gratuit'),
      status,
      h('div', { class: 'reg-btns' },
        iconButton('file', 'Ouvrir et modifier', () => onOpen(c)),
        iconButton('download', 'Télécharger le PDF', () => exportPdf(c)),
        iconButton('refresh', 'Préparer le renouvellement', () => {
          if (!info.end) return toast('Cession pour la durée légale : pas de renouvellement nécessaire.');
          if (!canStore({ id: null })) return;
          const next = renewal(c);
          const saved = saveContract(next);
          toast(`Renouvellement ${saved.number} créé, à partir du ${dateShort(saved.startDate)}.`, { type: 'ok' });
          onOpen(saved);
        }),
        iconButton('trash', 'Supprimer', () => {
          if (!confirm(`Supprimer définitivement le contrat ${c.number} ?`)) return;
          removeContract(c.id);
          render();
        }, 'danger'),
      ),
    );
  }

  render();
  return { render };
}
