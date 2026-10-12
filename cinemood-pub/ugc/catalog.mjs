// Catalogue fictif servi à la place de TMDB pendant la capture : titres, affiches,
// équipes et notes sont inventés. Les 8 premiers films (science-fiction / aventure
// spatiale) sont ceux que le parcours « M'évader » doit faire remonter.
const G = { action: 28, aventure: 12, animation: 16, comedie: 35, crime: 80, drame: 18, famille: 10751,
  fantastique: 14, histoire: 36, horreur: 27, musique: 10402, mystere: 9648, romance: 10749, sf: 878,
  thriller: 53, guerre: 10752 };
export const GENRE_NAMES = { 28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime', 18: 'Drame',
  10751: 'Familial', 14: 'Fantastique', 36: 'Histoire', 27: 'Horreur', 10402: 'Musique', 9648: 'Mystère',
  10749: 'Romance', 878: 'Science-Fiction', 53: 'Thriller', 10752: 'Guerre' };

const KW = {
  space: ['space', 'spaceship', 'planet', 'astronaut', 'space travel', 'future', 'alien', 'space station', 'exploration'],
  aventure: ['adventure', 'expedition', 'journey', 'desert', 'island', 'treasure', 'survival'],
  fantastique: ['magic', 'kingdom', 'dragon', 'quest', 'myth'],
  comedie: ['friendship', 'road trip', 'family', 'misunderstanding'],
  horreur: ['haunted house', 'ghost', 'supernatural', 'possession'],
  thriller: ['investigation', 'conspiracy', 'chase'],
  drame: ['family', 'grief', 'coming of age', 'small town'],
  romance: ['love', 'romance', 'first love'],
  crime: ['heist', 'police', 'gangster'],
  animation: ['animation', 'talking animals', 'friendship'],
  histoire: ['biography', 'true story', 'period piece'],
  musique: ['music', 'musician', 'band'],
  guerre: ['world war ii', 'soldier'],
  mystere: ['secret', 'mystery', 'puzzle'],
};

// [titre, année, durée, genres, langue, note, votes, popularité, palette, synopsis, réalisateur]
const HERO = [
  ['L’Écho des étoiles', 2019, 124, [G.sf, G.aventure, G.drame], 'en', 7.9, 6840, 88, 0,
    'Une astronome capte un signal qui ne vient d’aucune étoile connue. Pour le suivre, elle embarque avec un équipage réduit vers la bordure du système solaire.', 'Inès Calvar'],
  ['Le Dernier Signal', 2016, 118, [G.sf, G.aventure, G.mystere], 'en', 7.6, 5210, 64, 1,
    'Seule à bord d’une station en orbite, une ingénieure reçoit un message daté de demain. Chaque réponse qu’elle envoie modifie ce qui l’attend.', 'Tomas Reyhl'],
  ['Orbite basse', 2021, 112, [G.sf, G.aventure, G.thriller], 'en', 7.4, 3980, 71, 2,
    'Après une collision en orbite, deux astronautes que tout oppose n’ont que quatre-vingt-dix minutes pour rejoindre la dernière capsule intacte.', 'Maya Okoro'],
  ['Mer de sable', 2014, 127, [G.sf, G.aventure], 'fr', 7.5, 2730, 39, 3,
    'Sur une planète couverte de dunes, une cartographe et son frère traversent le désert pour retrouver la colonie qui a cessé d’émettre.', 'Louis Ferrand'],
  ['Les Cartographes', 2018, 109, [G.sf, G.aventure, G.famille], 'en', 7.3, 2410, 42, 4,
    'Une famille de géomètres de l’espace dresse la carte d’un monde inconnu, jusqu’au jour où la carte commence à se redessiner seule.', 'Hana Seo'],
  ['Au-delà des dunes', 2022, 121, [G.sf, G.aventure], 'en', 7.1, 1980, 55, 5,
    'Un convoi traverse un océan de sable vers une cité que personne n’a jamais vue. Le guide, lui, prétend l’avoir quittée.', 'Ada Lindqvist'],
  ['Cap sur l’aurore', 2017, 115, [G.sf, G.aventure], 'es', 7.0, 1640, 33, 6,
    'Deux pilotes de cargo spatial, un chargement qu’ils n’ont pas le droit d’ouvrir, et une aurore qui ne se lève qu’une fois par siècle.', 'Rafael Cuenca'],
  ['La Septième Lune', 2020, 126, [G.sf, G.aventure, G.fantastique], 'ja', 7.2, 1320, 29, 7,
    'Un garçon de la station minière découvre qu’une des lunes de sa planète n’apparaît sur aucune carte. Il décide d’aller y poser le pied.', 'Kenji Arima'],
];

