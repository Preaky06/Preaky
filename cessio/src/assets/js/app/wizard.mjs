// Assistant de création d'un contrat de cession, en 5 étapes.
import { h, icon, iconButton, toast, segmented, field, put } from '../ui.mjs';
import { MODES, TERRITORIES, DURATIONS, WORK_TYPES } from '../core/pricing.mjs';
import { newContract, validate, buildContract, buildSummary, buildQuoteClause, priceOf, contractEnd, FORFAIT_REASONS, RIGHTS } from '../core/contract.mjs';
import { renderHtml } from '../core/render-html.mjs';
import { euro, dateShort, percent } from '../core/format.mjs';
import { getDraft, saveDraft, clearDraft, getSettings, getProfiles, saveProfiles, activeProfile, saveContract } from '../core/store.mjs';
import { persist, exportPdf, exportDocx, copyQuoteClause } from './exports.mjs';

const STEPS = ['Parties', 'Œuvres', 'Droits', 'Prix', 'Contrat'];

const RIGHT_HELP = {
  reproduction: 'Copier l’œuvre sur des supports : impression, fichiers, site…',
  representation: 'Montrer l’œuvre au public : mise en ligne, affichage, diffusion.',
  adaptation: 'Décliner, recadrer, changer les couleurs ou le format.',
  translation: 'Traduire les textes de l’œuvre dans d’autres langues.',
  trademark: 'Déposer le logo comme marque (INPI, EUIPO). Indispensable pour un logo.',
  transfer: 'Permettre au client de revendre ou transférer les droits à un tiers.',
};

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const set = (obj, path, value) => {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => (o[k] ??= {}), obj)[last] = value;
};

/**
 * Monte l'assistant dans `root`.
 * opts.contract : contrat existant à modifier ; sinon reprise du brouillon ou nouveau contrat.
 */
