import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { zoneOf, matchesCriteria, departmentOfPostalCode, departmentOfCityCode, REGION_DEPARTMENTS, activityMatches, SECTOR_KEYWORDS } from '@/lib/radar-zone';
import { SECTORS } from '@/lib/sectors';
import { normalizeTarget } from '@/lib/site-audit';
import { REMEDIES } from '@/lib/audit-remedies';
import { company } from './fixtures';

describe('Radar : zone surveillée', () => {
  it('déduit le département d’un code postal, Corse et outre-mer compris', () => {
    expect(departmentOfPostalCode('69002')).toBe('69');
    expect(departmentOfPostalCode('20000')).toBe('2A');
    expect(departmentOfPostalCode('20200')).toBe('2B');
    expect(departmentOfPostalCode('97411')).toBe('974');
    expect(departmentOfPostalCode('6900')).toBeNull();
  });
  it('déduit le département d’un code commune Insee', () => {
    expect(departmentOfCityCode('69123')).toBe('69');
    expect(departmentOfCityCode('2A004')).toBe('2A');
    expect(departmentOfCityCode('97411')).toBe('974');
  });
  it('construit la zone à partir de la recherche, ou refuse sans territoire', () => {
    expect(zoneOf({ postalCode: '69002' })).toEqual({ departments: ['69'], postalCode: '69002', label: 'code postal 69002' });
    expect(zoneOf({ cityCode: '69123', city: 'Lyon' })?.departments).toEqual(['69']);
    expect(zoneOf({ department: '2a' })?.departments).toEqual(['2A']);
    expect(zoneOf({ region: '11' })?.departments).toEqual(REGION_DEPARTMENTS['11']);
    expect(zoneOf({ sector: 'restauration' })).toBeNull();
  });
  it('chaque région métropolitaine liste au plus 13 départements (limite de la requête BODACC)', () => {
    for (const deps of Object.values(REGION_DEPARTMENTS)) expect(deps.length).toBeLessThanOrEqual(13);
    const all = Object.values(REGION_DEPARTMENTS).flat();
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(101);
  });
});

describe('Radar : filtre des entreprises détectées', () => {
  const resto = company({ naf: '56.10A', section: 'I', sectorId: 'restauration', employeesRange: '03', category: 'PME' });
  it('garde une entreprise du bon secteur', () => {
    expect(matchesCriteria(resto, { sector: 'restauration' })).toBe(true);
    expect(matchesCriteria(resto, { sector: 'technologie' })).toBe(false);
  });
  it('un secteur défini par section (commerce) couvre ses sous-secteurs', () => {
    const bijou = company({ naf: '47.77Z', section: 'G', sectorId: 'bijouterie' });
    expect(matchesCriteria(bijou, { sector: 'commerce' })).toBe(true);
  });
  it('exclut toujours l’opposition au démarchage et les entreprises fermées', () => {
    expect(matchesCriteria({ ...resto, optOut: true }, {})).toBe(false);
    expect(matchesCriteria({ ...resto, active: false }, {})).toBe(false);
  });
  it('applique la taille, l’exclusion des grandes entreprises et les mots-clés', () => {
    expect(matchesCriteria(resto, { sizes: ['tpe'] })).toBe(true);
    expect(matchesCriteria({ ...resto, category: 'GE' }, { excludeLarge: true })).toBe(false);
    expect(matchesCriteria(resto, { q: 'zzz-introuvable' })).toBe(false);
  });
});

describe('Radar : pré-tri par l’activité déclarée au BODACC', () => {
  it('reconnaît l’activité, accents et majuscules compris', () => {
    expect(activityMatches('Toutes activités de RESTAURATION, brasserie, bistrot', 'restauration')).toBe(true);
    expect(activityMatches('Travaux de rénovation et maçonnerie générale', 'btp')).toBe(true);
    expect(activityMatches('La vente en ligne de meubles neufs', 'restauration')).toBe(false);
  });
  it('ne conclut pas sans texte ni secteur : la vérification SIRENE tranche', () => {
    expect(activityMatches(null, 'restauration')).toBeNull();
    expect(activityMatches('Restauration', undefined)).toBeNull();
  });
  it('chaque secteur proposé (hors « autres ») a ses mots-clés', () => {
    for (const s of SECTORS.filter((x) => x.id !== 'autres')) expect(SECTOR_KEYWORDS[s.id], s.id).toBeDefined();
  });
});

describe('Audit de site : adresse cible', () => {
  it('accepte un domaine public, avec ou sans protocole', () => {
    expect(normalizeTarget('www.exemple.fr')?.toString()).toBe('https://www.exemple.fr/');
    expect(normalizeTarget('http://exemple.fr/page')?.hostname).toBe('exemple.fr');
  });
  it('refuse les adresses internes, IP, identifiants et protocoles exotiques', () => {
    for (const bad of ['localhost', 'http://127.0.0.1', 'intranet', 'http://user:pass@exemple.fr', 'ftp://exemple.fr', 'serveur.local', 'a b.fr', '']) expect(normalizeTarget(bad)).toBeNull();
  });
  it('chaque constat possible de l’audit a sa recommandation', () => {
    const src = readFileSync(path.resolve(__dirname, '../../src/lib/connectors/website.ts'), 'utf8');
    const ids = [...src.matchAll(/add\('([a-z_]+)'/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) expect(REMEDIES[id], id).toBeDefined();
  });
});
