import { describe, it, expect } from 'vitest';
import { buildInsights, tidyInsights } from '@/lib/insights';
import { scoreCompany } from '@/lib/scoring';
import { company, website } from './fixtures';

describe('analyse : aucune supposition présentée comme un fait', () => {
  const signals = [{ id: 's', label: 'Vente ou cession de fonds de commerce', kind: 'opportunity' as const, date: '2026-04-29', source: 'BODACC', verified: true }];

  it('site non analysable : les opportunités citent l’annonce, jamais une lacune du site', () => {
    const w = { status: 'unreachable' as const, url: null, verification: 'Accès impossible.', checkedAt: '' };
    const score = scoreCompany({ company: company(), website: w, signals });
    const ins = buildInsights(company(), w, signals, null, score, { services: ['site_web'] });
    const all = ins.opportunities.map((o) => o.reason).join(' ');
    expect(all).toMatch(/Annonce officielle : vente ou cession/);
    expect(all).not.toMatch(/Constaté sur le site|lacunes|absente ou incomplète/);
    expect(ins.caveats.join(' ')).toMatch(/Site web non analysé/);
    expect(score.criteria.find((c) => c.id === 'need')!.reasons[0]).toMatch(/non analysable/);
  });

  it('site audité : chaque opportunité cite un constat réel', () => {
    const w = website({ findings: [{ id: 'no_viewport', label: 'Aucune balise d’adaptation mobile (viewport) détectée.', severity: 'important', services: ['site_web'] }] });
    const score = scoreCompany({ company: company(), website: w, signals: [] });
    const ins = buildInsights(company(), w, [], null, score, { services: ['site_web'] });
    expect(ins.opportunities).toHaveLength(1);
    expect(ins.opportunities[0].reason).toMatch(/Constaté sur le site : aucune balise d’adaptation mobile/);
  });

  it('aucun fait : aucune opportunité inventée', () => {
    const score = scoreCompany({ company: company(), website: website(), signals: [] });
    expect(buildInsights(company(), website(), [], null, score, {}).opportunities).toEqual([]);
  });
});

describe('ponctuation des analyses', () => {
  it('aucun tiret cadratin dans une analyse neuve', () => {
    const score = scoreCompany({ company: company(), website: website(), signals: [] });
    const ins = buildInsights(company(), website(), [], null, score, { services: ['site_web'] });
    expect(JSON.stringify(ins)).not.toMatch(/—/);
  });

  it('analyses déjà enregistrées : tirets cadratins remplacés à la lecture', () => {
    const old = { summary: 'Résumé', strengths: [], weaknesses: [], opportunities: [{ service: 'site_web', reason: 'Annonce — vente' }], services: [], caveats: [], rationale: 'Point le plus contributif : pertinence — Besoins correspondant à vos services.' };
    const t = tidyInsights(old);
    expect(t.rationale).toBe('Point le plus contributif : pertinence. Besoins correspondant à vos services.');
    expect(t.opportunities[0].reason).toBe('Annonce, vente');
  });
});