export function mountWizard(root, opts = {}) {
  let c = opts.contract ? structuredClone(opts.contract) : getDraft() || fresh();
  let step = opts.step || 1;
  let shownErrors = false;
  let saveTimer;
  let editingSaved = !!opts.contract;

  function fresh() {
    const p = activeProfile();
    const contract = newContract(p ? { ...p } : {});
    contract.percentages = { ...(getSettings().percentages || {}) };
    if (opts.seed) Object.assign(contract, opts.seed);
    return contract;
  }

  const autosave = () => {
    c.updatedAt = Date.now();
    clearTimeout(saveTimer);
    // Contrat déjà au registre : enregistrement automatique ; sinon brouillon local.
    saveTimer = setTimeout(() => (editingSaved ? saveContract(c) : saveDraft(c)), 300);
  };

  const changed = () => {
    autosave();
    renderSide();
  };

  // ── Champs liés au contrat ──
  function text(label, path, { placeholder = '', required = false, type = 'text', help, area = false, testid } = {}) {
    const props = { class: 'input', placeholder, value: area ? undefined : get(c, path) ?? '', type: area ? undefined : type, 'data-path': path, 'data-testid': testid };
    const input = area ? h('textarea', { ...props, rows: '3' }, get(c, path) ?? '') : h('input', props);
    input.addEventListener('input', () => {
      set(c, path, type === 'number' ? (input.value === '' ? 0 : Number(input.value)) : input.value);
      input.removeAttribute('aria-invalid');
      changed();
    });
    return field(`${label}${required ? ' *' : ''}`, input, help);
  }

  function check(label, path, help) {
    const input = h('input', { type: 'checkbox', checked: !!get(c, path), 'data-path': path });
    input.addEventListener('change', () => {
      set(c, path, input.checked);
      changed();
    });
    return h('label', { class: 'check-card' }, input, h('span', {}, h('strong', {}, label), help ? h('small', {}, help) : null));
  }

  // ── Structure ──
  const stepper = h('ol', { class: 'stepper', 'aria-label': 'Étapes' });
  const panel = h('div', { class: 'wz-panel' });
  const nav = h('div', { class: 'wz-nav' });
  const side = h('aside', { class: 'wz-side', 'aria-live': 'polite' });
  put(root, h('div', { class: 'wizard' }, h('div', { class: 'wz-main' }, stepper, panel, nav), side));

  function renderStepper() {
    const errors = validate(c);
    put(stepper, 
      ...STEPS.map((name, i) => {
        const n = i + 1;
        const bad = shownErrors && errors.some((e) => e.step === n);
        const b = h('button', { type: 'button', class: `${n === step ? 'current' : ''}${bad ? ' bad' : ''}`, 'aria-current': n === step ? 'step' : null, onclick: () => go(n) }, h('span', { class: 'num' }, String(n)), h('span', { class: 'label' }, name));
        return h('li', {}, b);
      }),
    );
  }

  function go(n) {
    step = Math.max(1, Math.min(STEPS.length, n));
    if (step > 1) syncProfile();
    render();
    root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function syncProfile() {
    const a = c.author;
    if (!a.name) return;
    const list = getProfiles();
    const idx = getSettings().activeProfile || 0;
    list[idx] = { name: a.name, status: a.status, siret: a.siret, address: a.address, email: a.email, vatFranchise: !!a.vatFranchise };
    saveProfiles(list);
  }

  function next() {
    const errs = validate(c).filter((e) => e.step === step);
    if (errs.length) {
      shownErrors = true;
      render();
      toast(errs[0].message, { type: 'err' });
      const el = panel.querySelector(`[data-path="${errs[0].field}"]`);
      el?.setAttribute('aria-invalid', 'true');
      el?.focus();
      return;
    }
    go(step + 1);
  }

  function render() {
    renderStepper();
    put(panel, ...[step1, step2, step3, step4, step5][step - 1]());
    put(nav, 
      step > 1 ? h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => go(step - 1) }, icon('left', 16), 'Précédent') : h('span'),
      step < STEPS.length ? h('button', { type: 'button', class: 'btn btn-primary', 'data-testid': 'next', onclick: next }, 'Suivant', icon('right', 16)) : h('span'),
    );
    renderSide();
  }

  // ── Étape 1 : parties ──
  function step1() {
    const clientFields = h('div', { class: 'grid-2' });
    const drawClient = () => {
      put(clientFields, 
        text(c.client.kind === 'particulier' ? 'Nom et prénom' : 'Raison sociale', 'client.name', { required: true, testid: 'client-name' }),
        c.client.kind !== 'particulier' ? text('Forme juridique', 'client.form', { placeholder: 'SARL, SAS, association…' }) : null,
        c.client.kind !== 'particulier' ? text('SIRET', 'client.siret') : null,
        text('Adresse', 'client.address', { required: true, testid: 'client-address' }),
        c.client.kind !== 'particulier' ? text('Représenté(e) par', 'client.representative', { placeholder: 'Nom, fonction' }) : null,
        text('E-mail', 'client.email', { type: 'email' }),
      );
    };
    drawClient();
    return [
      h('h2', {}, 'Qui cède, et à qui ?'),
      h('h3', { class: 'wz-sub' }, 'Vous, l’auteur'),
      h(
        'div',
        { class: 'grid-2' },
        text('Nom ou nom d’artiste', 'author.name', { required: true, testid: 'author-name' }),
        text('Statut', 'author.status', { placeholder: 'Entrepreneur individuel, artiste-auteur…' }),
        text('SIRET', 'author.siret'),
        text('Adresse professionnelle', 'author.address', { required: true, testid: 'author-address' }),
        text('E-mail', 'author.email', { type: 'email' }),
      ),
      check('TVA non applicable (franchise en base, art. 293 B du CGI)', 'author.vatFranchise'),
      h('p', { class: 'muted small' }, 'Vos coordonnées sont mémorisées sur cet appareil pour vos prochains contrats.'),
      h('h3', { class: 'wz-sub' }, 'Votre client, le cessionnaire'),
      segmented('client-kind', [['pro', 'Professionnel'], ['particulier', 'Particulier']], c.client.kind, (v) => {
        c.client.kind = v;
        drawClient();
        changed();
      }),
      clientFields,
    ];
  }

  // ── Étape 2 : œuvres ──
  function step2() {
    const list = h('div', { class: 'works' });
    const draw = () => {
      put(list, 
        ...c.works.map((w, i) => {
          const title = h('input', { class: 'input', value: w.title, placeholder: 'Ex. : Logo « Boulangerie Dupont »', 'data-path': 'works', 'data-testid': `work-title-${i}` });
          title.addEventListener('input', () => {
            w.title = title.value;
            title.removeAttribute('aria-invalid');
            changed();
          });
          const type = h('select', { class: 'select' }, Object.entries(WORK_TYPES).map(([k, v]) => h('option', { value: k, selected: w.type === k }, v)));
          type.addEventListener('change', () => {
            w.type = type.value;
            if (w.type === 'code') c.forfaitReason = 'logiciel';
            changed();
          });
          const desc = h('textarea', { class: 'input', rows: '2', placeholder: 'Description précise : éléments, déclinaisons, formats livrés…' }, w.description);
          desc.addEventListener('input', () => {
            w.description = desc.value;
            changed();
          });
          return h(
            'div',
            { class: 'card work-card' },
            h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('strong', {}, `Œuvre ${i + 1}`), c.works.length > 1 ? iconButton('trash', 'Retirer cette œuvre', () => { c.works.splice(i, 1); draw(); changed(); }, 'danger') : null),
            h('div', { class: 'grid-2' }, field('Titre *', title), field('Type', type)),
            field('Description', desc),
          );
        }),
      );
    };
    draw();
    return [
      h('h2', {}, 'Quelles œuvres sont cédées ?'),
      h('p', { class: 'muted' }, 'Listez chaque création précisément : la loi interdit de céder « en bloc » des œuvres futures (art. L131-1 du CPI). Les propositions non retenues restent à vous.'),
      list,
      h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => { c.works.push({ title: '', type: c.works[0]?.type || 'logo', description: '' }); draw(); changed(); } }, icon('plus', 16), 'Ajouter une œuvre'),
    ];
  }

  // ── Étape 3 : droits et domaine d'exploitation ──
  function step3() {
    const modesBox = h('div', { class: 'mode-grid', 'data-path': 'modes' });
    const drawModes = () => {
      put(modesBox, 
        ...MODES.map((mode) => {
          const m = (c.modes[mode.id] ??= { enabled: false, type: 'forfait', override: null, rate: null, detail: '' });
          const box = h('input', { type: 'checkbox', checked: !!m.enabled, 'data-testid': `mode-${mode.id}` });
          const detail = h('input', { class: 'input', value: m.detail || '', placeholder: mode.quantity ? 'Quantités, ex. : tirage maximum 10 000 exemplaires' : 'Précisions facultatives' });
          detail.addEventListener('input', () => {
            m.detail = detail.value;
            changed();
          });
          box.addEventListener('change', () => {
            m.enabled = box.checked;
            if (m.enabled && mode.proportionalHint && !m.rate) m.rate = 8;
            drawModes();
            changed();
          });
          return h('div', { class: `mode-card${m.enabled ? ' on' : ''}` }, h('label', {}, box, h('span', {}, h('strong', {}, mode.label), h('small', {}, mode.hint))), m.enabled ? detail : null);
        }),
      );
    };
    drawModes();
    const start = h('input', { class: 'input', type: 'date', value: c.startDate, 'data-path': 'startDate', 'data-testid': 'start-date' });
    start.addEventListener('change', () => {
      c.startDate = start.value;
      changed();
    });
    return [
      h('h2', {}, 'Quels droits, pour quels usages ?'),
      h('p', { class: 'muted' }, 'Chaque droit cédé doit être mentionné séparément, et le domaine d’exploitation délimité : étendue, destination, lieu et durée (art. L131-3 du CPI). Tout ce qui n’est pas coché reste à vous.'),
      h('h3', { class: 'wz-sub' }, 'Droits cédés'),
      h('div', { class: 'grid-2', 'data-path': 'rights' }, ...Object.keys(RIGHTS).map((k) => check(RIGHTS[k].label, `rights.${k}`, RIGHT_HELP[k]))),
      h('h3', { class: 'wz-sub' }, 'Modes d’exploitation autorisés'),
      modesBox,
      h('div', { class: 'grid-2' },
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Territoire'), segmented('territory', Object.entries(TERRITORIES).map(([k, v]) => [k, v.label]), c.territory, (v) => { c.territory = v; changed(); })),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Exclusivité'), segmented('exclusive', [['true', 'Exclusive'], ['false', 'Non exclusive']], String(c.exclusive), (v) => { c.exclusive = v === 'true'; changed(); })),
      ),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Durée'), segmented('duration', Object.entries(DURATIONS).map(([k, v]) => [k, v.label]), c.duration, (v) => { c.duration = v; changed(); })),
      h('div', { class: 'grid-2' }, field('Début de la cession', start)),
      h('details', { class: 'advanced' }, h('summary', {}, 'Destination des œuvres (avancé)'), text('Les œuvres sont exploitées pour…', 'destination', { area: true })),
    ];
  }

  // ── Étape 4 : prix ──
  function step4() {
    const table = h('div', { class: 'price-table', 'data-testid': 'price-table' });
    const draw = () => {
      const price = priceOf(c);
      put(table, 
        ...price.lines.map((l) => {
          const m = c.modes[l.id];
          const typeSel = h('select', { class: 'select' }, h('option', { value: 'forfait', selected: m.type !== 'proportionnel' }, 'Forfait'), h('option', { value: 'proportionnel', selected: m.type === 'proportionnel' }, '% des ventes'));
          typeSel.addEventListener('change', () => {
            m.type = typeSel.value;
            if (m.type === 'proportionnel' && !m.rate) m.rate = 8;
            draw();
            changed();
          });
          let valueInput;
          if (m.type === 'proportionnel') {
            valueInput = h('input', { class: 'input', type: 'number', min: '0', step: '0.5', value: m.rate ?? '', 'aria-label': `Pourcentage ${l.label}`, 'data-path': `modes.${l.id}` });
            valueInput.addEventListener('input', () => {
              m.rate = Number(valueInput.value);
              changed();
            });
          } else {
            valueInput = h('input', { class: 'input', type: 'number', min: '0', step: '1', placeholder: String(l.computed), value: m.override ?? '', 'aria-label': `Montant ${l.label}`, 'data-testid': `amount-${l.id}` });
            valueInput.addEventListener('input', () => {
              m.override = valueInput.value === '' ? null : Number(valueInput.value);
              changed();
            });
          }
          return h(
            'div',
            { class: 'price-row' },
            h('div', { class: 'pr-label' }, h('strong', {}, l.label), h('small', { class: 'muted' }, m.type === 'proportionnel' ? 'Pourcentage des recettes HT' : `Calcul suggéré : ${euro(l.computed)} HT`)),
            typeSel,
            h('div', { class: 'pr-value' }, valueInput, h('span', {}, m.type === 'proportionnel' ? '%' : '€ HT')),
          );
        }),
      );
    };
    draw();
    const anyProp = () => Object.values(c.modes).some((m) => m.enabled && m.type === 'proportionnel');
    const reason = h('select', { class: 'select' }, Object.entries(FORFAIT_REASONS).map(([k, v]) => h('option', { value: k, selected: c.forfaitReason === k }, v.replace(/^./, (s) => s.toUpperCase()))));
    reason.addEventListener('change', () => {
      c.forfaitReason = reason.value;
      changed();
    });
    const sourcesPrice = text('Prix des fichiers sources (HT)', 'sourcesPrice', { type: 'number' });
    sourcesPrice.hidden = c.sources !== 'payant';
    const prop = h(
      'div',
      { class: 'grid-2' },
      field('Relevé des ventes', (() => {
        const s = h('select', { class: 'select' }, [['trimestre', 'Chaque trimestre'], ['semestre', 'Chaque semestre'], ['annee', 'Chaque année']].map(([k, v]) => h('option', { value: k, selected: c.proportional.period === k }, v)));
        s.addEventListener('change', () => {
          c.proportional.period = s.value;
          changed();
        });
        return s;
      })()),
      text('Minimum garanti (HT, facultatif)', 'proportional.minimum', { type: 'number' }),
    );
    prop.hidden = !anyProp();
    const feeField = text('Prix de la création (HT)', 'creationFee', { type: 'number', testid: 'creation-fee', help: 'Le montant de votre devis de création.' });
    feeField.querySelector('input').addEventListener('input', draw);
    return [
      h('h2', {}, 'Le prix des droits'),
      h('p', { class: 'muted' }, 'La cession se facture en plus de la création. Aucun barème légal n’existe : le calcul suggéré applique un pourcentage du prix de création par usage, ajusté selon le territoire, la durée et l’exclusivité. Chaque montant reste modifiable.'),
      h('div', { class: 'grid-2' }, feeField, text('Référence du devis', 'quoteRef', { placeholder: 'Ex. : D-2026-014' })),
      table,
      h('p', { class: 'muted small' }, `Coefficients appliqués : territoire × ${String(TERRITORIES[c.territory].factor).replace('.', ',')}, durée × ${String(DURATIONS[c.duration].factor).replace('.', ',')}${c.exclusive ? '' : ', non-exclusivité × 0,7'}. Pourcentages par usage modifiables dans Réglages.`),
      field('Motif du forfait (art. L131-4 du CPI)', reason, 'La loi prévoit en principe une rémunération proportionnelle ; un forfait doit être justifié par l’un de ces cas.'),
      prop,
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Fichiers sources'), segmented('sources', [['non', 'Non remis'], ['inclus', 'Inclus'], ['payant', 'Payants']], c.sources, (v) => { c.sources = v; sourcesPrice.hidden = v !== 'payant'; changed(); })),
      sourcesPrice,
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Paiement'), segmented('payment', [['reception', 'À réception'], ['30', 'À 30 jours']], c.paymentTerms, (v) => { c.paymentTerms = v; changed(); })),
    ];
  }

  // ── Étape 5 : clauses, aperçu et export ──
  function step5() {
    const creditText = text('Mention souhaitée', 'creditText', { placeholder: 'Ex. : Design : Maël Gillet' });
    creditText.hidden = c.credit !== 'mention';
    const previewHost = h('div', { class: 'preview-host' });
    let view = 'contract';
    const drawPreview = () => {
      if (view === 'quote') {
        put(previewHost, h('div', { class: 'quote-box', 'data-testid': 'quote-clause' }, buildQuoteClause(c)));
      } else {
        put(previewHost, renderHtml(view === 'summary' ? buildSummary(c) : buildContract(c), h));
      }
    };
    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    const drawTabs = () =>
      put(tabs, 
        ...[['contract', 'Contrat'], ['summary', 'Récapitulatif client'], ['quote', 'Clause pour devis']].map(([k, label]) =>
          h('button', { type: 'button', role: 'tab', 'aria-selected': String(view === k), onclick: () => { view = k; drawTabs(); drawPreview(); } }, label),
        ),
      );
    drawTabs();
    drawPreview();
    const refreshPreview = () => drawPreview();
    const sign = h('input', { class: 'input', type: 'date', value: c.signDate });
    sign.addEventListener('change', () => {
      c.signDate = sign.value;
      changed();
      refreshPreview();
    });
    const clauses = h(
      'div',
      { class: 'clauses' },
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Mention de votre nom sur les supports'), segmented('credit', [['none', 'Pas de mention'], ['mention', 'Mention de mon nom']], c.credit, (v) => { c.credit = v; creditText.hidden = v !== 'mention'; changed(); refreshPreview(); })),
      creditText,
      check('Je peux montrer ces œuvres dans mon portfolio', 'portfolio'),
      check('La cession ne prend effet qu’au paiement complet (recommandé)', 'retention'),
      text('Éléments sous licence intégrés (polices, photos…)', 'thirdParty', { placeholder: 'Ex. : police « Gilroy » (licence à acquérir par le client)' }),
      h('div', { class: 'grid-2' }, text('Fait à', 'place', { placeholder: 'Ville' }), field('Date de signature', sign)),
    );
    clauses.addEventListener('input', refreshPreview);
    clauses.addEventListener('change', refreshPreview);

    const action = (label, fn, testid, cls = 'btn-ghost') => {
      const b = h('button', { type: 'button', class: `btn ${cls}`, 'data-testid': testid }, label);
      b.addEventListener('click', async () => {
        const errors = validate(c);
        if (errors.length) {
          shownErrors = true;
          renderStepper();
          toast(`À corriger (étape ${errors[0].step}) : ${errors[0].message}`, { type: 'err', timeout: 7000 });
          return;
        }
        b.disabled = true;
        try {
          await fn();
        } finally {
          b.disabled = false;
        }
      });
      return b;
    };
    const store = () => {
      const saved = persist(c);
      if (!saved) return null;
      c = saved;
      editingSaved = true;
      clearDraft();
      opts.onSaved?.(saved);
      return saved;
    };
    return [
      h('h2', {}, 'Vérifiez, puis exportez'),
      clauses,
      tabs,
      previewHost,
      h('p', { class: 'notice small' }, 'Document généré à partir de vos réponses, sur la base du Code de la propriété intellectuelle. Il ne remplace pas le conseil d’un avocat pour un dossier à fort enjeu.'),
      h(
        'div',
        { class: 'export-bar' },
        action('Télécharger le contrat (PDF)', async () => { if (store()) { await exportPdf(c, 'contract'); toast('Contrat enregistré dans votre registre.', { type: 'ok' }); } }, 'export-pdf', 'btn-accent'),
        action('Récapitulatif client (PDF)', async () => { if (store()) await exportPdf(c, 'summary'); }, 'export-summary'),
        action('Word (.docx)', async () => { if (store()) await exportDocx(c); }, 'export-docx'),
        action('Copier la clause devis', () => copyQuoteClause(c), 'copy-quote'),
        action('Enregistrer', async () => { if (store()) toast('Contrat enregistré dans votre registre.', { type: 'ok' }); }, 'save'),
      ),
    ];
  }

  // ── Colonne de synthèse ──
  function renderSide() {
    const price = priceOf(c);
    const errors = validate(c);
    const end = contractEnd(c);
    const ok = (cond, label) => h('li', { class: cond ? 'ok' : 'ko' }, icon(cond ? 'check' : 'x', 14), label);
    const modesOk = price.lines.length > 0;
    put(side, 
      h('div', { class: 'side-card' },
        h('h3', {}, 'Prix de la cession'),
        price.lines.length
          ? h('ul', { class: 'side-lines' }, price.lines.map((l) => h('li', {}, h('span', {}, l.label), h('b', {}, l.type === 'proportionnel' ? percent(l.rate || 0) : euro(l.amount)))))
          : h('p', { class: 'muted small' }, 'Cochez des usages à l’étape « Droits ».'),
        h('div', { class: 'side-total' }, h('span', {}, 'Total droits'), h('b', { 'data-testid': 'total' }, `${euro(price.total)} HT`)),
        Number(c.creationFee) > 0 ? h('p', { class: 'muted small' }, `+ création : ${euro(Number(c.creationFee))} HT`) : null,
      ),
      h('div', { class: 'side-card' },
        h('h3', {}, 'Conformité (art. L131-3)'),
        h('ul', { class: 'compliance' },
          ok(c.works.every((w) => w.title?.trim()), 'Œuvres listées'),
          ok(c.rights.reproduction || c.rights.representation, 'Droits mentionnés un à un'),
          ok(modesOk, 'Étendue et destination'),
          ok(!!TERRITORIES[c.territory], `Lieu : ${TERRITORIES[c.territory]?.label}`),
          ok(!!c.startDate, `Durée : ${c.duration === 'legal' ? 'légale' : `jusqu’au ${dateShort(end)}`}`),
          ok(!errors.some((e) => e.step === 4) && modesOk, 'Rémunération par usage'),
        ),
      ),
      shownErrors && errors.length ? h('div', { class: 'notice err small' }, `${errors.length} point${errors.length > 1 ? 's' : ''} à compléter : ${errors[0].message}`) : null,
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { if (confirm('Repartir d’un contrat vierge ? Le brouillon actuel sera effacé.')) { clearDraft(); c = fresh(); step = 1; shownErrors = false; render(); } } }, 'Nouveau contrat vierge'),
    );
    renderStepper();
  }

  render();
  return { get contract() { return c; } };
}

