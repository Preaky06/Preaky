/* MoodFlix — couche TMDB.
   Aucune base locale : tout vient du catalogue TMDB (900 000+ films).
   Chaque réponse du parcours se traduit en paramètres de requête explicites,
   puis les candidats sont re-classés par un score déterministe (mêmes réponses = même résultat). */
window.MoodflixTMDB = (function () {
  'use strict';

  /* AUCUNE CLÉ DANS CETTE PAGE.
     Les appels passent par /tmdb, une fonction Cloudflare Pages qui ajoute la clé
     côté serveur (variable d'environnement TMDB_KEY). Voir cloudflare-pages/functions/.
     Repli : si le proxy n'existe pas (ouverture du fichier en local), on utilise une clé
     saisie par le développeur et gardée dans son propre navigateur — jamais dans le code. */
  var PROXY = '/tmdb';
  var DIRECT = 'https://api.themoviedb.org/3';
  var IMG = 'https://image.tmdb.org/t/p/';
  var cache = {};
  var mode = 'proxy';
  /* Clé de repli, utilisée UNIQUEMENT si le proxy ne répond pas.
     Dès que la variable TMDB_KEY existe côté Cloudflare, le proxy répond et cette clé
     n'est jamais employée. Elle est lisible dans la page : à considérer comme publique,
     et à régénérer sur TMDB si le quota est abusé.

     On ne lit PLUS localStorage : une clé périmée qui y traînait rendait le site vide
     sans aucun moyen de s'en sortir pour le visiteur. On purge au passage les restes. */
  var FALLBACK_KEY = ''; /* retirée du dépôt : voir README */
  var KEY = FALLBACK_KEY;
  try { localStorage.removeItem('moodflix.tmdb.key'); } catch (e) {}

  function qs(params, withKey) {
    var p = Object.assign({language: 'fr-FR', region: 'FR', include_adult: 'false'}, params || {});
    if (withKey) p.api_key = KEY;
    return Object.keys(p).filter(function (k) { return p[k] !== undefined && p[k] !== null && p[k] !== ''; })
      .map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&');
  }
  /* Jeton de parcours délivré par /api/run. Il prouve au proxy que la requête
     appartient à un parcours régulièrement décompté du quota. Sans lui, les
     requêtes du moteur sont bridées : on ne peut plus « farmer » les
     recommandations en contournant le compteur. */
  var runToken = '';
  function setRunToken(t) { runToken = t || ''; }

  function once(base, path, params, withKey) {
    var opts = {};
    if (base === PROXY && runToken) opts.headers = {'X-CM-Run': runToken};
    return fetch(base + path + '?' + qs(params, withKey), opts).then(function (r) {
      if (!r.ok) throw new Error('TMDB ' + r.status);
      return r.json();
    });
  }
  function direct(path, params) {
    return once(DIRECT, path, params, true).catch(function (e) {
      /* clé refusée : on rétablit la clé embarquée et on réessaie une fois */
      if (/40[13]/.test(e.message) && KEY !== FALLBACK_KEY) {
        KEY = FALLBACK_KEY;
        cache = {};
        return once(DIRECT, path, params, true);
      }
      throw e;
    });
  }
  function request(path, params) {
    if (mode === 'proxy') {
      return once(PROXY, path, params, false).catch(function (e) {
        /* 429 : le proxy fonctionne et nous bride volontairement. On ne contourne pas. */
        if (/429/.test(e.message)) throw new Error('Trop de requêtes. Patiente un instant.');
        mode = 'direct';
        return direct(path, params);
      });
    }
    return direct(path, params);
  }
  function api(path, params) {
    var ck = path + '?' + qs(params, false);
    if (cache[ck]) return cache[ck];
    cache[ck] = request(path, params).catch(function (e) { delete cache[ck]; throw e; });
    return cache[ck];
  }

  /* clé de secours pour le développement local uniquement : elle reste dans CE navigateur */
  /* Développement uniquement : la clé reste en mémoire, jamais persistée —
     une valeur périmée ne peut plus condamner un visiteur au silence. */
  function setKey(k) {
    KEY = (k || '').trim() || FALLBACK_KEY;
    cache = {}; mode = 'proxy';
  }
  /* exposé plus bas via l'objet retourné */
  function key() { return KEY ? '••••••••' : ''; }
  function poster(p, size) { return p ? IMG + (size || 'w500') + p : null; }

  /* ---------- genres TMDB ---------- */
  var G = {action:28, aventure:12, animation:16, comedie:35, crime:80, doc:99, drame:18, famille:10751,
    fantastique:14, histoire:36, horreur:27, musique:10402, mystere:9648, romance:10749, sf:878,
    thriller:53, guerre:10752, western:37};
  var GENRE_FR = {28:'Action',12:'Aventure',16:'Animation',35:'Comédie',80:'Policier',99:'Documentaire',
    18:'Drame',10751:'Famille',14:'Fantastique',36:'Histoire',27:'Horreur',10402:'Musique',9648:'Mystère',
    10749:'Romance',878:'Science-fiction',53:'Thriller',10752:'Guerre',37:'Western',10770:'Téléfilm'};

  /* ---------- parcours : 10 questions, la 2ᵉ dépend de la 1ʳᵉ ---------- */
  var Q1 = {id:'mood', kicker:'On commence par l\u2019essentiel', titre:'Ce soir, il te faut quoi ?', options:[
    {v:'rire', l:'Rire', sub:'et rien d\u2019autre', genres:[G.comedie]},
    {v:'peur', l:'Avoir peur', sub:'ou presque', genres:[G.horreur, G.thriller]},
    {v:'reflechir', l:'Réfléchir', sub:'ça te va ce soir', genres:[G.drame, G.mystere]},
    {v:'emotion', l:'Être ému', sub:'sortir les mouchoirs', genres:[G.drame, G.romance]},
    {v:'adrenaline', l:'De l\u2019adrénaline', sub:'du rythme, du bruit', genres:[G.action, G.thriller]},
    {v:'evasion', l:'M\u2019évader', sub:'partir loin d\u2019ici', genres:[G.sf, G.fantastique, G.aventure]},
    {v:'surprise', l:'Être surpris', sub:'ne rien voir venir', genres:[G.mystere, G.thriller]},
    {v:'detente', l:'Décrocher', sub:'zéro effort', genres:[G.comedie, G.famille, G.aventure]}
  ]};

  var BRANCH = {
    rire: {id:'sub', kicker:'Le type d\u2019humour', titre:'On rit de quoi ?', options:[
      {v:'tendre', l:'Tendre', sub:'ça réchauffe', genres:[G.comedie, G.famille]},
      {v:'absurde', l:'Absurde', sub:'ça part loin', genres:[G.comedie, G.fantastique]},
      {v:'romantique', l:'Romantique', sub:'ça finit bien', genres:[G.comedie, G.romance]},
      {v:'grincant', l:'Grinçant', sub:'ça mord', genres:[G.comedie, G.crime]}]},
    peur: {id:'sub', kicker:'Le type de peur', titre:'Elle vient d\u2019où, cette peur ?', options:[
      {v:'psy', l:'Tension psychologique', sub:'ça serre lentement', genres:[G.thriller, G.mystere]},
      {v:'horreur', l:'Horreur pure', sub:'ça ne fait pas semblant', genres:[G.horreur]},
      {v:'surnaturel', l:'Surnaturel', sub:'ça vient d\u2019ailleurs', genres:[G.horreur, G.fantastique]},
      {v:'survie', l:'Survie', sub:'ça court', genres:[G.thriller, G.action]}]},
    reflechir: {id:'sub', kicker:'Le sujet', titre:'On creuse quoi ?', options:[
      {v:'societe', l:'La société', sub:'nous, en groupe', genres:[G.drame]},
      {v:'esprit', l:'L\u2019esprit humain', sub:'nous, tout seuls', genres:[G.mystere, G.drame]},
      {v:'histoire', l:'L\u2019Histoire', sub:'ce qui a eu lieu', genres:[G.histoire, G.drame]},
      {v:'futur', l:'Le futur', sub:'ce qui nous attend', genres:[G.sf, G.drame]}]},
    emotion: {id:'sub', kicker:'Le type d\u2019émotion', titre:'Tu veux qu\u2019il te fasse quoi ?', options:[
      {v:'melo', l:'Grand mélo', sub:'franchement', genres:[G.drame]},
      {v:'amour', l:'Histoire d\u2019amour', sub:'regards, silences', genres:[G.romance, G.drame]},
      {v:'famille', l:'Liens de famille', sub:'ça remue', genres:[G.famille, G.drame]},
      {v:'musique', l:'Portée par la musique', sub:'ça chante', genres:[G.musique, G.drame]}]},
    adrenaline: {id:'sub', kicker:'Le type d\u2019action', titre:'Ça bouge à quelle vitesse ?', options:[
      {v:'action', l:'Action pure', sub:'cascades et impacts', genres:[G.action]},
      {v:'poursuite', l:'Course-poursuite', sub:'ça ne s\u2019arrête pas', genres:[G.action, G.thriller]},
      {v:'braquage', l:'Braquage', sub:'un plan, une équipe', genres:[G.crime, G.thriller]},
      {v:'guerre', l:'Guerre', sub:'grande échelle', genres:[G.guerre, G.action]}]},
    surprise: {id:'sub', kicker:'Le type de surprise', titre:'Tu veux être cueilli comment ?', options:[
      {v:'twist', l:'Un retournement', sub:'tout bascule', genres:[G.mystere, G.thriller]},
      {v:'etrange', l:'Quelque chose d\u2019étrange', sub:'hors norme', genres:[G.fantastique, G.sf]},
      {v:'vrai', l:'Une histoire vraie folle', sub:'et pourtant', genres:[G.histoire, G.crime]},
      {v:'melange', l:'Un film inclassable', sub:'ça change en route', genres:[G.drame, G.comedie]}]},
    detente: {id:'sub', kicker:'Le type de détente', titre:'On décroche de quelle façon ?', options:[
      {v:'feelgood', l:'Du feel-good', sub:'ça fait du bien', genres:[G.comedie, G.famille]},
      {v:'doudou', l:'Un film doudou', sub:'déjà vu ou pas', genres:[G.famille, G.animation]},
      {v:'legere', l:'Une aventure légère', sub:'ça avance sans peser', genres:[G.aventure, G.comedie]},
      {v:'popcorn', l:'Du pur divertissement', sub:'gros spectacle facile', genres:[G.action, G.aventure]}]},
    evasion: {id:'sub', kicker:'La destination', titre:'Direction ?', options:[
      {v:'sf', l:'Un autre monde', sub:'ailleurs complet', genres:[G.sf]},
      {v:'fantastique', l:'Un monde magique', sub:'les règles changent', genres:[G.fantastique, G.aventure]},
      {v:'aventure', l:'Les grands espaces', sub:'de l\u2019air', genres:[G.aventure]},
      {v:'anim', l:'L\u2019animation', sub:'tout est possible', genres:[G.animation, G.aventure]}]}
  };


  /* 3ᵉ niveau : la question dépend du sous-choix — pair = deux genres croisés (ET) */
  var MICRO = {
    tendre:['Une comédie qui fait du bien, mais laquelle ?',[['Feel-good familial','on ressort léger',[35,10751]],['Comédie douce-amère','ça rit et ça pique',[35,18]],['Comédie romantique','avec des sentiments',[35,10749]],['Juste drôle','rien de plus',[35]]]],
    absurde:['Jusqu\u2019où part l\u2019absurde ?',[['Délire de science-fiction','les règles sautent',[35,878]],['Fantaisie décalée','un monde à part',[35,14]],['Comédie d\u2019action','ça explose en riant',[35,28]],['Humour pur','sans décor',[35]]]],
    romantique:['Quelle romance ?',[['Comédie romantique','ça finit bien',[35,10749]],['Romance qui serre le cœur','ça fait mal',[10749,18]],['Romance d\u2019un autre temps','costumes et lettres',[10749,36]],['Romance légère','sans complication',[10749]]]],
    grincant:['Grinçant comment ?',[['Satire sociale','ça vise juste',[35,18]],['Comédie noire criminelle','on rit jaune',[35,80]],['Humour et guerre','absurde total',[35,10752]],['Cynisme pur','sans filtre',[35]]]],
    psy:['La tension vient d\u2019où ?',[['Un mystère à résoudre','on cherche avec',[53,9648]],['Une enquête criminelle','méthodique',[53,80]],['Un drame sous pression','ça monte lentement',[53,18]],['La tension pure','rien d\u2019autre',[53]]]],
    horreur:['Quelle horreur ?',[['Qui joue avec les nerfs','ça guette',[27,53]],['Surnaturelle','ça vient d\u2019ailleurs',[27,14]],['De science-fiction','la menace est autre',[27,878]],['Horreur frontale','sans détour',[27]]]],
    surnaturel:['D\u2019où vient l\u2019étrange ?',[['Fantômes et lieux hantés','ça hante',[27,14]],['Mystère inexpliqué','on ne saura pas tout',[14,9648]],['Créatures venues d\u2019ailleurs','contact hostile',[27,878]],['Fantastique sombre','le merveilleux qui tourne mal',[14]]]],
    survie:['Survivre à quoi ?',[['Une traque','on est la proie',[53,28]],['Une catastrophe','tout s\u2019effondre',[28,18]],['Un monde effondré','après la fin',[878,28]],['Une nature hostile','seul dehors',[12,53]]]],
    societe:['Quel angle ?',[['Le crime et la justice','ce qu\u2019on juge',[18,80]],['Une époque, un pays','le contexte parle',[18,36]],['La guerre et ses traces','ce qui reste',[18,10752]],['Le quotidien','à hauteur d\u2019homme',[18]]]],
    esprit:['Explorer quoi ?',[['Une énigme mentale','ça se démonte',[9648,53]],['Une conscience qui vacille','qui suis-je',[878,18]],['Un secret enfoui','ça remonte',[9648,18]],['L\u2019intime','sans artifice',[18]]]],
    histoire:['Quelle Histoire ?',[['Un conflit majeur','la grande échelle',[36,10752]],['Une vie hors norme','un destin',[36,18]],['Un crime réel','ça a existé',[36,80]],['Une grande fresque','le souffle',[36]]]],
    futur:['Quel futur ?',[['Un futur qui fait peur','ça dérape',[878,53]],['Un futur intime','à hauteur d\u2019humain',[878,18]],['Un futur en action','ça se bat',[878,28]],['Une idée vertigineuse','le concept d\u2019abord',[878]]]],
    melo:['Ça remue comment ?',[['Une famille qui se déchire','les liens cassent',[18,10751]],['Un amour impossible','ça ne peut pas marcher',[18,10749]],['Une histoire vraie','c\u2019est arrivé',[18,36]],['Un drame pur','frontal',[18]]]],
    amour:['Quelle histoire d\u2019amour ?',[['Deux êtres, rien d\u2019autre','en huis clos',[10749,18]],['Amour et légèreté','ça respire',[10749,35]],['Amour d\u2019époque','autre siècle',[10749,36]],['Amour et destin','plus grand qu\u2019eux',[10749,14]]]],
    famille:['Quels liens ?',[['Parents et enfants','la transmission',[18,10751]],['À hauteur d\u2019enfant','son regard',[10751,16]],['Une fratrie','frères et sœurs',[18,35]],['Une famille en crise','ça craque',[18]]]],
    musique:['La musique comment ?',[['Un biopic musical','une vraie vie',[10402,36]],['Une comédie musicale','ça chante',[10402,35]],['Un drame musical','ça coûte cher',[10402,18]],['La musique au centre','elle porte tout',[10402]]]],
    action:['L\u2019action, ça donne quoi ?',[['Grand spectacle','le maximum',[28,12]],['Action tendue','on serre les dents',[28,53]],['Action et humour','ça respire',[28,35]],['Action pure','sans détour',[28]]]],
    poursuite:['On poursuit quoi ?',[['Un criminel','la traque',[28,80]],['Un espion','le double jeu',[28,53]],['Une course contre la montre','le chrono',[53,12]],['Ça ne s\u2019arrête jamais','plein régime',[28]]]],
    braquage:['Quel casse ?',[['Un plan millimétré','tout est prévu',[80,53]],['Un casse qui dérape','rien ne va',[80,18]],['Un casse à l\u2019humour','l\u2019équipe fait le sel',[80,35]],['Le crime organisé','plus large',[80]]]],
    guerre:['Quelle guerre ?',[['Au front','dans la boue',[10752,28]],['Dans l\u2019Histoire','le contexte compte',[10752,36]],['Le drame des civils','de l\u2019autre côté',[10752,18]],['Le champ de bataille','l\u2019échelle',[10752]]]],
    sf:['Quel ailleurs ?',[['L\u2019espace','vraiment loin',[878,12]],['Un futur sombre','ça a mal tourné',[878,53]],['Une idée vertigineuse','ça retourne la tête',[878,9648]],['La SF pure','le genre pour lui-même',[878]]]],
    fantastique:['Quelle magie ?',[['Une grande quête','le long chemin',[14,12]],['Un conte','pour tous',[14,10751]],['Une magie sombre','ça inquiète',[14,53]],['Le merveilleux','sans limite',[14]]]],
    aventure:['Partir où ?',[['Une expédition','l\u2019inconnu',[12,28]],['Un voyage initiatique','on revient changé',[12,18]],['Un monde inconnu','hors carte',[12,878]],['L\u2019aventure pure','le mouvement',[12]]]],
    twist:['Le retournement porte sur quoi ?',[['Une enquête','on cherche le coupable',[9648,80]],['Une identité','qui est qui',[9648,53]],['La réalité elle-même','le sol se dérobe',[9648,878]],['Un secret de famille','ça sort',[9648,18]]]],
    etrange:['Étrange à quel point ?',[['Doucement décalé','un pas de côté',[14,18]],['Franchement bizarre','ça déraille',[878,14]],['Inquiétant','ça met mal à l\u2019aise',[14,53]],['Onirique','comme un rêve',[14,12]]]],
    vrai:['Quelle histoire vraie ?',[['Un fait divers','ça a fait la une',[36,80]],['Un destin hors norme','une vie entière',[36,18]],['Une arnaque','ils l\u2019ont fait',[80,35]],['Un moment d\u2019Histoire','ça a compté',[36,10752]]]],
    melange:['Inclassable comment ?',[['Ça rit puis ça serre','virage à mi-film',[35,18]],['Drame avec du fantastique','le réel dérape',[18,14]],['Comédie qui devient thriller','ça tourne mal',[35,53]],['Un objet à part','sans étiquette',[18]]]],
    feelgood:['Du bien, mais comment ?',[['Une comédie chaleureuse','ça réchauffe',[35,10751]],['Une rencontre','deux personnes',[35,10749]],['Un sursaut','ça relève',[18,35]],['Rien que du rire','sans arrière-plan',[35]]]],
    doudou:['Ton doudou, c\u2019est plutôt…',[['Un classique animé','valeur sûre',[16,10751]],['Une aventure familiale','tout public',[10751,12]],['Un conte réconfortant','ça berce',[14,10751]],['Une comédie familiale','ça rit ensemble',[35,10751]]]],
    legere:['Une aventure comment ?',[['Sur la route','ça bouge',[12,35]],['Avec un duo','le sel du film',[35,28]],['Vers l\u2019inconnu','sans danger réel',[12,10751]],['Grand air','ça respire',[12,18]]]],
    popcorn:['Le divertissement pur, c\u2019est…',[['Du blockbuster','le maximum',[28,878]],['De l\u2019aventure spectaculaire','le grand jeu',[28,12]],['De l\u2019action drôle','ça ne se prend pas au sérieux',[28,35]],['Un braquage réjouissant','l\u2019équipe et le plan',[80,28]]]],
    anim:['Quelle animation ?',[['Pour toute la famille','personne ne s\u2019ennuie',[16,10751]],['Une aventure animée','ça bouge',[16,12]],['Animation qui touche','ça serre',[16,18]],['Animation qui fait rire','ça pétille',[16,35]]]]
  };
  Object.keys(MICRO).forEach(function (k) {
    var m = MICRO[k];
    MICRO[k] = {id: 'micro', kicker: 'On affine', titre: m[0], options: m[1].map(function (o, i) {
      return {v: k + i, l: o[0], sub: o[1], pair: o[2]};
    })};
  });

  var REST = [
    {id:'intensite', kicker:'Le curseur', titre:'On monte le son jusqu\u2019où ?', options:[
      {v:'doux', l:'Tout doux', sub:'rien de dur, rien de violent', intensity:1, without:[G.horreur, G.guerre]},
      {v:'equilibre', l:'Équilibré', sub:'de la tension, sans excès', intensity:2},
      {v:'fort', l:'Intense', sub:'ça doit cogner', intensity:3},
      {v:'extreme', l:'Sans filtre', sub:'ne me ménage pas', intensity:4}]},
    {id:'social', kicker:'Ça change absolument tout', titre:'Qui est sur le canapé ?', options:[
      {v:'seul', l:'Seul', sub:'personne à ménager', social:'seul'},
      {v:'couple', l:'À deux', sub:'même écran, même envie', social:'couple'},
      {v:'amis', l:'Entre amis', sub:'ça commente', social:'amis'},
      {v:'famille', l:'En famille', sub:'tous les âges', social:'famille', without:[G.horreur], certif:true},
      {v:'enfants', l:'Avec des enfants', sub:'rien de dur', social:'enfants', without:[G.horreur, G.guerre, G.crime], certif:true},
      {v:'novice', l:'Avec quelqu\u2019un qui regarde peu de films', sub:'ça doit rester simple', social:'novice'}]},
    {id:'duree', kicker:'On ne dépassera pas', titre:'Il te reste combien de temps ?', options:[
      {v:'tres_court', l:'Moins de 1h25', sub:'vraiment court', runtime:[0, 85], ideal:78},
      {v:'court', l:'1h25 – 1h45', sub:'format serré', runtime:[85, 105], ideal:95},
      {v:'moyen', l:'1h45 – 2h10', sub:'le format normal', runtime:[105, 130], ideal:117},
      {v:'long', l:'2h10 – 2h40', sub:'on prend la soirée', runtime:[130, 160], ideal:142},
      {v:'libre', l:'Peu importe', sub:'aucune contrainte', runtime:[0, 400], ideal:null, freeRuntime:true}]},
    {id:'epoque', kicker:'L\u2019époque', titre:'On remonte jusqu\u2019où ?', options:[
      {v:'neuf', l:'Très récent', sub:'2020 et après', years:[2020, 2030]},
      {v:'2010s', l:'Les années 2010', sub:'2010 – 2019', years:[2010, 2019]},
      {v:'2000s', l:'Les années 2000', sub:'2000 – 2009', years:[2000, 2009]},
      {v:'8090', l:'Années 80 – 90', sub:'l\u2019âge d\u2019or vidéo', years:[1980, 1999]},
      {v:'vieux', l:'Avant 1980', sub:'les fondations', years:[1930, 1979]},
      {v:'libre', l:'Peu importe', sub:'toutes époques', years:[1920, 2030]}]},
    {id:'origine', kicker:'Le pays', titre:'Le film parle quelle langue ?', options:[
      {v:'libre', l:'De n\u2019importe où', sub:'le monde entier'},
      {v:'fr', l:'Français', sub:'chez nous', lang:'fr'},
      {v:'us', l:'Américain', sub:'la grande industrie', lang:'en'},
      {v:'coree', l:'Coréen', sub:'la vague', lang:'ko'},
      {v:'japon', l:'Japonais', sub:'animation comprise', lang:'ja'},
      {v:'euro', l:'Européen', sub:'Italie, Espagne, Allemagne', lang:'it|es|de'},
      {v:'nordique', l:'Nordique', sub:'Danemark, Suède, Norvège', lang:'da|sv|no|is'},
      {v:'latino', l:'Hispanophone', sub:'Espagne, Mexique, Argentine', lang:'es'}]},
    {id:'notoriete', kicker:'Connu ou pas', titre:'Terrain connu, ou on ose ?', options:[
      {v:'sur', l:'Un film très connu', sub:'des millions de spectateurs, peu de risque', votes:[3000, null], note:6.8},
      {v:'connu', l:'Assez connu', sub:'sans être un blockbuster', votes:[800, 6000], note:6.6},
      {v:'culte', l:'Un film culte', sub:'adoré par ceux qui l\u2019ont vu', votes:[1500, 12000], note:7.4},
      {v:'pepite', l:'Une découverte', sub:'peu vu, mais très bien noté', votes:[200, 2500], note:7.0},
      {v:'libre', l:'Peu importe', sub:'surprends-moi', votes:[150, null], note:6.2}]},
    {id:'rythme', kicker:'Le rythme', titre:'Ça fonce, ou ça prend son temps ?', options:[
      {v:'nerveux', l:'Ça enchaîne', sub:'jamais de temps mort', rythme:'nerveux'},
      {v:'moyen', l:'Entre les deux', sub:'ça avance sans courir', rythme:'moyen'},
      {v:'alterne', l:'Par vagues', sub:'des pointes, puis des pauses', rythme:'alterne'},
      {v:'contemplatif', l:'Tout en lenteur', sub:'de longs plans, on se pose', rythme:'contemplatif'}]},
    {id:'exigence', kicker:'Sois honnête', titre:'Ton cerveau est disponible ?', options:[
      {v:'accessible', l:'Non, je me laisse porter', sub:'facile à suivre, même distrait', exigence:'accessible'},
      {v:'entre', l:'Un peu', sub:'ça peut demander un minimum d\u2019attention', exigence:'entre'},
      {v:'exigeant', l:'Oui, à fond', sub:'un film qui demande de réfléchir', exigence:'exigeant'}]},
    {id:'final', kicker:'Dernière question', titre:'Ils se valent tous les deux. Tu prends lequel ?', options:[
      {v:'note', l:'Le mieux noté', sub:'la qualité avant tout', axe:'note'},
      {v:'populaire', l:'Celui dont tout le monde parle', sub:'l\u2019évidence', axe:'populaire'},
      {v:'oublie', l:'Un film qu\u2019on a oublié', sub:'à redécouvrir', axe:'oublie'},
      {v:'nouveau', l:'Le plus frais possible', sub:'le plus récent qui tient', axe:'nouveau'},
      {v:'consensus', l:'Celui qui met tout le monde d\u2019accord', sub:'aucun risque de rater sa soirée', axe:'consensus'}]}
  ];

  var TOTAL = 3 + REST.length;

  function questionAt(i, path) {
    if (i === 0) return Q1;
    if (i === 1) { var m = path[0]; return (m && BRANCH[m.value]) || REST[0]; }
    if (i === 2) { var b = path[1]; return (b && MICRO[b.value]) || REST[0]; }
    return REST[i - 3] || null;
  }

  /* ---------- réponses → profil de requête ---------- */
  function profile(path) {
    var p = {genres: [], without: [], pair: null, runtime: [60, 400], ideal: 120, years: [1920, 2030],
      lang: null, votes: [200, null], note: 6.3, social: null, rythme: 'moyen', exigence: 'entre', freeRuntime: true,
      axe: 'note', intensity: 2, certif: false, labels: [], set: {}};
    path.forEach(function (a) {
      if (a.label) p.labels.push(a.label);
      (a.genres || []).forEach(function (g) { if (p.genres.indexOf(g) === -1) p.genres.push(g); });
      if (a.pair) {
        if (a.pair.length === 2) p.pair = a.pair;
        a.pair.forEach(function (g) { if (p.genres.indexOf(g) === -1) p.genres.push(g); });
      }
      (a.without || []).forEach(function (g) { if (p.without.indexOf(g) === -1) p.without.push(g); });
      if (a.runtime) { p.runtime = a.runtime; p.ideal = a.ideal; p.freeRuntime = !!a.freeRuntime;
        if (!a.freeRuntime) p.set.runtime = 1; }
      if (a.years) { p.years = a.years; p.set.years = 1; }
      if (a.lang) { p.lang = a.lang; p.set.lang = 1; }
      if (a.votes) { p.votes = a.votes; p.note = a.note; }
      if (a.social) { p.social = a.social; p.set.social = 1; }
      if (a.rythme) { p.rythme = a.rythme; p.set.ton = 1; }
      if (a.exigence) { p.exigence = a.exigence; p.set.ton = 1; }
      if (a.axe) { p.axe = a.axe; p.set.axe = 1; }
      if (a.intensity != null) { p.intensity = a.intensity; p.set.intensity = 1; }
      if (a.certif) p.certif = true;
    });
    [G.doc, 10770].forEach(function (g) {
      if (p.genres.indexOf(g) === -1 && p.without.indexOf(g) === -1) p.without.push(g);
    });
    p.without = p.without.filter(function (g) { return p.genres.indexOf(g) === -1; });
    return p;
  }

  var INT_TXT = ['très douce', 'douce', 'moyenne', 'forte', 'maximale'];
  var INT_WANT = [1.1, 1.9, 2.7, 3.9, 4.8];
  /* Un long métrage fait au moins une heure. Ce plancher ne dépend d'aucune
     réponse : « peu importe la durée » ne veut pas dire « un film de 4 minutes ». */
  var MIN_LONG = 60;

  function query(p, page, sort) {
    var q = {
      with_genres: p.pair ? p.pair.join(',') : p.genres.join('|'),
      without_genres: p.without.join(','),
      'vote_count.gte': p.votes[0],
      'vote_average.gte': p.note,
      'primary_release_date.gte': p.years[0] + '-01-01',
      'primary_release_date.lte': p.years[1] + '-12-31',
      'with_runtime.gte': Math.max(MIN_LONG, p.runtime[0]),   /* jamais de court métrage */
      'with_runtime.lte': p.runtime[1],
      sort_by: sort || sortFor(p),
      page: page || 1
    };
    if (p.votes[1]) q['vote_count.lte'] = p.votes[1];
    if (p.lang) q.with_original_language = p.lang;
    if (p.certif) { q.certification_country = 'FR'; q['certification.lte'] = '12'; }
    return q;
  }
  function sortFor(p) {
    if (p.axe === 'populaire') return 'popularity.desc';
    if (p.axe === 'nouveau') return 'primary_release_date.desc';
    if (p.axe === 'consensus') return 'vote_count.desc';
    if (p.axe === 'oublie') return 'vote_average.desc';
    return 'vote_average.desc';
  }

  /* filtres lisibles, affichés à l'utilisateur : rien n'est caché */
  function filterChips(p) {
    var c = [];
    if (p.pair) c.push('croisement : ' + p.pair.map(function (g) { return GENRE_FR[g]; }).join(' + '));
    else if (p.genres.length) c.push('genres : ' + p.genres.map(function (g) { return GENRE_FR[g]; }).join(' ou '));
    if (p.without.length) c.push('sans : ' + p.without.map(function (g) { return GENRE_FR[g]; }).join(', '));
    c.push(p.freeRuntime ? 'durée : sans contrainte'
      : 'durée ' + p.runtime[0] + '–' + p.runtime[1] + ' min (cible ' + p.ideal + ')');
    c.push('intensité visée ' + INT_TXT[p.intensity]);
    c.push('sortie ' + p.years[0] + '–' + p.years[1]);
    c.push('note ≥ ' + p.note.toFixed(1));
    c.push(p.votes[1] ? p.votes[0] + '–' + p.votes[1] + ' votes' : p.votes[0] + '+ votes');
    if (p.lang) c.push('langue : ' + p.lang.split('|').join('/'));
    if (p.certif) c.push('tous publics (≤ 12)');
    return c;
  }

  /* ---------- re-classement déterministe ---------- */
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* intensité intrinsèque d'un film, déduite de ses genres (1 = doux → 5 = extrême) */
  var HEAT = {};
  HEAT[G.horreur] = 5; HEAT[G.guerre] = 4.6; HEAT[G.thriller] = 4.2; HEAT[G.action] = 4;
  HEAT[G.crime] = 3.8; HEAT[G.mystere] = 3.2; HEAT[G.western] = 3.4; HEAT[G.sf] = 3;
  HEAT[G.aventure] = 2.8; HEAT[G.drame] = 2.8; HEAT[G.histoire] = 3; HEAT[G.fantastique] = 2.6;
  HEAT[G.musique] = 1.8; HEAT[G.animation] = 1.8; HEAT[G.romance] = 1.6; HEAT[G.comedie] = 1.5;
  HEAT[G.famille] = 1.2;
  function heatOf(gs) {
    var vals = gs.map(function (g) { return HEAT[g]; }).filter(function (v) { return v; });
    if (!vals.length) return 2.6;
    var max = Math.max.apply(null, vals);
    var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    return max * 0.65 + avg * 0.35;
  }

  /* PORTE D'ÉLIGIBILITÉ
     Le score classe ; cette fonction, elle, exclut. Un film qui contredit un
     choix explicite ne peut plus apparaître, quel que soit son score par
     ailleurs. TMDB étant permissif (un « ou » sur les genres, des dates
     approximatives), on revérifie tout côté client. */
  function eligible(m, p) {
    var gs = m.genre_ids || [];
    if (!gs.length) return false;
    if (p.without.some(function (g) { return gs.indexOf(g) > -1; })) return false;
    if (p.pair && !p.pair.every(function (g) { return gs.indexOf(g) > -1; })) return false;
    if (p.genres.length && !p.genres.some(function (g) { return gs.indexOf(g) > -1; })) return false;
    var y = parseInt((m.release_date || '').slice(0, 4), 10);
    if (y && (y < p.years[0] || y > p.years[1])) return false;
    if (typeof m.vote_average === 'number' && m.vote_average < p.note - 0.05) return false;
    if (typeof m.vote_count === 'number' && m.vote_count < p.votes[0]) return false;
    if (p.votes[1] && m.vote_count > p.votes[1]) return false;
    if (p.lang && p.lang.split('|').indexOf(m.original_language) === -1) return false;
    return true;
  }

  function scoreOne(m, p) {
    var gs = m.genre_ids || [];
    var hit = p.genres.filter(function (g) { return gs.indexOf(g) > -1; }).length;

    /* Le genre ne se contente plus de « au moins un tag en commun ».
       On mesure deux choses : combien des genres demandés sont couverts (rappel),
       et quelle part du film relève réellement de ces genres (précision). Un film
       qui ne coche AUCUN genre demandé chute à 8 : il ne peut plus passer devant. */
    var genre;
    if (!p.genres.length) genre = 70;
    else if (!hit) genre = 8;
    else {
      var rappel = Math.min(1, hit / Math.min(p.genres.length, 2));
      var precision = Math.min(1, hit / Math.max(1, gs.length) * 1.7);
      genre = clamp(100 * (0.60 * rappel + 0.40 * precision), 0, 100);
    }
    if (p.pair && p.pair.every(function (g) { return gs.indexOf(g) > -1; })) genre = 100;
    if (p.without.some(function (g) { return gs.indexOf(g) > -1; })) genre -= 55;
    genre = clamp(genre, 0, 100);

    /* intensité : distance entre ce que le film dégage et ce qui a été demandé */
    var want = INT_WANT[p.intensity]; if (want == null) want = 2.7;
    var intensite = clamp(100 - Math.abs(heatOf(gs) - want) * 26, 0, 100);

    var year = parseInt((m.release_date || '0000').slice(0, 4), 10) || 0;
    var mid = (p.years[0] + p.years[1]) / 2, span = Math.max(6, (p.years[1] - p.years[0]) / 2);
    var epoque = clamp(100 - Math.abs(year - mid) / span * 42, 20, 100);
    if (p.axe === 'nouveau') epoque = clamp(40 + (year - 2015) * 7, 10, 100);

    var note = clamp((m.vote_average - 5.5) * 22, 0, 100);
    var conf = clamp(Math.log10(Math.max(10, m.vote_count)) / 5 * 100, 0, 100);
    var pop = clamp(Math.log10(Math.max(1, m.popularity)) / 3 * 100, 0, 100);

    var notoriete;
    if (p.axe === 'populaire') notoriete = pop;
    else if (p.axe === 'consensus') notoriete = conf * 0.62 + note * 0.38;
    else if (p.axe === 'oublie') notoriete = clamp(112 - pop, 0, 100) * 0.6 + note * 0.4;
    else notoriete = conf * 0.45 + note * 0.55;

    var social = 70;
    if (p.social === 'famille') social = gs.indexOf(G.famille) > -1 || gs.indexOf(G.animation) > -1 ? 98 : 54;
    if (p.social === 'couple') social = gs.indexOf(G.romance) > -1 || gs.indexOf(G.drame) > -1 ? 94 : 66;
    if (p.social === 'amis') social = gs.indexOf(G.comedie) > -1 || gs.indexOf(G.action) > -1 || gs.indexOf(G.horreur) > -1 ? 94 : 62;
    if (p.social === 'seul') social = gs.indexOf(G.drame) > -1 || gs.indexOf(G.mystere) > -1 || gs.indexOf(G.sf) > -1 ? 92 : 68;
    if (p.social === 'enfants') social = gs.indexOf(G.animation) > -1 || gs.indexOf(G.famille) > -1 ? 99 : 40;
    if (p.social === 'novice') social = clamp(38 + pop * 0.5 + (gs.indexOf(G.comedie) > -1 || gs.indexOf(G.action) > -1 ? 16 : 0), 0, 100);

    var ton = 70;
    if (p.rythme === 'nerveux') ton = pop * 0.4 + (gs.indexOf(G.action) > -1 || gs.indexOf(G.thriller) > -1 ? 58 : 18);
    if (p.rythme === 'contemplatif') ton = note * 0.45 + (gs.indexOf(G.drame) > -1 || gs.indexOf(G.histoire) > -1 ? 52 : 16);
    if (p.rythme === 'alterne') ton = clamp(52 + (gs.length >= 2 ? 30 : 0) + note * 0.18, 0, 100);
    if (p.exigence === 'accessible') ton = ton * 0.5 + conf * 0.5;
    if (p.exigence === 'exigeant') ton = ton * 0.5 + note * 0.5;
    ton = clamp(ton, 0, 100);

    /* Les poids suivent les réponses : ce que l'utilisateur a explicitement
       choisi pèse plus lourd que les valeurs par défaut du moteur. */
    var W = {genre: .26, intensite: .15, note: .14, social: .12, notoriete: .11, epoque: .09, ton: .08};
    if (p.pair) W.genre += .11;
    else if (p.genres.length && p.genres.length <= 3) W.genre += .06;
    if (p.set.intensity) W.intensite += (p.intensity === 0 || p.intensity === 4) ? .10 : .06;
    if (p.set.social) W.social += .06;
    if (p.set.years) W.epoque += .07;
    if (p.set.axe) W.notoriete += .06;
    if (p.set.ton) W.ton += .06;
    var somme = 0, k;
    for (k in W) somme += W[k];
    for (k in W) W[k] = W[k] / somme;

    var g = W.genre * genre + W.intensite * intensite + W.note * note + W.social * social
      + W.notoriete * notoriete + W.epoque * epoque + W.ton * ton;
    return {
      raw: g,
      global: Math.round(clamp(g, 5, 99)),
      criteria: [
        {k: 'genre', l: 'Genre', v: Math.round(genre)},
        {k: 'intensite', l: 'Intensité', v: Math.round(intensite)},
        {k: 'note', l: 'Qualité', v: Math.round(note)},
        {k: 'social', l: 'Contexte', v: Math.round(social)},
        {k: 'notoriete', l: 'Notoriété', v: Math.round(notoriete)},
        {k: 'epoque', l: 'Époque', v: Math.round(epoque)},
        {k: 'ton', l: 'Ton', v: Math.round(ton)}
      ]
    };
  }

  /* genre grammatical des noms de genres, pour éviter « c'est du comédie » */
  var FEM = {35:1, 10749:1, 12:1, 16:1, 878:1, 10752:1, 36:1, 10402:1};
  function duGenre(id) {
    var n = (GENRE_FR[id] || '').toLowerCase();
    return (FEM[id] ? 'de la ' : 'du ') + n;
  }
  function aGenre(id) {
    var n = (GENRE_FR[id] || '').toLowerCase();
    return (FEM[id] ? 'à la ' : 'au ') + n;
  }

  var SOC = {seul:'en solo', couple:'à deux', amis:'entre amis', famille:'en famille',
    enfants:'avec des enfants', novice:'avec quelqu\u2019un qui regarde peu de films'};

  function why(m, sc, p, details) {
    var gs = (m.genre_ids || []);
    var bits = [];
    var hits = gs.filter(function (g) { return p.genres.indexOf(g) > -1; });
    if (p.pair && p.pair.every(function (g) { return gs.indexOf(g) > -1; })) {
      bits.push('il croise exactement ' + p.pair.map(function (g) { return GENRE_FR[g].toLowerCase(); }).join(' et '));
    } else if (hits.length >= 2) {
      bits.push('c\u2019est ' + duGenre(hits[0]) + ' mêlé ' + aGenre(hits[1]));
    } else if (hits.length === 1) {
      bits.push('c\u2019est ' + duGenre(hits[0]));
    }
    var h = heatOf(gs), asked = INT_WANT[p.intensity]; if (asked == null) asked = 2.7;
    var gap = Math.abs(h - asked);
    bits.push(gap < 0.55 ? 'une intensité ' + INT_TXT[p.intensity] + ', exactement ton niveau'
      : gap < 1.2 ? 'une intensité proche de ton niveau (' + INT_TXT[p.intensity] + ' demandée)'
      : h > asked ? 'un cran au-dessus de l\u2019intensité demandée'
      : 'un cran en dessous de l\u2019intensité demandée');
    if (details && details.runtime) {
      bits.push(p.freeRuntime ? fmt(details.runtime)
        : fmt(details.runtime) + (Math.abs(details.runtime - p.ideal) <= 12 ? ', pile ta durée' : ', dans ton créneau'));
    }
    bits.push('noté ' + m.vote_average.toFixed(1) + '/10 sur ' + m.vote_count.toLocaleString('fr-FR') + ' votes');
    if (p.social) bits.push('ça tient ' + SOC[p.social]);
    return bits.join(' · ') + '.';
  }

  function fmt(m) { return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0'); }

  /* élargissement progressif : on garde le cap, on ouvre les vannes */
  /* on lâche du plus secondaire au plus essentiel : notoriété → époque → durée → langue → genre */
  function widen(p, round) {
    if (!round) return p;
    var w = JSON.parse(JSON.stringify(p));
    w.note = Math.max(5.6, p.note - 0.3 * round);
    w.votes = [Math.max(120, Math.round(p.votes[0] / (1 + round))), p.votes[1] ? p.votes[1] * (1 + round) : null];
    if (round >= 2) w.years = [Math.max(1920, p.years[0] - 8 * (round - 1)), Math.min(2030, p.years[1] + 8 * (round - 1))];
    if (round >= 3) w.runtime = [Math.max(MIN_LONG, p.runtime[0] - 20 * (round - 2)), Math.min(400, p.runtime[1] + 25 * (round - 2))];
    if (round >= 4) w.lang = null;
    if (round >= 5) w.pair = null;
    if (round >= 6) w.without = [];
    return w;
  }
  var STEPS = ['', 'la notoriété', 'les années de sortie', 'la durée', 'la langue', 'le croisement de genres', 'tout le reste'];
  /* relance demandée */
  var RELAX_MSG = ['', 'Je garde ton cap et j\u2019ouvre sur la notoriété.',
    'J\u2019élargis les années de sortie — ton registre ne bouge pas.',
    'J\u2019ouvre aussi la durée, toujours dans le même genre.',
    'J\u2019ouvre à toutes les langues pour continuer à te proposer autre chose.',
    'Je décroise les genres : ton mood reste le même, les profils changent.',
    'On est au bout du filon : voici ce qui reste de plus proche de tes réponses.'];
  function relaxMessage(round) { return RELAX_MSG[Math.min(round, RELAX_MSG.length - 1)]; }
  /* repli automatique, jamais demandé par l'utilisateur : on le dit tel quel */
  function fallbackMessage(round) {
    var opened = STEPS.slice(1, Math.min(round, STEPS.length - 1) + 1).filter(Boolean);
    return 'Trop peu de films correspondent à ce chemin exact. Pour t\u2019en proposer quand même, j\u2019ai ouvert '
      + opened.join(', ').replace(/,([^,]*)$/, ' et$1') + ' — le reste de tes réponses est intact.';
  }

  /* Le meilleur match reste le meilleur. Les alternatives, elles, doivent
     apporter un vrai contraste : on pénalise légèrement un candidat qui
     ressemble trop à ce qui est déjà retenu — jamais assez pour faire passer
     un film moins pertinent devant un film nettement plus juste. */
  function proximite(a, b) {
    var x = a.movie.genre_ids || [], y = b.movie.genre_ids || [];
    if (!x.length || !y.length) return 0;
    var inter = x.filter(function (g) { return y.indexOf(g) > -1; }).length;
    return inter / Math.max(1, Math.min(x.length, y.length));
  }
  function diversify(list, n) {
    if (list.length <= 1) return list.slice(0, n);
    var picked = [list[0]], rest = list.slice(1);
    while (picked.length < n && rest.length) {
      var bestI = 0, bestV = -1e9;
      rest.forEach(function (c, i) {
        var pen = 0;
        picked.forEach(function (q) { pen += proximite(c, q); });
        var v = c.raw - (pen / picked.length) * 9;
        if (v > bestV) { bestV = v; bestI = i; }
      });
      picked.push(rest.splice(bestI, 1)[0]);
    }
    return picked;
  }
  /* En quoi cette alternative diffère du meilleur match, dit en clair.
     Chaque étiquette n'est utilisée qu'une fois : cinq « Plus intense »
     n'apprendraient rien à l'utilisateur. */
  function profilOf(e, ref, used) {
    var gs = e.movie.genre_ids || [], rg = ref.movie.genre_ids || [];
    var h = heatOf(gs), hr = heatOf(rg);
    var cand = [];
    if (gs.indexOf(G.comedie) > -1 && rg.indexOf(G.comedie) === -1) cand.push('Plus drôle');
    if (h >= hr + 0.6) cand.push('Plus intense');
    if (h <= hr - 0.6) cand.push('Plus doux');
    if (e.runtime && ref.runtime && e.runtime <= ref.runtime - 18) cand.push('Plus court');
    if (e.runtime && ref.runtime && e.runtime >= ref.runtime + 25) cand.push('Plus ample');
    if (e.movie.popularity > ref.movie.popularity * 1.6) cand.push('Plus grand public');
    if (e.movie.popularity * 1.6 < ref.movie.popularity) cand.push('Plus confidentiel');
    if (e.movie.vote_average >= ref.movie.vote_average + 0.3) cand.push('Mieux noté');
    gs.filter(function (g) { return rg.indexOf(g) === -1 && GENRE_FR[g]; })
      .forEach(function (g) { cand.push('Plutôt ' + GENRE_FR[g].toLowerCase()); });
    var an = parseInt((e.movie.release_date || '').slice(0, 4), 10);
    var ar = parseInt((ref.movie.release_date || '').slice(0, 4), 10);
    if (an && ar && an >= ar + 12) cand.push('Plus récent');
    if (an && ar && an <= ar - 12) cand.push('Plus ancien');
    cand.push('Autre angle');
    for (var i = 0; i < cand.length; i++) if (used.indexOf(cand[i]) === -1) return cand[i];
    return 'Autre angle';
  }

  /* le parcours complet : plusieurs pages de candidats → score → N films → détails exacts */
  function recommend(path, count, exclude, round, asked) {
    round = round || 0;
    if (asked === undefined) asked = round;
    var strict = profile(path);
    var p = widen(strict, round);
    var first = 1 + round * 3;
    var pages = [first, first + 1, first + 2, first + 3, first + 4, first + 5].map(function (n) {
      return api('/discover/movie', query(p, n)).catch(function () { return {results: []}; });
    });
    return Promise.all(pages).then(function (rs) {
      var seen = {}, pool = [];
      rs.forEach(function (r) {
        (r.results || []).forEach(function (m) {
          if (!m.poster_path || seen[m.id]) return;
          if ((exclude || []).indexOf(m.id) > -1) return;
          if (!eligible(m, p)) return;   /* hors critères : écarté, pas seulement mal noté */
          seen[m.id] = 1; pool.push(m);
        });
      });
      /* filet de sécurité : jamais d'écran vide, on élargit tout seul — et on le signale */
      if (pool.length < (count || 5) && round < 6) {
        return recommend(path, count, exclude, round + 1, (asked === undefined ? round : asked));
      }
      var n = count || 5;
      var scored = pool.map(function (m) {
        var sc = scoreOne(m, strict);
        return {movie: m, raw: sc.raw, global: sc.global, criteria: sc.criteria};
      }).sort(function (a, b) { return b.raw - a.raw || b.movie.vote_count - a.movie.vote_count; });
      /* on vérifie la durée EXACTE d'une présélection large, puis on re-classe */
      var shortlist = scored.slice(0, Math.min(scored.length, n * 3));
      return Promise.all(shortlist.map(function (e) {
        return api('/movie/' + e.movie.id, {append_to_response: 'credits'}).catch(function () { return null; });
      })).then(function (details) {
        shortlist.forEach(function (e, i) {
          var d = details[i];
          e.details = d;
          e.runtime = d && d.runtime ? d.runtime : null;
          e.dureeTxt = e.runtime ? fmt(e.runtime) : '—';
          if (strict.freeRuntime) {
            /* la durée n'a pas été contrainte : elle ne pèse pas, sauf pour
               écarter ce qui n'est pas un long métrage */
            e.freeRuntime = true;
            if (e.runtime && e.runtime < MIN_LONG) e.raw = e.raw * 0.35;
          } else {
            /* durée choisie = vrai filtre : hors créneau, le film ne peut plus
               remonter dans le classement, même excellent par ailleurs. */
            var duree, marge;
            if (!e.runtime) duree = 55;
            else if (e.runtime < strict.runtime[0] || e.runtime > strict.runtime[1]) {
              marge = e.runtime < strict.runtime[0]
                ? strict.runtime[0] - e.runtime : e.runtime - strict.runtime[1];
              duree = clamp(24 - marge * 0.8, 2, 24);
            } else duree = clamp(100 - Math.abs(e.runtime - strict.ideal) * 1.5, 50, 100);
            e.criteria = e.criteria.concat([{k: 'duree', l: 'Durée', v: Math.round(duree)}]);
            e.raw = e.raw * 0.76 + duree * 0.24;
          }
          e.global = Math.round(clamp(e.raw, 5, 99));
          e.realisateur = d && d.credits ? (d.credits.crew || []).filter(function (c) { return c.job === 'Director'; })[0] : null;
          e.genresTxt = d && d.genres ? d.genres.map(function (g) { return g.name; }).slice(0, 3).join(', ')
            : (e.movie.genre_ids || []).map(function (g) { return GENRE_FR[g]; }).filter(Boolean).slice(0, 3).join(', ');
        });
        shortlist.sort(function (a, b) { return b.raw - a.raw || b.movie.vote_count - a.movie.vote_count; });
        /* durée réelle : on exclut pour de bon, on ne se contente pas de rétrograder.
           Si le filtre ne laisse plus rien, on garde le classement complet plutôt
           qu'un écran vide — et l'élargissement automatique prendra le relais. */
        var dansCreneau = shortlist.filter(function (e) {
          if (e.runtime && e.runtime < MIN_LONG) return false;
          if (strict.freeRuntime) return true;
          if (!e.runtime) return false;
          return e.runtime >= strict.runtime[0] && e.runtime <= strict.runtime[1];
        });
        if (dansCreneau.length >= Math.min(n, 3)) shortlist = dansCreneau;
        else if (dansCreneau.length) shortlist = dansCreneau.concat(
          shortlist.filter(function (e) { return dansCreneau.indexOf(e) === -1; }));
        shortlist.sort(function (a, b) { return b.raw - a.raw || b.movie.vote_count - a.movie.vote_count; });

        var top = diversify(shortlist, n);
        /* le meilleur reste en tête ; les alternatives se rangent par score
           décroissant, pour que l'affichage soit cohérent avec les chiffres */
        var tete = top.slice(0, 1);
        var suite = top.slice(1).sort(function (a, b) { return b.raw - a.raw; });
        top = tete.concat(suite);
        var vus = [];
        top.forEach(function (e, i) {
          e.rank = i;
          if (i === 0) e.profil = 'Le meilleur choix';
          else { e.profil = profilOf(e, top[0], vus); vus.push(e.profil); }
          e.why = why(e.movie, e, strict, e.details);
        });
        var auto = round > asked;
        return {
          results: top, profile: p, total: pool.length,
          /* les filtres montrés restent ceux des réponses tant que l'utilisateur n'a rien demandé */
          chips: filterChips(auto ? strict : p),
          round: asked, autoWidened: auto,
          relaxMessage: auto ? fallbackMessage(round) : relaxMessage(round)
        };
      });
    });
  }

  /* ---------- rayons du catalogue : requêtes explicites, critère affiché ---------- */
  var SHELVES = [
    {id:'top', l:'Les mieux notés de tous les temps', crit:'note ≥ 8 · 5 000+ votes', q:{'vote_count.gte':5000, 'vote_average.gte':8, sort_by:'vote_average.desc'}},
    {id:'now', l:'Sortis récemment', crit:'2025+ · 300+ votes · les mieux notés', q:{'primary_release_date.gte':'2025-01-01', 'vote_count.gte':300, sort_by:'vote_average.desc'}},
    {id:'rire', l:'Ça fait rire', crit:'comédie · note ≥ 7 · 2 000+ votes', q:{with_genres:35, 'vote_average.gte':7, 'vote_count.gte':2000, sort_by:'vote_average.desc'}},
    {id:'peur', l:'Ça fait peur', crit:'horreur / thriller · note ≥ 7 · 1 500+ votes', q:{with_genres:'27|53', 'vote_average.gte':7, 'vote_count.gte':1500, sort_by:'vote_average.desc'}},
    {id:'cerveau', l:'Ça fait réfléchir', crit:'mystère / drame · note ≥ 7.6 · 1 500+ votes', q:{with_genres:'9648|18', 'vote_average.gte':7.6, 'vote_count.gte':1500, sort_by:'vote_average.desc'}},
    {id:'spectacle', l:'Grand spectacle', crit:'action / aventure / SF · note ≥ 7.3 · 4 000+ votes', q:{with_genres:'28|12|878', 'vote_average.gte':7.3, 'vote_count.gte':4000, sort_by:'vote_average.desc'}},
    {id:'famille', l:'Toute la famille', crit:'famille / animation · note ≥ 7.3 · 2 000+ votes', q:{with_genres:'10751|16', 'vote_average.gte':7.3, 'vote_count.gte':2000, sort_by:'vote_average.desc'}},
    {id:'court', l:'Moins de 1h40', crit:'durée ≤ 100 min · note ≥ 7.5 · 1 000+ votes', q:{'with_runtime.lte':100, 'vote_average.gte':7.5, 'vote_count.gte':1000, sort_by:'vote_average.desc'}},
    {id:'fr', l:'Cinéma français', crit:'langue fr · note ≥ 7.2 · 800+ votes', q:{with_original_language:'fr', 'vote_average.gte':7.2, 'vote_count.gte':800, sort_by:'vote_average.desc'}},
    {id:'monde', l:'Cinéma du monde', crit:'ko / ja / es / it · note ≥ 7.5 · 800+ votes', q:{with_original_language:'ko|ja|es|it', 'vote_average.gte':7.5, 'vote_count.gte':800, sort_by:'vote_average.desc'}},
    {id:'pepites', l:'Pépites peu vues', crit:'note ≥ 7.5 · 250 à 1 200 votes', q:{'vote_average.gte':7.5, 'vote_count.gte':250, 'vote_count.lte':1200, sort_by:'vote_average.desc'}}
  ];
  function shelf(def, page) { return api('/discover/movie', Object.assign({page: page || 1}, def.q)); }
  function search(q, page) { return api('/search/movie', {query: q, page: page || 1}); }
  function movie(id) { return api('/movie/' + id, {append_to_response: 'credits'}); }

  /* fiche complète : synopsis, bande-annonce, distribution */
  function full(id) {
    return api('/movie/' + id, {append_to_response: 'videos,credits', include_video_language: 'fr,en,null'})
      .then(function (d) {
        var vids = (d.videos && d.videos.results) || [];
        var yt = vids.filter(function (v) { return v.site === 'YouTube'; });
        var pick = yt.filter(function (v) { return v.type === 'Trailer' && v.iso_639_1 === 'fr'; })[0]
          || yt.filter(function (v) { return v.type === 'Trailer'; })[0]
          || yt.filter(function (v) { return v.type === 'Teaser'; })[0] || yt[0];
        var crew = (d.credits && d.credits.crew) || [];
        d.trailer = pick ? {key: pick.key, name: pick.name} : null;
        d.director = crew.filter(function (c) { return c.job === 'Director'; })[0] || null;
        d.writers = crew.filter(function (c) { return c.job === 'Screenplay' || c.job === 'Writer'; }).slice(0, 2);
        d.cast = ((d.credits && d.credits.cast) || []).slice(0, 10);
        return d;
      });
  }

  return {setKey: setKey, key: key, setRunToken: setRunToken,
    usingProxy: function () { return mode === 'proxy'; },
    poster: poster, GENRE_FR: GENRE_FR, TOTAL: TOTAL, questionAt: questionAt,
    profile: profile, filterChips: filterChips, recommend: recommend, relaxMessage: relaxMessage,
    SHELVES: SHELVES, shelf: shelf, search: search, movie: movie, full: full, fmt: fmt};
})();
