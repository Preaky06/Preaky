// Calculateur public (gratuit, sans compte) : page d'appel SEO, puis bascule vers l'assistant.
import { h, segmented, field, put } from '../ui.mjs';
import { MODES, TERRITORIES, DURATIONS, computePrice } from '../core/pricing.mjs';
import { newContract } from '../core/contract.mjs';
import { euro } from '../core/format.mjs';
import { saveDraft, activeProfile, getSettings } from '../core/store.mjs';

export default function mountCalculator() {
  const root = document.getElementById('calc-root');
  if (!root) return;
  const state = { creationFee: 1200, territory: 'france', duration: '5', exclusive: true, modes: { web: { enabled: true }, social: { enabled: true }, print: { enabled: true } } };
  const result = h('div', { class: 'calc-result', 'aria-live': 'polite' });
  const draw = () => {
    const p = computePrice({ ...state, percentages: getSettings().percentages });
    put(result, 
      h('div', { class: 'calc-total' }, h('span', {}, 'Prix suggéré de la cession'), h('b', { 'data-testid': 'calc-total' }, `${euro(p.total)} HT`)),
      p.lines.length
        ? h('ul', { class: 'side-lines' }, p.lines.map((l) => h('li', {}, h('span', {}, l.label), h('b', {}, euro(l.amount)))))
        : h('p', { class: 'muted' }, 'Choisissez au moins un usage.'),
      h('p', { class: 'muted small' }, `Soit ${state.creationFee ? Math.round((p.total / state.creationFee) * 100) : 0} % du prix de création. Coefficient global appliqué : × ${String(p.factor).replace('.', ',')}.`),
      h('button', { type: 'button', class: 'btn btn-accent btn-block', 'data-testid': 'calc-to-contract', onclick: toContract }, 'Générer le contrat correspondant'),
      h('p', { class: 'muted small', style: { textAlign: 'center', margin: '8px 0 0' } }, 'Gratuit, sans inscription. Vos données restent sur votre appareil.'),
    );
  };
  const fee = h('input', { class: 'input', type: 'number', min: '0', step: '50', value: String(state.creationFee), 'data-testid': 'calc-fee' });
  fee.addEventListener('input', () => {
    state.creationFee = Number(fee.value) || 0;
    draw();
  });
  const modes = h('div', { class: 'mode-grid compact' }, ...MODES.map((m) => {
    const box = h('input', { type: 'checkbox', checked: !!state.modes[m.id]?.enabled, 'data-testid': `calc-mode-${m.id}` });
    box.addEventListener('change', () => {
      state.modes[m.id] = { enabled: box.checked };
      box.closest('.mode-card').classList.toggle('on', box.checked);
      draw();
    });
    return h('div', { class: `mode-card${state.modes[m.id]?.enabled ? ' on' : ''}` }, h('label', {}, box, h('span', {}, h('strong', {}, m.label), h('small', {}, m.hint))));
  }));
  function toContract() {
    const p = activeProfile();
    const c = newContract(p ? { ...p } : {});
    c.percentages = { ...(getSettings().percentages || {}) };
    Object.assign(c, { creationFee: state.creationFee, territory: state.territory, duration: state.duration, exclusive: state.exclusive });
    c.modes = Object.fromEntries(Object.entries(state.modes).filter(([, m]) => m.enabled).map(([k]) => [k, { enabled: true, type: 'forfait', override: null, rate: null, detail: '' }]));
    saveDraft(c);
    location.href = '/app#nouveau';
  }
  put(root, 
    h('div', { class: 'calc' },
      h('div', { class: 'calc-form' },
        field('Prix de votre création (HT)', fee, 'Le montant de votre devis pour le travail de création.'),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Usages prévus par le client'), modes),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Territoire'), segmented('calc-territory', Object.entries(TERRITORIES).map(([k, v]) => [k, v.label]), state.territory, (v) => { state.territory = v; draw(); })),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Durée'), segmented('calc-duration', Object.entries(DURATIONS).map(([k, v]) => [k, v.label]), state.duration, (v) => { state.duration = v; draw(); })),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Exclusivité'), segmented('calc-excl', [['true', 'Exclusive'], ['false', 'Non exclusive']], 'true', (v) => { state.exclusive = v === 'true'; draw(); })),
      ),
      result,
    ),
  );
  draw();
}