const OTHERS = [
  ['Les Petites Heures', 2015, 97, [G.comedie, G.romance], 'fr', 7.0, 2100], ['Rue des Lilas', 2009, 104, [G.comedie, G.famille], 'fr', 6.7, 1500],
  ['Le Grand Détour', 2018, 101, [G.comedie, G.aventure], 'en', 6.9, 3300], ['Mauvais Plan', 2012, 99, [G.comedie, G.crime], 'en', 6.8, 4100],
  ['La Maison du bout', 2017, 102, [G.horreur, G.thriller], 'en', 6.6, 3800], ['Ce qui dort', 2021, 96, [G.horreur, G.mystere], 'ko', 6.9, 1700],
  ['Dix-Neuf Jours', 2013, 128, [G.drame, G.histoire], 'fr', 7.7, 2600], ['L’Hiver de Clara', 2019, 113, [G.drame, G.romance], 'fr', 7.2, 1200],
  ['La Ligne rouge du port', 2011, 132, [G.crime, G.thriller], 'en', 7.5, 8700], ['Sans retour', 2016, 116, [G.action, G.thriller], 'en', 6.8, 9100],
  ['Le Casse du siècle', 2008, 118, [G.crime, G.comedie], 'en', 7.1, 12000], ['Les Vents du nord', 2020, 141, [G.drame, G.guerre], 'da', 7.6, 1900],
  ['Petit Renard', 2016, 88, [G.animation, G.famille], 'fr', 7.4, 3100], ['Le Royaume de verre', 2014, 108, [G.fantastique, G.aventure], 'en', 7.0, 6500],
  ['Le Dragon de Kelm', 2010, 119, [G.fantastique, G.aventure, G.famille], 'en', 7.2, 8200], ['Nuit blanche à Séoul', 2019, 117, [G.thriller, G.crime], 'ko', 7.8, 4300],
  ['La Dernière Note', 2018, 123, [G.musique, G.drame], 'en', 7.5, 5100], ['Tempo', 2022, 106, [G.musique, G.comedie], 'fr', 6.9, 900],
  ['Les Témoins', 2004, 125, [G.mystere, G.thriller], 'en', 7.6, 15000], ['L’Île aux oiseaux', 2012, 94, [G.animation, G.aventure], 'ja', 7.9, 5600],
  ['Premier Été', 2021, 103, [G.drame, G.comedie], 'it', 7.1, 1100], ['Sous la glace', 2015, 111, [G.thriller, G.aventure], 'en', 6.7, 7400],
  ['Les Fugitifs', 1998, 121, [G.action, G.crime], 'en', 7.3, 18000], ['Le Bal des ombres', 1987, 109, [G.horreur, G.fantastique], 'en', 7.0, 6200],
  ['Comme avant', 2023, 99, [G.romance, G.drame], 'es', 6.8, 800], ['Grand Ciel', 2006, 135, [G.aventure, G.drame], 'en', 7.4, 9900],
  ['La Brigade', 2017, 114, [G.action, G.comedie], 'fr', 6.5, 2300], ['Le Fils du phare', 2010, 107, [G.drame, G.famille], 'fr', 7.3, 1400],
  ['Aux confins', 2002, 131, [G.sf, G.thriller], 'en', 7.0, 11000], ['Machine douce', 2023, 104, [G.sf, G.drame], 'en', 6.9, 2600],
  ['Les Héritiers du vent', 1994, 148, [G.histoire, G.guerre, G.drame], 'en', 7.8, 14000], ['Bonne Nuit Paris', 2011, 95, [G.comedie, G.romance], 'fr', 6.6, 1900],
  ['Le Secret de Léna', 2019, 110, [G.mystere, G.drame], 'de', 7.2, 1300], ['Les Enfants du canal', 1979, 102, [G.drame], 'fr', 7.6, 700],
  ['Haute Mer', 2013, 126, [G.aventure, G.action], 'en', 7.0, 8800], ['Le Rire des autres', 2024, 98, [G.comedie], 'fr', 6.8, 600],
  ['Les Monstres gentils', 2021, 92, [G.animation, G.comedie, G.famille], 'en', 7.3, 4700], ['Ville lumière', 2007, 119, [G.drame, G.musique], 'fr', 7.1, 2000],
];

