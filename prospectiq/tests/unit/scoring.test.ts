import { describe, it, expect } from 'vitest';
import { scoreCompany, categoryOf, normalizeWeights, DEFAULT_WEIGHTS } from '@/lib/scoring';
import { company, website } from './fixtures';

const NOW = new Date('2026-06-01T00:00:00Z');

describe('scoring', () => {
  it('catégories aux bornes exactes du cahier des charges', () => {
    expect(categoryOf(100).id).toBe('elevee');
    expect(categoryOf(80).id).toBe('elevee');
    expect(categoryOf(79).id).toBe('interessant');
    expect(categoryOf(60).id).toBe('interessant');
    expect(categoryOf(59).id).toBe('modere');
    expect(categoryOf(40).id).toBe('modere');
    expect(categoryOf(39).id).toBe('faible');
    expect(categoryOf(0).id).toBe('faible');
  });

  it('pondérations par défaut 30/25/20/15/10 et normalisation à 100', () => {
    expect(DEFAULT_WEIGHTS).toEqual({ need: 30, relevance: 25, digital: 20, signals: 15, data: 10 });
    const w = normalizeWeights({ need: 1, relevance: 1, digital: 1, signals: 1, data: 0 });
    expect(Object.values(w).reduce((s, v) => s + v, 0)).toBeCloseTo(100);
    expect(w.data).toBe(0);
  });

  it('chaque critère porte des raisons, une base et des points ≤ poids', () => {
    const s = scoreCompany({ company: company(), website: website(), signals: [], now: NOW });
    expect(s.criteria).toHaveLength(5);
    for (const c of s.criteria) {
      expect(c.reasons.length).toBeGreaterThan(0);
      expect(['verified', 'estimated', 'missing']).toContain(c.basis);
      expect(c.points).toBeLessThanOrEqual(Math.round(c.weight));
      expect(c.points).toBeGreaterThanOrEqual(0);
    }
    expect(s.total).toBe(s.criteria.reduce((t, c) => t + c.points, 0));
  });

  it('un site défaillant augmente le besoin détecté', () => {
    const good = scoreCompany({ company: company(), website: website(), signals: [], offer: { services: ['site_web'] }, now: NOW });
    const bad = scoreCompany({
      company: company(),
      website: website({
        https: false,
        quality: 30,
        socials: {},
        analytics: [],
        findings: [
          { id: 'no_https', label: 'Pas de HTTPS', severity: 'important', services: ['site_web'] },
          { id: 'no_viewport', label: 'Pas mobile', severity: 'important', services: ['site_web'] },
        ],
      }),
      signals: [],
      offer: { services: ['site_web'] },
      now: NOW,
    });
    const need = (r: typeof good) => r.criteria.find((c) => c.id === 'need')!.points;
    expect(need(bad)).toBeGreaterThan(need(good));
    expect(bad.total).toBeGreaterThan(good.total);
  });

  it('sans analyse : score préliminaire et confiance faible, jamais présenté comme constaté', () => {
    const s = scoreCompany({ company: company(), now: NOW });
    expect(s.preliminary).toBe(true);
    expect(s.confidence).toBe('faible');
    expect(s.criteria.find((c) => c.id === 'need')!.basis).toBe('missing');
  });

  it('site non trouvé : besoin estimé (absence à confirmer), pas constaté', () => {
    const s = scoreCompany({ company: company(), website: { status: 'not_found', url: null, verification: '', checkedAt: '' }, signals: [], offer: { services: ['site_web'] }, now: NOW });
    const need = s.criteria.find((c) => c.id === 'need')!;
    expect(need.basis).toBe('estimated');
    expect(need.reasons.join(' ')).toMatch(/à confirmer/);
    expect(s.criteria.find((c) => c.id === 'relevance')!.basis).toBe('estimated');
    expect(s.confidence).not.toBe('élevée');
  });

  it('grande structure sans site détecté : besoin faible (échec de détection probable)', () => {
    const nf = { status: 'not_found' as const, url: null, verification: '', checkedAt: '' };
    const small = scoreCompany({ company: company(), website: nf, signals: [], now: NOW });
    const big = scoreCompany({ company: company({ employeesRange: '42', establishments: 141, category: 'GE' }), website: nf, signals: [], now: NOW });
    const need = (r: typeof small) => r.criteria.find((c) => c.id === 'need')!;
    expect(need(big).points).toBeLessThan(need(small).points);
    expect(need(big).reasons[0]).toMatch(/probablement pas été détecté/);
  });

  it('site non analysable (réseau) : aucune conclusion, pas de besoin constaté', () => {
    const s = scoreCompany({ company: company(), website: { status: 'unreachable', url: null, verification: '', checkedAt: '' }, signals: [], now: NOW });
    expect(s.criteria.find((c) => c.id === 'need')!.basis).toBe('missing');
    expect(s.preliminary).toBe(true);
  });

  it('procédure collective récente : score plafonné à 25', () => {
    const s = scoreCompany({
      company: company(),
      website: website({ findings: [{ id: 'no_https', label: 'x', severity: 'important', services: ['site_web'] }], https: false, quality: 20 }),
      signals: [{ id: 'r', label: 'Procédure collective', kind: 'risk', date: '2026-03-01', source: 'BODACC', verified: true }],
      now: NOW,
    });
    expect(s.total).toBeLessThanOrEqual(25);
    expect(s.flags).toContain('risk');
  });

  it('entreprise fermée : score nul', () => {
    expect(scoreCompany({ company: company({ active: false }), now: NOW }).total).toBe(0);
  });

  it('création récente : signal pris en compte', () => {
    const young = scoreCompany({ company: company({ createdOn: '2026-02-01' }), signals: [], now: NOW });
    const old = scoreCompany({ company: company(), signals: [], now: NOW });
    const sig = (r: typeof young) => r.criteria.find((c) => c.id === 'signals')!.points;
    expect(sig(young)).toBeGreaterThan(sig(old));
  });

  it('pondérations personnalisées respectées', () => {
    const s = scoreCompany({ company: company(), website: website(), signals: [], weights: { need: 0, relevance: 0, digital: 0, signals: 0, data: 100 }, now: NOW });
    expect(s.criteria.filter((c) => c.id !== 'data').every((c) => c.points === 0)).toBe(true);
  });
});
