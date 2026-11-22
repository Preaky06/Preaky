// Les quatre onglets + l'accueil de premier lancement.
import { h, frag, mount, dayKey, hashStr, fmtNum } from './util.js';
import { icon, LOGO } from './icons.js';
import { mascot } from './mascot.js';
import { brandBar, pageHead, gameBadge, weekStrip, weekMessage, openSheet, toggle, segmented } from './ui.js';
import * as store from './store.js';
import { GAMES } from './games/index.js';
import { DOMAINS, DOMAIN_ORDER, EXTRA_TECHNIQUES, SCIENCE } from './content.js';
import { pickSession, startSession, startFree, startDuo } from './player.js';
import { canVibrate } from './audio.js';
import * as install from './install.js';

// ---------- Aujourd'hui ----------
export function renderToday(view) {
  const d = store.db();
  const name = d.profile.name.trim();
  const done = store.doneToday();
  const week = weekStrip();
  mount(view, 
    brandBar(),
    h('header', { class: 'hello' },
      h('h1', { class: 'display hello-title', tabindex: '-1', 'data-focus': '' }, name ? `Salut ${name} !` : 'Salut !'),
      h('p', { class: 'lead' }, done
        ? 'Séance du jour terminée. Tu peux souffler, ou jouer librement.'
        : 'Ta séance du jour : 3 jeux, environ 5 minutes.')),
    sessionCard(pickSession(), done),
    h('section', { class: 'card week-card' },
      h('div', { class: 'row-between' },
        h('h2', { class: 'h3' }, 'Cette semaine'),
        h('span', { class: 'week-count' }, h('b', {}, String(week.active)), ' / 7 jours')),
      week.el,
      h('p', { class: 'muted small' }, weekMessage(week.active))),
    installCard(),
    duoCard(),
    techniqueCard());
}

function sessionCard(games, done) {
  return h('section', { class: 'card card-ink session-card' },
    h('div', { class: 'row-between' },
      h('p', { class: 'eyebrow' }, done ? 'Séance du jour · faite' : 'Séance du jour'),
      h('p', { class: 'eyebrow dim' }, '≈ 5 min')),
    h('ol', { class: 'session-list' }, games.map(g => h('li', { class: 'session-item' },
      gameBadge(g),
      h('span', { class: 'grow' }, h('span', { class: 'si-name' }, g.name), h('span', { class: 'si-dom' }, DOMAINS[g.domain].name)),
      done ? h('span', { class: 'si-check', 'aria-label': 'fait' }, icon('check')) : h('span', { class: 'si-level' }, `Niv. ${store.levelOf(g.id)}`)))),
    h('button', { class: `btn btn-block btn-lg ${done ? 'btn-outline-ink' : 'btn-light'}`, type: 'button', onClick: () => startSession() },
      done ? [icon('refresh'), 'Refaire une séance'] : [icon('play'), 'Commencer']));
}

