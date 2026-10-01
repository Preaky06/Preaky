/* CinéMood — comptes, quota, abonnement et avantages.

   ⚠ LIRE AVANT MISE EN PRODUCTION
   Ce module est une couche de DÉMONSTRATION : tout vit dans le navigateur.
   Il est durci contre la manipulation accidentelle (mots de passe dérivés en PBKDF2,
   enregistrements scellés, horloge surveillée, tentatives limitées), mais AUCUN code
   exécuté dans le navigateur ne peut être rendu inviolable : un utilisateur déterminé
   peut toujours réécrire son stockage local ou son propre code.

   Le seul modèle sûr est : le serveur détient la vérité (compte, abonnement, quota),
   le navigateur ne fait qu'afficher. Voir BACKEND.md.
   Pour brancher un vrai service, appeler MoodflixAccount.useBackend({...}) — voir
   la fin du fichier. Aucun autre morceau de l'application n'a besoin de changer. */
window.MoodflixAccount = (function () {
  'use strict';

  var K = {
    users:   'cinemood.users.v2',
    session: 'cinemood.session.v2',
    usage:   'cinemood.usage.v2',
    data:    'cinemood.data.v2',
    guard:   'cinemood.guard.v2'
  };

  var FREE_LIMIT = 3;          /* parcours par mois calendaire */
  var FREE_RELAUNCH = 1;       /* relances « encore d'autres » par parcours */
  var FREE_RESULTS = 5;
  var PRO_RESULTS = 8;
  var PRICE = '5,99 €';
  var PRICE_PERIOD = 'par mois';
  var SESSION_DAYS = 30;
  var MAX_ATTEMPTS = 5;
  var LOCK_MINUTES = 15;

  /* ---------------------------------------------------------------- socle */

  var listeners = [];
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }
  function onChange(fn) { listeners.push(fn); }

  /* clé de scellement propre à l'appareil : elle rend l'édition manuelle du
     stockage détectable. Elle n'est PAS un secret — le code qui la lit est public. */
  function deviceKey() {
    var g = raw(K.guard) || {};
    if (!g.key) {
      var b = new Uint8Array(16);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach(function (_, i) { b[i] = (Math.random() * 256) | 0; });
      g.key = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      rawWrite(K.guard, g);
    }
    return g.key;
  }
  function seal(json) {
    var s = deviceKey() + '|' + json, h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function raw(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function rawWrite(k, v) {
    if (window.CINEMOOD_NO_ACCOUNTS === true) return;   /* rien n'est stocké chez le visiteur */
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  var tampered = false;
  var badKeys = {};
  function read(k, d) {
    var box = raw(k);
    if (!box || typeof box !== 'object' || typeof box.v !== 'string') return d;
    if (box.s !== seal(box.v)) { tampered = true; badKeys[k] = true; return d; }
    try { return JSON.parse(box.v); } catch (e) { return d; }
  }
  /* seule une altération du fichier des comptes retire l'abonnement :
     un reste de données hérité d'une ancienne version ne doit pas punir l'utilisateur */
  function accountsTampered() { return !!badKeys[K.users]; }
  function write(k, v) {
    var json = JSON.stringify(v);
    rawWrite(k, {v: json, s: seal(json)});
  }
  function isTampered() { return tampered; }

  /* ------------------------------------------------------- temps et quota */

  /* index de mois monotone : reculer l'horloge de l'appareil ne redonne pas de quota */
  function monthIndex(d) { d = d || new Date(); return d.getFullYear() * 12 + d.getMonth(); }
  function currentMonth() {
    var g = raw(K.guard) || {}, now = monthIndex();
    if (typeof g.month === 'number' && now < g.month) return g.month;  /* horloge reculée : on garde */
    if (g.month !== now) { g.month = now; rawWrite(K.guard, g); }
    return now;
  }
  function monthLabel() { return new Date().toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'}); }
  function nextMonthLabel() {
    var d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1);
    return d.toLocaleDateString('fr-FR', {day: 'numeric', month: 'long'});
  }
  function inAMonth() {
    var d = new Date(); d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'});
  }

  /* --------------------------------------------------- mots de passe (PBKDF2) */

  var subtle = (window.crypto && window.crypto.subtle) || null;
  var ITER = 210000;

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function randomSalt() {
    var b = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (var i = 0; i < 16; i++) b[i] = (Math.random() * 256) | 0;
    return hex(b);
  }
  function fallbackHash(pw, salt) {
    /* uniquement si WebCrypto est indisponible (http:// non sécurisé, très vieux navigateur) */
    var s = salt + '|' + pw, h1 = 2166136261, h2 = 5381;
    for (var r = 0; r < 5000; r++) {
      for (var i = 0; i < s.length; i++) {
        h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 16777619);
        h2 = ((h2 << 5) + h2 + s.charCodeAt(i)) | 0;
      }
      s = (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + salt;
    }
    return Promise.resolve('fb1$' + s);
  }
  function derive(pw, salt) {
    if (!subtle) return fallbackHash(pw, salt);
    var enc = new TextEncoder();
    return subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return subtle.deriveBits({name: 'PBKDF2', salt: enc.encode(salt), iterations: ITER, hash: 'SHA-256'}, key, 256);
      })
      .then(function (bits) { return 'pbkdf2$' + ITER + '$' + hex(bits); })
      .catch(function () { return fallbackHash(pw, salt); });
  }
  /* comparaison à temps constant : ne fuit pas la position du premier octet faux */
  function equalConst(a, b) {
    a = String(a); b = String(b);
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  /* code de secours lisible : 4 groupes de 4 caractères, sans lettres ambiguës */
  function recoveryCode() {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = [];
    var b = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (var j = 0; j < 16; j++) b[j] = (Math.random() * 256) | 0;
    for (var i = 0; i < 16; i++) {
      out.push(abc[b[i] % abc.length]);
      if (i % 4 === 3 && i < 15) out.push('-');
    }
    return out.join('');
  }
  function cleanCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    .replace(/(.{4})(?=.)/g, '$1-'); }

  /* Réinitialisation hors serveur : l'utilisateur fournit son code de secours.
     Ses données, son historique et son abonnement sont conservés. */
  function resetWithCode(email, code, newPassword) {
    if (SRV) return resetPassword(pendingReset, newPassword);
    email = normalize(email);
    var issue = passwordIssue(newPassword);
    if (issue) return Promise.resolve({error: issue});
    var users = read(K.users, {}), u = users[email];
    if (!u) return Promise.resolve({error: 'Aucun compte avec cette adresse sur cet appareil.'});
    if (!u.recovery) return Promise.resolve({error: 'Ce compte n\u2019a pas de code de secours. Contacte-nous.'});
    var lock = attemptsFor('rec:' + email);
    if (lock.until && Date.now() < lock.until) {
      return Promise.resolve({error: 'Trop d\u2019essais. Réessaie dans quelques minutes.'});
    }
    return derive(cleanCode(code), u.salt).then(function (ch) {
      if (!equalConst(ch, u.recovery)) {
        noteAttempt('rec:' + email, false);
        return {error: 'Ce code de secours ne correspond pas.'};
      }
      noteAttempt('rec:' + email, true);
      return derive(newPassword, u.salt).then(function (h) {
        var all = read(K.users, {});
        all[email].hash = h;               /* plan, abonnement et données intacts */
        write(K.users, all);
        openSession(email);
        emit();
        return {ok: true};
      });
    });
  }
  /* nouveau code, à la demande, depuis « Mon compte » */
  function newRecoveryCode() {
    var u = current();
    if (!u || SRV) return Promise.resolve({error: 'indisponible'});
    var users = read(K.users, {}), rec = users[u.email];
    if (!rec) return Promise.resolve({error: 'introuvable'});
    var code = recoveryCode();
    return derive(code, rec.salt).then(function (ch) {
      var all = read(K.users, {});
      all[u.email].recovery = ch;
      write(K.users, all);
      return {ok: true, recoveryCode: code};
    });
  }

  function normalize(email) { return (email || '').trim().toLowerCase(); }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalize(e)); }
  function passwordIssue(pw) {
    pw = pw || '';
    if (pw.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.';
    if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Ajoute au moins une lettre et un chiffre.';
    if (/^(?:123456|password|azerty|qwerty|motdepasse)/i.test(pw)) return 'Ce mot de passe est trop courant.';
    return null;
  }

  /* ------------------------------------------------------------- session */

  function current() {
    if (SRV) {
      if (!SRV.user) return null;
      return {email: SRV.user.email, plan: SRV.user.plan, since: null,
        renewsAt: SRV.user.renewsAt ? new Date(SRV.user.renewsAt).toLocaleDateString('fr-FR',
          {day: 'numeric', month: 'long', year: 'numeric'}) : null,
        emailVerified: !!SRV.user.emailVerified, createdAt: null};
    }
    var s = read(K.session, null);
    if (!s || !s.email) return null;
    if (s.expires && Date.now() > s.expires) { write(K.session, null); return null; }
    var u = read(K.users, {})[s.email];
    if (!u) return null;
    var pro = u.plan === 'pro' && !accountsTampered() && (!u.renewsTs || Date.now() < u.renewsTs);
    if (u.plan === 'pro' && !pro) { u.plan = 'free'; var all = read(K.users, {}); all[s.email] = u; write(K.users, all); }
    return {email: s.email, plan: pro ? 'pro' : 'free', since: u.since || null,
      renewsAt: u.renewsAt || null, createdAt: u.created || null};
  }
  function isPro() {
    /* si le fichier des comptes a été édité à la main, on refuse l'abonnement
       plutôt que de faire confiance à une valeur qu'on ne peut plus vérifier */
    read(K.users, {});
    if (!SRV && accountsTampered()) return false;
    var u = current();
    return !!u && u.plan === 'pro';
  }
  function openSession(email) {
    write(K.session, {email: email, opened: Date.now(), expires: Date.now() + SESSION_DAYS * 864e5});
  }

  /* verrouillage après échecs répétés */
  function attemptsFor(email) {
    var g = raw(K.guard) || {}, a = (g.att || {})[email];
    if (!a) return {n: 0, until: 0};
    return a;
  }
  function noteAttempt(email, ok) {
    var g = raw(K.guard) || {};
    g.att = g.att || {};
    if (ok) { delete g.att[email]; }
    else {
      var a = g.att[email] || {n: 0, until: 0};
      a.n += 1;
      if (a.n >= MAX_ATTEMPTS) { a.until = Date.now() + LOCK_MINUTES * 60000; a.n = 0; }
      g.att[email] = a;
    }
    rawWrite(K.guard, g);
  }

  /* BACKEND — création de compte */
  function signup(email, password) {
    if (SRV) {
      var issue = passwordIssue(password);
      if (issue) return Promise.resolve({error: issue});
      if (!validEmail(email)) return Promise.resolve({error: 'Cette adresse e-mail n\u2019est pas valide.'});
      return apiCall('/signup', {method: 'POST', body: JSON.stringify(
        {email: normalize(email), password: password, turnstile: tsToken})})
        .then(function (d) {
          if (!d.ok) { resetTurnstile(); return {error: d.error || 'Création impossible.'}; }
          SRV.user = d.user; refreshMirror(); emit();
          return {ok: true};
        });
    }
    if (BACKEND.signup) return BACKEND.signup(email, password).then(afterAuth);
    email = normalize(email);
    if (!validEmail(email)) return Promise.resolve({error: 'Cette adresse e-mail n\u2019est pas valide.'});
    var issue = passwordIssue(password);
    if (issue) return Promise.resolve({error: issue});
    var users = read(K.users, {});
    if (users[email]) return Promise.resolve({error: 'Un compte existe déjà avec cette adresse. Connecte-toi.'});
    var salt = randomSalt();
    return derive(password, salt).then(function (h) {
      users = read(K.users, {});
      var code = recoveryCode();
      return derive(code, salt).then(function (ch) {
        users = read(K.users, {});
        users[email] = {salt: salt, hash: h, recovery: ch, plan: 'free', created: Date.now()};
        write(K.users, users);
        openSession(email);
        adoptGuestUsage(email);
        emit();
        /* le code n'est montré qu'une fois : c'est la seule façon de reprendre
           la main sur son compte sans serveur d'e-mails */
        return {ok: true, recoveryCode: code};
      });
    });
  }

  /* BACKEND — connexion */
  function login(email, password) {
    if (SRV) {
      return apiCall('/login', {method: 'POST', body: JSON.stringify({email: normalize(email), password: password})})
        .then(function (d) {
          if (!d.ok) return {error: d.error || 'Connexion impossible.'};
          SRV.user = d.user; refreshMirror(); emit();
          return {ok: true};
        });
    }
    if (BACKEND.login) return BACKEND.login(email, password).then(afterAuth);
    email = normalize(email);
    var lock = attemptsFor(email);
    if (lock.until && Date.now() < lock.until) {
      var min = Math.ceil((lock.until - Date.now()) / 60000);
      return Promise.resolve({error: 'Trop de tentatives. Réessaie dans ' + min + ' minute' + (min > 1 ? 's' : '') + '.'});
    }
    var u = read(K.users, {})[email];
    if (!u) {
      /* on ne révèle pas si l'adresse existe */
      noteAttempt(email, false);
      return derive(password || '', 'leurre').then(function () {
        return {error: 'Adresse ou mot de passe incorrect.'};
      });
    }
    return derive(password || '', u.salt).then(function (h) {
      if (!equalConst(h, u.hash)) {
        noteAttempt(email, false);
        return {error: 'Adresse ou mot de passe incorrect.'};
      }
      noteAttempt(email, true);
      openSession(email);
      adoptGuestUsage(email);
      emit();
      return {ok: true};
    });
  }
  function afterAuth(r) { if (r && r.ok) emit(); return r; }
  function logout() {
    if (SRV) {
      return apiCall('/logout', {method: 'POST'}).then(function () {
        SRV.user = null; MIRROR = {saved: [], seen: [], history: []}; emit();
      });
    }
    write(K.session, null); emit();
    return Promise.resolve({ok: true});
  }

  /* mot de passe oublié — serveur uniquement, par nature */
  function forgotPassword(email) {
    if (!SRV) return Promise.resolve({error: 'L\u2019envoi d\u2019e-mails n\u2019est pas encore activé sur ce site. Utilise ton code de secours en attendant.'});
    return apiCall('/password/forgot', {method: 'POST', body: JSON.stringify({email: normalize(email)})});
  }
  function resetPassword(token, password) {
    if (!SRV) return Promise.resolve({error: 'Cette fonction nécessite le serveur.'});
    var issue = passwordIssue(password);
    if (issue) return Promise.resolve({error: issue});
    return apiCall('/password/reset', {method: 'POST', body: JSON.stringify({token: token, password: password})})
      .then(function (d) { if (d.ok) { pendingReset = null; pull(); } return d; });
  }
  function resendVerification() {
    if (!SRV) return Promise.resolve({error: 'serveur'});
    return apiCall('/email/resend', {method: 'POST'});
  }
  function exportUrl() { return SRV ? '/api/export' : null; }

  /* --------------------------------------------------------------- quota */

  function usageKey() { var u = current(); return u ? u.email : 'guest'; }
  function usageFor(key) {
    var all = read(K.usage, {}), e = all[key];
    if (!e || e.month !== currentMonth()) return {month: currentMonth(), used: 0};
    return e;
  }
  function adoptGuestUsage(email) {
    var all = read(K.usage, {}), g = all.guest;
    if (g && g.month === currentMonth() && g.used > 0) {
      var mine = all[email];
      all[email] = {month: currentMonth(), used: (mine && mine.month === currentMonth() ? mine.used : 0) + g.used};
      all.guest = {month: currentMonth(), used: 0};
      write(K.usage, all);
    }
  }
  function quota() {
    if (freeMode()) return {unlimited: true, used: 0, limit: Infinity, left: Infinity,
      monthLabel: monthLabel(), renewsAt: null};
    if (SRV) {
      if (!SRV.user) {
        return {unlimited: false, used: 0, limit: FREE_LIMIT, left: FREE_LIMIT,
          monthLabel: monthLabel(), resetsOn: nextMonthLabel(), anonymous: true};
      }
      var q = SRV.user.quota || {};
      if (q.unlimited) return {unlimited: true, used: q.used || 0, limit: Infinity, left: Infinity,
        monthLabel: monthLabel(), renewsAt: current().renewsAt};
      return {unlimited: false, used: q.used || 0, limit: q.limit || FREE_LIMIT,
        left: typeof q.left === 'number' ? q.left : FREE_LIMIT,
        monthLabel: monthLabel(), resetsOn: nextMonthLabel()};
    }
    var u = current();
    if (u && u.plan === 'pro') {
      return {unlimited: true, used: usageFor(u.email).used, limit: Infinity, left: Infinity,
        monthLabel: monthLabel(), renewsAt: u.renewsAt};
    }
    var used = usageFor(usageKey()).used;
    return {unlimited: false, used: used, limit: FREE_LIMIT, left: Math.max(0, FREE_LIMIT - used),
      monthLabel: monthLabel(), resetsOn: nextMonthLabel()};
  }
  function canRun() { var q = quota(); return q.unlimited || q.left > 0; }

  /* Point d'entrée unique d'un parcours. En mode serveur, c'est le serveur qui
     décrémente et qui refuse : impossible à contourner depuis le navigateur. */
  function beginRun() {
    if (freeMode()) return Promise.resolve({ok: true});
    if (!SRV) {
      if (!canRun()) return Promise.resolve({error: 'quota'});
      consume();
      return Promise.resolve({ok: true});
    }
    if (!SRV.user) return Promise.resolve({error: 'auth'});
    return apiCall('/run', {method: 'POST'}).then(function (d) {
      if (d.status === 402) { pull(); return {error: 'quota'}; }
      if (d.status === 401) { pull(); return {error: 'auth'}; }
      if (d.status === 429) return {error: 'rate', message: d.message};
      if (!d.ok) return {error: 'server', message: d.message || d.error};
      SRV.user.quota = d.quota;
      /* le jeton prouve au proxy que ce parcours a bien été décompté */
      if (d.runToken && window.MoodflixTMDB && window.MoodflixTMDB.setRunToken) {
        window.MoodflixTMDB.setRunToken(d.runToken);
      }
      emit();
      return {ok: true};
    }).catch(function () { return {error: 'server', message: 'Le serveur n\u2019a pas répondu.'}; });
  }
  function consume() {
    var q = quota();
    if (!q.unlimited && q.left <= 0) return false;
    var all = read(K.usage, {}), key = usageKey(), e = usageFor(key);
    all[key] = {month: currentMonth(), used: e.used + 1};
    write(K.usage, all);
    emit();
    return true;
  }

  /* ---------------------------------------------------------- avantages */

  var FEATURES = {
    unlimited: {label: 'Parcours illimité', pro: true},
    relaunch:  {label: 'Relances illimitées', pro: true},
    duo:       {label: 'Mode Duo', pro: true},
    list:      {label: 'Ma liste et films vus', pro: true},
    history:   {label: 'Historique des séances', pro: true},
    depth:     {label: 'Sélection élargie', pro: true}
  };
  function can(f) {
    /* sans comptes, rien n'est conservé : ni liste, ni films vus, ni historique */
    if (noAccounts() && (f === 'list' || f === 'history')) return false;
    if (freeMode()) return !!FEATURES[f];
    var d = FEATURES[f];
    return d ? (d.pro ? isPro() : true) : false;
  }
  function resultCount() { return (freeMode() || isPro()) ? PRO_RESULTS : FREE_RESULTS; }
  function relaunchLimit() { return (freeMode() || isPro()) ? Infinity : FREE_RELAUNCH; }

  /* ------------------------------------------ données personnelles (Pro) */

  function dataKey() {
    if (noAccounts()) return null;   /* aucune donnée gardée */
    var u = current();
    return u ? u.email : null;
  }
  function bucket() {
    var k = dataKey();
    if (!k) return null;
    var all = read(K.data, {});
    return all[k] || {saved: [], seen: [], history: []};
  }
  function putBucket(b) {
    var k = dataKey();
    if (!k) return;
    var all = read(K.data, {});
    all[k] = b;
    write(K.data, all);
    emit();
  }
  function saved() { if (SRV) return MIRROR.saved; var b = bucket(); return b ? b.saved : []; }
  function isSaved(id) { return saved().some(function (f) { return f.id === id; }); }
  function toggleSave(film) {
    if (!can('list')) return {error: 'pro'};
    if (SRV) return srvToggle('/list', 'saved', film);
    var b = bucket();
    if (!b) return {error: 'auth'};
    var i = b.saved.findIndex(function (f) { return f.id === film.id; });
    if (i > -1) b.saved.splice(i, 1);
    else b.saved.unshift({id: film.id, title: film.title, poster: film.poster_path || null,
      year: (film.release_date || '').slice(0, 4), at: Date.now()});
    putBucket(b);
    return {ok: true, saved: i === -1};
  }
  function seenIds() {
    if (SRV) return MIRROR.seen.map(function (f) { return f.id; });
    var b = bucket(); return b ? b.seen.map(function (f) { return f.id; }) : [];
  }
  function seenList() { if (SRV) return MIRROR.seen; var b = bucket(); return b ? b.seen : []; }
  function isSeen(id) { return seenIds().indexOf(id) > -1; }
  function toggleSeen(film) {
    if (!can('list')) return {error: 'pro'};
    if (SRV) return srvToggle('/seen', 'seen', film);
    var b = bucket();
    if (!b) return {error: 'auth'};
    var i = b.seen.findIndex(function (f) { return f.id === film.id; });
    if (i > -1) b.seen.splice(i, 1);
    else b.seen.unshift({id: film.id, title: film.title, poster: film.poster_path || film.poster || null, at: Date.now()});
    putBucket(b);
    return {ok: true, seen: i === -1};
  }
  /* bascule optimiste : l'interface répond tout de suite, le serveur confirme */
  function srvToggle(path, key, film) {
    var list = MIRROR[key];
    var i = list.findIndex(function (x) { return x.id === film.id; });
    var adding = i < 0;
    if (adding) list.unshift({id: film.id, title: film.title, poster: film.poster_path || film.poster || null,
      year: (film.release_date || '').slice(0, 4), at: Date.now()});
    else list.splice(i, 1);
    emit();
    apiCall(path, {method: 'POST', body: JSON.stringify({id: film.id, title: film.title,
      poster: film.poster_path || film.poster || null,
      year: (film.release_date || '').slice(0, 4), remove: !adding})})
      .then(function (d) { if (!d.ok) refreshMirror(); })
      .catch(function () { refreshMirror(); });
    return {ok: true, saved: adding, seen: adding};
  }

  function pushHistory(entry) {
    if (!can('history')) return;
    if (SRV) {
      MIRROR.history.unshift({at: Date.now(), summary: entry.summary, duo: !!entry.duo,
        count: entry.count || 0, top: entry.top || null});
      MIRROR.history = MIRROR.history.slice(0, 40);
      emit();
      apiCall('/history', {method: 'POST', body: JSON.stringify(entry)}).catch(function () {});
      return;
    }
    var b = bucket();
    if (!b) return;
    b.history.unshift({at: Date.now(), summary: entry.summary, chips: entry.chips || [],
      top: entry.top || null, count: entry.count || 0, duo: !!entry.duo});
    b.history = b.history.slice(0, 40);
    putBucket(b);
  }
  function history() { if (SRV) return MIRROR.history; var b = bucket(); return b ? b.history : []; }
  function forget() {
    var u = current();
    if (!u) return;
    var all = read(K.data, {});
    delete all[u.email];
    write(K.data, all);
    emit();
  }

  /* ---------------------------------------------------------- abonnement */

  /* BACKEND — ici part la session de paiement (Stripe Checkout, redirection) */
  function subscribe(termsAccepted) {
    var u = current();
    if (!u) return Promise.resolve({error: 'auth', message: 'Crée un compte pour t\u2019abonner : c\u2019est lui qui porte l\u2019abonnement.'});
    if (SRV) {
      return apiCall('/checkout', {method: 'POST', body: JSON.stringify({termsAccepted: termsAccepted !== false})})
        .then(function (d) {
          if (d.ok && d.url) { location.href = d.url; return {redirect: true}; }
          if (d.error === 'config') return {error: 'config', message: 'Le paiement n\u2019est pas encore configuré sur ce site.'};
          return {error: d.error || 'server', message: d.message || 'Le paiement n\u2019a pas pu démarrer.'};
        });
    }
    if (BACKEND.checkout) return BACKEND.checkout(u.email).then(afterAuth);
    var users = read(K.users, {});
    var d = new Date(); d.setMonth(d.getMonth() + 1);
    users[u.email].plan = 'pro';
    users[u.email].since = Date.now();
    users[u.email].renewsAt = inAMonth();
    users[u.email].renewsTs = d.getTime();
    write(K.users, users);
    emit();
    return Promise.resolve({ok: true});
  }
  /* BACKEND — résiliation côté facturation */
  function cancel() {
    var u = current();
    if (!u) return Promise.resolve({error: 'auth'});
    if (SRV) {
      return apiCall('/billing-portal', {method: 'POST'}).then(function (d) {
        if (d.ok && d.url) { location.href = d.url; return {redirect: true}; }
        return {error: d.error || 'server', message: d.message || 'Impossible d\u2019ouvrir la gestion de l\u2019abonnement.'};
      });
    }
    if (BACKEND.cancel) return BACKEND.cancel(u.email).then(afterAuth);
    var users = read(K.users, {});
    users[u.email].plan = 'free';
    users[u.email].renewsAt = null;
    users[u.email].renewsTs = null;
    write(K.users, users);
    emit();
    return Promise.resolve({ok: true});
  }
  function deleteAccount() {
    var u = current();
    if (!u) return Promise.resolve({error: 'auth'});
    if (SRV) {
      return apiCall('/account', {method: 'DELETE'}).then(function (d) {
        if (d.ok) { SRV.user = null; MIRROR = {saved: [], seen: [], history: []}; emit(); }
        return d;
      });
    }
    var users = read(K.users, {});
    delete users[u.email];
    write(K.users, users);
    var data = read(K.data, {}); delete data[u.email]; write(K.data, data);
    var use = read(K.usage, {}); delete use[u.email]; write(K.usage, use);
    write(K.session, null);
    emit();
  }

  var PERKS = [
    {t: 'Parcours illimité', d: 'Autant de séances que tu veux, tous les jours. Sans abonnement : ' + FREE_LIMIT + ' par mois.'},
    {t: 'Mode Duo', d: 'Deux personnes répondent, on croise les deux profils et on ne garde que ce qui convient aux deux.'},
    {t: 'Relances illimitées', d: '« Aucun ne me tente » autant de fois qu\u2019il faut. Sans abonnement : une seule relance.'},
    {t: 'Ma liste et films vus', d: 'Mets un film de côté, marque-le comme vu — il ne te sera plus jamais proposé.'},
    {t: 'Sélection élargie', d: PRO_RESULTS + ' propositions classées au lieu de ' + FREE_RESULTS + ', pour trancher plus finement.'},
    {t: 'Historique des séances', d: 'Retrouve les films conseillés lors de tes précédents parcours.'}
  ];

  /* ============================================================ SERVEUR
     Si /api/me répond, le serveur détient la vérité : compte, formule et quota
     viennent de lui et ne sont plus modifiables depuis le navigateur.
     S'il ne répond pas (fichier ouvert en local, projet sans Functions),
     on retombe sur la couche de démonstration ci-dessus. */

  var SRV = null;        /* null = mode local ; objet = état renvoyé par le serveur */
  var MIRROR = {saved: [], seen: [], history: []};
  var booted = false;

  function apiCall(path, opts) {
    return fetch('/api' + path, Object.assign({
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'}
    }, opts || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        d.status = r.status;
        return d;
      });
    });
  }

  function boot() {
    if (booted) return Promise.resolve(!!SRV);
    booted = true;
    if (noAccounts()) return Promise.resolve(false);   /* aucun serveur, aucun appel */
    return apiCall('/me').then(function (d) {
      if (d.status === 200 && 'user' in d) {
        SRV = {user: d.user || null};
        emit();
        if (d.user) refreshMirror();
        handleUrlTokens();
        return true;
      }
      return false;
    }).catch(function () { return false; });
  }

  function refreshMirror() {
    if (!SRV || !SRV.user || SRV.user.plan !== 'pro') { MIRROR = {saved: [], seen: [], history: []}; return; }
    Promise.all([apiCall('/list'), apiCall('/seen'), apiCall('/history')]).then(function (r) {
      MIRROR = {saved: r[0].items || [], seen: r[1].items || [], history: r[2].items || []};
      emit();
    }).catch(function () {});
  }

  function pull(sync) {
    return apiCall('/me' + (sync ? '?sync=1' : '')).then(function (d) {
      if ('user' in d) { SRV = {user: d.user || null}; refreshMirror(); emit(); }
      return d;
    });
  }

  /* Après un paiement accepté, le webhook Stripe peut arriver une ou deux secondes
     après le retour du visiteur. On interroge donc plusieurs fois, en demandant au
     serveur de vérifier directement chez Stripe : l'abonnement n'est jamais perdu. */
  var activating = false;
  function activationPending() { return activating; }
  function awaitActivation() {
    activating = true;
    emit();
    var tries = 0;
    var tick = function () {
      tries += 1;
      pull(true).then(function () {
        if (SRV && SRV.user && SRV.user.plan === 'pro') { activating = false; emit(); return; }
        if (tries >= 6) { activating = false; emit(); return; }
        setTimeout(tick, tries < 3 ? 1200 : 2500);
      }).catch(function () {
        if (tries >= 6) { activating = false; emit(); return; }
        setTimeout(tick, 2500);
      });
    };
    tick();
  }

  /* bouton de secours : « j'ai payé mais rien ne s'est passé » */
  function syncSubscription() {
    if (!SRV) return Promise.resolve({error: 'local'});
    return pull(true).then(function () {
      return {ok: true, pro: !!(SRV.user && SRV.user.plan === 'pro')};
    });
  }

  /* liens reçus par e-mail : ?verify=… et ?reset=… */
  var pendingReset = null;
  function handleUrlTokens() {
    try {
      var p = new URLSearchParams(location.search);
      var v = p.get('verify'), r = p.get('reset');
      if (v) {
        apiCall('/email/verify', {method: 'POST', body: JSON.stringify({token: v})}).then(pull);
        clean(['verify']);
      }
      if (r) { pendingReset = r; clean(['reset']); }
      var ab = p.get('abonnement');
      if (ab) {
        clean(['abonnement', 'sync']);
        if (ab === 'ok') awaitActivation();
      }
    } catch (e) {}
  }
  function clean(keys) {
    try {
      var u = new URL(location.href);
      keys.forEach(function (k) { u.searchParams.delete(k); });
      history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
    } catch (e) {}
  }
  function resetToken() { return pendingReset; }
  function clearResetToken() { pendingReset = null; emit(); }

  function serverMode() { return !!SRV; }

  /* MODE GRATUIT
     Quand window.CINEMOOD_FREE_MODE vaut true, tout le site est offert :
     aucune limite, tous les avantages, aucune interface d'abonnement.
     Le code de paiement reste en place, inerte — il suffit de retirer le
     drapeau pour le réactiver tel quel. */
  function freeMode() { return window.CINEMOOD_FREE_MODE === true; }

  /* SANS COMPTES
     window.CINEMOOD_NO_ACCOUNTS = true retire toute notion de compte :
     ni connexion, ni déconnexion, ni serveur. Ma liste, les films vus et
     l'historique restent, gardés dans le navigateur du visiteur.
     Le code de comptes reste en place, inerte. */
  function noAccounts() { return window.CINEMOOD_NO_ACCOUNTS === true; }

  /* ------------------------------------------------- anti-robot Turnstile
     Actif uniquement si window.CINEMOOD_TURNSTILE contient la clé PUBLIQUE
     (celle en 0x…, sans danger dans la page) ET que TURNSTILE_SECRET existe
     côté serveur. Sans ces deux valeurs, l'inscription reste protégée par la
     seule limitation de débit. */
  function turnstileKey() { return window.CINEMOOD_TURNSTILE || ''; }
  var tsLoading = null, tsToken = '', tsWidget = null;
  function loadTurnstile() {
    if (!turnstileKey()) return Promise.resolve(false);
    if (window.turnstile) return Promise.resolve(true);
    if (tsLoading) return tsLoading;
    tsLoading = new Promise(function (res) {
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = function () { res(true); };
      s.onerror = function () { res(false); };
      document.head.appendChild(s);
    });
    return tsLoading;
  }
  function mountTurnstile(el) {
    if (!el || !turnstileKey()) return;
    loadTurnstile().then(function (ok) {
      if (!ok || !window.turnstile || el.dataset.cmMounted) return;
      el.dataset.cmMounted = '1';
      tsWidget = window.turnstile.render(el, {
        sitekey: turnstileKey(),
        theme: 'dark',
        language: 'fr',
        callback: function (t) { tsToken = t; },
        'expired-callback': function () { tsToken = ''; }
      });
    });
  }
  function resetTurnstile() {
    tsToken = '';
    try { if (tsWidget !== null && window.turnstile) window.turnstile.reset(tsWidget); } catch (e) {}
  }

  /* ------------------------------------------------------------ backend */

  var BACKEND = {};
  /* Brancher un vrai service : chaque fonction rend une Promise.
     MoodflixAccount.useBackend({
       signup(email, pw), login(email, pw), checkout(email), cancel(email)
     });
     Voir BACKEND.md pour le contrat complet côté serveur. */
  function useBackend(impl) { BACKEND = impl || {}; }

  return {
    FREE_LIMIT: FREE_LIMIT, FREE_RESULTS: FREE_RESULTS, PRO_RESULTS: PRO_RESULTS,
    FREE_RELAUNCH: FREE_RELAUNCH, PRICE: PRICE, PRICE_PERIOD: PRICE_PERIOD,
    PERKS: PERKS, FEATURES: FEATURES,
    onChange: onChange, current: current, isPro: isPro, can: can,
    resultCount: resultCount, relaunchLimit: relaunchLimit,
    signup: signup, login: login, logout: logout, deleteAccount: deleteAccount,
    passwordIssue: passwordIssue,
    quota: quota, canRun: canRun, consume: consume,
    saved: saved, isSaved: isSaved, toggleSave: toggleSave,
    seenIds: seenIds, seenList: seenList, isSeen: isSeen, toggleSeen: toggleSeen,
    pushHistory: pushHistory, history: history, forget: forget,
    subscribe: subscribe, cancel: cancel,
    isTampered: isTampered, useBackend: useBackend,
    boot: boot, serverMode: serverMode, refresh: pull, beginRun: beginRun,
    forgotPassword: forgotPassword, resetPassword: resetPassword,
    resetToken: resetToken, clearResetToken: clearResetToken,
    resendVerification: resendVerification, exportUrl: exportUrl,
    resetWithCode: resetWithCode, newRecoveryCode: newRecoveryCode, cleanCode: cleanCode,
    activationPending: activationPending, syncSubscription: syncSubscription,
    freeMode: freeMode, noAccounts: noAccounts,
    turnstileKey: turnstileKey, mountTurnstile: mountTurnstile
  };
})();
