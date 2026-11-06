// Application : routes #nouveau, #registre, #reglages, #contrat/<id>
import { h, toast, put } from '../ui.mjs';
import { mountWizard } from './wizard.mjs';
import { mountRegistry, expiryInfo } from './registry.mjs';
import { mountSettings } from './settings.mjs';
import { getContract, listContracts } from '../core/store.mjs';

export default function mountApp() {
  const root = document.getElementById('app-root');
  if (!root) return;
  const tabs = h('nav', { class: 'app-tabs', 'aria-label': 'Sections' });
  const view = h('div', { class: 'app-view' });
  put(root, tabs, view);

  function drawTabs(current) {
    const all = listContracts();
    const due = all.filter((c) => c.status === 'signe' && ['soon', 'expired'].includes(expiryInfo(c).kind)).length;
    put(tabs, 
      ...[
        ['nouveau', 'Nouveau contrat'],
        ['registre', `Registre${all.length ? ` (${all.length})` : ''}`],
        ['reglages', 'Réglages'],
      ].map(([id, label]) =>
        h('a', { href: `#${id}`, class: current === id ? 'active' : '', 'aria-current': current === id ? 'page' : null, 'data-testid': `tab-${id}` }, label, id === 'registre' && due ? h('span', { class: 'dot', title: `${due} à renouveler` }, String(due)) : null),
      ),
    );
  }

  function route() {
    const hash = location.hash.replace(/^#/, '') || 'nouveau';
    if (hash.startsWith('contrat/')) {
      const c = getContract(hash.slice(8));
      if (!c) {
        toast('Contrat introuvable dans ce navigateur.', { type: 'err' });
        location.hash = '#registre';
        return;
      }
      drawTabs('registre');
      mountWizard(view, { contract: c, step: 5, onSaved: () => drawTabs('registre') });
      return;
    }
    drawTabs(hash);
    if (hash === 'registre') mountRegistry(view, { onOpen: (c) => (location.hash = `#contrat/${c.id}`) });
    else if (hash === 'reglages') mountSettings(view);
    else mountWizard(view, { onSaved: () => drawTabs('nouveau') });
  }

  window.addEventListener('hashchange', route);
  route();
}