function duoCard() {
  return h('section', { class: 'card duo-card' },
    h('div', { class: 'duo-top' },
      h('div', { class: 'duo-art', html: mascot('happy', { size: 54, color: 'var(--mag)' }) + mascot('wow', { size: 46, color: 'var(--yel)' }) }),
      h('div', { class: 'grow' },
        h('h2', { class: 'h3' }, 'À deux'),
        h('p', { class: 'muted' }, 'Le même défi pour deux joueurs, en se passant le téléphone. Petits-enfants contre grands-parents ?'))),
    h('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => startDuo() }, icon('duo'), 'Lancer un duel'));
}

function allTechniques() {
  return [...GAMES.map(g => g.tip), ...EXTRA_TECHNIQUES];
}

function techniqueCard() {
  const all = allTechniques();
  const t = all[hashStr(`tech${dayKey()}`) % all.length];
  return h('section', { class: 'card tip-card' },
    h('p', { class: 'eyebrow' }, icon('bulb'), 'Technique du jour'),
    h('h2', { class: 'h3' }, t.title),
    h('p', {}, t.text),
    h('p', { class: 'small muted' }, h('b', {}, 'Dans la vraie vie : '), t.life));
}

function installCard() {
  const d = store.db();
  if (!install.available() || d.flags.installDismissed || d.sessions < 1) return null;
  const card = h('section', { class: 'card install-card' },
    h('div', { class: 'row-between' },
      h('h2', { class: 'h3' }, 'Garde l’appli sous la main'),
      h('button', { class: 'icon-btn small', type: 'button', 'aria-label': 'Masquer', onClick: () => { d.flags.installDismissed = true; store.save(); card.remove(); } }, icon('close'))),
    h('p', { class: 'muted' }, install.hint()),
    install.canPrompt() && h('button', { class: 'btn btn-primary', type: 'button', onClick: async () => { if (await install.prompt()) card.remove(); } }, icon('install'), 'Installer'));
  return card;
}

// ---------- Jeux ----------
export function renderGames(view) {
  mount(view, 
    pageHead('Jeux', 'Joue librement. Chaque jeu s’adapte à ton niveau.'),
    DOMAIN_ORDER.map(dom => h('section', { class: `domain d-${dom}` },
      h('div', { class: 'domain-head' },
        h('h2', { class: 'h3' }, h('span', { class: 'dot' }), DOMAINS[dom].name),
        h('p', { class: 'muted small' }, DOMAINS[dom].blurb)),
      h('div', { class: 'game-list' }, GAMES.filter(g => g.domain === dom).map(gameCard)))));
}

function gameCard(g) {
  const plays = store.playsOf(g.id);
  return h('button', { class: `game-card d-${g.domain}`, type: 'button', onClick: () => startFree(g.id) },
    gameBadge(g, 'lg'),
    h('span', { class: 'gc-body' },
      h('span', { class: 'gc-name' }, g.name),
      h('span', { class: 'gc-tag' }, g.tagline),
      h('span', { class: 'gc-meta' }, `Niveau ${store.levelOf(g.id)} · ${plays ? `record ${store.recordOf(g.id)}` : 'jamais joué'}`)),
    h('span', { class: 'gc-go' }, icon('play')));
}

// ---------- Progrès ----------
function sparkline(values) {
  const W = 200;
  const H = 48;
  const P = 5;
  if (values.length < 2) return frag(`<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" style="stroke:var(--line)" stroke-width="2"/><circle cx="${W - P}" cy="${H / 2}" r="5" style="fill:var(--d-deep)"/></svg>`);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [P + (i * (W - 2 * P)) / (values.length - 1), H - P - ((v - min) / span) * (H - 2 * P)]);
  const line = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const end = pts[pts.length - 1];
  return frag(`<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <path d="M${pts[0][0]},${H - P} L${line.split(' ').join(' L')} L${end[0]},${H - P}Z" style="fill:var(--d-soft)"/>
    <polyline points="${line}" fill="none" style="stroke:var(--d-deep)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${end[0]}" cy="${end[1]}" r="5" style="fill:var(--d-deep)"/></svg>`);
}

function progCard(g) {
  const hist = store.historyOf(g.id, 14);
  if (!hist.length) {
    return h('article', { class: `prog-card d-${g.domain} empty` },
      gameBadge(g),
      h('div', { class: 'grow' }, h('h3', { class: 'pc-name' }, g.name), h('p', { class: 'muted small' }, 'Pas encore joué')),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onClick: () => startFree(g.id) }, 'Essayer'));
  }
  const last = hist[hist.length - 1].s;
  return h('article', { class: `prog-card d-${g.domain}` },
    gameBadge(g),
    h('div', { class: 'grow' },
      h('h3', { class: 'pc-name' }, g.name),
      h('p', { class: 'muted small' }, `Niveau ${store.levelOf(g.id)} · joué ${store.playsOf(g.id)} fois`)),
    h('div', { class: 'pc-nums' },
      h('span', {}, h('b', {}, String(store.recordOf(g.id))), ' record'),
      h('span', {}, h('b', {}, String(last)), ' dernier')),
    hist.length > 1
      ? sparkline(hist.map(e => e.s))
      : h('p', { class: 'spark-empty small muted' }, 'Rejoue une fois pour voir ta courbe apparaître.'),
    h('p', { class: 'pc-unit small muted' }, `Score : ${g.unit(2)}${hist.length > 1 ? ` · tes ${hist.length} dernières parties` : ''}.`));
}

