/* Ladalle — moteur. Aucune dépendance, aucun appel réseau. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const eur = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const TINTS = ['t0', 't1', 't2', 't3', 't4', 't5'];
  const DISH = Object.fromEntries(DISHES.map((d, i) => [d.id, Object.assign(d, { tint: TINTS[i % TINTS.length] })]));

  /* ---------- État persistant ---------- */
  /* Abonnement. PAY_LINK : URL d'un lien de paiement (ex. Stripe Payment Link) dont la page de retour est « #/premium?ok=1 ».
     Tant qu'il est vide, le bouton active un mode démo sans paiement.
     Le compteur vit dans le navigateur : il informe l'utilisateur, il ne protège pas le contenu. */
  const PAY_LINK = '';
  const PRICE = 4.99, FREE_DISHES = 3, FREE_PLANS = 1;
  const IMG = window.IMAGES || {};
  const KEY = 'ladalle:v1';
  const def = { store: 'lidl', fav: [], list: {}, checked: [], pantry: [], eq: ['plaque', 'four', 'micro', 'bouilloire'], plan: null, premium: false, usage: { month: '', dishes: [], plans: 0 } };
  let S = { ...def };
  try { S = { ...def, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* stockage indisponible */ }
  if (!STORES.some((s) => s.id === S.store)) S.store = def.store;
  const month = () => new Date().toISOString().slice(0, 7);
  const usage = () => { if (!S.usage || S.usage.month !== month()) S.usage = { month: month(), dishes: [], plans: 0 }; return S.usage; };
  const dishesLeft = () => Math.max(0, FREE_DISHES - usage().dishes.length);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* idem */ } };

  /* ---------- Calculs ---------- */
  const store = () => STORES.find((s) => s.id === S.store);
  const unitPrice = (k) => (ING[k][2] === 'pc' ? ING[k][3] : ING[k][3] / 1000);
  const lineCost = (k, q, idx = store().idx) => (q * unitPrice(k) * idx) / 100;
  /* Achat réel : on paie le paquet entier, pas la quantité utilisée. */
  const SKIP = ['huile', 'huile_olive', 'epices', 'farine', 'sucre'];
  const pack = (k) => PACK[k] || (ING[k][2] === 'pc' ? [1, 'pièce'] : null);
  const buy = (k, need, idx = store().idx) => {
    const pk = pack(k);
    if (!pk) return { n: 1, label: 'au poids', cost: lineCost(k, need, idx), left: 0 };
    const n = Math.max(1, Math.ceil(need / pk[0] - 1e-9));
    return { n, label: pk[1], cost: n * lineCost(k, pk[0], idx), left: n * pk[0] - need };
  };
  const buyLbl = (b) => (b.label === 'pièce' ? (b.n > 1 ? b.n + ' pièces' : 'la pièce') : (b.n > 1 ? b.n + ' × ' : '') + b.label);
  const buyTxt = (b) => `${buyLbl(b)} · ${eur(b.cost)}`;
  const ticket = (tot, skip = []) => Object.entries(tot).reduce((s, [k, q]) => s + (skip.includes(k) ? 0 : buy(k, q).cost), 0);
  const dishTotals = (pairs) => { const t = {}; for (const [id, n] of pairs) { const d = DISH[id]; if (!d) continue; for (const [k, q] of d.ing) t[k] = (t[k] || 0) + (q * n) / d.p; } return t; };
  const cost = (d, idx) => d.ing.reduce((t, [k, q]) => t + lineCost(k, q, idx), 0) / d.p;
  const flags = (d) => d.ing.map(([k]) => ING[k][4]).join('');
  const DIETS = {
    veg: ['Végétarien', (f) => !/[mf]/.test(f)],
    vegan: ['Végan', (f) => !/[mfdeh]/.test(f)],
    noporc: ['Sans porc', (f) => !/k/.test(f)],
    halal: ['Halal-compatible', (f) => !/[ka]/.test(f)],
    nogluten: ['Sans gluten', (f) => !/g/.test(f)],
    nolactose: ['Sans lactose', (f) => !/d/.test(f)],
  };
  const isDiet = (d, k) => DIETS[k][1](flags(d));
  const STYLES = {
    rapide: ['Rapide', (d) => d.t <= 15],
    chic: ['Sophistiqué', (d) => d.s.includes('chic')],
    batch: ['À préparer d’avance', (d) => d.s.includes('batch')],
    reconfort: ['Réconfort', (d) => d.s.includes('reconfort')],
    leger: ['Léger', (d) => d.s.includes('leger')],
    nocook: ['Sans cuisson', (d) => d.eq.length === 0],
    fav: ['♥ Favoris', (d) => S.fav.includes(d.id)],
  };
  const EQ = { plaque: 'Plaques', four: 'Four', micro: 'Micro-ondes', bouilloire: 'Bouilloire' };
  const TYPES = { '': 'Tous', repas: 'Repas', matin: 'Petit-déj', douceur: 'Douceurs' };
  const TIMES = { '': 'Tous', 10: '10 min', 20: '20 min', 30: '30 min' };
  const canCook = (d, eq = S.eq) => d.eq.length === 0 || d.eq.some((alt) => alt.split('+').every((e) => eq.includes(e)));
  const eqLabel = (d) => (d.eq.length ? d.eq.map((a) => a.split('+').map((e) => EQ[e]).join(' + ')).join(' ou ') : 'Sans cuisson');
  const fmtQty = (k, q) => {
    const u = ING[k][2];
    if (u === 'pc') { const r = Math.round(q * 4) / 4; const w = Math.floor(r); const fr = { 0.25: '¼', 0.5: '½', 0.75: '¾' }[r - w] || ''; return (w || '') + fr || '¼'; }
    const r = q >= 100 ? Math.round(q / 10) * 10 : Math.round(q);
    return u === 'ml' ? (r >= 1000 ? (r / 1000).toLocaleString('fr-FR') + ' l' : (r / 10).toLocaleString('fr-FR') + ' cl') : (r >= 1000 ? (r / 1000).toLocaleString('fr-FR') + ' kg' : r + ' g');
  };
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  /* ---------- Toast ---------- */
  let toastT;
  const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); };

  /* ---------- Visuel : photo si disponible, sinon emoji ---------- */
  const art = (d) => (IMG[d.id] ? `<img src="img/${IMG[d.id].file}" alt="" loading="lazy">` : d.e);

  /* ---------- Formules ---------- */
  const PLANS_HTML = () => `<div class="plans">
      <div class="plan"><h3>Gratuit</h3><p class="plan-p">0 €</p>
        <ul><li>${FREE_DISHES} fiches plats par mois</li><li>${FREE_PLANS} semaine par mois</li><li>Prix et bons plans</li></ul>
        ${S.premium ? '' : '<span class="tag tag-ok">Ta formule actuelle</span>'}</div>
      <div class="plan pro"><span class="reco">Recommandé</span><h3>Premium</h3><p class="plan-p">${eur(PRICE)} <small>/ mois, sans engagement</small></p>
        <ul><li><b>Fiches et semaines illimitées</b></li><li>Placard : cuisine avec ce que tu as</li><li>Liste à copier et imprimer</li><li>Favoris</li></ul>
        ${S.premium ? '<span class="tag tag-ok">Premium actif</span> <button class="lnk" type="button" data-unsub>Repasser en gratuit</button>' : '<button class="btn btn-accent" type="button" data-sub>Passer Premium <span aria-hidden="true">→</span></button>'}
</div>
    </div>`;
  const renderPricing = () => $$('.pricing-slot').forEach((e) => (e.innerHTML = PLANS_HTML()));
  function paywall(title, txt) {
    $('#dlgBody').innerHTML = `<div class="d-head pw"><div><p class="eyebrow">Premium</p><h2 id="dlgTitle">${title}</h2><p style="margin:0">${txt}</p></div><button class="d-x" type="button" data-close aria-label="Fermer">✕</button></div><div class="d-body">${PLANS_HTML()}</div>`;
    const dlg = $('#dlg'); delete dlg.dataset.id; if (!dlg.open) dlg.showModal(); dlg.scrollTop = 0;
  }
  const needPremium = (what) => { if (S.premium) return false; paywall('Réservé à Premium', what); return true; };
  function subscribe() {
    if (PAY_LINK) { location.href = PAY_LINK; return; }
    S.premium = true; save(); if ($('#dlg').open) $('#dlg').close(); rerender(); toast('Mode démo : Premium activé, aucun paiement effectué.');
  }

  /* ---------- Carte plat ---------- */
  const dietTags = (d) => ['vegan', 'veg', 'nogluten', 'nolactose'].filter((k) => isDiet(d, k)).filter((k, i, a) => !(k === 'veg' && a.includes('vegan'))).slice(0, 2).map((k) => `<span class="tag tag-ok">${DIETS[k][0]}</span>`).join('');
  const card = (d, extra = '') => `
    <article class="card" data-dish="${d.id}" tabindex="0" role="button" aria-label="${d.n}, ${eur(cost(d))} par portion, ${d.t} minutes">
      <div class="card-art ${d.tint}" aria-hidden="true">${art(d)}</div>
      <span class="price">${eur(cost(d))} <small>/ portion</small></span>
      ${S.premium ? `<button class="fav" type="button" data-fav="${d.id}" aria-pressed="${S.fav.includes(d.id)}" aria-label="Favori : ${d.n}">♥</button>` : ''}
      <div class="card-b"><h3>${d.n}</h3>
        <div class="meta"><span class="tag">⏱ ${d.t} min</span><span class="tag">${eqLabel(d).split(' ou ')[0]}</span>${dietTags(d)}</div>${extra}
      </div>
    </article>`;

  /* ---------- Filtres plats ---------- */
  const F0 = () => ({ q: '', max: 4, time: '', diet: [], style: [], type: '', sort: 'price' });
  let F = F0();
  const chip = (g, k, label, on) => `<button class="chip" type="button" data-g="${g}" data-k="${k}" aria-pressed="${on}">${label}</button>`;
  function renderChips() {
    $('[data-group=time]').innerHTML = Object.entries(TIMES).sort((a, b) => (a[0] === '' ? 1 : b[0] === '' ? -1 : a[0] - b[0])).map(([k, l]) => chip('time', k, l, String(F.time) === k)).join('');
    $('[data-group=diet]').innerHTML = Object.entries(DIETS).map(([k, v]) => chip('diet', k, v[0], F.diet.includes(k))).join('');
    $('[data-group=style]').innerHTML = Object.entries(STYLES).filter(([k]) => k !== 'reconfort' && k !== 'leger').map(([k, v]) => chip('style', k, v[0], F.style.includes(k))).join('');
    $('[data-group=eq]').innerHTML = Object.entries(EQ).map(([k, l]) => chip('eq', k, l, S.eq.includes(k))).join('');
    $('[data-group=type]').innerHTML = Object.entries(TYPES).map(([k, l]) => chip('type', k, l, F.type === k)).join('');
    $('#q').value = F.q; $('#max').value = F.max; $('#sort').value = F.sort;
    $('#maxLbl').textContent = F.max >= 4 ? 'sans limite' : eur(F.max);
  }
  const match = (d) => {
    if (F.max < 4 && cost(d) > F.max + 1e-9) return false;
    if (F.time && d.t > +F.time) return false;
    if (F.type && d.type !== F.type) return false;
    if (!F.diet.every((k) => isDiet(d, k))) return false;
    if (!F.style.every((k) => STYLES[k][1](d))) return false;
    if (!canCook(d)) return false;
    if (F.q) { const hay = norm(d.n + ' ' + d.ing.map(([k]) => ING[k][0]).join(' ')); if (!norm(F.q).split(/\s+/).every((w) => hay.includes(w))) return false; }
    return true;
  };
  function renderDishes() {
    const res = DISHES.filter(match).sort((a, b) => (F.sort === 'time' ? a.t - b.t || cost(a) - cost(b) : F.sort === 'name' ? a.n.localeCompare(b.n, 'fr') : cost(a) - cost(b)));
    $('#dishGrid').innerHTML = res.map((d) => card(d)).join('');
    $('#resCount').textContent = `${res.length} plat${res.length > 1 ? 's' : ''} sur ${DISHES.length}`;
    $('#quota').innerHTML = S.premium ? '<span class="tag tag-ok">Premium · fiches illimitées</span>' : `${dishesLeft()} fiche${dishesLeft() > 1 ? 's' : ''} gratuite${dishesLeft() > 1 ? 's' : ''} sur ${FREE_DISHES} ce mois-ci · <a class="lnk" href="#/premium">Illimité</a>`;
    const empty = $('#dishEmpty'); empty.hidden = res.length > 0;
    if (!res.length) {
      const relaxed = { ...F, max: 4 }; const keep = F; F = relaxed; const n = DISHES.filter(match); F = keep;
      const cheapest = n.length ? Math.min(...n.map((d) => cost(d))) : null;
      empty.innerHTML = `<h3>Aucun plat ne passe tous tes filtres.</h3><p>${cheapest ? `Avec ces critères, le premier plat démarre à <b>${eur(cheapest)}</b> la portion. Monte le budget à ce niveau ou retire un filtre.` : 'Retire un filtre de régime, d’envie ou d’équipement.'}</p><button class="btn btn-ink" type="button" id="resetF2">Réinitialiser les filtres</button>`;
    }
  }
  const refreshDishes = () => { renderChips(); renderDishes(); };

  /* ---------- Fiche plat ---------- */
  let dlgPortions = 1;
  function openDish(id, portions) {
    const d = DISH[id]; if (!d) return;
    if (!S.premium) {
      const u = usage();
      if (!u.dishes.includes(id)) {
        if (u.dishes.length >= FREE_DISHES) return paywall(`Tes ${FREE_DISHES} fiches gratuites du mois sont utilisées.`, `Les fiches déjà ouvertes restent accessibles. Premium ouvre les ${DISHES.length} plats, sans limite.`);
        u.dishes.push(id); save(); if (current === 'plats') renderDishes();
      }
    }
    dlgPortions = portions || d.p;
    const k = dlgPortions / d.p, c = cost(d);
    const diets = Object.keys(DIETS).filter((x) => isDiet(d, x)).map((x) => `<span class="tag tag-ok">${DIETS[x][0]}</span>`).join('');
    const byStore = [...STORES].sort((a, b) => a.idx - b.idx).map((s) => `<span class="tag${s.id === S.store ? ' tag-ok' : ''}">${s.n} · ${eur(cost(d, s.idx))}</span>`).join('');
    $('#dlgBody').innerHTML = `
      <div class="d-head"><div class="d-art ${d.tint}" aria-hidden="true">${art(d)}</div>
        <div><h2 id="dlgTitle">${d.n}</h2><div class="meta">${diets || '<span class="tag">Aucun régime spécifique</span>'}</div></div>
        <button class="d-x" type="button" data-close aria-label="Fermer">✕</button></div>
      <div class="d-body">
        <div class="d-kpis">
          <div class="kpi"><b>${eur(c)}</b><span>par portion</span></div>
          <div class="kpi"><b>${d.t} min</b><span>${eqLabel(d).split(' ou ')[0]}</span></div>
          <div class="kpi"><b>${eur(ticket(dishTotals([[id, dlgPortions]])))}</b><span>ticket complet</span></div>
        </div>
        <div class="d-cols">
          <div><h3>Ingrédients</h3>
            <div class="stepper"><button type="button" data-step="-1" aria-label="Moins de portions">−</button><span>${dlgPortions} portion${dlgPortions > 1 ? 's' : ''}</span><button type="button" data-step="1" aria-label="Plus de portions">+</button></div>
            <ul class="ings">${d.ing.map(([i, q]) => `<li><span>${ING[i][0].replace(/ \(.*\)/, '')} — ${fmtQty(i, q * k)}</span><em>${buyTxt(buy(i, q * k))}</em></li>`).join('')}</ul>
            <p class="fine" style="margin-top:8px">Prix du paquet entier chez ${store().n}.</p></div>
          <div><h3>Préparation</h3><ol class="d-steps">${d.steps.map((s) => `<li>${s}</li>`).join('')}</ol></div>
        </div>
        <div class="tipbox"><b>Le détail qui change tout.</b> ${d.tip}</div>
        <div class="d-act"><button class="btn btn-accent" type="button" data-add="${d.id}">Ajouter à ma liste de courses</button>
          <button class="btn" type="button" data-fav="${d.id}" aria-pressed="${S.fav.includes(d.id)}">${S.fav.includes(d.id) ? '♥ Dans mes favoris' : '♡ Mettre en favori'}</button></div>
        ${S.premium ? '' : `<p class="fine" style="margin:0">${dishesLeft()} fiche${dishesLeft() > 1 ? 's' : ''} gratuite${dishesLeft() > 1 ? 's' : ''} restante${dishesLeft() > 1 ? 's' : ''} ce mois-ci. <a class="lnk" href="#/premium" data-close>Passer en illimité</a></p>`}
      </div>`;
    const dlg = $('#dlg'); dlg.dataset.id = id; if (!dlg.open) dlg.showModal(); dlg.scrollTop = 0;
  }

  /* ---------- Liste de courses ---------- */
  const listTotals = () => dishTotals(Object.entries(S.list));
  const updateCount = () => { $('#listCount').textContent = Object.keys(S.list).length; };
  function addToList(id, portions) { S.list[id] = (S.list[id] || 0) + portions; save(); updateCount(); }
  function listText() {
    const t = listTotals(); const by = {};
    for (const k of Object.keys(t)) (by[ING[k][1]] ||= []).push(`- ${ING[k][0].replace(/ \(.*\)/, '')} : ${buyLbl(buy(k, t[k]))} (besoin : ${fmtQty(k, t[k])})`);
    return 'Ma liste Ladalle\n\n' + Object.entries(by).map(([r, l]) => `${r.toUpperCase()}\n${l.join('\n')}`).join('\n\n');
  }
  function renderList() {
    const out = $('#listOut'); const ids = Object.keys(S.list).filter((id) => DISH[id]);
    if (!ids.length) { out.innerHTML = `<div class="empty"><h3>Ta liste est vide.</h3><p>Ajoute un plat depuis sa fiche, ou génère une semaine complète : la liste se remplit toute seule.</p><p><a class="btn btn-accent" href="#/semaine">Générer ma semaine</a> <a class="btn" href="#/plats">Parcourir les plats</a></p></div>`; return; }
    const t = listTotals(); const total = ticket(t);
    const left = ticket(t, S.checked);
    const by = {}; for (const k of Object.keys(t)) (by[ING[k][1]] ||= []).push(k);
    const portions = ids.reduce((s, id) => s + S.list[id], 0);
    out.innerHTML = `
      <div class="plan-sum"><div class="kpi"><b>${eur(total)}</b><span>ticket total</span></div><div class="kpi"><b>${eur(left)}</b><span>reste à payer</span></div><div class="kpi"><b>${portions}</b><span>portions</span></div></div>
      <div class="list-top"><div class="plan-act" style="margin:0"><button class="btn btn-ink" type="button" id="copyList">Copier la liste</button><button class="btn" type="button" id="printList">Imprimer</button><button class="btn" type="button" id="clearList">Vider</button></div></div>
      <div class="list-dishes">${ids.map((id) => `<span class="pill">${DISH[id].e} ${DISH[id].n} × ${S.list[id]}<button type="button" data-rm="${id}" aria-label="Retirer ${DISH[id].n}">✕</button></span>`).join('')}</div>
      ${Object.entries(by).map(([r, ks]) => `<div class="aisle"><h3>${r}</h3>${ks.sort((a, b) => ING[a][0].localeCompare(ING[b][0], 'fr')).map((k) => `<label class="item${S.checked.includes(k) ? ' done' : ''}"><input type="checkbox" data-chk="${k}" ${S.checked.includes(k) ? 'checked' : ''}><span>${ING[k][0].replace(/ \(.*\)/, '')} <small>${buyLbl(buy(k, t[k]))}</small></span><em>${eur(buy(k, t[k]).cost)}</em></label>`).join('')}</div>`).join('')}
      <p class="fine">Coche ce que tu as déjà : le reste à payer se met à jour.</p>`;
  }

  /* ---------- Planificateur ---------- */
  const SLOTS = { 5: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map((d) => d + ' soir'), 7: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => d + ' soir'), 10: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].flatMap((d) => [d + ' midi', d + ' soir']), 14: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].flatMap((d) => [d + ' midi', d + ' soir']) };
  const planPool = (p) => DISHES.filter((d) => d.type === 'repas' && canCook(d) && (!p.diet || isDiet(d, p.diet)) && (!p.time || d.t <= +p.time));
  const planTotal = (ids, p = S.plan) => ticket(dishTotals(ids.map((id) => [id, 1])), p && p.basics ? SKIP : []);
  function buildPlan(p) {
    const pool = planPool(p); if (!pool.length) return null;
    const fill = (order) => {
      const ids = []; let i = 0;
      while (ids.length < p.meals) { const d = order[i % order.length]; const n = d.s.includes('batch') && p.meals - ids.length >= 2 ? 2 : 1; for (let j = 0; j < n; j++) ids.push(d.id); i++; }
      return ids;
    };
    const cheapest = fill([...pool].sort((a, b) => cost(a) - cost(b)));
    let best = null, bestScore = -1, minIds = cheapest, minT = planTotal(cheapest, p);
    for (let it = 0; it < 500; it++) {
      // w = 0 : du moins cher au plus cher ; w = 1 : tirage au hasard. On garde le plan le plus varié qui tient dans le budget.
      const w = it / 499;
      let order = [...pool].map((d) => [d, cost(d) * (1 - w) + Math.random() * 4 * w]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
      // Une itération sur deux : peu de plats différents, donc des paquets mieux rentabilisés et un ticket plus bas.
      if (it % 2) order = order.slice(0, 3 + (it % 5));
      const ids = fill(order);
      const tot = planTotal(ids, p); if (tot < minT) { minT = tot; minIds = ids; } if (tot > p.budget) continue;
      const score = new Set(ids).size * 10 + Math.min(1, tot / p.budget) * 12 + Math.random();
      if (score > bestScore) { bestScore = score; best = ids; }
    }
    const over = !best; let ids = best || minIds;
    // Répartit les doublons (restes) pour éviter deux fois le même plat à la suite.
    for (let tries = 0; tries < 40; tries++) { ids = ids.map((v) => [v, Math.random()]).sort((a, b) => a[1] - b[1]).map((x) => x[0]); if (ids.every((v, i) => i === 0 || v !== ids[i - 1])) break; }
    return { ...p, ids, over, min: minT };
  }
  function renderPlan() {
    const out = $('#planOut'); const P = S.plan;
    if (!P) { out.innerHTML = ''; return; }
    if (!P.ids) { out.innerHTML = `<div class="warn"><b>Aucun plat ne correspond à ces critères avec ton équipement.</b> Élargis le temps max, change de régime ou coche plus d'équipement dans les filtres des plats.</div>`; return; }
    const ids = P.ids.filter((id) => DISH[id]); const tot = planTotal(ids); const slots = SLOTS[P.meals] || SLOTS[10];
    out.innerHTML = `
      ${tot > P.budget + 1e-9 ? `<div class="warn"><b>${eur(P.budget)} ne suffisent pas pour ${P.meals} repas.</b> Le plan le moins cher coûte ${eur(P.min)} : le voici. Réduis le nombre de repas ou complète avec le <a href="#/bons-plans">resto U</a>.</div>` : ''}
      <div class="plan-sum">
        <div class="kpi"><b>${eur(tot)}</b><span>ticket, sur ${eur(P.budget)}</span><div class="bar"><i style="width:${Math.min(100, (tot / P.budget) * 100)}%"></i></div></div>
        <div class="kpi"><b>${eur(tot / ids.length)}</b><span>par repas</span></div>
        <div class="kpi"><b>${eur(Math.max(0, P.budget - tot))}</b><span>restants</span></div>
      </div>
      <div class="plan-act"><button class="btn btn-accent" type="button" id="planToList">Créer ma liste de courses</button><button class="btn" type="button" id="planAgain">Autre proposition</button><button class="btn" type="button" id="printList">Imprimer</button></div>
      <div class="meals">${ids.map((id, i) => { const d = DISH[id]; const rest = ids.indexOf(id) < i; return `<div class="meal"><div class="meal-h"><span>${slots[i] || 'Repas ' + (i + 1)}</span><span>${rest ? 'Restes' : d.t + ' min'}</span></div><button class="meal-n" type="button" data-dish="${id}">${d.e} ${d.n}</button><div class="meal-f"><b>${eur(cost(d))} <small>/ portion</small></b><button class="swap" type="button" data-swap="${i}" aria-label="Remplacer ${d.n}">Changer</button></div></div>`; }).join('')}</div>
      <p class="fine" style="margin-top:16px">Paquets entiers, prix ${store().n}${P.basics ? ', hors huile, épices, farine et sucre' : ''}. « Restes » : cuisiné en double la veille.</p>`;
  }
  function swapMeal(i) {
    const P = S.plan; const cur = P.ids[i]; const cap = Math.max(P.budget, planTotal(P.ids)) + 1e-9;
    const cands = planPool(P).filter((d) => d.id !== cur && !P.ids.includes(d.id) && planTotal(P.ids.map((x, j) => (j === i ? d.id : x))) <= cap);
    if (!cands.length) return toast('Aucun autre plat ne rentre dans le budget restant.');
    P.ids[i] = cands[Math.floor(Math.random() * cands.length)].id; save(); renderPlan();
  }

  /* ---------- Placard ---------- */
  function renderPantry() {
    const by = {}; for (const [k, v] of Object.entries(ING)) if (!BASICS.includes(k) && DISHES.filter((d) => d.ing.some(([i]) => i === k)).length >= 3) (by[v[1]] ||= []).push(k);
    $('#pantry').innerHTML = Object.entries(by).map(([r, ks]) => `<div><h3>${r}</h3><div class="chips">${ks.map((k) => chip('pantry', k, ING[k][0].replace(/ \(.*\)/, ''), S.pantry.includes(k))).join('')}</div></div>`).join('');
    $('#pantryCount').textContent = `${S.pantry.length} ingrédient${S.pantry.length > 1 ? 's' : ''} coché${S.pantry.length > 1 ? 's' : ''}`;
    const out = $('#pantryOut');
    if (!S.premium) { out.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Le Placard fait partie de Premium.</h3><p>Coche tes ingrédients, Premium te montre les plats faisables et ce qu'il manque, au centime près.</p><a class="btn btn-accent" href="#/premium">Voir les formules</a></div>`; return; }
    if (!S.pantry.length) { out.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Coche au moins un ingrédient.</h3></div>`; return; }
    const res = DISHES.filter((d) => canCook(d)).map((d) => { const need = d.ing.filter(([k]) => !BASICS.includes(k)); const miss = need.filter(([k]) => !S.pantry.includes(k)); return { d, miss, have: need.length - miss.length, mc: miss.reduce((s, [k, q]) => s + buy(k, q).cost, 0) }; })
      .filter((r) => r.have > 0 && r.miss.length <= 2).sort((a, b) => a.miss.length - b.miss.length || a.mc - b.mc).slice(0, 12);
    out.innerHTML = res.length ? res.map((r) => card(r.d, r.miss.length ? `<p class="miss">Il te manque : <b>${r.miss.map(([k]) => ING[k][0].replace(/ \(.*\)/, '').toLowerCase()).join(', ')}</b> (≈ ${eur(r.mc)})</p>` : `<p class="miss"><span class="tag tag-ok">Tu as tout</span></p>`)).join('')
      : `<div class="empty" style="grid-column:1/-1"><h3>Rien de faisable à 2 ingrédients près.</h3><p>Coche davantage d'ingrédients, ou regarde les <a href="#/plats?max=1">plats à moins de 1 €</a>.</p></div>`;
  }

  /* ---------- Magasins, bons plans ---------- */
  function renderStores() {
    const mx = Math.max(...STORES.map((s) => s.idx));
    $('#stores').innerHTML = STORES.map((s) => `<div class="store${s.id === S.store ? ' on' : ''}"><div><h3>${s.e} ${s.n}</h3><small>${s.kind}</small></div>
      <div><div class="idx"><b>${s.idx}</b><div class="bar"><i style="width:${(s.idx / mx) * 100}%"></i></div></div><p><b>Idéal pour :</b> ${s.plus.toLowerCase()}.</p></div>
      ${s.id === S.store ? '<span class="tag tag-ok">Mon magasin</span>' : `<button class="btn btn-sm" type="button" data-store="${s.id}">C'est mon magasin</button>`}</div>`).join('');
    $('#spots').innerHTML = SPOTS.map((s) => `<div class="spot"><h3><span>${s.e}</span>${s.n}</h3><p>${s.txt}</p></div>`).join('');
    renderCmp();
  }
  let cmpId = 'dahl';
  function renderCmp() {
    const d = DISH[cmpId]; const min = Math.min(...STORES.map((s) => s.idx));
    $('#cmp').innerHTML = `<label>Plat à comparer<select id="cmpSel">${DISHES.map((x) => `<option value="${x.id}"${x.id === cmpId ? ' selected' : ''}>${x.n}</option>`).join('')}</select></label>
      <table><thead><tr><th>Enseigne</th><th>Par portion</th><th>10 repas</th><th>Écart sur 10 repas</th></tr></thead><tbody>${[...STORES].sort((a, b) => a.idx - b.idx).map((s) => { const c = cost(d, s.idx), b = cost(d, min); return `<tr class="${s.idx === min ? 'best' : ''}"><td>${s.n}</td><td>${eur(c)}</td><td>${eur(c * 10)}</td><td>${s.idx === min ? 'le moins cher' : '+ ' + eur((c - b) * 10)}</td></tr>`; }).join('')}</tbody></table>`;
  }
  function renderDeals() {
    $('#deals').innerHTML = DEALS.slice(0, 6).map((d) => `<div class="deal"><h3><span>${d.e}</span>${d.t}</h3><div><span class="tag tag-ok">${d.tag}</span></div><p>${d.txt}</p><div class="act"><b>À faire cette semaine</b>${d.act}</div>${d.url ? `<a class="lnk" href="${d.url}" target="_blank" rel="noopener noreferrer">${d.src} ↗</a>` : ''}</div>`).join('');
  }

  /* ---------- Accueil ---------- */
  const COLLS = [
    ['🪙', 'Moins de 1 €', 'Les plats de fin de mois.', '#/plats?max=1', (d) => cost(d) <= 1],
    ['⚡', 'Prêt en 10 min', 'Entre deux cours.', '#/plats?time=10', (d) => d.t <= 10],
    ['🕯️', 'Sophistiqué', 'Pour recevoir sans se ruiner.', '#/plats?style=chic', STYLES.chic[1]],
    ['🧊', 'Préparé d’avance', 'Une heure, quatre repas.', '#/plats?style=batch', STYLES.batch[1]],
    ['📡', 'Micro-ondes seul', 'Résidence sans cuisine.', '#/plats?eq=micro', (d) => canCook(d, ['micro'])],
    ['🌱', 'Végan', 'Sans produit animal.', '#/plats?diet=vegan', (d) => isDiet(d, 'vegan')],
  ];
  function renderHome() {
    const meals = DISHES.filter((d) => d.type === 'repas'); const med = median(meals.map((d) => cost(d)));
    const v = DISH.dahl; $('#vsPrice').textContent = eur(cost(v)); $('#vsArt').innerHTML = art(v); $('#vsName').textContent = v.n; $('#vsTime').textContent = v.t;
    $('#medianFig').textContent = eur(med);
    $('#mockPrice').innerHTML = ['dahl', 'fried_rice'].map((id) => `<div class="mock-line"><span>${DISH[id].e} ${DISH[id].n}</span><b>${eur(cost(DISH[id]))}</b></div>`).join('') ;
    $('#collections').innerHTML = COLLS.map(([e, t, p, href, fn], i) => `<a class="coll" href="${href}"><div class="coll-art ${TINTS[i]}"><span class="badge">${DISHES.filter(fn).length} plats</span>${e}</div><h3>${t}</h3><p>${p}</p></a>`).join('');
    renderPricing();
  }

  function renderCredits() {
    const ids = Object.keys(IMG).filter((id) => DISH[id]);
    $('#credits').innerHTML = ids.length ? `<p>Photos issues de Wikimedia Commons, utilisées selon leur licence.</p><ul>${ids.map((id) => { const c = IMG[id]; return `<li><b>${DISH[id].n}</b> — ${c.author || 'auteur non renseigné'}, <a href="${c.licenseUrl || c.source}" target="_blank" rel="noopener noreferrer">${c.license}</a>, <a href="${c.source}" target="_blank" rel="noopener noreferrer">source</a></li>`; }).join('')}</ul>` : '<p>Aucune photo pour le moment : les plats sont illustrés par des pictogrammes.</p>';
  }

  /* ---------- Animations ---------- */
  // « enter » : joue l'entrée en cascade du contenu une seule fois, à l'arrivée sur une page.
  const enter = (el) => { if (!el) return; el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('enter'), 1400); };
  // Apparition au défilement des sections de l'accueil. Sans IntersectionObserver, tout reste visible.
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  if (io) document.documentElement.classList.add('js');
  const reveal = () => { if (!io) return; $$('#v-home .sec .eyebrow, #v-home .sec h2, #v-home .step, #v-home .car, #v-home .dk, #v-home .pricing-slot, #v-home .faq, #v-home .final .btn').forEach((el) => { if (!el.classList.contains('rv')) { el.classList.add('rv'); io.observe(el); } }); };

  /* ---------- Routeur ---------- */
  const VIEWS = { '': 'home', plats: 'plats', semaine: 'semaine', placard: 'placard', magasins: 'bons-plans', 'bons-plans': 'bons-plans', liste: 'liste', manifeste: 'manifeste', premium: 'premium', credits: 'credits' };
  const RENDER = { home: renderHome, plats: refreshDishes, semaine: renderPlan, placard: renderPantry, 'bons-plans': () => { renderStores(); renderDeals(); }, liste: renderList, premium: renderPricing, credits: renderCredits };
  let current = 'home';
  function route() {
    const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
    current = VIEWS[path] || 'home';
    if (current === 'premium' && PAY_LINK && new URLSearchParams(qs || '').get('ok') === '1' && !S.premium) { S.premium = true; save(); toast('Premium activé. Merci !'); }
    if (current === 'plats' && qs !== undefined) {
      const p = new URLSearchParams(qs); F = F0();
      if (p.get('max')) F.max = Math.min(4, +p.get('max') || 4);
      if (p.get('time')) F.time = p.get('time');
      if (p.get('diet') && DIETS[p.get('diet')]) F.diet = [p.get('diet')];
      if (p.get('style') && STYLES[p.get('style')]) F.style = [p.get('style')];
      if (p.get('eq') && EQ[p.get('eq')]) { S.eq = [p.get('eq')]; save(); toast(`Équipement réglé sur : ${EQ[p.get('eq')]} seul.`); }
      if (p.has('max') || p.has('time')) F.type = 'repas';
    }
    $$('.view').forEach((v) => (v.hidden = v.id !== 'v-' + current));
    $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === current));
    $('#nav').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false');
    $$('.storeName').forEach((e) => (e.textContent = store().n));
    RENDER[current]?.(); window.scrollTo(0, 0); enter($('#v-' + current)); reveal();
    document.title = { home: 'Ladalle — Bien manger, même le 28 du mois', plats: 'Les plats — Ladalle', semaine: 'Ma semaine — Ladalle', placard: 'Placard — Ladalle', premium: 'Premium — Ladalle', credits: 'Crédits photo — Ladalle', 'bons-plans': 'Bons plans — Ladalle', liste: 'Ma liste — Ladalle', manifeste: 'Ligne éditoriale — Ladalle' }[current];
  }
  const rerender = () => { $$('.storeName').forEach((e) => (e.textContent = store().n)); RENDER[current]?.(); renderPricing(); };

  /* ---------- Événements ---------- */
  const sel = $('#storeSel');
  sel.innerHTML = STORES.map((s) => `<option value="${s.id}">${s.n}</option>`).join(''); sel.value = S.store;
  const setStore = (id) => { S.store = id; sel.value = id; save(); rerender(); toast(`Prix recalculés pour ${store().n}.`); };
  sel.addEventListener('change', () => setStore(sel.value));
  $('#burger').addEventListener('click', () => { const o = $('#nav').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); });
  $('#carPrev').addEventListener('click', () => $('#collections').scrollBy({ left: -320, behavior: 'smooth' }));
  $('#carNext').addEventListener('click', () => $('#collections').scrollBy({ left: 320, behavior: 'smooth' }));

  $('#quickForm').addEventListener('submit', (e) => {
    e.preventDefault(); const f = new FormData(e.target), pf = $('#planForm');
    for (const k of ['budget', 'meals', 'diet']) pf.elements[k].value = f.get(k);
    location.hash = '#/semaine'; setTimeout(() => pf.requestSubmit(), 60);
  });
  $('#q').addEventListener('input', (e) => { F.q = e.target.value; renderDishes(); });
  $('#sort').addEventListener('change', (e) => { F.sort = e.target.value; renderDishes(); });
  $('#max').addEventListener('input', (e) => { F.max = +e.target.value; $('#maxLbl').textContent = F.max >= 4 ? 'sans limite' : eur(F.max); renderDishes(); });
  const resetF = () => { F = F0(); S.eq = [...def.eq]; save(); refreshDishes(); };
  $('#resetF').addEventListener('click', resetF);
  $('#pantryReset').addEventListener('click', () => { S.pantry = []; save(); renderPantry(); });

  $('#planForm').addEventListener('submit', (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    const p = { budget: Math.max(1, +f.get('budget') || 20), meals: +f.get('meals'), diet: f.get('diet'), time: f.get('time'), basics: f.get('basics') === 'on' };
    if (!S.premium) { if (usage().plans >= FREE_PLANS) return paywall('Ta semaine gratuite du mois est déjà générée.', 'Elle reste affichée ci-dessous. Premium en génère autant que tu veux.'); usage().plans++; }
    S.plan = buildPlan(p) || { ...p, ids: null }; save(); renderPlan(); enter($('#planOut'));
    $('#planOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const toggle = (arr, k) => { const i = arr.indexOf(k); i < 0 ? arr.push(k) : arr.splice(i, 1); };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-sub],[data-unsub],[data-fav],[data-g],[data-dish],[data-close],[data-step],[data-add],[data-rm],[data-swap],[data-store],#resetF2,#copyList,#printList,#clearList,#planToList,#planAgain');
    if (!t) return;
    if ('sub' in t.dataset) return subscribe();
    if ('unsub' in t.dataset) { S.premium = false; save(); rerender(); return toast('Formule gratuite réactivée.'); }
    if (t.dataset.fav) { e.stopPropagation(); if (needPremium('Les favoris font partie de Premium.')) return; toggle(S.fav, t.dataset.fav); save(); if ($('#dlg').open) openDish($('#dlg').dataset.id, dlgPortions); rerender(); return; }
    if (t.dataset.g) {
      const { g, k } = t.dataset;
      if (g === 'pantry') { toggle(S.pantry, k); save(); renderPantry(); return; }
      if (g === 'eq') { toggle(S.eq, k); save(); }
      else if (g === 'time' || g === 'type') F[g] = k;
      else toggle(F[g], k);
      refreshDishes(); return;
    }
    if (t.dataset.dish) return openDish(t.dataset.dish);
    if ('close' in t.dataset) return $('#dlg').close();
    if (t.dataset.step) return openDish($('#dlg').dataset.id, Math.min(12, Math.max(1, dlgPortions + +t.dataset.step)));
    if (t.dataset.add) { addToList(t.dataset.add, dlgPortions); toast(`${DISH[t.dataset.add].n} × ${dlgPortions} ajouté à ta liste.`); if (current === 'liste') renderList(); return; }
    if (t.dataset.rm) { delete S.list[t.dataset.rm]; save(); updateCount(); renderList(); return; }
    if (t.dataset.swap) return needPremium('Remplacer un plat de la semaine fait partie de Premium.') || swapMeal(+t.dataset.swap);
    if (t.dataset.store) return setStore(t.dataset.store);
    if (t.id === 'resetF2') return resetF();
    if (t.id === 'printList') return needPremium('Imprimer la liste ou la semaine fait partie de Premium.') || window.print();
    if (t.id === 'clearList') { S.list = {}; S.checked = []; save(); updateCount(); renderList(); return; }
    if (t.id === 'copyList') { if (needPremium('Copier la liste fait partie de Premium.')) return; const txt = listText(); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Liste copiée. Colle-la dans tes notes.'), () => toast('Copie impossible ici : utilise Imprimer.')); return; }
    if (t.id === 'planAgain') { if (needPremium('Générer une autre proposition fait partie de Premium.')) return; S.plan = buildPlan(S.plan); save(); renderPlan(); return; }
    if (t.id === 'planToList') { S.list = {}; S.checked = S.plan.basics ? [...SKIP] : []; S.plan.ids.forEach((id) => (S.list[id] = (S.list[id] || 0) + 1)); save(); updateCount(); toast('Liste créée à partir de ta semaine.'); location.hash = '#/liste'; }
  });
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card')) { e.preventDefault(); openDish(e.target.dataset.dish); } });
  document.addEventListener('change', (e) => {
    if (e.target.dataset.chk) { toggle(S.checked, e.target.dataset.chk); save(); renderList(); }
    if (e.target.id === 'cmpSel') { cmpId = e.target.value; renderCmp(); }
  });
  $('#dlg').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  window.addEventListener('hashchange', route);
  updateCount(); route();
})();