function pick(list, n, seed) {
  const out = [];
  let s = seed;
  for (let i = 0; out.length < Math.min(n, list.length); i++) {
    s = (s * 9301 + 49297) % 233280;
    const k = list[s % list.length];
    if (!out.includes(k)) out.push(k);
  }
  return out;
}
const kwId = (name) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 900000, 7) + 100000;
const KEYS = { [G.sf]: 'space', [G.aventure]: 'aventure', [G.fantastique]: 'fantastique', [G.comedie]: 'comedie', [G.horreur]: 'horreur',
  [G.thriller]: 'thriller', [G.drame]: 'drame', [G.romance]: 'romance', [G.crime]: 'crime', [G.animation]: 'animation', [G.histoire]: 'histoire',
  [G.musique]: 'musique', [G.guerre]: 'guerre', [G.mystere]: 'mystere', [G.famille]: 'comedie', [G.action]: 'thriller' };
const FIRST = ['Lina', 'Marc', 'Sofia', 'Yanis', 'Elsa', 'Noah', 'Iris', 'Hugo', 'Maëlle', 'Ravi', 'Jade', 'Oskar', 'Nora', 'Kenzo', 'Alba', 'Théo'];
const LAST = ['Vasseur', 'Okafor', 'Lindgren', 'Moreau', 'Takeda', 'Rinaldi', 'Duval', 'Hartmann', 'Benali', 'Costa', 'Novak', 'Aubert'];

function build() {
  const films = [];
  const add = (row, i, hero) => {
    const [title, year, runtime, genres, lang, note, votes] = row;
    const id = (hero ? 9001 : 9101) + i;
    const kws = [];
    genres.forEach((g, k) => kws.push(...pick(KW[KEYS[g]] || [], hero && g === G.sf ? 5 : 2, id * 7 + k)));
    const names = [...new Set(kws)];
    const cast = [0, 1, 2, 3].map((k) => ({ id: id * 10 + k, name: `${FIRST[(id + k * 5) % FIRST.length]} ${LAST[(id * 3 + k) % LAST.length]}`, character: '', order: k }));
    films.push({
      id, title, original_title: title, original_language: lang, adult: false, video: false,
      overview: hero ? row[9] : `${title} : une histoire ${GENRE_NAMES[genres[0]].toLowerCase()} portée par ${cast[0].name} et ${cast[1].name}.`,
      release_date: `${year}-0${(id % 9) + 1}-1${id % 9}`,
      genre_ids: genres, runtime, vote_average: note, vote_count: votes,
      popularity: hero ? row[7] : Math.round(10 + (votes / 300) % 60),
      poster_path: `/cm${id}.png`, backdrop_path: `/cmb${id}.png`,
      palette: hero ? row[8] : (i * 3) % 8, hero,
      keywords: names.map((n) => ({ id: kwId(n), name: n })),
      director: hero ? row[10] : `${FIRST[(id * 7) % FIRST.length]} ${LAST[(id * 5) % LAST.length]}`,
      cast,
    });
  };
  HERO.forEach((r, i) => add(r, i, true));
  OTHERS.forEach((r, i) => add(r, i, false));
  return films;
}
export const FILMS = build();
export { kwId };