function toolbox() {
  const d = store.db();
  const items = [
    ...GAMES.map(g => ({ ...g.tip, unlocked: store.playsOf(g.id) > 0, how: `Joue à ${g.name} pour la débloquer.` })),
    ...EXTRA_TECHNIQUES.map(t => ({ ...t, unlocked: d.sessions >= t.unlock, how: `Débloquée après ${t.unlock} séance${t.unlock > 1 ? 's' : ''} du jour.` })),
  ];
  const n = items.filter(i => i.unlocked).length;
  return h('section', { class: 'stack' },
    h('div', { class: 'row-between' }, h('h2', { class: 'h3' }, 'Ta boîte à techniques'), h('span', { class: 'muted small' }, `${n} sur ${items.length}`)),
    h('div', { class: 'tool-list' }, items.map(t => (t.unlocked
      ? h('details', { class: 'tool' },
        h('summary', {}, icon('bulb'), h('span', { class: 'grow' }, t.title), icon('chev', 'ic chev')),
        h('p', {}, t.text),
        h('p', { class: 'small muted' }, h('b', {}, 'Dans la vraie vie : '), t.life))
      : h('div', { class: 'tool locked' }, icon('lock'), h('span', { class: 'grow' }, h('span', { class: 'tool-title' }, t.title), h('span', { class: 'small muted' }, t.how)))))));
}

function scienceCard() {
  return h('section', { class: 'card science' },
    h('p', { class: 'eyebrow' }, icon('science'), 'Ce que dit la science'),
    h('h2', { class: 'h3' }, 'On ne te promet pas de miracle.'),
    h('ul', { class: 'science-list' }, SCIENCE.map(s => h('li', {}, h('b', {}, s.t), ' ', s.d))));
}

export function renderProgress(view) {
  const d = store.db();
  if (!d.history.length) {
    mount(view, 
      pageHead('Progrès', 'Tu te compares à toi-même, jamais aux autres.'),
      h('section', { class: 'card empty-card' },
        frag(mascot('idle', { size: 96 })),
        h('h2', { class: 'h3' }, 'Rien à afficher pour l’instant'),
        h('p', { class: 'muted' }, 'Ta première séance crée ta référence. Ensuite, tu verras tes courbes ici.'),
        h('button', { class: 'btn btn-primary', type: 'button', onClick: () => startSession() }, icon('play'), 'Faire ma première séance')),
      toolbox(),
      scienceCard());
    return;
  }
  const activeDays = Object.keys(d.days).length;
  const week = weekStrip();
  const stat = (v, label) => h('div', { class: 'stat' }, h('b', {}, String(v)), h('span', {}, label));
  mount(view, 
    pageHead('Progrès', 'Tu te compares à toi-même, jamais aux autres.'),
    h('div', { class: 'stats-row' },
      stat(d.sessions, d.sessions > 1 ? 'séances' : 'séance'),
      stat(activeDays, activeDays > 1 ? 'jours actifs' : 'jour actif'),
      stat(`${week.active}/7`, 'cette semaine')),
    h('section', { class: 'card' },
      h('h2', { class: 'h3' }, 'Niveau par domaine'),
      h('div', { class: 'dbars' }, DOMAIN_ORDER.map(dom => {
        const gs = GAMES.filter(g => g.domain === dom);
        const avg = gs.reduce((a, g) => a + store.levelOf(g.id), 0) / gs.length;
        return h('div', { class: `dbar d-${dom}` },
          h('span', { class: 'dbar-name' }, DOMAINS[dom].name),
          h('span', { class: 'dbar-track' }, h('i', { style: `width:${Math.max(4, (avg / 20) * 100)}%` })),
          h('span', { class: 'dbar-val' }, `Niv. ${fmtNum(avg)}`));
      })),
      h('p', { class: 'muted small' }, 'Les niveaux vont de 1 à 20. Ils montent quand tu réussis, et redescendent un peu si c’est trop dur : c’est normal et voulu.')),
    h('section', { class: 'stack' }, h('h2', { class: 'h3' }, 'Par jeu'), h('div', { class: 'prog-list' }, GAMES.map(progCard))),
    toolbox(),
    scienceCard());
}

