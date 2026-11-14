// Cloudflare Pages Function : POST /api/license
// Relaie la vérification de licence vers le point d'accès public du prestataire.
// Aucune clé API, aucun secret, aucune variable d'environnement requise.
import config from '../../site.config.mjs';
import { handleLicenseRequest } from '../../server/license.mjs';

export const onRequest = ({ request }) => handleLicenseRequest(request, config);
