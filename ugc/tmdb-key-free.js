// Nom de fichier du cache pour une URL TMDB, calculé sans le paramètre api_key.
const crypto = require('crypto');

function stripKey(url) {
  const u = new URL(url);
  u.searchParams.delete('api_key');
  return u.toString();
}

function cacheName(url) {
  const clean = stripKey(url);
  const ext = new URL(clean).hostname === 'image.tmdb.org' ? '.jpg' : '.json';
  return crypto.createHash('sha1').update(clean).digest('hex') + ext;
}

module.exports = { stripKey, cacheName };