// ---------- Réglages ----------
export function renderSettings(view, app) {
  const d = store.db();
  const s = d.settings;
  const nameInput = h('input', { id: 'set-name', class: 'input', type: 'text', value: d.profile.name, maxlength: '24', autocomplete: 'given-name', placeholder: 'Ton prénom' });
  nameInput.addEventListener('input', () => { d.profile.name = nameInput.value.slice(0, 24); store.save(); });
  const row = (label, control, desc, forId) => h('div', { class: 'setting' },
    h('div', { class: 'grow' }, h('label', { class: 'setting-label', for: forId }, label), desc && h('p', { class: 'muted small' }, desc)),
    control);
  const group = (title, ...rows) => h('section', { class: 'group' }, h('h2', { class: 'label' }, title), h('div', { class: 'group-body' }, rows));

  mount(view, 
    pageHead('Réglages'),
    group('Toi', h('div', { class: 'setting stack-setting' }, h('label', { class: 'setting-label', for: 'set-name' }, 'Prénom'), nameInput)),
    group('Confort de jeu',
      h('div', { class: 'setting stack-setting' },
        h('span', { class: 'setting-label', id: 'set-text-l' }, 'Taille du texte'),
        segmented('set-text', [['m', h('span', {}, 'Aa'), 'Normale'], ['l', h('span', {}, 'Aa'), 'Grande'], ['xl', h('span', {}, 'Aa'), 'Très grande']], s.text, v => { s.text = v; store.save(); app.applySettings(); }, 'Taille du texte', 'seg-size')),
      row('Mode zen', toggle('set-zen', s.zen, v => { s.zen = v; store.save(); }), 'Pas de chrono et plus de temps pour mémoriser. Les jeux s’adaptent à ta précision, pas à ta vitesse.', 'set-zen'),
      row('Sons', toggle('set-sound', s.sound, v => { s.sound = v; store.save(); app.applySettings(); }), null, 'set-sound'),
      canVibrate() && row('Vibrations', toggle('set-haptics', s.haptics, v => { s.haptics = v; store.save(); app.applySettings(); }), null, 'set-haptics')),
    install.available() && group('Écran d’accueil',
      h('div', { class: 'setting stack-setting' },
        h('p', {}, install.hint()),
        install.canPrompt() && h('button', { class: 'btn btn-primary', type: 'button', onClick: () => install.prompt() }, icon('install'), 'Installer Preaky Mind'))),
    group('Tes données',
      h('div', { class: 'setting stack-setting' },
        h('p', {}, 'Tout reste sur cet appareil : pas de compte, pas de pub, pas de suivi.'),
        !store.isPersistent() && h('p', { class: 'warn small' }, 'Ce navigateur bloque la sauvegarde : ta progression sera perdue à la fermeture.'),
        h('button', { class: 'btn btn-danger-ghost', type: 'button', onClick: () => confirmReset(app) }, icon('trash'), 'Effacer mes données'))),
    h('footer', { class: 'about' }, frag(LOGO), h('p', { class: 'muted small' }, 'Preaky Mind · version 1.0 · une création Preaky')));
}

function confirmReset(app) {
  openSheet(document.body, {
    title: 'Tout effacer ?',
    text: 'Niveaux, records et historique seront supprimés de cet appareil. Impossible d’annuler.',
    actions: [
      { label: 'Effacer mes données', danger: true, onClick: () => { store.reset(); app.restart(); } },
      { label: 'Annuler' },
    ],
  });
}

