import { describe, it, expect } from 'vitest';
import { isPrivateAddress } from '@/lib/connectors/web';
import { candidateDomains, auditPage } from '@/lib/connectors/website';
import { toSignals } from '@/lib/connectors/bodacc';
import { normalizeCompany, buildQuery } from '@/lib/connectors/sirene';

describe('protection SSRF', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '224.0.0.1'])('bloque %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });
  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '2001:4860:4860::8888'])('autorise %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe('découverte de site', () => {
  it('domaines candidats sans formes juridiques', () => {
    const d = candidateDomains({ name: 'SARL LES DELICES DE PROVENCE', tradeNames: ['Les Délices'] });
    expect(d).toContain('delices.fr');
    expect(d.some((x) => x.includes('sarl'))).toBe(false);
    expect(d.length).toBeLessThanOrEqual(6);
  });
});

describe('audit de page', () => {
  const page = (html: string, url = 'https://atelier.invalid/') => ({ url, status: 200, contentType: 'text/html', text: html, ms: 300, bytes: html.length });

  it('détecte les lacunes réelles et ne conserve que les e-mails génériques', async () => {
    const html = `<html><head><title>Ok</title></head><body><h1>Bienvenue</h1>
      <p>Réservations au 01 23 45 67 89. © 2019 Atelier — contact@atelier.invalid — jean.dupont@atelier.invalid — 01 23 45 67 89</p></body></html>`;
    const a = await auditPage(page(html, 'http://atelier.invalid/'), { sectorId: 'restauration' });
    const ids = a.findings!.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['no_https', 'no_viewport', 'no_title', 'no_description', 'old_copyright', 'no_socials', 'no_booking']));
    expect(a.copyrightYear).toBe(2019);
    expect(a.booking).toBe(false); // une mention « réservations au … » n'est pas une réservation en ligne
    expect(a.emails).toEqual([{ address: 'contact@atelier.invalid', kind: 'generique' }]);
    expect(a.phones?.[0]).toMatch(/01 23 45 67 89/);
    expect(a.quality).toBeLessThan(50);
  });

  it('site soigné : peu de constats', async () => {
    const y = new Date().getFullYear();
    const html = `<html><head><title>Atelier Exemple — restaurant</title><meta name="viewport" content="width=device-width"><meta name="description" content="Restaurant">
      <meta property="og:title" content="Atelier"><script type="application/ld+json">{}</script><script src="https://www.googletagmanager.com/gtag/js?id=G-X"></script></head>
      <body><h1>Atelier</h1><a href="https://www.instagram.com/atelier">Instagram</a><a href="/reservation">Réserver</a><p>© ${y}</p></body></html>`;
    const a = await auditPage(page(html), { sectorId: 'restauration' });
    expect(a.findings!.filter((f) => f.severity !== 'info').map((f) => f.id)).toEqual([]);
    expect(a.socials?.instagram).toContain('instagram.com/atelier');
    expect(a.booking).toBe(true);
  });
});

describe('BODACC', () => {
  it('traduit les annonces en signaux datés et sourcés', () => {
    expect(toSignals({ id: 'a', familleavis: 'creation', dateparution: '2026-01-10' })[0]).toMatchObject({ kind: 'opportunity', source: 'BODACC', verified: true, date: '2026-01-10' });
    expect(toSignals({ id: 'b', familleavis: 'collective', dateparution: '2026-01-10', jugement: JSON.stringify({ nature: 'Jugement d’ouverture' }) })[0].kind).toBe('risk');
    const m = toSignals({ id: 'c', familleavis: 'modification', dateparution: '2026-01-10', modificationsgenerales: JSON.stringify({ descriptif: 'Modification de la dénomination' }) });
    expect(m.map((s) => s.label)).toContain('Changement de nom ou d’enseigne');
    expect(toSignals({ familleavis: 'inconnu' })).toEqual([]);
  });
});

describe('SIRENE', () => {
  const raw = {
    siren: '123456789',
    nom_complet: 'ATELIER TEST (ATELIER)',
    activite_principale: '56.10A',
    section_activite_principale: 'I',
    nature_juridique: '5710',
    categorie_entreprise: 'PME',
    tranche_effectif_salarie: '03',
    annee_tranche_effectif_salarie: '2024',
    date_creation: '2020-01-01',
    etat_administratif: 'A',
    nombre_etablissements_ouverts: 1,
    siege: { siret: '12345678900011', adresse: '1 RUE DU TEST 75001 PARIS', code_postal: '75001', libelle_commune: 'PARIS', departement: '75', region: '11', latitude: '48.86', longitude: '2.34', liste_enseignes: ['ATELIER'] },
    dirigeants: [{ type_dirigeant: 'personne physique', nom: 'TEST', prenoms: 'CAMILLE MARIE', annee_de_naissance: '1980', date_de_naissance: '1980-01', qualite: 'Président' }],
    complements: { est_entrepreneur_individuel: false },
    opposition_diffusion_commerciale: false,
  };

  it('normalise et minimise (jamais de date de naissance)', () => {
    const c = normalizeCompany(raw);
    expect(c).toMatchObject({ siren: '123456789', sectorId: 'restauration', legalForm: 'SAS', employeesLabel: '6 à 9 salariés', city: 'PARIS', lat: 48.86, tradeNames: ['ATELIER'] });
    expect(c.directors).toEqual([{ name: 'Camille Test', role: 'Président' }]);
    expect(JSON.stringify(c)).not.toMatch(/1980/);
  });

  it('entrepreneur « non diffusible » exclu comme une opposition', () => {
    expect(normalizeCompany({ siren: '111111111', statut_diffusion: 'P', nom_complet: '[NON-DIFFUSIBLE]' }).optOut).toBe(true);
    expect(normalizeCompany({ siren: '111111112', nom_complet: '[Non-Diffusible]' }).optOut).toBe(true);
    expect(normalizeCompany({ siren: '111111113', statut_diffusion: 'O', nom_complet: 'ATELIER' }).optOut).toBe(false);
  });

  it('valeurs inconnues à null, opposition détectée', () => {
    const c = normalizeCompany({ siren: '987654321', opposition_diffusion_commerciale: true });
    expect(c.optOut).toBe(true);
    expect(c.nafLabel).toBeNull();
    expect(c.city).toBeNull();
    expect(c.employeesLabel).toBeNull();
  });

  it('construit la requête : secteur → NAF, zone, entreprises actives', () => {
    const { path, query } = buildQuery({ sector: 'restauration', postalCode: '69002', sizes: ['tpe'] });
    expect(path).toBe('/search');
    expect(query.get('activite_principale')).toContain('56.10A');
    expect(query.get('code_postal')).toBe('69002');
    expect(query.get('etat_administratif')).toBe('A');
    expect(query.get('tranche_effectif_salarie')).toBe('01,02,03');
  });

  it('recherche par rayon plafonnée à 50 km', () => {
    const { path, query, postFilterSizes } = buildQuery({ lat: 45, lon: 4, radiusKm: 200, sizes: ['pe'] });
    expect(path).toBe('/near_point');
    expect(query.get('radius')).toBe('50');
    expect(postFilterSizes?.length).toBeGreaterThan(0);
  });
});
