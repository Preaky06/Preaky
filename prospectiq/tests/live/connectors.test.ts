// Tests contre les vraies API publiques (réseau requis) : LIVE=1 npx vitest run
import { describe, it, expect } from 'vitest';
import { searchCompanies, getCompany } from '@/lib/connectors/sirene';
import { bodaccSignals } from '@/lib/connectors/bodacc';
import { findCommunes } from '@/lib/connectors/geo';
import { scoreCompany } from '@/lib/scoring';

describe('API réelles', () => {
  it('SIRENE : recherche par secteur et code postal, normalisation, exclusions', async () => {
    const res = await searchCompanies({ sector: 'bijouterie', postalCode: '06000', excludeLarge: true });
    expect(res.total).toBeGreaterThan(0);
    expect(res.companies.length).toBeGreaterThan(0);
    const c = res.companies[0];
    expect(c.siren).toMatch(/^\d{9}$/);
    expect(c.name.length).toBeGreaterThan(1);
    expect(c.optOut).toBe(false);
    expect(c.directors.every((d) => !('annee_de_naissance' in d))).toBe(true);
    console.log('SIRENE', res.total, 'résultats ; exclus', res.excluded, '; premier :', c.name, c.city, c.nafLabel, c.employeesLabel);
  });

  it('SIRENE : recherche géographique (rayon)', async () => {
    const res = await searchCompanies({ sector: 'restauration', lat: 43.7032, lon: 7.2528, radiusKm: 1 });
    expect(res.companies.length).toBeGreaterThan(0);
    console.log('near_point', res.total, res.companies.slice(0, 3).map((c) => `${c.name} (${c.city})`));
  });

  it('SIRENE : fiche par SIREN', async () => {
    const c = await getCompany('972802664');
    expect(c?.siren).toBe('972802664');
  });

  it('BODACC : signaux groupés pour plusieurs SIREN', async () => {
    const res = await searchCompanies({ sector: 'immobilier', department: '06' });
    const sig = await bodaccSignals(res.companies.map((c) => c.siren));
    const withSignals = Object.entries(sig).filter(([, s]) => s.length);
    console.log('BODACC', withSignals.length, 'entreprises avec signaux ;', withSignals.slice(0, 2).map(([k, s]) => `${k}: ${s.map((x) => x.label).join(' | ')}`));
    expect(Object.keys(sig).length).toBe(res.companies.length);
    const scored = res.companies.map((c) => scoreCompany({ company: c, signals: sig[c.siren] }));
    console.log('scores préliminaires', scored.map((s) => s.total));
  });

  it('Géo : communes par nom et par code postal', async () => {
    expect((await findCommunes('Nice'))[0].nom).toBe('Nice');
    expect((await findCommunes('06000'))[0].codesPostaux).toContain('06000');
  });
});
