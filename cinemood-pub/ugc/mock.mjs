// Réponses façon TMDB tirées du catalogue fictif (catalog.mjs), avec les mêmes filtres
// que l'API réelle pour /discover/movie : le moteur du site les reçoit telles quelles.
import { FILMS, GENRE_NAMES, kwId } from './catalog.mjs';

const listFields = (f) => ({
  id: f.id, title: f.title, original_title: f.original_title, original_language: f.original_language, overview: f.overview,
  release_date: f.release_date, genre_ids: f.genre_ids, vote_average: f.vote_average, vote_count: f.vote_count,
  popularity: f.popularity, poster_path: f.poster_path, backdrop_path: f.backdrop_path, adult: false, video: false,
});

function details(f, append) {
  const d = Object.assign(listFields(f), {
    runtime: f.runtime, genres: f.genre_ids.map((id) => ({ id, name: GENRE_NAMES[id] })), tagline: '', status: 'Released',
    production_countries: [], spoken_languages: [], budget: 0, revenue: 0, imdb_id: null, homepage: '',
  });
  const a = (append || '').split(',');
  if (a.includes('credits')) d.credits = { cast: f.cast, crew: [{ id: f.id * 10 + 9, job: 'Director', department: 'Directing', name: f.director }] };
  if (a.includes('keywords')) d.keywords = { keywords: f.keywords };
  if (a.includes('videos')) d.videos = { results: [] };
  if (a.includes('release_dates')) d.release_dates = { results: [] };
  return d;
}

function discover(q) {
  let r = FILMS.slice();
  const num = (k) => (q.has(k) && q.get(k) !== '' ? parseFloat(q.get(k)) : null);
  const wg = q.get('with_genres');
  if (wg) {
    if (wg.includes('|')) { const any = wg.split('|').map(Number); r = r.filter((f) => any.some((g) => f.genre_ids.includes(g))); }
    else { const all = wg.split(',').map(Number); r = r.filter((f) => all.every((g) => f.genre_ids.includes(g))); }
  }
  const wo = q.get('without_genres');
  if (wo) { const no = wo.split(/[,|]/).filter(Boolean).map(Number); r = r.filter((f) => !no.some((g) => f.genre_ids.includes(g))); }
  const lim = [['vote_count.gte', (f, v) => f.vote_count >= v], ['vote_count.lte', (f, v) => f.vote_count <= v],
    ['vote_average.gte', (f, v) => f.vote_average >= v], ['with_runtime.gte', (f, v) => f.runtime >= v], ['with_runtime.lte', (f, v) => f.runtime <= v]];
  for (const [k, test] of lim) { const v = num(k); if (v !== null && !Number.isNaN(v)) r = r.filter((f) => test(f, v)); }
  const d0 = q.get('primary_release_date.gte') || q.get('release_date.gte'), d1 = q.get('primary_release_date.lte') || q.get('release_date.lte');
  if (d0) r = r.filter((f) => f.release_date >= d0);
  if (d1) r = r.filter((f) => f.release_date <= d1);
  const lang = q.get('with_original_language');
  if (lang) { const ls = lang.split('|'); r = r.filter((f) => ls.includes(f.original_language)); }
  const kws = q.get('with_keywords');
  if (kws) { const ids = kws.split(/[|,]/).map(Number); r = r.filter((f) => f.keywords.some((k) => ids.includes(k.id))); }
  const sort = q.get('sort_by') || 'popularity.desc';
  const key = { 'vote_average.desc': (f) => f.vote_average, 'vote_count.desc': (f) => f.vote_count,
    'primary_release_date.desc': (f) => f.release_date, 'popularity.desc': (f) => f.popularity }[sort] || ((f) => f.popularity);
  r.sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : a.id - b.id));
  const page = Math.max(1, parseInt(q.get('page') || '1', 10));
  const per = 20;
  return { page, results: r.slice((page - 1) * per, page * per).map(listFields), total_results: r.length, total_pages: Math.max(1, Math.ceil(r.length / per)) };
}

export function tmdb(pathname, q) {
  const p = pathname.replace(/^\/tmdb/, '').replace(/^\/3/, '');
  let m;
  if (p === '/discover/movie') return discover(q);
  if ((m = p.match(/^\/movie\/(\d+)$/))) {
    const f = FILMS.find((x) => x.id === +m[1]);
    return f ? details(f, q.get('append_to_response')) : null;
  }
  if ((m = p.match(/^\/movie\/(\d+)\/(keywords|credits|videos|similar|recommendations)$/))) {
    const f = FILMS.find((x) => x.id === +m[1]);
    if (!f) return null;
    if (m[2] === 'keywords') return { id: f.id, keywords: f.keywords };
    if (m[2] === 'credits') return details(f, 'credits').credits;
    if (m[2] === 'videos') return { id: f.id, results: [] };
    return { page: 1, results: [], total_pages: 1, total_results: 0 };
  }
  if (p === '/search/keyword') { const name = (q.get('query') || '').toLowerCase(); return { page: 1, results: [{ id: kwId(name), name }], total_pages: 1, total_results: 1 }; }
  if (p === '/search/movie') {
    const s = (q.get('query') || '').toLowerCase();
    const r = FILMS.filter((f) => f.title.toLowerCase().includes(s)).map(listFields);
    return { page: 1, results: r, total_pages: 1, total_results: r.length };
  }
  if (p === '/genre/movie/list') return { genres: Object.entries(GENRE_NAMES).map(([id, name]) => ({ id: +id, name })) };
  if (p.startsWith('/trending') || p.startsWith('/movie/')) return discover(new URLSearchParams('sort_by=popularity.desc'));
  return { page: 1, results: [], total_pages: 1, total_results: 0 };
}