// ---------- Premier lancement ----------
export function renderOnboarding(root, app) {
  let style = '';
  const nameInput = h('input', { id: 'onb-name', class: 'input', type: 'text', maxlength: '24', autocomplete: 'given-name', placeholder: 'Par exemple : Lucie' });

  const welcome = () => h('section', { class: 'onb' },
    h('div', { class: 'onb-art' },
      h('div', { class: 'onb-inks', html: '<span class="ink c"></span><span class="ink m"></span><span class="ink y"></span>' }),
      frag(mascot('happy', { size: 150, cls: 'bob' }))),
    h('div', { class: 'onb-text' },
      h('p', { class: 'eyebrow' }, 'Bienvenue sur'),
      h('h1', { class: 'display onb-title', tabindex: '-1', 'data-focus': '' }, 'Preaky Mind'),
      h('p', { class: 'lead' }, 'Cinq minutes par jour pour garder l’esprit vif, quel que soit ton âge.')),
    h('ul', { class: 'onb-points' },
      h('li', {}, h('span', { class: 'pt-ic d-concentration' }, icon('games')), h('span', {}, 'Des mini-jeux courts qui s’adaptent à ton niveau.')),
      h('li', {}, h('span', { class: 'pt-ic d-logique' }, icon('bulb')), h('span', {}, 'Une technique utile dans la vraie vie avec chaque jeu.')),
      h('li', {}, h('span', { class: 'pt-ic d-memoire' }, icon('duo')), h('span', {}, 'Un mode à deux pour jouer en famille.'))),
    h('div', { class: 'onb-cta' },
      h('button', { class: 'btn btn-primary btn-block btn-lg', type: 'button', onClick: () => draw(stepStyle) }, 'Commencer'),
      h('p', { class: 'muted small center' }, 'Sans compte, sans pub. Tes données restent sur ton téléphone.')));

  const stepStyle = () => {
    const go = h('button', { class: 'btn btn-primary btn-block btn-lg', type: 'button', disabled: !style, onClick: finish }, 'C’est parti');
    const choice = (id, ic, title, text, dom) => {
      const b = h('button', { class: 'choice', type: 'button', role: 'radio', 'aria-checked': String(style === id) },
        h('span', { class: `choice-ic d-${dom}` }, icon(ic)),
        h('span', { class: 'grow' }, h('span', { class: 'choice-title' }, title), h('span', { class: 'choice-text' }, text)));
      b.addEventListener('click', () => {
        style = id;
        b.parentElement.querySelectorAll('.choice').forEach(x => x.setAttribute('aria-checked', String(x === b)));
        go.disabled = false;
        // Aperçu immédiat : le mode Tranquille agrandit le texte tout de suite.
        document.documentElement.dataset.text = id === 'tranquille' ? 'l' : 'm';
      });
      return b;
    };
    return h('section', { class: 'onb' },
      h('div', { class: 'pbar' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', onClick: () => draw(welcome) }, icon('back'))),
      h('div', { class: 'onb-text' },
        h('h1', { class: 'display onb-q', tabindex: '-1', 'data-focus': '' }, 'Comment veux-tu jouer ?'),
        h('p', { class: 'muted' }, 'Tu pourras changer d’avis à tout moment dans les réglages.')),
      h('div', { class: 'choice-list', role: 'radiogroup', 'aria-label': 'Style de jeu' },
        choice('dynamique', 'bolt', 'Dynamique', 'Avec chrono. Ça va vite, ça pique un peu.', 'memoire'),
        choice('tranquille', 'leaf', 'Tranquille', 'Sans chrono, texte plus grand. Tu prends ton temps.', 'concentration')),
      h('div', { class: 'field' }, h('label', { class: 'label', for: 'onb-name' }, 'Ton prénom (facultatif)'), nameInput),
      h('div', { class: 'onb-cta' }, go));
  };

  function finish() {
    const d = store.db();
    d.profile.style = style;
    d.profile.name = nameInput.value.trim().slice(0, 24);
    d.profile.onboarded = true;
    d.settings.zen = style === 'tranquille';
    d.settings.text = style === 'tranquille' ? 'l' : 'm';
    store.save();
    app.applySettings();
    app.start();
  }

  function draw(step) {
    const node = step();
    root.replaceChildren(node);
    node.classList.add('enter');
    window.scrollTo(0, 0);
    node.querySelector('[data-focus]')?.focus({ preventScroll: true });
  }
  draw(welcome);
}
