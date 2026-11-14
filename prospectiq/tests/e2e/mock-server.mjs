// Serveur de simulation des sources externes pour les tests de bout en bout.
// Toutes les entreprises, personnes et sites sont FICTIFS.
//   /sirene/*  → API Recherche d'entreprises
//   /bodacc/*  → BODACC (opendatasoft)
//   /geo/*     → geo.api.gouv.fr
//   /web/*     → sites web (hôte d'origine transmis dans X-Test-Host)
import http from 'node:http';

const months = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};

const base = (siren, over = {}) => ({
  siren,
  nom_complet: 'ENTREPRISE FICTIVE',
  activite_principale: '56.10A',
  section_activite_principale: 'I',
  nature_juridique: '5710',
  categorie_entreprise: 'PME',
  tranche_effectif_salarie: '03',
  annee_tranche_effectif_salarie: '2024',
  date_creation: '2012-04-01',
  date_mise_a_jour: months(2),
  etat_administratif: 'A',
  nombre_etablissements_ouverts: 1,
  siege: { siret: `${siren}00011`, adresse: '1 RUE DE L’EXEMPLE 69002 LYON', code_postal: '69002', libelle_commune: 'LYON', departement: '69', region: '84', latitude: '45.75', longitude: '4.83', liste_enseignes: [] },
  dirigeants: [{ type_dirigeant: 'personne physique', nom: 'FICTIF', prenoms: 'DOMINIQUE', annee_de_naissance: '1975', qualite: 'Président' }],
  complements: {},
  finances: {},
  matching_etablissements: [],
  opposition_diffusion_commerciale: false,
  ...over,
});

export const COMPANIES = [
  base('100000001', { nom_complet: 'LE COMPTOIR DEMO', date_creation: months(6), siege: { ...base('100000001').siege, liste_enseignes: ['LE COMPTOIR DEMO'] } }),
  base('100000002', { nom_complet: 'BRASSERIE EXEMPLE', tranche_effectif_salarie: '11' }),
  base('100000003', { nom_complet: 'TRAITEUR OPPOSANT', opposition_diffusion_commerciale: true }),
  base('100000004', { nom_complet: 'CAFE PROCEDURE' }),
];

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};
const html = (res, body, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
};

const SITES = {
  'www.comptoirdemo.fr': {
    '/': `<!doctype html><html><head><title>Le Comptoir Demo - restaurant</title></head><body><h1>Le Comptoir Demo</h1>
      <p>Cuisine du marché. Réservations au 04 00 00 00 01 ou contact@comptoirdemo.fr — gerant.prive@comptoirdemo.fr</p>
      <a href="/mentions-legales">Mentions légales</a><footer>© 2019 Le Comptoir Demo</footer></body></html>`,
    '/mentions-legales': `<html><body><h1>Mentions légales</h1><p>SAS LE COMPTOIR DEMO — SIREN 100 000 001 — RCS Lyon</p></body></html>`,
    '/robots.txt': 'User-agent: *\nAllow: /\n',
    '/sitemap.xml': '<?xml version="1.0"?><urlset><url><loc>https://www.comptoirdemo.fr/</loc><lastmod>2021-05-04</lastmod></url></urlset>',
  },
  // Outil d'audit gratuit : un site imparfait, et un site qui refuse les robots.
  'www.audit-demo.fr': {
    '/': `<!doctype html><html><head><title>Audit Demo</title></head><body><h1>Atelier Audit Demo</h1>
      <p>Appelez le 04 00 00 00 99 ou écrivez à contact@audit-demo.fr</p><footer>© 2018 Atelier Audit Demo</footer></body></html>`,
    '/robots.txt': 'User-agent: *\nAllow: /\n',
  },
  'www.robots-interdit.fr': {
    '/': '<html><head><title>Site privé</title></head><body><h1>Privé</h1></body></html>',
    '/robots.txt': 'User-agent: ProSpectre-Analyse\nDisallow: /\n',
  },
};

let hits = { sirene: 0, bodacc: 0, geo: 0, web: 0 };

