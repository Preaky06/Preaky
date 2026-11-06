// Alternative à Cloudflare Pages : Cloudflare Workers avec fichiers statiques.
// Sert dist/ et répond à /api/license. Voir wrangler.jsonc.
import config from '../site.config.mjs';
import { handleLicenseRequest } from '../server/license.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/license') return handleLicenseRequest(request, config);
    return env.ASSETS.fetch(request);
  },
};
