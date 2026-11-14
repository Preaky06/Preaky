// Données de test SYNTHÉTIQUES (aucune entreprise ni personne réelle).
import type { Company, WebsiteAudit } from '@/lib/connectors/types';

export function company(over: Partial<Company> = {}): Company {
  return {
    siren: '123456789',
    siret: '12345678900011',
    name: 'ATELIER TEST',
    tradeNames: [],
    naf: '56.10A',
    nafLabel: 'Restauration traditionnelle',
    section: 'I',
    sectorId: 'restauration',
    legalForm: 'SAS',
    category: 'PME',
    employeesRange: '03',
    employeesLabel: '6 à 9 salariés',
    employeesYear: '2024',
    createdOn: '2015-03-01',
    active: true,
    establishments: 1,
    address: '1 RUE DU TEST 75001 PARIS',
    postalCode: '75001',
    city: 'PARIS',
    department: '75',
    region: '11',
    lat: 48.86,
    lon: 2.34,
    localAddress: null,
    finances: null,
    directors: [],
    labels: [],
    optOut: false,
    isIndividual: false,
    updatedAt: '2025-01-01',
    source: { name: 'test', url: '', fetchedAt: '2026-01-01T00:00:00Z' },
    ...over,
  };
}

export function website(over: Partial<WebsiteAudit> = {}): WebsiteAudit {
  return { status: 'verified', url: 'https://atelier-test.fr/', verification: 'SIREN trouvé', checkedAt: '2026-01-01T00:00:00Z', https: true, mobileViewport: true, socials: { instagram: 'https://instagram.com/x' }, analytics: ['GA4'], findings: [], quality: 95, phones: ['01 00 00 00 00'], ...over };
}