export function startMock(port = 4010) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const p = url.pathname;
    if (p === '/__hits') return json(res, 200, hits);

    if (p.startsWith('/sirene/')) {
      hits.sirene++;
      const qv = url.searchParams.get('q') || '';
      if (/^\d{9}$/.test(qv)) {
        // Fiche par SIREN : les SIREN « 2000000xx » sont générés à la volée (test des quotas)
        const known = COMPANIES.find((c) => c.siren === qv);
        const c = known || (qv.startsWith('2') ? base(qv, { nom_complet: `SOCIETE QUOTA ${qv.slice(-2)}` }) : null);
        return json(res, 200, { results: c ? [c] : [], total_results: c ? 1 : 0, page: 1, per_page: 1, total_pages: c ? 1 : 0 });
      }
      const naf = url.searchParams.get('activite_principale') || '';
      const list = !naf || naf.includes('56.10A') ? COMPANIES : [];
      return json(res, 200, { results: list, total_results: list.length, page: 1, per_page: 25, total_pages: list.length ? 1 : 0 });
    }

    if (p.startsWith('/bodacc/')) {
      hits.bodacc++;
      const where = url.searchParams.get('where') || '';
      const today = new Date().toISOString().slice(0, 10);
      // Radar : annonces récentes d'un département (zone d'une alerte)
      if (where.includes('numerodepartement')) {
        const zone = where.includes("'69'")
          ? [
              { id: 'Z1', dateparution: today, familleavis: 'creation', registre: ['100 000 002', '100000002'], cp: '69002', ville: 'Lyon', url_complete: 'https://www.bodacc.fr/' },
              { id: 'Z2', dateparution: today, familleavis: 'creation', registre: ['100000003'], cp: '69002', ville: 'Lyon' }, // opposition : doit être exclue
              { id: 'Z3', dateparution: today, familleavis: 'vente', registre: ['200000077'], cp: '69002', ville: 'Lyon' },
              { id: 'Z4', dateparution: today, familleavis: 'creation', registre: ['200000078'], cp: '69003', ville: 'Lyon' }, // hors code postal
            ]
          : [];
        return json(res, 200, { total_count: zone.length, results: zone });
      }
      const sirens = [...where.matchAll(/registre="(\d{9})"/g)].map((m) => m[1]);
      const results = [];
      if (sirens.includes('100000001')) results.push({ id: 'A1', dateparution: months(5), familleavis: 'creation', registre: ['100 000 001', '100000001'], url_complete: 'https://www.bodacc.fr/' });
      if (sirens.includes('100000002')) results.push({ id: 'M2', dateparution: today, familleavis: 'modification', registre: ['100000002'], modificationsgenerales: JSON.stringify({ descriptif: 'Modification survenue sur l’administration : nouveau gérant' }), url_complete: 'https://www.bodacc.fr/' });
      if (sirens.includes('100000004')) results.push({ id: 'A4', dateparution: months(3), familleavis: 'collective', registre: ['100000004'], jugement: JSON.stringify({ nature: 'Jugement d’ouverture d’une procédure de redressement judiciaire' }) });
      return json(res, 200, { total_count: results.length, results });
    }

    if (p.startsWith('/geo/')) {
      hits.geo++;
      const nom = (url.searchParams.get('nom') || '').toLowerCase();
      const cp = url.searchParams.get('codePostal');
      const lyon = { nom: 'Lyon', code: '69123', codesPostaux: ['69001', '69002', '69003'], codeDepartement: '69', codeRegion: '84', centre: { type: 'Point', coordinates: [4.835, 45.758] } };
      return json(res, 200, nom.startsWith('ly') || cp?.startsWith('690') ? [lyon] : []);
    }

    if (p.startsWith('/web/')) {
      hits.web++;
      const host = req.headers['x-test-host'];
      const path = p.slice(4) || '/';
      const page = SITES[host]?.[path];
      if (page === undefined) return html(res, '<h1>Introuvable</h1>', 404);
      if (path.endsWith('.txt')) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end(page);
      }
      if (path.endsWith('.xml')) {
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        return res.end(page);
      }
      return html(res, page);
    }
    json(res, 404, { error: 'not found' });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  startMock(Number(process.env.MOCK_PORT || 4010)).then(() => console.log('mock prêt'));
}
