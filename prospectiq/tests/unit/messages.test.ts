import { describe, it, expect } from 'vitest';
import { templateMessages, hooks, fit, LIMITS, CHANNELS, TONES, factsForAi, withPrep, type Channel, type Tone } from '@/lib/messages';
import { toCsv } from '@/lib/csv';
import { displayName } from '@/lib/insights';
import { company, website } from './fixtures';

// Formulations qui inventeraient une relation préalable avec le prospect.
const INVENTED_RELATION = /suite à notre (échange|conversation|appel|rencontre)|comme convenu|comme promis|nous nous sommes (vus|rencontrés|parlé)|ravi de vous avoir|suite à votre demande|vous m'avez|vous m’avez/i;

const ctx = (over = {}) => ({
  company: company({ tradeNames: ['Atelier Test'] }),
  website: website({ https: false, findings: [{ id: 'no_https', label: 'Pas de HTTPS', severity: 'important' as const, services: ['site_web'] }] }),
  signals: [],
  places: null,
  service: 'site_web',
  senderName: 'Alex',
  senderCompany: 'Studio Démo',
  ...over,
});

describe('générateur de messages (modèles)', () => {
  const combos = (Object.keys(CHANNELS) as Channel[]).flatMap((ch) => (Object.keys(TONES) as Tone[]).map((t) => [ch, t] as const));

  it.each(combos)('%s / %s : respecte la limite, n’invente aucune relation, cite le prospect', (channel, tone) => {
    const out = templateMessages(ctx(), channel, tone, 3);
    expect(out.length).toBeGreaterThan(0);
    for (const m of out) {
      expect(m.length).toBeLessThanOrEqual(LIMITS[channel]);
      expect(m).not.toMatch(INVENTED_RELATION);
    }
    if (channel !== 'court') expect(out.join(' ')).toContain('Atelier Test');
  });

  it('e-mail : objet et mention de désinscription', () => {
    const [m] = templateMessages(ctx(), 'email', 'professionnel', 1);
    expect(m.startsWith('Objet : ')).toBe(true);
    expect(m).toMatch(/« stop »/);
  });

  it('les accroches ne viennent que de constats réels', () => {
    expect(hooks(ctx())).toEqual(['votre site n’est pas encore en connexion sécurisée (HTTPS)']);
    expect(hooks(ctx({ website: website() }))).toEqual([]);
    const withSignal = hooks(ctx({ website: null, signals: [{ id: 's', label: 'Création d’entreprise publiée au BODACC', kind: 'opportunity', date: new Date().toISOString().slice(0, 10), source: 'BODACC', verified: true }] }));
    expect(withSignal[0]).toMatch(/BODACC/);
  });

  it('sans constat, le message reste générique (aucune affirmation inventée)', () => {
    const m = templateMessages(ctx({ website: null }), 'linkedin', 'direct', 1)[0];
    expect(m).not.toMatch(/j’ai vu|votre site/);
  });

  it('contractions françaises (au, du, aux, des, d’)', () => {
    expect(withPrep('à', 'Le Comptoir')).toBe('au Comptoir');
    expect(withPrep('de', 'Le Comptoir')).toBe('du Comptoir');
    expect(withPrep('à', 'Les Halles')).toBe('aux Halles');
    expect(withPrep('de', 'Les Halles')).toBe('des Halles');
    expect(withPrep('de', 'Atelier Test')).toBe('d’Atelier Test');
    expect(withPrep('à', 'Maison Rose')).toBe('à Maison Rose');
    const all = (Object.keys(TONES) as Tone[]).flatMap((t) => templateMessages(ctx({ company: company({ tradeNames: ['Le Comptoir'] }) }), 'email', t, 3));
    expect(all.join(' ')).not.toMatch(/\b(à|de) Le\b/);
  });

  it('fit coupe à la phrase', () => {
    const long = 'Phrase un. '.repeat(60);
    const r = fit(long, 'court');
    expect(r.length).toBeLessThanOrEqual(LIMITS.court);
    expect(r.endsWith('.')).toBe(true);
  });

  it('faits transmis à l’IA : pas de dirigeants, inconnu = « Non renseigné »', () => {
    const f = factsForAi(ctx({ company: company({ directors: [{ name: 'Camille Test', role: 'Président' }], city: null }) }));
    expect(JSON.stringify(f)).not.toContain('Camille');
    expect(f.entreprise.ville).toBe('Non renseigné');
  });
});

describe('noms affichés', () => {
  it('capitalisation lisible, sigles conservés', () => {
    expect(displayName({ name: "SOCIETE D'AFFINAGE (S.A.A.M.P)", tradeNames: [] })).toBe("Societe D'Affinage (S.A.A.M.P)");
    expect(displayName({ name: 'LE COMPTOIR DEMO SAS', tradeNames: [] })).toBe('Le Comptoir Demo SAS');
    expect(displayName({ name: 'X', tradeNames: ['Maison Rose'] })).toBe('Maison Rose');
  });
});

describe('export CSV', () => {
  it('neutralise les formules et échappe les séparateurs', () => {
    const csv = toCsv([['nom', 'note'], ['=HYPERLINK("x")', 'a;b'], ['+33', '-1'], ['@cmd', 'ligne\n2']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"a;b"');
    expect(csv).toContain(`'+33;'-1`);
    expect(csv).toContain(`'@cmd`);
  });
});
