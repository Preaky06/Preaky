// Télécharge chaque URL de tmdb-requests.txt (sans clé) dans tmdb-cache/<sha1>.
// La clé TMDB vient du secret TMDB_KEY et n'est jamais écrite dans les fichiers.
const fs = require('fs');
const path = require('path');
const { cacheName } = require('./tmdb-key-free');

const KEY = process.env.TMDB_KEY;
if (!KEY) { console.error('TMDB_KEY manquant'); process.exit(1); }

const dir = path.join(__dirname, 'tmdb-cache');
fs.mkdirSync(dir, { recursive: true });
const urls = fs.readFileSync(path.join(__dirname, 'tmdb-requests.txt'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean);

(async () => {
  let failed = 0;
  for (const url of urls) {
    const file = path.join(dir, cacheName(url));
    if (fs.existsSync(file)) continue;
    const u = new URL(url);
    if (u.hostname === 'api.themoviedb.org') u.searchParams.set('api_key', KEY);
    try {
      const res = await fetch(u);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      console.log('ok  ', url);
    } catch (e) {
      failed++;
      console.log('FAIL', url, e.message);
    }
  }
  process.exit(failed ? 1 : 0);
})();
