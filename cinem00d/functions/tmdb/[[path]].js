/* CinéMood — proxy TMDB (Cloudflare Pages Functions).
   assets/js/tmdb.js appelle /tmdb/<chemin>?<paramètres> ; ce proxy ajoute la clé côté serveur.
   La clé ne vit que dans la variable d'environnement TMDB_KEY du projet Cloudflare :
   clé API v3 (32 caractères) ou jeton de lecture v4 (« eyJ… »), les deux sont acceptés.
   Seuls les chemins réellement utilisés par le site passent : le proxy ne sert pas
   de relais ouvert vers tout TMDB. */

const ALLOWED = [/^discover\/movie$/, /^search\/movie$/, /^movie\/\d+$/];
const UPSTREAM = 'https://api.themoviedb.org/3/';

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}
  });
}

export async function onRequestGet({request, params, env}) {
  const path = [].concat(params.path || []).join('/');
  if (!ALLOWED.some((re) => re.test(path))) return json(404, {error: 'chemin non autorisé'});

  const key = env.TMDB_KEY;
  if (!key) return json(503, {error: 'TMDB_KEY manquante côté serveur'});

  const target = new URL(UPSTREAM + path);
  new URL(request.url).searchParams.forEach((v, k) => {
    if (k !== 'api_key') target.searchParams.set(k, v);
  });
  const headers = {Accept: 'application/json'};
  if (key.length > 40) headers.Authorization = 'Bearer ' + key;
  else target.searchParams.set('api_key', key);

  let res;
  try {
    res = await fetch(target, {headers, cf: {cacheTtl: 3600, cacheEverything: true}});
  } catch (e) {
    return json(502, {error: 'TMDB injoignable'});
  }
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': res.ok ? 'public, max-age=600' : 'no-store'
    }
  });
}
