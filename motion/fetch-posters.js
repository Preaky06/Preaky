// Télécharge les affiches utilisées dans le motion design depuis TMDB.
// Usage : TMDB_KEY=ta_cle_api node fetch-posters.js
// Les fichiers vont dans posters/<slug>.jpg ; index.html les charge automatiquement.
const fs = require('fs');
const path = require('path');

const KEY = process.env.TMDB_KEY;
if (!KEY) { console.error('TMDB_KEY manquant'); process.exit(1); }

// slug -> [titre de recherche, année, id TMDB facultatif quand la recherche est ambiguë]
const FILMS = {
  'it-follows': ['It Follows', 2014],
  'insidious': ['Insidious', 2010],
  'babadook': ['The Babadook', 2014],
  'oculus': ['Oculus', 2013],
  'jane-doe': ['The Autopsy of Jane Doe', 2016],
  'interstellar': ['Interstellar', 2014],
  'parasite': ['Parasite', 2019],
  'la-la-land': ['La La Land', 2016],
  'mad-max-fury-road': ['Mad Max: Fury Road', 2015],
  'spider-verse': ['Spider-Man: Into the Spider-Verse', 2018],
  'get-out': ['Get Out', 2017],
  'intouchables': ['Intouchables', 2011],
  'dune': ['Dune', 2021],
  'the-dark-knight': ['The Dark Knight', 2008],
  'chihiro': ['Spirited Away', 2001],
  'whiplash': ['Whiplash', 2014],
  'john-wick': ['John Wick', 2014],
  'inception': ['Inception', 2010],
  'everything-everywhere': ['Everything Everywhere All at Once', 2022],
  'blade-runner-2049': ['Blade Runner 2049', 2017],
  'joker': ['Joker', 2019],
  'oppenheimer': ['Oppenheimer', 2023],
  'drive': ['Drive', 2011, 64690],
};

const OUT = path.join(__dirname, 'posters');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  let failed = 0;
  for (const [slug, [title, year, id]] of Object.entries(FILMS)) {
    try {
      let hit;
      if (id) {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${KEY}&language=fr-FR`);
        if (!res.ok) throw new Error(`film HTTP ${res.status}`);
        hit = await res.json();
      } else {
        const q = new URLSearchParams({ api_key: KEY, query: title, year: String(year), language: 'fr-FR' });
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?${q}`);
        if (!res.ok) throw new Error(`recherche HTTP ${res.status}`);
        hit = (await res.json()).results.find(r => r.poster_path);
      }
      if (!hit || !hit.poster_path) throw new Error('aucune affiche');
      const img = await fetch(`https://image.tmdb.org/t/p/w780${hit.poster_path}`);
      if (!img.ok) throw new Error(`image HTTP ${img.status}`);
      fs.writeFileSync(path.join(OUT, `${slug}.jpg`), Buffer.from(await img.arrayBuffer()));
      console.log(`ok   ${slug}  (${hit.title})`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${slug}  ${e.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
})();
